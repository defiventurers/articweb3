const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createFishflowService } = require("../fishflowService.js");
const {
  FISHFLOW_RULESET,
  applyAction,
  assertCounterInvariant,
  createFishflowState,
  getLegalActions
} = require("../fishflowRules.js");
const {
  injectFishflow,
  injectFourWingIceHunt,
  injectNineIceForts
} = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function makeHarness() {
  const rooms = new Map();
  const profiles = new Map([
    ["0xblue", { wallet: "0xblue", name: "Blue Current" }],
    ["0xcoral", { wallet: "0xcoral", name: "Coral Current" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const wsBlue = { readyState: 1, send() {} };
  const wsCoral = { readyState: 1, send() {} };
  const service = createFishflowService({
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
    async getHistoryForWallet(wallet, gameId) {
      return history.filter((entry) => entry.wallet === wallet && (!gameId || entry.gameId === gameId));
    }
  });
  return { service, rooms, packets, savedRooms, history, wsBlue, wsCoral };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

test("opening state contains two rows of seven pits and conserves all 84 counters", () => {
  const state = createFishflowState();
  assert.deepEqual(state.rows.blue, [6, 6, 6, 6, 6, 6, 6]);
  assert.deepEqual(state.rows.coral, [6, 6, 6, 6, 6, 6, 6]);
  assert.equal(getLegalActions(state).length, 7);
  assert.equal(assertCounterInvariant(state), true);
});

test("a complete sow action resolves relay sowing and empty-next-pit capture", () => {
  const state = createFishflowState();
  const result = applyAction(state, { type: "sow", pitIndex: 0 }, "blue");
  assert.equal(result.error, null);
  assert.equal(result.state.currentPlayer, "coral");
  assert.equal(result.state.lastTurn.relays, 2);
  assert.equal(result.state.lastTurn.captured, 7);
  assert.equal(result.state.stores.blue, 7);
  assert.equal(assertCounterInvariant(result.state), true);
});

test("a pit reaching exactly four is banked immediately", () => {
  const state = createFishflowState();
  state.rows.blue = [1, 3, 0, 0, 0, 0, 0];
  state.rows.coral = [6, 0, 0, 0, 0, 0, 0];
  state.stores = { blue: 40, coral: 34 };
  const result = applyAction(state, { type: "sow", pitIndex: 0 }, "blue");
  assert.equal(result.error, null);
  assert.equal(result.state.lastTurn.exactFourPickups, 1);
  assert.equal(result.state.lastTurn.captured, 4);
  assert.equal(assertCounterInvariant(result.state), true);
});

test("inactive pits cannot be selected", () => {
  const state = createFishflowState();
  state.activePits.blue = 3;
  const result = applyAction(state, { type: "sow", pitIndex: 4 }, "blue");
  assert.match(result.error, /frozen/i);
  assert.equal(result.state.rows.blue[4], 6);
});

test("service assigns opposite currents and validates authoritative turns", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsBlue, "create", {
    wallet: "0xblue",
    visibility: "public",
    current: "blue"
  });
  const created = lastPayload(harness, "fish_room_create_result").room;
  assert.equal(created.status, "waiting");
  assert.equal(created.gameId, FISHFLOW_RULESET.gameId);
  assert.equal(created.players[0].current, "blue");

  harness.service.joinRoom(harness.wsCoral, "join", {
    wallet: "0xcoral",
    roomCode: created.roomCode
  });
  const joined = lastPayload(harness, "fish_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xcoral").current, "coral");

  harness.service.action(harness.wsCoral, "wrong-turn", {
    wallet: "0xcoral",
    roomCode: created.roomCode,
    action: { type: "sow", pitIndex: 0 }
  });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);

  harness.service.action(harness.wsBlue, "blue-sow", {
    wallet: "0xblue",
    roomCode: created.roomCode,
    action: { type: "sow", pitIndex: 0 }
  });
  const updated = lastPayload(harness, "fish_game_action_result").room;
  assert.equal(updated.gameState.currentPlayer, "coral");
  assert.equal(updated.gameState.stores.blue, 7);
  assert.equal(updated.gameState.lastTurn.relays, 2);
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Fishflow rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsCoral, "create", {
    wallet: "0xcoral",
    visibility: "private",
    current: "coral"
  });
  const original = [...harness.rooms.values()][0];
  const serialized = JSON.parse(JSON.stringify(original));

  const restoredHarness = makeHarness();
  restoredHarness.rooms.set(serialized.roomCode, serialized);
  assert.equal(restoredHarness.service.restoreRoom(serialized), true);
  restoredHarness.service.getState(restoredHarness.wsCoral, "resume", {
    wallet: "0xcoral",
    roomCode: serialized.roomCode
  });
  const resumed = lastPayload(restoredHarness, "fish_game_state_result").room;
  assert.equal(resumed.roomCode, serialized.roomCode);
  assert.equal(resumed.rulesetVersion, FISHFLOW_RULESET.rulesetVersion);
  assert.equal(resumed.players[0].current, "coral");
});

test("backend transformer installs Fishflow handlers, restore support and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectFishflow(
    injectFourWingIceHunt(
      injectNineIceForts(transformBackendSource(source))
    )
  );
  assert.match(transformed, /createFishflowService/);
  assert.match(transformed, /type === "fish_room_create"/);
  assert.match(transformed, /type === "fish_game_action"/);
  assert.match(transformed, /fishflow\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsFishflow: true/);
});
