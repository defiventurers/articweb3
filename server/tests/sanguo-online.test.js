const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { randomBytes } = require("node:crypto");
const { createSanguoService } = require("../sanguoService.js");
const { sanguoActions, chooseSanguoBotAction } = require("../sanguoEngine.cjs");
const { injectSanguo } = require("../sanguoBackendBootstrap.js");
const token = () => randomBytes(32).toString("hex");
function harness(t, options = {}) {
  const rooms = new Map(), saves = [], packets = [];
  const service = createSanguoService({ rooms, send(ws, packet) { packets.push({ ws, ...packet }); }, ok(ws, requestId, type, payload) { packets.push({ ws, requestId, type, payload }); }, fail(ws, requestId, message) { packets.push({ ws, requestId, type: "error", payload: { message } }); }, saveRoomSafe(room) { saves.push(JSON.parse(JSON.stringify(room))); }, chooseBot: async state => chooseSanguoBotAction(state, "easy"), botDelay: 1, ...options });
  t.after(() => service.close());
  let serial = 0;
  const socket = () => Object.assign(new EventEmitter(), { readyState: 1 });
  function call(ws, type, payload = {}) {
    const id = String(++serial); service.dispatch(ws, id, type, payload);
    return packets.find(p => p.requestId === id);
  }
  function create(count = 3, visibility = "public") {
    const ws = socket(), secret = token();
    const result = call(ws, "sg_room_create", { name: "Host", humanCount: count, faction: "red", difficulty: "medium", visibility, token: secret });
    assert.notEqual(result.type, "error", result.payload.message);
    return { ws, room: result.payload.room, creds: { roomCode: result.payload.room.roomCode, playerId: result.payload.playerId, token: secret } };
  }
  function join(roomCode, name = "Friend") {
    const ws = socket(), secret = token();
    const result = call(ws, "sg_room_join", { roomCode, name, token: secret });
    assert.notEqual(result.type, "error", result.payload.message);
    return { ws, room: result.payload.room, creds: { roomCode, playerId: result.payload.playerId, token: secret } };
  }
  function start(host, others = [], fillWithBots = false) {
    for (const p of [host, ...others]) assert.notEqual(call(p.ws, "sg_room_ready", { ...p.creds, ready: true }).type, "error");
    const result = call(host.ws, "sg_room_start", { ...host.creds, fillWithBots });
    assert.notEqual(result.type, "error", result.payload.message); return result.payload.room;
  }
  return { service, rooms, saves, packets, socket, call, create, join, start };
}

test("private codes work, public listings omit private rooms and all seat secrets", t => {
  const h = harness(t), privateRoom = h.create(3, "private"), publicRoom = h.create();
  const list = h.call(h.socket(), "sg_room_list").payload.rooms;
  assert.deepEqual(list.map(r => r.roomCode), [publicRoom.room.roomCode]);
  assert.ok(h.join(privateRoom.room.roomCode));
  for (const p of h.packets) { assert.ok(!JSON.stringify(p.payload).includes(privateRoom.creds.token)); assert.ok(!JSON.stringify(p.payload).includes("tokenHash")); }
  assert.match(h.rooms.get(privateRoom.room.roomCode).players[privateRoom.creds.playerId].tokenHash, /^[a-f0-9]{64}$/);
});

test("three seats, readiness and host-only start are enforced", t => {
  const h = harness(t), host = h.create(), green = h.join(host.room.roomCode), blue = h.join(host.room.roomCode);
  assert.equal(h.call(h.socket(), "sg_room_join", { roomCode: host.room.roomCode, name: "Fourth", token: token() }).type, "error");
  assert.equal(h.call(green.ws, "sg_room_start", green.creds).type, "error");
  assert.equal(h.call(host.ws, "sg_room_start", host.creds).type, "error");
  const room = h.start(host, [green, blue]);
  assert.equal(room.status, "playing"); assert.equal(room.gameState.turn, "red");
});

test("online rejects forged seats, wrong turns, illegal moves and replayed revisions", t => {
  const h = harness(t), host = h.create(), green = h.join(host.room.roomCode), blue = h.join(host.room.roomCode);
  const room = h.start(host, [green, blue]), action = sanguoActions(room.gameState)[0];
  assert.equal(h.call(green.ws, "sg_game_action", { ...green.creds, revision: room.revision, action }).type, "error");
  assert.equal(h.call(green.ws, "sg_game_action", { ...host.creds, token: token(), revision: room.revision, action }).type, "error");
  assert.equal(h.call(host.ws, "sg_game_action", { ...host.creds, revision: room.revision, action: { type: "move", pieceId: "red-king-4", to: { sector: "red", rank: 9, file: 4 } } }).type, "error");
  const result = h.call(host.ws, "sg_game_action", { ...host.creds, revision: room.revision, action });
  assert.equal(result.payload.room.gameState.turn, "green");
  assert.equal(h.call(host.ws, "sg_game_action", { ...host.creds, revision: room.revision, action }).type, "error");
  assert.equal(h.rooms.get(room.roomCode).gameState.moveNumber, 2);
});

test("rooms rejoin after serialization without granting a new player the old seat", t => {
  const h = harness(t), host = h.create(2), friend = h.join(host.room.roomCode);
  const room = h.start(host, [friend]);
  const stored = JSON.parse(JSON.stringify(h.rooms.get(room.roomCode)));
  const restored = harness(t); restored.rooms.set(room.roomCode, stored); assert.equal(restored.service.restoreRoom(stored), true);
  assert.equal(restored.call(restored.socket(), "sg_game_state", { ...host.creds, token: token() }).type, "error");
  const rejoined = restored.call(restored.socket(), "sg_game_state", host.creds);
  assert.equal(rejoined.payload.room.players.length, 2); assert.equal(rejoined.payload.room.gameState.turn, "red");
});

test("solo rooms advance both bot kingdoms; two-human rooms keep one bot", async t => {
  const h = harness(t), host = h.create(1), room = h.start(host);
  h.call(host.ws, "sg_game_action", { ...host.creds, revision: room.revision, action: sanguoActions(room.gameState)[0] });
  await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error("Bots did not return the turn")), 4000); const poll = () => { const state = h.rooms.get(room.roomCode).gameState; if (state.moveNumber >= 4) { clearTimeout(timeout); resolve(); } else setTimeout(poll, 20); }; poll(); });
  assert.equal(h.rooms.get(room.roomCode).gameState.turn, "red");
  const pair = h.create(2); const friend = h.join(pair.room.roomCode);
  assert.equal(Object.values(h.start(pair, [friend]).seats).filter(s => s.kind === "bot").length, 1);
});

test("leaving transfers the waiting-room host; missing seats can be explicitly filled", t => {
  const h = harness(t), host = h.create(), friend = h.join(host.room.roomCode);
  h.call(host.ws, "sg_room_leave", host.creds);
  assert.equal(h.rooms.get(host.room.roomCode).hostId, friend.creds.playerId);
  const room = h.start(friend, [], true);
  assert.equal(Object.values(room.seats).filter(s => s.kind === "bot").length, 2);
});

test("resignation ends a final duel and all participants see the same result", t => {
  const h = harness(t), host = h.create(), green = h.join(host.room.roomCode), blue = h.join(host.room.roomCode);
  let room = h.start(host, [green, blue]);
  room = h.call(green.ws, "sg_game_action", { ...green.creds, revision: room.revision, action: { type: "resign" } }).payload.room;
  room = h.call(blue.ws, "sg_game_action", { ...blue.creds, revision: room.revision, action: { type: "resign" } }).payload.room;
  assert.equal(room.status, "finished"); assert.equal(room.gameState.winner, "red");
  for (const player of [host, green, blue]) assert.equal(h.call(player.ws, "sg_game_state", player.creds).payload.room.gameState.winner, "red");
});

test("disconnect grace preserves identity and stops a stale bot after rejoin", async t => {
  let clock = Date.now(), complete;
  const h = harness(t, { now: () => clock, chooseBot: state => new Promise(resolve => { complete = () => resolve(chooseSanguoBotAction(state, "easy")); }) });
  const host = h.create(), green = h.join(host.room.roomCode), blue = h.join(host.room.roomCode);
  let room = h.start(host, [green, blue]);
  green.ws.readyState = 3; green.ws.emit("close"); clock += 121000;
  room = h.call(host.ws, "sg_game_action", { ...host.creds, revision: room.revision, action: sanguoActions(room.gameState)[0] }).payload.room;
  await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(typeof complete, "function");
  h.call(h.socket(), "sg_game_state", green.creds); complete();
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(h.rooms.get(room.roomCode).gameState.turn, "green"); assert.equal(h.rooms.get(room.roomCode).gameState.moveNumber, 2);
});

test("bootstrap fails closed when integration anchors drift", () => {
  assert.throws(() => injectSanguo("invalid backend"), /anchor missing/);
});
