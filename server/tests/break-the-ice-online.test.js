const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createBreakTheIceService } = require("../breakTheIceService.js");
const {
  BREAK_THE_ICE_RULESET,
  FINISH_PROGRESS,
  ROUTES,
  SAFE_SPACES,
  applyAction,
  applyRoll,
  assertStateInvariant,
  createBreakTheIceState,
  getLegalActions,
  getPieceSpaceId
} = require("../breakTheIceRules.js");
const {
  injectBreakTheIce,
  injectFishflow,
  injectFourWingIceHunt,
  injectNineIceForts
} = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function makeHarness(faces = [1, 0, 0, 0, 0, 0, 0]) {
  const rooms = new Map();
  const profiles = new Map([
    ["0xblue", { wallet: "0xblue", name: "Blue Runner" }],
    ["0xcoral", { wallet: "0xcoral", name: "Coral Runner" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const wsBlue = { readyState: 1, send() {} };
  const wsCoral = { readyState: 1, send() {} };
  const service = createBreakTheIceService({
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
    },
    rollFaces() { return [...faces]; }
  });
  return { service, rooms, packets, savedRooms, history, wsBlue, wsCoral };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

function prepareMoveState({ value, blueProgress = null, coralProgress = null }) {
  const state = createBreakTheIceState({ starter: "blue" });
  if (blueProgress !== null) state.pieces.blue[0] = { ...state.pieces.blue[0], status: "track", progress: blueProgress };
  if (coralProgress !== null) state.pieces.coral[0] = { ...state.pieces.coral[0], status: "track", progress: coralProgress };
  state.awaiting = "move";
  state.roll = {
    faces: Array(7).fill(0).map((_, index) => index < value ? 1 : 0),
    value,
    bonus: [1, 5, 7].includes(value),
    throwNumber: 1
  };
  state.lastRoll = { ...state.roll, player: "blue" };
  assertStateInvariant(state);
  return state;
}

test("Panchi route has 56 playable progress positions and declared protected spaces", () => {
  assert.equal(ROUTES.blue.length, FINISH_PROGRESS);
  assert.equal(ROUTES.coral.length, FINISH_PROGRESS);
  assert.equal(ROUTES.blue[0], "B0");
  assert.equal(ROUTES.coral[0], "B10");
  assert.equal(ROUTES.blue.at(-1), "V10");
  assert.equal(ROUTES.coral.at(-1), "V10");
  assert.equal(SAFE_SPACES.has("B0"), true);
  assert.equal(SAFE_SPACES.has("B10"), true);
  assert.equal(SAFE_SPACES.has("V10"), true);
});

test("zero mouths up loses the turn", () => {
  const state = createBreakTheIceState({ starter: "blue" });
  const result = applyRoll(state, [0, 0, 0, 0, 0, 0, 0], "blue");
  assert.equal(result.error, null);
  assert.equal(result.state.currentPlayer, "coral");
  assert.equal(result.state.awaiting, "roll");
  assert.equal(result.state.lastMove.reason, "no-mouths-up");
});

test("throws of 1, 5 and 7 allow entry and preserve the bonus throw", () => {
  for (const value of [1, 5, 7]) {
    const state = createBreakTheIceState({ starter: "blue" });
    const faces = Array(7).fill(0).map((_, index) => index < value ? 1 : 0);
    const rolled = applyRoll(state, faces, "blue");
    const entry = getLegalActions(rolled.state, "blue").find((action) => action.type === "enter");
    assert.ok(entry, `entry should be legal on ${value}`);
    const moved = applyAction(rolled.state, entry, "blue");
    assert.equal(moved.error, null);
    assert.equal(moved.state.currentPlayer, "blue");
    assert.equal(moved.state.awaiting, "roll");
    assert.equal(moved.state.pieces.blue[0].status, "track");
  }
});

test("an exact landing captures an unprotected rival and sends it home", () => {
  const state = prepareMoveState({ value: 1, blueProgress: 5, coralProgress: 6 });
  assert.equal(getPieceSpaceId(state.pieces.blue[0]), "B5");
  assert.equal(getPieceSpaceId(state.pieces.coral[0]), "V1");
  const action = getLegalActions(state, "blue").find((candidate) => candidate.pieceId === "blue-1");
  assert.equal(action.targetSpace, "V1");
  assert.equal(action.captures, "coral-1");
  const result = applyAction(state, action, "blue");
  assert.equal(result.error, null);
  assert.equal(result.state.pieces.coral[0].status, "home");
  assert.equal(result.state.pieces.coral[0].progress, -1);
  assert.equal(result.state.captures.blue, 1);
});

test("an enemy on a protected space blocks capture", () => {
  const state = prepareMoveState({ value: 1, blueProgress: 9, coralProgress: 10 });
  assert.equal(getPieceSpaceId(state.pieces.blue[0]), "V4");
  assert.equal(getPieceSpaceId(state.pieces.coral[0]), "V5");
  assert.equal(SAFE_SPACES.has("V5"), true);
  const action = getLegalActions(state, "blue").find((candidate) => candidate.pieceId === "blue-1");
  assert.equal(action, undefined);
});

test("leaving the board requires the exact remaining throw", () => {
  const state = prepareMoveState({ value: 5, blueProgress: 51 });
  const action = getLegalActions(state, "blue").find((candidate) => candidate.pieceId === "blue-1");
  assert.equal(action.finishes, true);
  const result = applyAction(state, action, "blue");
  assert.equal(result.state.pieces.blue[0].status, "finished");
  assert.equal(result.state.pieces.blue[0].progress, FINISH_PROGRESS);

  const overshoot = prepareMoveState({ value: 7, blueProgress: 51 });
  assert.equal(getLegalActions(overshoot, "blue").some((candidate) => candidate.pieceId === "blue-1"), false);
});

test("service assigns opposite runners and controls cowrie randomness and turns", () => {
  const harness = makeHarness([1, 0, 0, 0, 0, 0, 0]);
  harness.service.createRoom(harness.wsBlue, "create", { wallet: "0xblue", visibility: "public", runner: "blue" });
  const created = lastPayload(harness, "bti_room_create_result").room;
  assert.equal(created.status, "waiting");
  assert.equal(created.gameId, BREAK_THE_ICE_RULESET.gameId);
  assert.equal(created.players[0].runner, "blue");

  harness.service.joinRoom(harness.wsCoral, "join", { wallet: "0xcoral", roomCode: created.roomCode });
  const joined = lastPayload(harness, "bti_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xcoral").runner, "coral");

  harness.service.roll(harness.wsCoral, "wrong-turn", { wallet: "0xcoral", roomCode: created.roomCode });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);

  harness.service.roll(harness.wsBlue, "blue-roll", { wallet: "0xblue", roomCode: created.roomCode });
  const rolled = lastPayload(harness, "bti_game_roll_result").room;
  assert.equal(rolled.gameState.roll.value, 1);
  assert.equal(rolled.gameState.roll.bonus, true);
  assert.equal(rolled.gameState.roll.faces.length, 7);
  assert.ok(rolled.gameState.roll.proofHash);

  harness.service.action(harness.wsBlue, "blue-enter", {
    wallet: "0xblue",
    roomCode: created.roomCode,
    action: { type: "enter", pieceId: "blue-1" }
  });
  const updated = lastPayload(harness, "bti_game_action_result").room;
  assert.equal(updated.gameState.pieces.blue[0].status, "track");
  assert.equal(updated.gameState.currentPlayer, "blue");
  assert.equal(updated.gameState.awaiting, "roll");
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Break the Ice rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsCoral, "create", { wallet: "0xcoral", visibility: "private", runner: "coral" });
  const original = [...harness.rooms.values()][0];
  const serialized = JSON.parse(JSON.stringify(original));
  const restoredHarness = makeHarness();
  restoredHarness.rooms.set(serialized.roomCode, serialized);
  assert.equal(restoredHarness.service.restoreRoom(serialized), true);
  restoredHarness.service.getState(restoredHarness.wsCoral, "resume", { wallet: "0xcoral", roomCode: serialized.roomCode });
  const resumed = lastPayload(restoredHarness, "bti_game_state_result").room;
  assert.equal(resumed.roomCode, serialized.roomCode);
  assert.equal(resumed.rulesetVersion, BREAK_THE_ICE_RULESET.rulesetVersion);
  assert.equal(resumed.players[0].runner, "coral");
});

test("backend transformer installs Break the Ice handlers, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectBreakTheIce(
    injectFishflow(
      injectFourWingIceHunt(
        injectNineIceForts(transformBackendSource(source))
      )
    )
  );
  assert.match(transformed, /createBreakTheIceService/);
  assert.match(transformed, /type === "bti_room_create"/);
  assert.match(transformed, /type === "bti_game_roll"/);
  assert.match(transformed, /type === "bti_game_action"/);
  assert.match(transformed, /breakTheIce\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsBreakTheIce: true/);
});
