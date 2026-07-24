const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createFourWingIceHuntService } = require("../fourWingIceHuntService.js");
const {
  FOUR_WING_ICE_HUNT_RULESET,
  applyAction,
  createFourWingIceHuntState,
  getLegalActions
} = require("../fourWingIceHuntRules.js");
const { injectFourWingIceHunt, injectNineIceForts } = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function makeHarness() {
  const rooms = new Map();
  const profiles = new Map([
    ["0xleopard", { wallet: "0xleopard", name: "Leopard Player" }],
    ["0xcattle", { wallet: "0xcattle", name: "Colony Player" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const wsLeopard = { readyState: 1, send() {} };
  const wsCattle = { readyState: 1, send() {} };
  const service = createFourWingIceHuntService({
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
  return { service, rooms, packets, savedRooms, history, wsLeopard, wsCattle };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

test("Parker opening places a leopard, one safe cattle piece, then the second leopard", () => {
  let state = createFourWingIceHuntState();
  let result = applyAction(state, { type: "place", nodeId: "c22" }, "leopards");
  assert.equal(result.error, null);
  state = result.state;
  assert.equal(state.currentPlayer, "cattle");
  assert.equal(state.leopardsPlaced, 1);

  result = applyAction(state, { type: "place", nodeId: "c11" }, "cattle");
  assert.match(result.error, /safe from immediate capture/i);
  assert.equal(result.state.board.c11, null);

  result = applyAction(state, { type: "place", nodeId: "c00" }, "cattle");
  assert.equal(result.error, null);
  state = result.state;
  assert.equal(state.currentPlayer, "leopards");
  assert.equal(state.cattlePlaced, 1);

  result = applyAction(state, { type: "place", nodeId: "c44" }, "leopards");
  assert.equal(result.error, null);
  assert.equal(result.state.leopardsPlaced, 2);
  assert.equal(result.state.currentPlayer, "cattle");
});

test("cattle cannot move before all twenty-four pieces are deployed", () => {
  const state = createFourWingIceHuntState();
  state.board.c22 = "leopards";
  state.board.c00 = "cattle";
  state.board.c44 = "leopards";
  state.leopardsPlaced = 2;
  state.cattlePlaced = 1;
  state.currentPlayer = "cattle";
  const result = applyAction(state, { type: "move", from: "c00", to: "c01" }, "cattle");
  assert.match(result.error, /place its next piece|cannot move/i);
  assert.equal(result.state.board.c00, "cattle");
});

test("server assigns opposite roles and validates every action", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsLeopard, "create", { wallet: "0xleopard", visibility: "public", role: "leopards" });
  const created = lastPayload(harness, "fwh_room_create_result").room;
  assert.equal(created.status, "waiting");
  assert.equal(created.gameId, FOUR_WING_ICE_HUNT_RULESET.gameId);
  assert.equal(created.players[0].role, "leopards");

  harness.service.joinRoom(harness.wsCattle, "join", { wallet: "0xcattle", roomCode: created.roomCode });
  const joined = lastPayload(harness, "fwh_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xcattle").role, "cattle");

  harness.service.action(harness.wsCattle, "wrong-turn", {
    wallet: "0xcattle",
    roomCode: created.roomCode,
    action: { type: "place", nodeId: "c00" }
  });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);

  harness.service.action(harness.wsLeopard, "first-leopard", {
    wallet: "0xleopard",
    roomCode: created.roomCode,
    action: { type: "place", nodeId: "c22" }
  });
  let updated = lastPayload(harness, "fwh_game_action_result").room;
  assert.equal(updated.gameState.board.c22, "leopards");
  assert.equal(updated.gameState.currentPlayer, "cattle");

  harness.service.action(harness.wsCattle, "unsafe-cattle", {
    wallet: "0xcattle",
    roomCode: created.roomCode,
    action: { type: "place", nodeId: "c11" }
  });
  assert.match(lastPayload(harness, "error").message, /safe from immediate capture/i);
  assert.equal(harness.rooms.get(created.roomCode).gameState.board.c11, null);

  harness.service.action(harness.wsCattle, "safe-cattle", {
    wallet: "0xcattle",
    roomCode: created.roomCode,
    action: { type: "place", nodeId: "c00" }
  });
  updated = lastPayload(harness, "fwh_game_action_result").room;
  assert.equal(updated.gameState.board.c00, "cattle");
  assert.equal(updated.gameState.currentPlayer, "leopards");
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Four-Wing rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsCattle, "create", { wallet: "0xcattle", visibility: "private", role: "cattle" });
  const original = [...harness.rooms.values()][0];
  const serialized = JSON.parse(JSON.stringify(original));

  const restoredHarness = makeHarness();
  restoredHarness.rooms.set(serialized.roomCode, serialized);
  assert.equal(restoredHarness.service.restoreRoom(serialized), true);
  restoredHarness.service.getState(restoredHarness.wsCattle, "resume", { wallet: "0xcattle", roomCode: serialized.roomCode });
  const resumed = lastPayload(restoredHarness, "fwh_game_state_result").room;
  assert.equal(resumed.roomCode, serialized.roomCode);
  assert.equal(resumed.rulesetVersion, FOUR_WING_ICE_HUNT_RULESET.rulesetVersion);
  assert.equal(resumed.players[0].role, "cattle");
});

test("legal action generation includes graph movement and directional captures", () => {
  const state = createFourWingIceHuntState();
  state.leopardsPlaced = 2;
  state.cattlePlaced = 24;
  state.currentPlayer = "leopards";
  state.board.c22 = "leopards";
  state.board.c44 = "leopards";
  state.board.c11 = "cattle";
  const actions = getLegalActions(state, "leopards");
  assert.ok(actions.some((action) => action.type === "capture" && action.from === "c22" && action.over === "c11" && action.to === "c00"));
});

test("backend transformer installs Four-Wing handlers and restore support", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectFourWingIceHunt(injectNineIceForts(transformBackendSource(source)));
  assert.match(transformed, /createFourWingIceHuntService/);
  assert.match(transformed, /type === "fwh_room_create"/);
  assert.match(transformed, /type === "fwh_game_action"/);
  assert.match(transformed, /fourWingIceHunt\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsFourWingIceHunt: true/);
});
