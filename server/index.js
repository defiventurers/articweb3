require("dotenv").config();

const http = require("http");
const WebSocket = require("ws");
const { randomUUID } = require("crypto");
const { verifyMessage } = require("viem");

const PORT = process.env.PORT || 10000;
const COUNTDOWN_DURATION_MS = 5000;

const profiles = new Map();
const nonces = new Map();
const rooms = new Map();
const socketsByWallet = new Map();

function send(ws, packet) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(packet));
  }
}

function ok(ws, requestId, type, payload) {
  send(ws, { type, requestId, payload });
}

function fail(ws, requestId, message, code = "ERROR") {
  send(ws, {
    type: "error",
    requestId,
    payload: { message, code }
  });
}

function normalizeWallet(wallet) {
  return String(wallet || "").toLowerCase();
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 4; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  if (rooms.has(code)) return makeRoomCode();
  return code;
}

function getPlayers(room) {
  return Object.values(room.players || {});
}

function publicRoom(room) {
  return {
    id: room.id,
    roomCode: room.roomCode,
    visibility: room.visibility,
    status: room.status,
    playerCount: getPlayers(room).length,
    maxPlayers: 4,
    countdownStartTime: room.countdownStartTime,
    countdownDurationMs: room.countdownDurationMs,
    players: getPlayers(room).map((player) => {
      const profile = profiles.get(player.wallet);

      return {
        wallet: player.wallet,
        name: profile?.name || "Player",
        team: player.team
      };
    })
  };
}

function broadcastRoom(room) {
  const packet = {
    type: "room_state",
    payload: { room: publicRoom(room) }
  };

  for (const player of getPlayers(room)) {
    const ws = socketsByWallet.get(player.wallet);
    if (ws) send(ws, packet);
  }
}

function assignTeam(room) {
  const teams = ["green", "red", "blue", "yellow"];
  const taken = new Set(getPlayers(room).map((player) => player.team));
  return teams.find((team) => !taken.has(team));
}

function maybeStartCountdown(room) {
  if (room.status !== "waiting") return;
  if (getPlayers(room).length !== 4) return;

  if (!room.countdownStartTime) {
    room.countdownStartTime = Date.now();
    room.countdownDurationMs = COUNTDOWN_DURATION_MS;
    broadcastRoom(room);
  }
}

function maybeStartGame(room) {
  if (room.status !== "waiting") return;
  if (!room.countdownStartTime) return;

  const elapsed = Date.now() - room.countdownStartTime;
  if (elapsed < COUNTDOWN_DURATION_MS) return;

  room.status = "playing";
  room.countdownStartTime = null;
  broadcastRoom(room);
}

async function handleProfileNonce(ws, requestId, payload) {
  const address = normalizeWallet(payload.address);

  if (!address) {
    return fail(ws, requestId, "Missing wallet address.");
  }

  const nonce = randomUUID();
  const message = `Sign in to Artic Web3\nWallet: ${address}\nNonce: ${nonce}`;

  nonces.set(address, {
    message,
    createdAt: Date.now()
  });

  return ok(ws, requestId, "profile_nonce_result", { message });
}

async function handleProfileLogin(ws, requestId, payload) {
  const address = normalizeWallet(payload.address);
  const name = String(payload.name || "").trim().slice(0, 20);
  const message = payload.message;
  const signature = payload.signature;

  if (!address) return fail(ws, requestId, "Missing wallet address.");
  if (name.length < 3) return fail(ws, requestId, "Name must be at least 3 characters.");

  const nonceRecord = nonces.get(address);

  if (!nonceRecord || nonceRecord.message !== message) {
    return fail(ws, requestId, "Invalid login nonce.");
  }

  const valid = await verifyMessage({
    address,
    message,
    signature
  });

  if (!valid) {
    return fail(ws, requestId, "Invalid wallet signature.");
  }

  const existing = profiles.get(address);

  const profile = {
    wallet: address,
    name,
    points: existing?.points || 0,
    gamesPlayed: existing?.gamesPlayed || 0,
    wins: existing?.wins || 0,
    createdAt: existing?.createdAt || Date.now()
  };

  profiles.set(address, profile);
  socketsByWallet.set(address, ws);
  nonces.delete(address);

  return ok(ws, requestId, "profile_login_result", { profile });
}

function handleRoomList(ws, requestId) {
  const publicRooms = [...rooms.values()]
    .filter((room) => room.visibility === "public")
    .filter((room) => room.status === "waiting")
    .filter((room) => getPlayers(room).length < 4)
    .map(publicRoom);

  return ok(ws, requestId, "room_list_result", { rooms: publicRooms });
}

function handleRoomCreate(ws, requestId, payload) {
  const wallet = normalizeWallet(payload.wallet);
  const visibility = payload.visibility === "private" ? "private" : "public";

  if (!profiles.has(wallet)) {
    return fail(ws, requestId, "Create profile first.");
  }

  socketsByWallet.set(wallet, ws);

  const roomCode = makeRoomCode();

  const room = {
    id: randomUUID(),
    roomCode,
    visibility,
    status: "waiting",
    players: {
      [wallet]: {
        wallet,
        team: "green",
        joinedAt: Date.now()
      }
    },
    countdownStartTime: null,
    countdownDurationMs: COUNTDOWN_DURATION_MS,
    createdAt: Date.now()
  };

  rooms.set(roomCode, room);

  ok(ws, requestId, "room_create_result", {
    room: publicRoom(room)
  });

  return broadcastRoom(room);
}

function handleRoomJoin(ws, requestId, payload) {
  const wallet = normalizeWallet(payload.wallet);
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();

  if (!profiles.has(wallet)) {
    return fail(ws, requestId, "Create profile first.");
  }

  const room = rooms.get(roomCode);

  if (!room) return fail(ws, requestId, "Room not found.");
  if (room.status !== "waiting") return fail(ws, requestId, "Room already started.");

  socketsByWallet.set(wallet, ws);

  if (!room.players[wallet]) {
    if (getPlayers(room).length >= 4) {
      return fail(ws, requestId, "Room is full.");
    }

    const team = assignTeam(room);

    if (!team) {
      return fail(ws, requestId, "No team available.");
    }

    room.players[wallet] = {
      wallet,
      team,
      joinedAt: Date.now()
    };
  }

  maybeStartCountdown(room);

  ok(ws, requestId, "room_join_result", {
    room: publicRoom(room)
  });

  return broadcastRoom(room);
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        profiles: profiles.size,
        rooms: rooms.size
      })
    );
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Artic Web3 lobby server running.");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    let packet;

    try {
      packet = JSON.parse(raw);
    } catch {
      return fail(ws, null, "Invalid JSON.");
    }

    const { type, requestId, payload = {} } = packet;

    try {
      if (type === "profile_nonce") return handleProfileNonce(ws, requestId, payload);
      if (type === "profile_login") return handleProfileLogin(ws, requestId, payload);
      if (type === "room_list") return handleRoomList(ws, requestId, payload);
      if (type === "room_create") return handleRoomCreate(ws, requestId, payload);
      if (type === "room_join") return handleRoomJoin(ws, requestId, payload);

      return fail(ws, requestId, `Unknown message type: ${type}`);
    } catch (err) {
      return fail(ws, requestId, err.message || "Server error.");
    }
  });
});

setInterval(() => {
  for (const room of rooms.values()) {
    maybeStartGame(room);
  }
}, 250);

server.listen(PORT, () => {
  console.log(`Artic Web3 lobby server running on port ${PORT}`);
});
