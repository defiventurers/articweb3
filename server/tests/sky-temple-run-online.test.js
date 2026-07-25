const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  SKY_TEMPLE_RUN_RULESET,
  ANCHOR_ROUTES,
  ROUTES,
  GATE_PROGRESS,
  FINISH_PROGRESS,
  SAFE_SPACES,
  SPACES,
  applyAction,
  applyRoll,
  createSkyTempleRunState,
  createTempleGateDrill,
  getLegalActions,
  scoreCowries
} = require("../skyTempleRunRules.js");
const { createSkyTempleRunService } = require("../skyTempleRunService.js");
const { injectSkyTempleRun } = require("../skyTempleRunBackendBootstrap.js");
const { injectFortyGlacierGuards } = require("../fortyGlacierGuardsBackendBootstrap.js");
const { injectCrownRun } = require("../crownRunBackendBootstrap.js");
const { injectGlacierTrail } = require("../glacierTrailBackendBootstrap.js");
const { injectSixteenIceWarriors } = require("../sixteenIceWarriorsBackendBootstrap.js");
const { injectBreakTheIce, injectFishflow, injectFourWingIceHunt, injectIceHunters, injectNineIceForts } = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function makeHarness(faceQueue = []) {
  const rooms = new Map();
  const profiles = new Map([
    ["0xaurora", { wallet: "0xaurora", name: "Aurora Guide" }],
    ["0xember", { wallet: "0xember", name: "Ember Guide" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const queue = [...faceQueue];
  const wsAurora = { readyState: 1, send() {} };
  const wsEmber = { readyState: 1, send() {} };
  const service = createSkyTempleRunService({
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
    rollFaces() { return queue.length ? queue.shift() : [1, 0, 0, 0, 0, 0]; }
  });
  return { service, rooms, packets, savedRooms, history, wsAurora, wsEmber };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

test("the named Vimanam routes remain opposed and expand to equal digital paths", () => {
  assert.deepEqual(ANCHOR_ROUTES.aurora, ["a", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "n", "q", "r"]);
  assert.deepEqual(ANCHOR_ROUTES.ember, ["b", "c", "d", "k", "j", "i", "h", "g", "f", "e", "m", "n", "o", "p"]);
  assert.equal(ROUTES.aurora.length, 53);
  assert.equal(ROUTES.ember.length, 53);
  assert.equal(FINISH_PROGRESS, 52);
  assert.equal(GATE_PROGRESS.aurora, 36);
  assert.equal(GATE_PROGRESS.ember, 36);
  assert.equal(SPACES.length, 75);
  assert.equal(SAFE_SPACES.size, 18);
  const state = createSkyTempleRunState();
  assert.equal(state.pieces.aurora.length, 6);
  assert.equal(state.pieces.ember.length, 6);
});

test("six cowries score zero mouths as twelve and preserve bonus values", () => {
  assert.deepEqual(scoreCowries([0, 0, 0, 0, 0, 0]), { mouthsUp: 0, value: 12 });
  assert.deepEqual(scoreCowries([1, 1, 1, 1, 1, 1]), { mouthsUp: 6, value: 6 });
  const zero = applyRoll(createSkyTempleRunState(), [0, 0, 0, 0, 0, 0], "aurora");
  assert.equal(zero.error, null);
  assert.equal(zero.state.lastRoll.value, 12);
  assert.equal(zero.state.lastRoll.bonus, true);
});

test("only one or five enters a waiting pilgrim", () => {
  const one = applyRoll(createSkyTempleRunState(), [1, 0, 0, 0, 0, 0], "aurora");
  assert.equal(getLegalActions(one.state, "aurora").filter((action) => action.type === "enter").length, 6);
  const two = applyRoll(createSkyTempleRunState(), [1, 1, 0, 0, 0, 0], "aurora");
  assert.equal(two.state.awaiting, "roll");
  assert.equal(two.state.currentPlayer, "ember");
});

test("the inner route is capture-gated and the Temple Gate drill unlocks it", () => {
  const blocked = createSkyTempleRunState();
  blocked.pieces.aurora[0].status = "track";
  blocked.pieces.aurora[0].progress = GATE_PROGRESS.aurora - 1;
  blocked.awaiting = "move";
  blocked.roll = { faces: [1, 1, 0, 0, 0, 0], mouthsUp: 2, value: 2, bonus: false };
  assert.equal(getLegalActions(blocked, "aurora").some((action) => action.pieceId === "aurora-1"), false);
  blocked.captureLicense.aurora = true;
  assert.equal(getLegalActions(blocked, "aurora").some((action) => action.pieceId === "aurora-1"), true);

  const drill = createTempleGateDrill();
  const capture = getLegalActions(drill, "aurora").find((action) => action.captures === "ember-1");
  assert.ok(capture);
  const result = applyAction(drill, capture, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.captureLicense.aurora, true);
  assert.equal(result.state.lastMove.unlockedGate, true);
  assert.equal(result.state.pieces.ember[0].status, "home");
  assert.equal(result.state.currentPlayer, "aurora");
  assert.equal(result.state.awaiting, "roll");
});

test("finishing requires an exact cast", () => {
  const state = createSkyTempleRunState();
  state.captureLicense.aurora = true;
  state.pieces.aurora.slice(1).forEach((piece) => { piece.status = "finished"; piece.progress = FINISH_PROGRESS; });
  state.pieces.aurora[0].status = "track";
  state.pieces.aurora[0].progress = FINISH_PROGRESS - 2;
  state.awaiting = "move";
  state.roll = { faces: [1, 1, 1, 0, 0, 0], mouthsUp: 3, value: 3, bonus: false };
  assert.equal(getLegalActions(state, "aurora").length, 0);
  state.roll = { faces: [1, 1, 0, 0, 0, 0], mouthsUp: 2, value: 2, bonus: false };
  const action = getLegalActions(state, "aurora")[0];
  const result = applyAction(state, action, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.winner, "aurora");
  assert.equal(result.state.pieces.aurora[0].status, "finished");
});

test("service assigns opposite courts, owns cowrie randomness and rejects wrong turns", () => {
  const harness = makeHarness([[1, 0, 0, 0, 0, 0]]);
  harness.service.createRoom(harness.wsEmber, "create", { wallet: "0xember", visibility: "public", side: "ember" });
  const created = lastPayload(harness, "str_room_create_result").room;
  assert.equal(created.gameId, SKY_TEMPLE_RUN_RULESET.gameId);
  harness.service.joinRoom(harness.wsAurora, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = lastPayload(harness, "str_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").side, "aurora");

  harness.service.roll(harness.wsEmber, "wrong", { wallet: "0xember", roomCode: created.roomCode });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);
  harness.service.roll(harness.wsAurora, "roll", { wallet: "0xaurora", roomCode: created.roomCode });
  const rolled = lastPayload(harness, "str_game_roll_result").room;
  assert.equal(rolled.gameState.lastRoll.value, 1);
  assert.ok(rolled.gameState.lastRoll.proofHash);
  assert.ok(rolled.gameState.lastRoll.nonce);
  const action = getLegalActions(rolled.gameState, "aurora")[0];
  harness.service.action(harness.wsAurora, "move", { wallet: "0xaurora", roomCode: created.roomCode, action });
  assert.equal(lastPayload(harness, "str_game_action_result").room.gameState.pieces.aurora.filter((piece) => piece.status === "track").length, 1);
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Sky Temple Run rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsAurora, "create", { wallet: "0xaurora", visibility: "private", side: "aurora" });
  const serialized = JSON.parse(JSON.stringify([...harness.rooms.values()][0]));
  const restored = makeHarness();
  restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.wsAurora, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  const room = lastPayload(restored, "str_game_state_result").room;
  assert.equal(room.rulesetVersion, SKY_TEMPLE_RUN_RULESET.rulesetVersion);
  assert.equal(room.players[0].side, "aurora");
});

test("backend transformer installs Sky Temple Run dispatch, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectSkyTempleRun(
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
  );
  assert.match(transformed, /createSkyTempleRunService/);
  assert.match(transformed, /type === "str_room_create"/);
  assert.match(transformed, /type === "str_game_roll"/);
  assert.match(transformed, /skyTempleRun\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsSkyTempleRun: true/);
});
