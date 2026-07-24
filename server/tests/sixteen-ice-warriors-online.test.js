const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createSixteenIceWarriorsService } = require("../sixteenIceWarriorsService.js");
const {
  SIXTEEN_ICE_WARRIORS_RULESET,
  NODES,
  AURORA_START,
  EMBER_START,
  applyAction,
  createCaptureDrillState,
  createSixteenIceWarriorsState,
  getLegalActions,
  occupiedNodes
} = require("../sixteenIceWarriorsRules.js");
const {
  injectBreakTheIce,
  injectFishflow,
  injectFourWingIceHunt,
  injectIceHunters,
  injectNineIceForts
} = require("../loadMultiGameBackend.js");
const { injectSixteenIceWarriors } = require("../sixteenIceWarriorsBackendBootstrap.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function makeHarness() {
  const rooms = new Map();
  const profiles = new Map([
    ["0xaurora", { wallet: "0xaurora", name: "Aurora Captain" }],
    ["0xember", { wallet: "0xember", name: "Ember Captain" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const wsAurora = { readyState: 1, send() {} };
  const wsEmber = { readyState: 1, send() {} };
  const service = createSixteenIceWarriorsService({
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
  return { service, rooms, packets, savedRooms, history, wsAurora, wsEmber };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

test("Parker board starts thirty-two soldiers in opposite formations with the transverse centre line clear", () => {
  const state = createSixteenIceWarriorsState();
  assert.equal(NODES.length, 37);
  assert.equal(AURORA_START.length, 16);
  assert.equal(EMBER_START.length, 16);
  assert.equal(occupiedNodes(state, "aurora").length, 16);
  assert.equal(occupiedNodes(state, "ember").length, 16);
  ["c02", "c12", "c22", "c32", "c42"].forEach((nodeId) => assert.equal(state.board[nodeId], null));
  assert.equal(state.currentPlayer, "aurora");
});

test("a soldier may make an ordinary step because captures are optional", () => {
  const state = createCaptureDrillState();
  const actions = getLegalActions(state, "aurora");
  assert.equal(actions.some((action) => action.type === "capture" && action.from === "c04" && action.to === "c22"), true);
  assert.equal(actions.some((action) => action.type === "move" && action.from === "c04" && action.to === "c14"), true);

  const result = applyAction(state, { type: "move", from: "c04", to: "c14" }, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.board.c14, "aurora");
  assert.equal(result.state.currentPlayer, "ember");
});

test("a capturing soldier may continue with the same piece or deliberately end the chain", () => {
  const state = createCaptureDrillState();
  const first = applyAction(state, { type: "capture", from: "c04", over: "c13", to: "c22" }, "aurora");
  assert.equal(first.error, null);
  assert.equal(first.state.board.c13, null);
  assert.equal(first.state.board.c22, "aurora");
  assert.equal(first.state.currentPlayer, "aurora");
  assert.equal(first.state.chainFrom, "c22");

  const chainActions = getLegalActions(first.state, "aurora");
  assert.equal(chainActions.some((action) => action.type === "capture" && action.from === "c22" && action.over === "c31" && action.to === "c40"), true);
  assert.equal(chainActions.some((action) => action.type === "end-chain" && action.from === "c22"), true);

  const ended = applyAction(first.state, { type: "end-chain", from: "c22" }, "aurora");
  assert.equal(ended.error, null);
  assert.equal(ended.state.currentPlayer, "ember");
  assert.equal(ended.state.chainFrom, null);
  assert.equal(occupiedNodes(ended.state, "ember").length, 1);
});

test("the second jump in the drill eliminates the enemy army and wins", () => {
  const state = createCaptureDrillState();
  const first = applyAction(state, { type: "capture", from: "c04", over: "c13", to: "c22" }, "aurora");
  const second = applyAction(first.state, { type: "capture", from: "c22", over: "c31", to: "c40" }, "aurora");
  assert.equal(second.error, null);
  assert.equal(second.state.winner, "aurora");
  assert.equal(second.state.winReason, "all-soldiers-captured");
  assert.equal(second.state.captured.aurora, 16);
  assert.equal(occupiedNodes(second.state, "ember").length, 0);
});

test("service assigns opposite legions and rejects out-of-turn actions", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsEmber, "create", { wallet: "0xember", visibility: "public", role: "ember" });
  const created = lastPayload(harness, "siw_room_create_result").room;
  assert.equal(created.gameId, SIXTEEN_ICE_WARRIORS_RULESET.gameId);
  assert.equal(created.status, "waiting");
  assert.equal(created.players[0].role, "ember");

  harness.service.joinRoom(harness.wsAurora, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = lastPayload(harness, "siw_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").role, "aurora");

  harness.service.action(harness.wsEmber, "wrong", { wallet: "0xember", roomCode: created.roomCode, action: { type: "move", from: "c03", to: "c02" } });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);

  harness.service.action(harness.wsAurora, "move", { wallet: "0xaurora", roomCode: created.roomCode, action: { type: "move", from: "c01", to: "c02" } });
  const updated = lastPayload(harness, "siw_game_action_result").room;
  assert.equal(updated.gameState.board.c02, "aurora");
  assert.equal(updated.gameState.currentPlayer, "ember");
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Sixteen Ice Warriors rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsAurora, "create", { wallet: "0xaurora", visibility: "private", role: "aurora" });
  const original = [...harness.rooms.values()][0];
  const serialized = JSON.parse(JSON.stringify(original));
  const restoredHarness = makeHarness();
  restoredHarness.rooms.set(serialized.roomCode, serialized);
  assert.equal(restoredHarness.service.restoreRoom(serialized), true);
  restoredHarness.service.getState(restoredHarness.wsAurora, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  const resumed = lastPayload(restoredHarness, "siw_game_state_result").room;
  assert.equal(resumed.roomCode, serialized.roomCode);
  assert.equal(resumed.rulesetVersion, SIXTEEN_ICE_WARRIORS_RULESET.rulesetVersion);
  assert.equal(resumed.players[0].role, "aurora");
});

test("backend transformer installs Sixteen Ice Warriors handlers, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectSixteenIceWarriors(
    injectIceHunters(
      injectBreakTheIce(
        injectFishflow(
          injectFourWingIceHunt(
            injectNineIceForts(transformBackendSource(source))
          )
        )
      )
    )
  );
  assert.match(transformed, /createSixteenIceWarriorsService/);
  assert.match(transformed, /type === "siw_room_create"/);
  assert.match(transformed, /type === "siw_game_action"/);
  assert.match(transformed, /sixteenIceWarriors\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsSixteenIceWarriors: true/);
});
