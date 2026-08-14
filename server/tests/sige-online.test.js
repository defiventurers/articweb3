const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  SIGE_RULESET,
  ROUTES,
  SAFE_SPACES,
  FINISH_PROGRESS,
  applyAction,
  applyRoll,
  createSigeState,
  createSplitFinishDrill,
  getLegalActions,
  getPieceSpaceId,
  scoreCowries
} = require("../sigeRules.js");
const { createSigeService } = require("../sigeService.js");
const { injectSige } = require("../sigeBackendBootstrap.js");
const ganjifaBackend = require("../auroraGanjifaBackendBootstrap.js");
const polarBackend = require("../polarTablanBackendBootstrap.js");
const auroraVultureBackend = require("../auroraVultureBackendBootstrap.js");
const twoStonesBackend = require("../twoStonesBackendBootstrap.js");
const cowrieBackend = require("../cowrieKingdomsBackendBootstrap.js");
const ringsBackend = require("../iceRingsBackendBootstrap.js");
const skyBackend = require("../skyTempleRunBackendBootstrap.js");
const guardBackend = require("../fortyGlacierGuardsBackendBootstrap.js");
const crownBackend = require("../crownRunBackendBootstrap.js");
const glacierBackend = require("../glacierTrailBackendBootstrap.js");
const sixteenBackend = require("../sixteenIceWarriorsBackendBootstrap.js");
const multiGameBackend = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function harness(faceQueue = []) {
  const rooms = new Map();
  const profiles = new Map([
    ["0xaurora", { wallet: "0xaurora", name: "Aurora Runner" }],
    ["0xember", { wallet: "0xember", name: "Ember Runner" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const queue = [...faceQueue];
  const ws = { readyState: 1, send() {} };
  const service = createSigeService({
    rooms,
    profiles,
    sockets,
    send(_socket, packet) { packets.push(packet); },
    ok(_socket, requestId, type, payload) { packets.push({ requestId, type, payload }); },
    fail(_socket, requestId, message) { packets.push({ requestId, type: "error", payload: { message } }); },
    walletOf(value) { return String(value || "").toLowerCase(); },
    profileFor(wallet) { return profiles.get(String(wallet || "").toLowerCase()); },
    saveRoomSafe(room) { savedRooms.push(JSON.parse(JSON.stringify(room))); },
    async saveHistoryEntry(entry) { history.push(entry); },
    async getHistoryForWallet(wallet, gameId) { return history.filter((entry) => entry.wallet === wallet && (!gameId || entry.gameId === gameId)); },
    rollFaces() { return queue.length ? queue.shift() : [1, 0, 0, 0]; }
  });
  return { service, rooms, packets, savedRooms, history, ws };
}
function lastPayload(h, type) { return [...h.packets].reverse().find((packet) => packet.type === type)?.payload; }

test("Sige routes cover the 5x5 board once and oppose each other", () => {
  assert.equal(ROUTES.aurora.length, 25);
  assert.equal(new Set(ROUTES.aurora).size, 25);
  assert.equal(ROUTES.aurora[0], "c02");
  assert.equal(ROUTES.aurora[15], "c03");
  assert.equal(ROUTES.aurora[16], "c13");
  assert.equal(ROUTES.aurora.at(-1), "c22");
  assert.equal(ROUTES.ember[0], "c42");
  assert.equal(ROUTES.ember.at(-1), "c22");
  assert.deepEqual([...SAFE_SPACES].sort(), ["c02", "c20", "c22", "c24", "c42"]);
});

test("four cowries score no mouths as eight and bonus values are one and eight", () => {
  assert.deepEqual(scoreCowries([0, 0, 0, 0]), { mouthsUp: 0, value: 8, bonus: true });
  assert.deepEqual(scoreCowries([1, 0, 0, 0]), { mouthsUp: 1, value: 1, bonus: true });
  assert.deepEqual(scoreCowries([1, 1, 1, 1]), { mouthsUp: 4, value: 4, bonus: false });
});

test("a throw of one enters a counter and preserves the bonus turn", () => {
  const rolled = applyRoll(createSigeState(), [1, 0, 0, 0], "aurora");
  const enter = getLegalActions(rolled.state, "aurora").find((action) => action.type === "enter" && action.pieceId === "aurora-1");
  assert.ok(enter);
  const result = applyAction(rolled.state, enter, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.currentPlayer, "aurora");
  assert.equal(result.state.awaiting, "roll");
  assert.equal(result.state.pieces.aurora[0].progress, 0);
});

test("exact landing chops an unprotected rival but never attacks a protected Katti", () => {
  const state = createSigeState();
  state.pieces.aurora[0] = { id: "aurora-1", side: "aurora", status: "track", progress: 4 };
  const target = ROUTES.aurora[6];
  state.pieces.ember[0] = { id: "ember-1", side: "ember", status: "track", progress: ROUTES.ember.indexOf(target) };
  state.awaiting = "move";
  state.roll = { faces: [1, 1, 0, 0], mouthsUp: 2, value: 2, bonus: false };
  const capture = getLegalActions(state, "aurora").find((action) => action.capturedPieceIds?.length);
  assert.ok(capture);
  const result = applyAction(state, capture, "aurora");
  assert.equal(result.state.pieces.ember[0].status, "home");
  assert.equal(result.state.currentPlayer, "aurora");

  const safeState = createSigeState();
  safeState.pieces.aurora[0] = { id: "aurora-1", side: "aurora", status: "track", progress: 7 };
  const safeTarget = ROUTES.aurora[8];
  safeState.pieces.ember[0] = { id: "ember-1", side: "ember", status: "track", progress: ROUTES.ember.indexOf(safeTarget) };
  safeState.awaiting = "move";
  safeState.roll = { faces: [1, 0, 0, 0], mouthsUp: 1, value: 1, bonus: true };
  const safeMove = getLegalActions(safeState, "aurora").find((action) => action.pieceId === "aurora-1");
  assert.ok(safeMove);
  assert.deepEqual(safeMove.capturedPieceIds, []);
});

test("Parker's centre exception divides one exact throw across both counters", () => {
  const state = createSplitFinishDrill();
  const action = getLegalActions(state, "aurora").find((candidate) => candidate.type === "split-finish");
  assert.ok(action);
  assert.deepEqual(action.allocations.map((item) => item.steps).sort((a, b) => a - b), [1, 7]);
  const result = applyAction(state, action, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.winner, "aurora");
  assert.equal(result.state.winReason, "split-centre-finish");
  assert.equal(result.state.pieces.aurora.every((piece) => piece.status === "finished"), true);
});

test("ordinary movement cannot overshoot the exact centre", () => {
  const state = createSigeState();
  state.pieces.aurora[0] = { id: "aurora-1", side: "aurora", status: "track", progress: FINISH_PROGRESS - 1 };
  state.awaiting = "move";
  state.roll = { faces: [1, 1, 0, 0], mouthsUp: 2, value: 2, bonus: false };
  assert.deepEqual(getLegalActions(state, "aurora"), [{ type: "pass", value: 2 }]);
});

test("service assigns opposite routes, owns randomness and rejects wrong turns", () => {
  const h = harness();
  h.service.createRoom(h.ws, "create", { wallet: "0xember", visibility: "public", side: "ember" });
  const created = lastPayload(h, "sg_room_create_result").room;
  assert.equal(created.gameId, SIGE_RULESET.gameId);
  h.service.joinRoom(h.ws, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = lastPayload(h, "sg_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").side, "aurora");
  h.service.roll(h.ws, "wrong", { wallet: "0xember", roomCode: created.roomCode });
  assert.match(lastPayload(h, "error").message, /not your turn/i);
  h.service.roll(h.ws, "roll", { wallet: "0xaurora", roomCode: created.roomCode });
  const rolled = lastPayload(h, "sg_game_roll_result").room;
  assert.ok(rolled.gameState.lastRoll.proofHash);
  assert.ok(rolled.gameState.lastRoll.nonce);
  assert.ok(h.savedRooms.length >= 3);
});

test("persisted Sige rooms restore and reconnect", () => {
  const h = harness();
  h.service.createRoom(h.ws, "create", { wallet: "0xaurora", visibility: "private", side: "aurora" });
  const serialized = JSON.parse(JSON.stringify([...h.rooms.values()][0]));
  const restored = harness();
  restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.ws, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  assert.equal(lastPayload(restored, "sg_game_state_result").room.rulesetVersion, SIGE_RULESET.rulesetVersion);
});

test("backend transformer installs Sige dispatch, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectSige(
    ganjifaBackend.injectAuroraGanjifa(
      polarBackend.injectPolarTablan(
        auroraVultureBackend.injectAuroraVulture(
          twoStonesBackend.injectTwoStones(
            cowrieBackend.injectCowrieKingdoms(
              ringsBackend.injectIceRings(
                skyBackend.injectSkyTempleRun(
                  guardBackend.injectFortyGlacierGuards(
                    crownBackend.injectCrownRun(
                      glacierBackend.injectGlacierTrail(
                        sixteenBackend.injectSixteenIceWarriors(
                          multiGameBackend.injectIceHunters(
                            multiGameBackend.injectBreakTheIce(
                              multiGameBackend.injectFishflow(
                                multiGameBackend.injectFourWingIceHunt(
                                  multiGameBackend.injectNineIceForts(transformBackendSource(source))
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
            )
          )
        )
      )
    )
  );
  assert.match(transformed, /createSigeService/);
  assert.match(transformed, /type === "sg_room_create"/);
  assert.match(transformed, /type === "sg_game_roll"/);
  assert.match(transformed, /sige\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsSige: true/);
});
