const assert = require("node:assert/strict");
const test = require("node:test");
const { createKhasiFishflowService } = require("../khasiFishflowService.js");
const { KHASI_FISHFLOW_RULESET, applyAction, assertCounterInvariant, createKhasiFishflowState, getLegalActions } = require("../khasiFishflowRules.js");

function makeHarness() {
  const rooms = new Map();
  const profiles = new Map([["0xblue", { wallet: "0xblue", name: "Blue Current" }], ["0xcoral", { wallet: "0xcoral", name: "Coral Current" }]]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const wsBlue = { readyState: 1, send() {} };
  const wsCoral = { readyState: 1, send() {} };
  const service = createKhasiFishflowService({ rooms, profiles, sockets, send(_ws, packet) { packets.push(packet); }, ok(_ws, requestId, type, payload) { packets.push({ requestId, type, payload }); }, fail(_ws, requestId, message) { packets.push({ requestId, type: "error", payload: { message } }); }, walletOf(value) { return String(value || "").toLowerCase(); }, profileFor(wallet) { return profiles.get(String(wallet || "").toLowerCase()); }, saveRoomSafe(room) { savedRooms.push(JSON.parse(JSON.stringify(room))); }, async saveHistoryEntry(entry) { history.push(entry); }, async getHistoryForWallet(wallet, gameId) { return history.filter((entry) => entry.wallet === wallet && (!gameId || entry.gameId === gameId)); } });
  return { service, rooms, packets, savedRooms, history, wsBlue, wsCoral };
}
function lastPayload(harness, type) { return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload; }

test("opening state contains 70 counters in two rows of seven", () => {
  const state = createKhasiFishflowState();
  assert.deepEqual(state.rows.blue, [5, 5, 5, 5, 5, 5, 5]);
  assert.deepEqual(state.rows.coral, [5, 5, 5, 5, 5, 5, 5]);
  assert.equal(getLegalActions(state).length, 7);
  assert.equal(assertCounterInvariant(state), true);
});

test("modern pit-transfer handicap preserves the 70-counter invariant", () => {
  const state = createKhasiFishflowState({ handicap: "blue-pit" });
  assert.equal(state.activePits.coral, 6);
  assert.equal(state.stores.blue, 5);
  assert.equal(state.handicap.heritage, false);
  assert.equal(assertCounterInvariant(state), true);
});

test("clockwise relay action resolves and passes the turn", () => {
  const state = createKhasiFishflowState();
  const result = applyAction(state, { type: "sow", pitIndex: 6 }, "blue");
  assert.equal(result.error, null);
  assert.equal(result.state.currentPlayer, "coral");
  assert.ok(result.state.lastTurn.relays >= 1);
  assert.equal(assertCounterInvariant(result.state), true);
});

test("inactive pits cannot be selected", () => {
  const state = createKhasiFishflowState({ handicap: "coral-pit" });
  const result = applyAction(state, { type: "sow", pitIndex: 6 }, "blue");
  assert.match(result.error, /inactive/i);
});

test("service creates, joins and validates authoritative turns", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsBlue, "create", { wallet: "0xblue", visibility: "public", current: "blue" });
  const created = lastPayload(harness, "kf_room_create_result").room;
  assert.equal(created.status, "waiting");
  assert.equal(created.gameId, KHASI_FISHFLOW_RULESET.gameId);
  assert.equal(created.gameState.handicap.type, "none");
  harness.service.joinRoom(harness.wsCoral, "join", { wallet: "0xcoral", roomCode: created.roomCode });
  const joined = lastPayload(harness, "kf_room_join_result").room;
  assert.equal(joined.status, "playing");
  harness.service.action(harness.wsCoral, "wrong-turn", { wallet: "0xcoral", roomCode: created.roomCode, action: { type: "sow", pitIndex: 0 } });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);
  harness.service.action(harness.wsBlue, "blue-sow", { wallet: "0xblue", roomCode: created.roomCode, action: { type: "sow", pitIndex: 6 } });
  const updated = lastPayload(harness, "kf_game_action_result").room;
  assert.equal(updated.gameState.currentPlayer, "coral");
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Khasi Fishflow rooms restore", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsCoral, "create", { wallet: "0xcoral", visibility: "private", current: "coral" });
  const serialized = JSON.parse(JSON.stringify([...harness.rooms.values()][0]));
  const restoredHarness = makeHarness();
  restoredHarness.rooms.set(serialized.roomCode, serialized);
  assert.equal(restoredHarness.service.restoreRoom(serialized), true);
  restoredHarness.service.getState(restoredHarness.wsCoral, "resume", { wallet: "0xcoral", roomCode: serialized.roomCode });
  const resumed = lastPayload(restoredHarness, "kf_game_state_result").room;
  assert.equal(resumed.rulesetVersion, KHASI_FISHFLOW_RULESET.rulesetVersion);
});
