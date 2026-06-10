require("dotenv").config();

const http = require("http");
const WebSocket = require("ws");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 10000;
const COUNTDOWN_MS = 5000;
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

function code() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(out) ? code() : out;
}

function players(room) {
  return Object.values(room.players);
}

function view(room) {
  return {
    id: room.id,
    roomCode: room.roomCode,
    visibility: room.visibility,
    status: room.status,
    playerCount: players(room).length,
    maxPlayers: 4,
    countdownStartTime: room.countdownStartTime,
    countdownDurationMs: room.countdownDurationMs,
    players: players(room).map((player) => ({
      wallet: player.wallet,
      name: profiles.get(player.wallet)?.name || "Player",
      team: player.team
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

function list(ws, requestId) {
  const publicRooms = [...rooms.values()]
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
  const roomCode = code();
  const room = {
    id: randomUUID(),
    roomCode,
    visibility: payload.visibility === "private" ? "private" : "public",
    status: "waiting",
    players: { [wallet]: { wallet, team: "green", joinedAt: Date.now() } },
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
  sockets.set(wallet, ws);
  if (!room.players[wallet]) {
    if (players(room).length >= 4) return fail(ws, requestId, "Room is full.");
    const pickedTeam = team(room);
    room.players[wallet] = { wallet, team: pickedTeam, joinedAt: Date.now() };
  }
  checkCountdown(room);
  ok(ws, requestId, "room_join_result", { room: view(room) });
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
    if (type === "room_list") return list(ws, requestId);
    if (type === "room_create") return createRoom(ws, requestId, payload);
    if (type === "room_join") return joinRoom(ws, requestId, payload);
    return fail(ws, requestId, `Unknown message type: ${type}`);
  });
});

setInterval(() => {
  for (const room of rooms.values()) checkStart(room);
}, 250);

server.listen(PORT, () => console.log(`Artic Web3 lobby server running on port ${PORT}`));
