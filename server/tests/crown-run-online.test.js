const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  CROWN_RUN_RULESET,
  SPACES,
  SAFE_SPACES,
  CENTER_PROGRESS,
  FINISHED_PROGRESS,
  OPPONENT_HOME_START,
  applyAction,
  applyRollSequence,
  createCrownCollapseDrill,
  createCrownRunState,
  getLegalActions,
  getPieceSpaceId
} = require("../crownRunRules.js");
const { createCrownRunService } = require("../crownRunService.js");
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

function roll(value, id = `r-${value}`) {
  const mouths = value === 10 ? 5 : value;
  return { id, faces: Array.from({ length: 5 }, (_, index) => index < mouths ? 1 : 0) };
}

function licensedState() {
  const state = createCrownRunState({ starter: "aurora" });
  state.captureLicense.aurora = true;
  state.turnHasDa = true;
  state.awaiting = "allocate";
  return state;
}

function makeHarness(faceQueue = []) {
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
  const queue = [...faceQueue];
  const service = createCrownRunService({
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
    rollFaces() { return queue.length ? queue.shift() : [1, 0, 0, 0, 0]; }
  });
  return { service, rooms, packets, savedRooms, history, wsAurora, wsEmber };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

test("majority board uses seven five-step segments, eight macho and opposed routes", () => {
  const state = createCrownRunState();
  assert.equal(SPACES.length, 36);
  assert.equal(SAFE_SPACES.size, 8);
  assert.deepEqual([...SAFE_SPACES], ["R0", "R5", "R10", "R15", "R20", "R25", "R30", "R35"]);
  assert.equal(state.pieces.aurora.length, 9);
  assert.equal(state.pieces.ember.length, 9);
  assert.equal(state.pieces.aurora.filter((piece) => piece.kind === "king").length, 1);
});

test("a player without da loses the chance to apply the sequence", () => {
  const state = createCrownRunState({ starter: "aurora" });
  const result = applyRollSequence(state, [roll(2)], "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.currentPlayer, "ember");
  assert.equal(result.state.awaiting, "roll");
  assert.equal(result.state.throwPool.length, 0);
  assert.equal(result.state.history.at(-1).reason, "no-da");
});

test("zero forfeits the accumulated sequence under the majority rule", () => {
  const state = createCrownRunState({ starter: "aurora" });
  const result = applyRollSequence(state, [roll(1, "one"), roll(0, "zero")], "aurora");
  assert.equal(result.state.currentPlayer, "ember");
  assert.equal(result.state.throwPool.length, 0);
  assert.equal(result.state.history.at(-1).reason, "zero-forfeit");
});

test("da must enter a waiting piece before moving an existing piece", () => {
  const state = licensedState();
  state.pieces.aurora[1].status = "track";
  state.pieces.aurora[1].progress = 8;
  state.throwPool = [roll(1, "da")];
  const actions = getLegalActions(state, "aurora");
  assert.equal(actions.length, 8);
  assert.equal(actions.every((action) => action.type === "enter"), true);
  assert.equal(actions.some((action) => action.pieceId === state.pieces.aurora[1].id), false);
});

test("the opposing home row remains closed until the side has captured", () => {
  const state = createCrownRunState({ starter: "aurora" });
  state.turnHasDa = true;
  state.awaiting = "allocate";
  state.pieces.aurora.forEach((piece) => { piece.status = "finished"; piece.progress = FINISHED_PROGRESS; });
  const runner = state.pieces.aurora[0];
  runner.status = "track";
  runner.progress = OPPONENT_HOME_START - 2;
  state.throwPool = [roll(2, "gate")];
  assert.equal(getLegalActions(state, "aurora").length, 0);
  state.captureLicense.aurora = true;
  assert.equal(getLegalActions(state, "aurora").some((action) => action.pieceId === runner.id), true);
});

test("a standard piece capturing the nakta resets unfinished allies but preserves exited pieces", () => {
  const state = createCrownCollapseDrill();
  const striker = state.pieces.aurora.find((piece) => piece.status === "track");
  const action = getLegalActions(state, "aurora").find((item) => item.pieceId === striker.id && item.capturedPieceId);
  assert.ok(action);
  const result = applyAction(state, action, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.awaiting, "capture-roll");
  assert.equal(result.state.lastMove.capturedKind, "king");
  assert.equal(result.state.lastMove.resetCount, 3);
  assert.equal(result.state.captureLicense.ember, false);
  assert.equal(result.state.pieces.ember.filter((piece) => piece.status === "finished").length, 1);
  assert.equal(result.state.pieces.ember.filter((piece) => piece.status === "track" || piece.status === "center").length, 0);
});

test("nakta-on-nakta capture resets even pieces that already exited", () => {
  const state = licensedState();
  state.pieces.aurora.forEach((piece) => { piece.status = "home"; piece.progress = -1; });
  state.pieces.ember.forEach((piece) => { piece.status = "home"; piece.progress = -1; });
  const attacker = state.pieces.aurora.find((piece) => piece.kind === "king");
  const victim = state.pieces.ember.find((piece) => piece.kind === "king");
  attacker.status = "track";
  attacker.progress = 8;
  victim.status = "track";
  victim.progress = 24;
  state.pieces.ember[1].status = "finished";
  state.pieces.ember[1].progress = FINISHED_PROGRESS;
  state.throwPool = [roll(3, "royal")];
  const action = getLegalActions(state, "aurora").find((item) => item.pieceId === attacker.id);
  const result = applyAction(state, action, "aurora");
  assert.equal(result.state.lastReset.includedFinishedPieces, true);
  assert.equal(result.state.pieces.ember.every((piece) => piece.status === "home"), true);
});

test("friendly pieces stack while an opposing stack blocks a macho", () => {
  const state = licensedState();
  state.pieces.aurora.forEach((piece) => { piece.status = "home"; piece.progress = -1; });
  state.pieces.ember.forEach((piece) => { piece.status = "home"; piece.progress = -1; });
  state.pieces.aurora[0].status = "track";
  state.pieces.aurora[0].progress = 3;
  state.pieces.aurora[1].status = "track";
  state.pieces.aurora[1].progress = 5;
  state.throwPool = [roll(2, "friendly")];
  assert.equal(getLegalActions(state, "aurora").some((action) => action.pieceId === state.pieces.aurora[0].id), true);
  state.pieces.ember[0].status = "track";
  state.pieces.ember[0].progress = 30;
  assert.equal(getPieceSpaceId(state.pieces.ember[0]), "R5");
  assert.equal(getLegalActions(state, "aurora").some((action) => action.pieceId === state.pieces.aurora[0].id), false);
});

test("landing on the final square moves a piece to center and a later da exits it", () => {
  const state = licensedState();
  state.pieces.aurora.forEach((piece) => { piece.status = "finished"; piece.progress = FINISHED_PROGRESS; });
  const runner = state.pieces.aurora[0];
  runner.status = "track";
  runner.progress = 33;
  state.throwPool = [roll(2, "center")];
  let result = applyAction(state, getLegalActions(state, "aurora")[0], "aurora");
  assert.equal(result.state.pieces.aurora[0].status, "center");
  assert.equal(result.state.pieces.aurora[0].progress, CENTER_PROGRESS);
  result.state.awaiting = "allocate";
  result.state.throwPool = [roll(1, "exit")];
  result.state.turnHasDa = true;
  result = applyAction(result.state, getLegalActions(result.state, "aurora")[0], "aurora");
  assert.equal(result.state.winner, "aurora");
  assert.equal(result.state.pieces.aurora[0].status, "finished");
});

test("service assigns opposite courts, generates authoritative cowries and rejects wrong turns", () => {
  const harness = makeHarness([[1, 0, 0, 0, 0], [1, 1, 0, 0, 0]]);
  harness.service.createRoom(harness.wsEmber, "create", { wallet: "0xember", visibility: "public", side: "ember" });
  const created = lastPayload(harness, "cr_room_create_result").room;
  assert.equal(created.gameId, CROWN_RUN_RULESET.gameId);
  harness.service.joinRoom(harness.wsAurora, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = lastPayload(harness, "cr_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").side, "aurora");

  harness.service.roll(harness.wsEmber, "wrong-roll", { wallet: "0xember", roomCode: created.roomCode });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);

  harness.service.roll(harness.wsAurora, "roll", { wallet: "0xaurora", roomCode: created.roomCode });
  const rolled = lastPayload(harness, "cr_game_roll_result").room;
  assert.equal(rolled.gameState.awaiting, "allocate");
  assert.deepEqual(rolled.gameState.throwPool.map((item) => item.value), [1, 2]);
  assert.ok(rolled.gameState.throwPool.every((item) => item.proofHash && item.nonce));

  const action = getLegalActions(rolled.gameState, "aurora")[0];
  harness.service.action(harness.wsAurora, "action", { wallet: "0xaurora", roomCode: created.roomCode, action });
  const updated = lastPayload(harness, "cr_game_action_result").room;
  assert.equal(updated.gameState.pieces.aurora.filter((piece) => piece.status === "track").length, 1);
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Crown Run rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsAurora, "create", { wallet: "0xaurora", visibility: "private", side: "aurora" });
  const original = [...harness.rooms.values()][0];
  const serialized = JSON.parse(JSON.stringify(original));
  const restored = makeHarness();
  restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.wsAurora, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  const room = lastPayload(restored, "cr_game_state_result").room;
  assert.equal(room.rulesetVersion, CROWN_RUN_RULESET.rulesetVersion);
  assert.equal(room.players[0].side, "aurora");
});

test("backend transformer installs Crown Run dispatch, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectCrownRun(
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
  );
  assert.match(transformed, /createCrownRunService/);
  assert.match(transformed, /type === "cr_room_create"/);
  assert.match(transformed, /type === "cr_game_roll"/);
  assert.match(transformed, /crownRun\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsCrownRun: true/);
});