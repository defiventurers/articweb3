const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  FORTY_GLACIER_GUARDS_RULESET,
  NODES,
  EDGES,
  JUMP_PATHS,
  CENTER_NODE,
  applyAction,
  createBreakthroughDrillState,
  createFortyGlacierGuardsState,
  getLegalActions,
  occupiedNodes
} = require("../fortyGlacierGuardsRules.js");
const { createFortyGlacierGuardsService } = require("../fortyGlacierGuardsService.js");
const { injectFortyGlacierGuards } = require("../fortyGlacierGuardsBackendBootstrap.js");
const { injectCrownRun } = require("../crownRunBackendBootstrap.js");
const { injectGlacierTrail } = require("../glacierTrailBackendBootstrap.js");
const { injectSixteenIceWarriors } = require("../sixteenIceWarriorsBackendBootstrap.js");
const {
  injectBreakTheIce,
  injectFishflow,
  injectFourWingIceHunt,
  injectIceHunters,
  injectNineIceForts
} = require("../loadMultiGameBackend.js");
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
  const service = createFortyGlacierGuardsService({
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
  return { service, rooms, packets, savedRooms, history, wsAurora, wsEmber };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

test("orthogonal Datta board begins with eighty guards and one empty centre", () => {
  const state = createFortyGlacierGuardsState();
  assert.equal(NODES.length, 81);
  assert.equal(EDGES.length, 144);
  assert.equal(JUMP_PATHS.length, 252);
  assert.equal(CENTER_NODE, "g44");
  assert.equal(state.board[CENTER_NODE], null);
  assert.equal(occupiedNodes(state, "aurora").length, 40);
  assert.equal(occupiedNodes(state, "ember").length, 40);
  assert.equal(getLegalActions(state, "aurora").every((action) => action.type === "move"), true);
});

test("movement and capture remain orthogonal", () => {
  const state = createFortyGlacierGuardsState();
  const opening = getLegalActions(state, "aurora").find((action) => action.from === "g45" && action.to === "g44");
  const opened = applyAction(state, opening, "aurora");
  assert.equal(opened.error, null);
  const reply = getLegalActions(opened.state, "ember");
  assert.ok(reply.some((action) => action.type === "capture" && action.from === "g43" && action.over === "g44" && action.to === "g45"));
  assert.equal(reply.some((action) => action.to === "g55"), false);
});

test("a guard may continue a capture chain or end it", () => {
  const drill = createBreakthroughDrillState();
  const first = getLegalActions(drill, "aurora").find((action) => action.type === "capture" && action.to === "g44");
  const afterFirst = applyAction(drill, first, "aurora");
  assert.equal(afterFirst.error, null);
  assert.equal(afterFirst.state.chainFrom, "g44");
  assert.ok(getLegalActions(afterFirst.state, "aurora").some((action) => action.type === "end-chain"));
  assert.ok(getLegalActions(afterFirst.state, "aurora").some((action) => action.type === "capture" && action.to === "g46"));

  const stopped = applyAction(afterFirst.state, { type: "end-chain", from: "g44" }, "aurora");
  assert.equal(stopped.error, null);
  assert.equal(stopped.state.currentPlayer, "ember");

  const second = getLegalActions(afterFirst.state, "aurora").find((action) => action.type === "capture" && action.to === "g46");
  const won = applyAction(afterFirst.state, second, "aurora");
  assert.equal(won.error, null);
  assert.equal(won.state.winner, "aurora");
  assert.equal(won.state.winReason, "all-guards-captured");
});

test("ordinary movement remains legal while another capture exists", () => {
  const state = createBreakthroughDrillState();
  const actions = getLegalActions(state, "aurora");
  assert.ok(actions.some((action) => action.type === "capture"));
  assert.ok(actions.some((action) => action.type === "move"));
});

test("service assigns opposite formations, rejects wrong turns and persists", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsEmber, "create", { wallet: "0xember", visibility: "public", role: "ember" });
  const created = lastPayload(harness, "fgg_room_create_result").room;
  assert.equal(created.gameId, FORTY_GLACIER_GUARDS_RULESET.gameId);
  harness.service.joinRoom(harness.wsAurora, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = lastPayload(harness, "fgg_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").role, "aurora");

  const opening = getLegalActions(joined.gameState, "aurora")[0];
  harness.service.action(harness.wsEmber, "wrong", { wallet: "0xember", roomCode: created.roomCode, action: opening });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);
  harness.service.action(harness.wsAurora, "move", { wallet: "0xaurora", roomCode: created.roomCode, action: opening });
  const updated = lastPayload(harness, "fgg_game_action_result").room;
  assert.equal(updated.gameState.currentPlayer, "ember");
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Forty Glacier Guards rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsAurora, "create", { wallet: "0xaurora", visibility: "private", role: "aurora" });
  const original = [...harness.rooms.values()][0];
  const serialized = JSON.parse(JSON.stringify(original));
  const restored = makeHarness();
  restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.wsAurora, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  const room = lastPayload(restored, "fgg_game_state_result").room;
  assert.equal(room.rulesetVersion, FORTY_GLACIER_GUARDS_RULESET.rulesetVersion);
  assert.equal(room.players[0].role, "aurora");
});

test("backend transformer installs Forty Glacier Guards dispatch, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectFortyGlacierGuards(
    injectCrownRun(
      injectGlacierTrail(
        injectSixteenIceWarriors(
          injectIceHunters(
            injectBreakTheIce(
              injectFishflow(
                injectFourWingIceHunt(
                  injectNineIceForts(transformBackendSource(source))
                )
              )
            )
          )
        )
      )
    )
  );
  assert.match(transformed, /createFortyGlacierGuardsService/);
  assert.match(transformed, /type === "fgg_room_create"/);
  assert.match(transformed, /type === "fgg_game_action"/);
  assert.match(transformed, /fortyGlacierGuards\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsFortyGlacierGuards: true/);
});
