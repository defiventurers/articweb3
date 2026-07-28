const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  COWRIE_KINGDOMS_RULESET,
  CELLS,
  SAFE_SPACES,
  ROUTES,
  FINISH_PROGRESS,
  applyAction,
  applyRoll,
  createAshtaGraceDrill,
  createCowrieKingdomsState,
  getLegalActions,
  getPieceSpaceId,
  scoreCowries
} = require("../cowrieKingdomsRules.js");
const { createCowrieKingdomsService } = require("../cowrieKingdomsService.js");
const { injectCowrieKingdoms } = require("../cowrieKingdomsBackendBootstrap.js");
const { injectIceRings } = require("../iceRingsBackendBootstrap.js");
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
    ["0xaurora", { wallet: "0xaurora", name: "Aurora Ruler" }],
    ["0xember", { wallet: "0xember", name: "Ember Ruler" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const queue = [...faceQueue];
  const wsAurora = { readyState: 1, send() {} };
  const wsEmber = { readyState: 1, send() {} };
  const service = createCowrieKingdomsService({
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
    rollFaces() { return queue.length ? queue.shift() : [1, 0, 0, 0]; }
  });
  return { service, rooms, packets, savedRooms, history, wsAurora, wsEmber };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

test("Ashta-Kashte release one has a 7x7 spiral, five crosses and four runners per side", () => {
  assert.equal(CELLS.length, 49);
  assert.equal(SAFE_SPACES.size, 5);
  assert.equal(ROUTES.aurora.length, 49);
  assert.equal(ROUTES.ember.length, 49);
  assert.equal(FINISH_PROGRESS, 48);
  assert.equal(ROUTES.aurora[0], "c03");
  assert.equal(ROUTES.ember[0], "c63");
  assert.equal(ROUTES.aurora.at(-1), "c33");
  assert.equal(ROUTES.ember.at(-1), "c33");
  const state = createCowrieKingdomsState();
  assert.equal(state.pieces.aurora.length, 4);
  assert.equal(state.pieces.ember.length, 4);
});

test("four cowries preserve grace on four and split Ashta into eight plus grace", () => {
  assert.deepEqual(scoreCowries([1, 1, 1, 1]), { mouthsUp: 4, value: 4, grace: true, splitGrace: false });
  assert.deepEqual(scoreCowries([0, 0, 0, 0]), { mouthsUp: 0, value: 8, grace: true, splitGrace: true });
  const result = applyRoll(createCowrieKingdomsState(), [0, 0, 0, 0], "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.throwPool.length, 2);
  assert.deepEqual(result.state.throwPool.map((unit) => [unit.kind, unit.value]), [["grace", 0], ["move", 8]]);
  assert.equal(result.state.bonusRolls, 1);
});

test("Ashta Grace Drill enters separately, then captures with the stored eight", () => {
  const state = createAshtaGraceDrill();
  const graceEntry = getLegalActions(state, "aurora", "drill-grace").find((action) => action.type === "enter" && action.pieceId === "aurora-1");
  assert.ok(graceEntry);
  const afterEntry = applyAction(state, graceEntry, "aurora");
  assert.equal(afterEntry.error, null);
  assert.equal(afterEntry.state.pieces.aurora[0].status, "track");
  assert.deepEqual(afterEntry.state.throwPool.map((unit) => unit.id), ["drill-eight"]);
  assert.equal(afterEntry.state.currentPlayer, "aurora");

  const capture = getLegalActions(afterEntry.state, "aurora", "drill-eight").find((action) => action.pieceId === "aurora-2" && action.captures === "ember-1");
  assert.ok(capture);
  const afterCapture = applyAction(afterEntry.state, capture, "aurora");
  assert.equal(afterCapture.error, null);
  assert.equal(afterCapture.state.pieces.ember[0].status, "home");
  assert.equal(afterCapture.state.captures.aurora, 1);
  assert.equal(afterCapture.state.bonusRolls, 1);
  assert.equal(afterCapture.state.currentPlayer, "aurora");
});

test("Falkener optional play permits passing every stored unit", () => {
  const rolled = applyRoll(createCowrieKingdomsState(), [1, 1, 0, 0], "aurora").state;
  const pass = getLegalActions(rolled, "aurora").find((action) => action.type === "pass-unit");
  assert.ok(pass);
  const result = applyAction(rolled, pass, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.currentPlayer, "ember");
  assert.equal(result.state.awaiting, "roll");
});

test("crossed entry squares allow mixed occupancy without capture", () => {
  const state = createCowrieKingdomsState();
  const emberIndex = ROUTES.ember.indexOf("c03");
  assert.ok(emberIndex >= 0);
  state.pieces.ember[0].status = "track";
  state.pieces.ember[0].progress = emberIndex;
  state.awaiting = "allocate";
  state.throwPool = [{ id: "grace", kind: "grace", value: 0, label: "Grace entry", enterAllowed: true, moveAllowed: false }];
  const enter = getLegalActions(state, "aurora", "grace").find((action) => action.type === "enter" && action.pieceId === "aurora-1");
  const result = applyAction(state, enter, "aurora");
  assert.equal(result.error, null);
  assert.equal(getPieceSpaceId(result.state.pieces.aurora[0]), "c03");
  assert.equal(getPieceSpaceId(result.state.pieces.ember[0]), "c03");
  assert.equal(result.state.pieces.ember[0].status, "track");
});

test("the centre requires an exact throw and finishing all four wins", () => {
  const state = createCowrieKingdomsState();
  state.pieces.aurora.slice(1).forEach((piece) => { piece.status = "finished"; piece.progress = FINISH_PROGRESS; });
  state.pieces.aurora[0].status = "track";
  state.pieces.aurora[0].progress = FINISH_PROGRESS - 1;
  state.awaiting = "allocate";
  state.throwPool = [{ id: "two", kind: "move", value: 2, label: "Move 2", enterAllowed: false, moveAllowed: true }];
  assert.equal(getLegalActions(state, "aurora", "two").some((action) => action.type === "move"), false);
  state.throwPool = [{ id: "one", kind: "move", value: 1, label: "Move 1", enterAllowed: false, moveAllowed: true }];
  const finish = getLegalActions(state, "aurora", "one").find((action) => action.type === "move");
  const result = applyAction(state, finish, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.winner, "aurora");
  assert.equal(result.state.pieces.aurora[0].status, "finished");
});

test("service assigns opposite kingdoms, owns cowries and rejects wrong turns", () => {
  const harness = makeHarness([[0, 0, 0, 0]]);
  harness.service.createRoom(harness.wsEmber, "create", { wallet: "0xember", visibility: "public", side: "ember" });
  const created = lastPayload(harness, "ck_room_create_result").room;
  assert.equal(created.gameId, COWRIE_KINGDOMS_RULESET.gameId);
  assert.equal(created.players[0].side, "ember");
  harness.service.joinRoom(harness.wsAurora, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = lastPayload(harness, "ck_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").side, "aurora");

  harness.service.roll(harness.wsEmber, "wrong", { wallet: "0xember", roomCode: created.roomCode });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);
  harness.service.roll(harness.wsAurora, "roll", { wallet: "0xaurora", roomCode: created.roomCode });
  const rolled = lastPayload(harness, "ck_game_roll_result").room;
  assert.equal(rolled.gameState.lastRoll.value, 8);
  assert.equal(rolled.gameState.throwPool.length, 2);
  assert.ok(rolled.gameState.lastRoll.proofHash);
  assert.ok(rolled.gameState.lastRoll.nonce);
  const entry = getLegalActions(rolled.gameState, "aurora", rolled.gameState.throwPool[0].id).find((action) => action.type === "enter");
  harness.service.action(harness.wsAurora, "entry", { wallet: "0xaurora", roomCode: created.roomCode, action: entry });
  const updated = lastPayload(harness, "ck_game_action_result").room;
  assert.equal(updated.gameState.pieces.aurora.filter((piece) => piece.status === "track").length, 1);
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Cowrie Kingdoms rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsAurora, "create", { wallet: "0xaurora", visibility: "private", side: "aurora" });
  const serialized = JSON.parse(JSON.stringify([...harness.rooms.values()][0]));
  const restored = makeHarness();
  restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.wsAurora, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  const room = lastPayload(restored, "ck_game_state_result").room;
  assert.equal(room.rulesetVersion, COWRIE_KINGDOMS_RULESET.rulesetVersion);
  assert.equal(room.players[0].side, "aurora");
});

test("backend transformer installs Cowrie Kingdoms dispatch restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectCowrieKingdoms(
    injectIceRings(
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
    )
  );
  assert.match(transformed, /createCowrieKingdomsService/);
  assert.match(transformed, /type === "ck_room_create"/);
  assert.match(transformed, /type === "ck_game_roll"/);
  assert.match(transformed, /cowrieKingdoms\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsCowrieKingdoms: true/);
});
