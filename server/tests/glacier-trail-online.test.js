const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createGlacierTrailService } = require("../glacierTrailService.js");
const {
  GLACIER_TRAIL_RULESET,
  SAFE_SPACES,
  ROUTES,
  FINISH_PROGRESS,
  applyAction,
  applyRollSequence,
  createExactLandingDrill,
  createGlacierTrailState,
  getLegalActions,
  getPieceSpaceId
} = require("../glacierTrailRules.js");
const { injectGlacierTrail } = require("../glacierTrailBackendBootstrap.js");
const { injectSixteenIceWarriors } = require("../sixteenIceWarriorsBackendBootstrap.js");
const { injectBreakTheIce, injectFishflow, injectFourWingIceHunt, injectIceHunters, injectNineIceForts } = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function makeHarness() {
  const rooms = new Map();
  const profiles = new Map([
    ["0xaurora", { wallet: "0xaurora", name: "Aurora Guide" }],
    ["0xember", { wallet: "0xember", name: "Ember Guide" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const wsAurora = { readyState: 1, send() {} };
  const wsEmber = { readyState: 1, send() {} };
  const service = createGlacierTrailService({
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
    async getHistoryForWallet(wallet, gameId) { return history.filter((entry) => entry.wallet === wallet && (!gameId || entry.gameId === gameId)); },
    rollSequence() {
      return [
        { faces: [1, 1, 1, 1, 1, 0], value: 5, bonus: true },
        { faces: [1, 1, 0, 0, 0, 0], value: 2, bonus: false }
      ];
    }
  });
  return { service, rooms, packets, savedRooms, history, wsAurora, wsEmber };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

test("Parker ruleset uses two opposing sides, three counters each and five safe houses", () => {
  const state = createGlacierTrailState();
  assert.equal(GLACIER_TRAIL_RULESET.sides, 2);
  assert.equal(state.pieces.aurora.length, 3);
  assert.equal(state.pieces.ember.length, 3);
  assert.equal(SAFE_SPACES.size, 5);
  assert.deepEqual(ROUTES.aurora.slice(0, 5), ["B0", "B1", "B2", "B3", "B4"]);
  assert.deepEqual(ROUTES.ember.slice(0, 5), ["B8", "B7", "B6", "B5", "B4"]);
  assert.deepEqual(ROUTES.aurora.slice(5), ROUTES.ember.slice(5));
});

test("bonus throws are stored and whole scores can be allocated to different counters", () => {
  const state = createGlacierTrailState();
  const rolled = applyRollSequence(state, [
    { faces: [1, 1, 1, 1, 1, 0], value: 5, bonus: true },
    { faces: [1, 1, 0, 0, 0, 0], value: 2, bonus: false }
  ], "aurora");
  assert.equal(rolled.error, null);
  assert.deepEqual(rolled.state.throwPool.map((item) => item.value), [5, 2]);
  const entry = getLegalActions(rolled.state, "aurora").find((action) => action.type === "enter" && action.value === 5 && action.pieceId === "aurora-1");
  assert.ok(entry);
  const entered = applyAction(rolled.state, entry, "aurora");
  assert.equal(entered.error, null);
  assert.deepEqual(entered.state.throwPool.map((item) => item.value), [2]);
  assert.equal(entered.state.pieces.aurora[0].status, "track");
  assert.equal(entered.state.currentPlayer, "aurora");
});

test("all stored scores may be combined for one counter", () => {
  const state = createGlacierTrailState();
  state.pieces.aurora[0].status = "track";
  state.pieces.aurora[0].progress = 0;
  state.awaiting = "allocate";
  state.throwPool = [
    { id: "a", faces: [1, 1, 1, 1, 1, 0], value: 5, bonus: true },
    { id: "b", faces: [1, 1, 0, 0, 0, 0], value: 2, bonus: false }
  ];
  const combined = getLegalActions(state, "aurora").find((action) => action.combined && action.pieceId === "aurora-1" && action.value === 7);
  assert.ok(combined);
  const moved = applyAction(state, combined, "aurora");
  assert.equal(moved.error, null);
  assert.equal(moved.state.pieces.aurora[0].progress, 7);
  assert.equal(moved.state.currentPlayer, "ember");
});

test("exact landing beyond Kenda-ge finishes the third counter", () => {
  const state = createExactLandingDrill();
  assert.equal(getPieceSpaceId(state.pieces.aurora[0]), ROUTES.aurora[FINISH_PROGRESS - 2]);
  const action = getLegalActions(state, "aurora").find((candidate) => candidate.finishes);
  const result = applyAction(state, action, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.winner, "aurora");
  assert.equal(result.state.winReason, "all-three-landed");
});

test("exact landing on an unprotected rival cuts it back to start", () => {
  const state = createGlacierTrailState();
  state.pieces.aurora[0] = { ...state.pieces.aurora[0], status: "track", progress: 5 };
  state.pieces.ember[0] = { ...state.pieces.ember[0], status: "track", progress: 7 };
  state.awaiting = "allocate";
  state.throwPool = [{ id: "two", faces: [1, 1, 0, 0, 0, 0], value: 2, bonus: false }];
  const capture = getLegalActions(state, "aurora").find((action) => action.captures === "ember-1");
  assert.ok(capture);
  const result = applyAction(state, capture, "aurora");
  assert.equal(result.state.pieces.ember[0].status, "home");
  assert.equal(result.state.captures.aurora, 1);
});

test("service assigns opposite sides, rolls authoritative sequences and rejects wrong turns", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsEmber, "create", { wallet: "0xember", visibility: "public", side: "ember" });
  const created = lastPayload(harness, "gt_room_create_result").room;
  assert.equal(created.gameId, GLACIER_TRAIL_RULESET.gameId);
  assert.equal(created.players[0].role, "ember");

  harness.service.joinRoom(harness.wsAurora, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = lastPayload(harness, "gt_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").role, "aurora");

  harness.service.roll(harness.wsEmber, "wrong", { wallet: "0xember", roomCode: created.roomCode });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);
  harness.service.roll(harness.wsAurora, "roll", { wallet: "0xaurora", roomCode: created.roomCode });
  const rolled = lastPayload(harness, "gt_game_roll_result").room;
  assert.deepEqual(rolled.gameState.throwPool.map((item) => item.value), [5, 2]);
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Glacier Trail rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsAurora, "create", { wallet: "0xaurora", visibility: "private", side: "aurora" });
  const serialized = JSON.parse(JSON.stringify([...harness.rooms.values()][0]));
  const restored = makeHarness();
  restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.wsAurora, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  const room = lastPayload(restored, "gt_game_state_result").room;
  assert.equal(room.roomCode, serialized.roomCode);
  assert.equal(room.rulesetVersion, GLACIER_TRAIL_RULESET.rulesetVersion);
});

test("backend transformer installs Glacier Trail handlers, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectGlacierTrail(
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
  );
  assert.match(transformed, /createGlacierTrailService/);
  assert.match(transformed, /type === "gt_game_roll"/);
  assert.match(transformed, /type === "gt_game_action"/);
  assert.match(transformed, /glacierTrail\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsGlacierTrail: true/);
});
