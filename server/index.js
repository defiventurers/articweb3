require("dotenv").config();

const http = require("http");
const WebSocket = require("ws");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 10000;
const COUNTDOWN_MS = 5000;
const ROOM_MODES = {
  OPEN_ICE: "open_ice",
  HIGH_STAKES: "high_stakes"
};
const ENTRY_TIERS = {
  "1": { code: "1", label: "$1", entryFeeUsd: 1, tokenUnits: "1000000" },
  "4": { code: "4", label: "$4", entryFeeUsd: 4, tokenUnits: "4000000" },
  "16": { code: "16", label: "$16", entryFeeUsd: 16, tokenUnits: "16000000" }
};
const HIGH_STAKES_ENABLED = process.env.HIGH_STAKES_ENABLED === "true";

const profiles = new Map();
const rooms = new Map();
const sockets = new Map();

function send(ws, packet) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(packet));
}

function ok(ws, requestId, type, payload) {
  send(ws, { type, requestId, payload });
}

function fail(ws, requestId, message) {
  send(ws, { type: "error", requestId, payload: { message } });
}

function walletOf(value) {
  return String(value || "").toLowerCase();
}

function normalizeRoomMode(value) {
  return value === ROOM_MODES.HIGH_STAKES ? ROOM_MODES.HIGH_STAKES : ROOM_MODES.OPEN_ICE;
}

function normalizeEntryTier(value) {
  const tier = ENTRY_TIERS[String(value || "1")];
  return tier || ENTRY_TIERS["1"];
}

function code() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(out) ? code() : out;
}

function matchId() {
  return `match-${randomUUID()}`;
}

function players(room) {
  return Object.values(room.players);
}

function view(room) {
  return {
    id: room.id,
    matchId: room.matchId,
    roomCode: room.roomCode,
    roomMode: room.roomMode,
    entryTier: room.entryTier,
    entryFeeUsd: room.entryFeeUsd,
    tokenUnits: room.tokenUnits,
    visibility: room.visibility,
    status: room.status,
    playerCount: players(room).length,
    maxPlayers: 4,
    countdownStartTime: room.countdownStartTime,
    countdownDurationMs: room.countdownDurationMs,
    players: players(room).map((player) => ({
      wallet: player.wallet,
      name: profiles.get(player.wallet)?.name || "Player",
      team: player.team,
      entryLocked: Boolean(player.entryLocked)
    }))
  };
}

function broadcast(room) {
  const packet = { type: "room_state", payload: { room: view(room) } };
  for (const player of players(room)) {
    const ws = sockets.get(player.wallet);
    if (ws) send(ws, packet);
  }
}

function team(room) {
  const all = ["green", "red", "blue", "yellow"];
  const used = new Set(players(room).map((player) => player.team));
  return all.find((item) => !used.has(item));
}

function checkCountdown(room) {
  if (room.status !== "waiting") return;
  if (players(room).length !== 4) return;
  if (room.roomMode !== ROOM_MODES.OPEN_ICE) return;
  if (!room.countdownStartTime) {
    room.countdownStartTime = Date.now();
    broadcast(room);
  }
}

function checkStart(room) {
  if (room.status !== "waiting" || !room.countdownStartTime) return;
  if (Date.now() - room.countdownStartTime < COUNTDOWN_MS) return;
  room.status = "playing";
  room.countdownStartTime = null;
  broadcast(room);
}

function login(ws, requestId, payload) {
  const wallet = walletOf(payload.address);
  const name = String(payload.name || "").trim().slice(0, 20);
  if (!wallet) return fail(ws, requestId, "Missing wallet address.");
  if (name.length < 3) return fail(ws, requestId, "Name must be at least 3 characters.");
  const old = profiles.get(wallet);
  const profile = {
    wallet,
    name,
    points: old?.points || 0,
    gamesPlayed: old?.gamesPlayed || 0,
    wins: old?.wins || 0,
    createdAt: old?.createdAt || Date.now()
  };
  profiles.set(wallet, profile);
  sockets.set(wallet, ws);
  return ok(ws, requestId, "profile_login_result", { profile });
}

function list(ws, requestId, payload = {}) {
  const roomMode = normalizeRoomMode(payload.roomMode);
  const publicRooms = [...rooms.values()]
    .filter((room) => room.roomMode === roomMode)
    .filter((room) => room.visibility === "public")
    .filter((room) => room.status === "waiting")
    .filter((room) => players(room).length < 4)
    .map(view);
  return ok(ws, requestId, "room_list_result", { rooms: publicRooms });
}

function createRoom(ws, requestId, payload) {
  const wallet = walletOf(payload.wallet);
  if (!profiles.has(wallet)) return fail(ws, requestId, "Create profile first.");
  sockets.set(wallet, ws);

  const roomMode = normalizeRoomMode(payload.roomMode);
  const entryTier = normalizeEntryTier(payload.entryTier);

  if (roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) {
    return fail(ws, requestId, "High Stakes rooms are not enabled yet.");
  }

  const roomCode = code();
  const room = {
    id: randomUUID(),
    matchId: matchId(),
    roomCode,
    roomMode,
    entryTier: roomMode === ROOM_MODES.HIGH_STAKES ? entryTier.code : null,
    entryFeeUsd: roomMode === ROOM_MODES.HIGH_STAKES ? entryTier.entryFeeUsd : 0,
    tokenUnits: roomMode === ROOM_MODES.HIGH_STAKES ? entryTier.tokenUnits : "0",
    visibility: payload.visibility === "private" ? "private" : "public",
    status: "waiting",
    players: {
      [wallet]: {
        wallet,
        team: "green",
        joinedAt: Date.now(),
        entryLocked: roomMode === ROOM_MODES.OPEN_ICE
      }
    },
    countdownStartTime: null,
    countdownDurationMs: COUNTDOWN_MS,
    createdAt: Date.now()
  };
  rooms.set(roomCode, room);
  ok(ws, requestId, "room_create_result", { room: view(room) });
  return broadcast(room);
}

function joinRoom(ws, requestId, payload) {
  const wallet = walletOf(payload.wallet);
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();
  if (!profiles.has(wallet)) return fail(ws, requestId, "Create profile first.");
  const room = rooms.get(roomCode);
  if (!room) return fail(ws, requestId, "Room not found.");
  if (room.status !== "waiting") return fail(ws, requestId, "Room already started.");
  if (room.roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) {
    return fail(ws, requestId, "High Stakes rooms are not enabled yet.");
  }
  sockets.set(wallet, ws);
  if (!room.players[wallet]) {
    if (players(room).length >= 4) return fail(ws, requestId, "Room is full.");
    const pickedTeam = team(room);
    room.players[wallet] = {
      wallet,
      team: pickedTeam,
      joinedAt: Date.now(),
      entryLocked: room.roomMode === ROOM_MODES.OPEN_ICE
    };
  }
  checkCountdown(room);
  ok(ws, requestId, "room_join_result", { room: view(room) });
  return broadcast(room);
}

function devFillRoom(ws, requestId, payload) {
  const wallet = walletOf(payload.wallet);
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();
  if (!profiles.has(wallet)) return fail(ws, requestId, "Create profile first.");
  const room = rooms.get(roomCode);
  if (!room) return fail(ws, requestId, "Room not found.");
  if (room.status !== "waiting") return fail(ws, requestId, "Room already started.");
  if (room.roomMode !== ROOM_MODES.OPEN_ICE) return fail(ws, requestId, "Dev fill is only available for Open Ice.");
  if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");

  const testNames = ["Test Raja", "Test Mantri", "Test Senapati"];

  for (const name of testNames) {
    if (players(room).length >= 4) break;
    const fakeWallet = `dev-${room.roomCode}-${players(room).length}`;
    const pickedTeam = team(room);
    profiles.set(fakeWallet, {
      wallet: fakeWallet,
      name,
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      createdAt: Date.now()
    });
    room.players[fakeWallet] = {
      wallet: fakeWallet,
      team: pickedTeam,
      joinedAt: Date.now(),
      entryLocked: true
    };
  }

  checkCountdown(room);
  ok(ws, requestId, "dev_fill_room_result", { room: view(room) });
  return broadcast(room);
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, profiles: profiles.size, rooms: rooms.size }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Artic Web3 lobby server running.");
});

new WebSocket.Server({ server }).on("connection", (ws) => {
  ws.on("message", async (raw) => {
    let packet;
    try { packet = JSON.parse(raw); } catch { return fail(ws, null, "Invalid JSON."); }
    const { type, requestId, payload = {} } = packet;
    if (type === "profile_login") return login(ws, requestId, payload);
    if (type === "room_list") return list(ws, requestId, payload);
    if (type === "room_create") return createRoom(ws, requestId, payload);
    if (type === "room_join") return joinRoom(ws, requestId, payload);
    if (type === "dev_fill_room") return devFillRoom(ws, requestId, payload);
    return fail(ws, requestId, `Unknown message type: ${type}`);
  });
});

setInterval(() => {
  for (const room of rooms.values()) checkStart(room);
}, 250);

server.listen(PORT, () => console.log(`Artic Web3 lobby server running on port ${PORT}`));
