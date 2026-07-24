const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createNineIceFortsService } = require("../nineIceFortsService.js");
const { createNineIceFortsState, applyAction } = require("../nineIceFortsRules.js");
const { injectNineIceForts } = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function makeHarness() {
  const rooms = new Map();
  const profiles = new Map([
    ["0xblue", { wallet: "0xblue", name: "Blue Player" }],
    ["0xcoral", { wallet: "0xcoral", name: "Coral Player" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const wsBlue = { readyState: 1, send() {} };
  const wsCoral = { readyState: 1, send() {} };
  const service = createNineIceFortsService({
    rooms,
    profiles,
    sockets,
    send(_ws, packet) { packets.push(packet); },
    ok(_ws, requestId, type, payload) { packets.push({ requestId, type, payload }); },
    fail(_ws, requestId, message) { packets.push({ requestId, type: "error", payload: { message } }); },
    walletOf(value) { return String(value || "").toLowerCase(); },
    profileFor(wallet) { return profiles.get(String(wallet || "").toLowerCase()); },
    saveRoomSafe(room) { savedRooms.push(JSON.parse(JSON.stringify(room))); },
    async saveHistoryEntry(entry) { history.push(entry); },
    async getHistoryForWallet(wallet, gameId) { return history.filter((entry) => entry.wallet === wallet && (!gameId || entry.gameId === gameId)); }
  });
  return { service, rooms, packets, savedRooms, history, wsBlue, wsCoral };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

test("rules reject an action from the wrong player", () => {
  const state = createNineIceFortsState();
  const result = applyAction(state, { type: "place", nodeId: "a7" }, "coral");
  assert.equal(result.error, "It is not this player’s turn.");
  assert.equal(result.state.board.a7, null);
});

test("service creates, joins and validates a server-authoritative room", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsBlue, "create", { wallet: "0xblue", visibility: "public" });
  const created = lastPayload(harness, "nif_room_create_result").room;
  assert.equal(created.status, "waiting");
  assert.equal(created.players[0].seat, "blue");
  assert.equal(created.gameId, "nine-ice-forts");

  harness.service.joinRoom(harness.wsCoral, "join", { wallet: "0xcoral", roomCode: created.roomCode });
  const joined = lastPayload(harness, "nif_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xcoral").seat, "coral");

  harness.service.action(harness.wsCoral, "wrong-turn", {
    wallet: "0xcoral",
    roomCode: created.roomCode,
    action: { type: "place", nodeId: "a7" }
  });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);
  assert.equal(harness.rooms.get(created.roomCode).gameState.board.a7, null);

  harness.service.action(harness.wsBlue, "blue-place", {
    wallet: "0xblue",
    roomCode: created.roomCode,
    action: { type: "place", nodeId: "a7" }
  });
  const updated = lastPayload(harness, "nif_game_action_result").room;
  assert.equal(updated.gameState.board.a7, "blue");
  assert.equal(updated.gameState.currentPlayer, "coral");
  assert.ok(harness.savedRooms.length >= 2);
});

test("restored rooms remain reconnectable", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsBlue, "create", { wallet: "0xblue", visibility: "private" });
  const room = [...harness.rooms.values()][0];
  const serialized = JSON.parse(JSON.stringify(room));
  const nextHarness = makeHarness();
  nextHarness.rooms.set(serialized.roomCode, serialized);
  assert.equal(nextHarness.service.restoreRoom(serialized), true);
  nextHarness.service.getState(nextHarness.wsBlue, "resume", { wallet: "0xblue", roomCode: serialized.roomCode });
  const resumed = lastPayload(nextHarness, "nif_game_state_result").room;
  assert.equal(resumed.roomCode, serialized.roomCode);
  assert.equal(resumed.rulesetVersion, "navakankari-standard-1.0.0");
});

test("backend source transformer installs all Nine Ice Forts handlers", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectNineIceForts(transformBackendSource(source));
  assert.match(transformed, /createNineIceFortsService/);
  assert.match(transformed, /type === "nif_room_create"/);
  assert.match(transformed, /type === "nif_game_action"/);
  assert.match(transformed, /nineIceForts\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsNineIceForts: true/);
});
