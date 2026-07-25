const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  ICE_RINGS_RULESET,
  NODES,
  EDGES,
  JUMP_PATHS,
  AURORA_START,
  EMBER_START,
  applyAction,
  createIceRingsState,
  createRingBreakDrillState,
  getLegalActions
} = require("../iceRingsRules.js");
const { createIceRingsService } = require("../iceRingsService.js");
const { injectIceRings } = require("../iceRingsBackendBootstrap.js");
const { injectSkyTempleRun } = require("../skyTempleRunBackendBootstrap.js");
const { injectFortyGlacierGuards } = require("../fortyGlacierGuardsBackendBootstrap.js");
const { injectCrownRun } = require("../crownRunBackendBootstrap.js");
const { injectGlacierTrail } = require("../glacierTrailBackendBootstrap.js");
const { injectSixteenIceWarriors } = require("../sixteenIceWarriorsBackendBootstrap.js");
const { injectBreakTheIce, injectFishflow, injectFourWingIceHunt, injectIceHunters, injectNineIceForts } = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function makeHarness() {
  const rooms = new Map();
  const profiles = new Map([
    ["0xaurora", { wallet: "0xaurora", name: "Aurora Guard" }],
    ["0xember", { wallet: "0xember", name: "Ember Guard" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const wsAurora = { readyState: 1, send() {} };
  const wsEmber = { readyState: 1, send() {} };
  const service = createIceRingsService({
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

test("Pretwa graph has nineteen points, three rings and six spokes", () => {
  assert.equal(NODES.length, 19);
  assert.equal(EDGES.length, 36);
  assert.equal(JUMP_PATHS.length, 66);
  assert.equal(AURORA_START.length, 9);
  assert.equal(EMBER_START.length, 9);
  const state = createIceRingsState();
  assert.equal(state.board.c, null);
  assert.equal(Object.values(state.board).filter((value) => value === "aurora").length, 9);
  assert.equal(Object.values(state.board).filter((value) => value === "ember").length, 9);
  assert.deepEqual(getLegalActions(state, "aurora").map((action) => action.to).sort(), ["c", "c", "c"]);
});

test("capture is compulsory whenever any jump exists", () => {
  const state = createIceRingsState();
  Object.keys(state.board).forEach((id) => { state.board[id] = null; });
  state.board.r3s0 = "aurora";
  state.board.r2s0 = "ember";
  state.board.r1s2 = "aurora";
  state.board.r1s3 = null;
  state.captured = { aurora: 8, ember: 7 };
  state.positionCounts = {};
  const legal = getLegalActions(state, "aurora");
  assert.equal(legal.length, 1);
  assert.deepEqual(legal[0], { type: "capture", from: "r3s0", over: "r2s0", to: "r1s0", line: "spoke-0" });
});

test("Ring Break drill forces the same guard through a two-jump chain", () => {
  const state = createRingBreakDrillState();
  const first = getLegalActions(state, "aurora")[0];
  assert.equal(first.from, "r3s0");
  assert.equal(first.over, "r2s0");
  assert.equal(first.to, "r1s0");
  const afterFirst = applyAction(state, first, "aurora");
  assert.equal(afterFirst.error, null);
  assert.equal(afterFirst.state.chainFrom, "r1s0");
  assert.equal(afterFirst.state.currentPlayer, "aurora");
  const continuation = getLegalActions(afterFirst.state, "aurora");
  assert.equal(continuation.length, 1);
  assert.deepEqual(continuation[0], { type: "capture", from: "r1s0", over: "c", to: "r1s3", line: "diameter-0" });
  const finished = applyAction(afterFirst.state, continuation[0], "aurora");
  assert.equal(finished.error, null);
  assert.equal(finished.state.winner, "aurora");
  assert.equal(finished.state.winReason, "all-rivals-captured");
});

test("service assigns opposite formations and rejects a wrong-turn action", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsEmber, "create", { wallet: "0xember", visibility: "public", side: "ember" });
  const created = lastPayload(harness, "ir_room_create_result").room;
  assert.equal(created.gameId, ICE_RINGS_RULESET.gameId);
  assert.equal(created.players[0].side, "ember");
  harness.service.joinRoom(harness.wsAurora, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = lastPayload(harness, "ir_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").side, "aurora");

  const firstAction = getLegalActions(joined.gameState, "aurora")[0];
  harness.service.action(harness.wsEmber, "wrong", { wallet: "0xember", roomCode: created.roomCode, action: firstAction });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);
  harness.service.action(harness.wsAurora, "move", { wallet: "0xaurora", roomCode: created.roomCode, action: firstAction });
  const updated = lastPayload(harness, "ir_game_action_result").room;
  assert.equal(updated.gameState.board.c, "aurora");
  assert.equal(updated.gameState.currentPlayer, "ember");
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Ice Rings rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsAurora, "create", { wallet: "0xaurora", visibility: "private", side: "aurora" });
  const serialized = JSON.parse(JSON.stringify([...harness.rooms.values()][0]));
  const restored = makeHarness();
  restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.wsAurora, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  const room = lastPayload(restored, "ir_game_state_result").room;
  assert.equal(room.rulesetVersion, ICE_RINGS_RULESET.rulesetVersion);
  assert.equal(room.players[0].side, "aurora");
});

test("backend transformer installs Ice Rings dispatch restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectIceRings(
    injectSkyTempleRun(
      injectFortyGlacierGuards(
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
      )
    )
  );
  assert.match(transformed, /createIceRingsService/);
  assert.match(transformed, /type === "ir_room_create"/);
  assert.match(transformed, /type === "ir_game_action"/);
  assert.match(transformed, /iceRings\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsIceRings: true/);
});
