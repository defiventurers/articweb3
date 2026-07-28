const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  AURORA_VULTURE_RULESET,
  POINTS,
  LINES,
  EDGES,
  ADJACENCY,
  JUMPS,
  applyAction,
  createAuroraVultureState,
  createFourthCrowDrill,
  getLegalActions
} = require("../auroraVultureRules.js");
const { createAuroraVultureService } = require("../auroraVultureService.js");
const { injectAuroraVulture } = require("../auroraVultureBackendBootstrap.js");
const { injectTwoStones } = require("../twoStonesBackendBootstrap.js");
const { injectCowrieKingdoms } = require("../cowrieKingdomsBackendBootstrap.js");
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
    ["0xcrows", { wallet: "0xcrows", name: "Crow Captain" }],
    ["0xvulture", { wallet: "0xvulture", name: "Vulture Captain" }]
  ]);
  const packets = [];
  const savedRooms = [];
  const history = [];
  const sockets = new Map();
  const ws = { readyState: 1, send() {} };
  const service = createAuroraVultureService({
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
  return { service, rooms, packets, savedRooms, history, ws };
}

function payload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

function setBoardCrow(state, index, point) {
  state.crows[index].status = "board";
  state.crows[index].point = point;
}

test("Kaooa uses ten points, fifteen edges and five straight four-point lines", () => {
  assert.equal(POINTS.length, 10);
  assert.equal(EDGES.length, 15);
  assert.equal(LINES.length, 5);
  assert.equal(LINES.every((line) => line.length === 4), true);
  assert.equal(ADJACENCY.o0.length, 2);
  assert.equal(ADJACENCY.i0.length, 4);
  assert.deepEqual(JUMPS.o0, [{ over: "i0", to: "i1" }, { over: "i4", to: "i3" }]);
});

test("the empty-board sequence is crow placement, vulture placement, then continued crow deployment", () => {
  let state = createAuroraVultureState();
  assert.equal(state.currentPlayer, "crows");
  const firstCrow = getLegalActions(state, "crows").find((action) => action.to === "o0");
  state = applyAction(state, firstCrow, "crows").state;
  assert.equal(state.deployedCrows, 1);
  assert.equal(state.currentPlayer, "vulture");
  assert.equal(getLegalActions(state, "vulture").every((action) => action.type === "place-vulture"), true);

  const vultureEntry = getLegalActions(state, "vulture").find((action) => action.to === "o1");
  state = applyAction(state, vultureEntry, "vulture").state;
  assert.equal(state.currentPlayer, "crows");
  assert.equal(getLegalActions(state, "crows").every((action) => action.type === "place-crow"), true);

  const secondCrow = getLegalActions(state, "crows").find((action) => action.to === "i4");
  state = applyAction(state, secondCrow, "crows").state;
  assert.equal(state.currentPlayer, "vulture");
  assert.equal(getLegalActions(state, "vulture").some((action) => action.type === "move-vulture" || action.type === "capture-crow"), true);
});

test("a vulture capture is one straight short leap and never chains in the same turn", () => {
  const state = createAuroraVultureState();
  state.phase = "movement";
  state.currentPlayer = "vulture";
  state.vulture = { id: "vulture-1", side: "vulture", point: "o0", status: "board" };
  ["i0", "i2", "o1", "o2", "o4", "i3", "i4"].forEach((point, index) => setBoardCrow(state, index, point));
  state.deployedCrows = 7;

  const capture = getLegalActions(state, "vulture").find((action) => action.type === "capture-crow" && action.to === "i1");
  assert.ok(capture);
  assert.equal(capture.over, "i0");
  const result = applyAction(state, capture, "vulture");
  assert.equal(result.error, null);
  assert.equal(result.state.vulture.point, "i1");
  assert.equal(result.state.capturedCrows, 1);
  assert.equal(result.state.currentPlayer, "crows");
  assert.equal(result.state.lastAction.capturedPieceId, "crow-1");
});

test("the Fourth-Crow Strike drill wins at the fixed four-capture threshold", () => {
  const state = createFourthCrowDrill();
  const capture = getLegalActions(state, "vulture").find((action) => action.type === "capture-crow" && action.to === "i1");
  assert.ok(capture);
  const result = applyAction(state, capture, "vulture");
  assert.equal(result.error, null);
  assert.equal(result.state.capturedCrows, 4);
  assert.equal(result.state.winner, "vulture");
  assert.equal(result.state.winReason, "four-crows-captured");
});

test("crows win immediately when their move blocks every vulture step and jump", () => {
  const state = createAuroraVultureState();
  state.phase = "movement";
  state.currentPlayer = "crows";
  state.vulture = { id: "vulture-1", side: "vulture", point: "o0", status: "board" };
  ["i0", "i1", "i4", "i2", "o1", "o2", "o3"].forEach((point, index) => setBoardCrow(state, index, point));
  state.deployedCrows = 7;

  const lock = getLegalActions(state, "crows").find((action) => action.from === "i2" && action.to === "i3");
  assert.ok(lock);
  const result = applyAction(state, lock, "crows");
  assert.equal(result.error, null);
  assert.equal(result.state.winner, "crows");
  assert.equal(result.state.winReason, "vulture-immobilized");
  const inspection = JSON.parse(JSON.stringify(result.state));
  inspection.winner = null;
  inspection.currentPlayer = "vulture";
  assert.equal(getLegalActions(inspection, "vulture").length, 0);
});

test("authoritative rooms assign opposite roles and reject wrong-turn actions", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.ws, "create", { wallet: "0xvulture", side: "vulture", visibility: "public" });
  const created = payload(harness, "av_room_create_result").room;
  assert.equal(created.gameId, AURORA_VULTURE_RULESET.gameId);
  assert.equal(created.players[0].side, "vulture");

  harness.service.joinRoom(harness.ws, "join", { wallet: "0xcrows", roomCode: created.roomCode });
  const joined = payload(harness, "av_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xcrows").side, "crows");

  harness.service.action(harness.ws, "wrong", {
    wallet: "0xvulture",
    roomCode: created.roomCode,
    action: { type: "place-vulture", pieceId: "vulture-1", to: "o0" }
  });
  assert.match(payload(harness, "error").message, /not your turn/i);

  const crowAction = getLegalActions(joined.gameState, "crows").find((action) => action.to === "o0");
  harness.service.action(harness.ws, "crow", { wallet: "0xcrows", roomCode: created.roomCode, action: crowAction });
  const updated = payload(harness, "av_game_action_result").room;
  assert.equal(updated.gameState.deployedCrows, 1);
  assert.equal(updated.gameState.currentPlayer, "vulture");
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Aurora Vulture rooms restore and reconnect", () => {
  const first = makeHarness();
  first.service.createRoom(first.ws, "create", { wallet: "0xcrows", side: "crows", visibility: "private" });
  const serialized = JSON.parse(JSON.stringify([...first.rooms.values()][0]));
  const restored = makeHarness();
  restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.ws, "resume", { wallet: "0xcrows", roomCode: serialized.roomCode });
  assert.equal(payload(restored, "av_game_state_result").room.rulesetVersion, AURORA_VULTURE_RULESET.rulesetVersion);
});

test("backend transformer installs Aurora Vulture dispatch, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectAuroraVulture(
    injectTwoStones(
      injectCowrieKingdoms(
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
      )
    )
  );
  assert.match(transformed, /createAuroraVultureService/);
  assert.match(transformed, /type === "av_room_create"/);
  assert.match(transformed, /type === "av_game_action"/);
  assert.match(transformed, /auroraVulture\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsAuroraVulture: true/);
});
