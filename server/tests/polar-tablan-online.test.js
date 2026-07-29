const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { POLAR_TABLAN_RULESET, ROUTES, applyAction, applyRoll, createFinishRowDrill, createPolarTablanState, getLegalActions, getPieceCell, scoreSticks } = require("../polarTablanRules.js");
const { createPolarTablanService } = require("../polarTablanService.js");
const { injectPolarTablan } = require("../polarTablanBackendBootstrap.js");
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
  const profiles = new Map([["0xaurora", { wallet: "0xaurora", name: "Aurora Captain" }], ["0xember", { wallet: "0xember", name: "Ember Captain" }]]);
  const packets = []; const savedRooms = []; const history = []; const sockets = new Map(); const ws = { readyState: 1, send() {} };
  const service = createPolarTablanService({ rooms, profiles, sockets, send(_ws, packet) { packets.push(packet); }, ok(_ws, requestId, type, payload) { packets.push({ requestId, type, payload }); }, fail(_ws, requestId, message) { packets.push({ requestId, type: "error", payload: { message } }); }, walletOf(value) { return String(value || "").toLowerCase(); }, profileFor(wallet) { return profiles.get(String(wallet || "").toLowerCase()); }, saveRoomSafe(room) { savedRooms.push(JSON.parse(JSON.stringify(room))); }, async saveHistoryEntry(entry) { history.push(entry); }, async getHistoryForWallet(wallet, gameId) { return history.filter((entry) => entry.wallet === wallet && (!gameId || entry.gameId === gameId)); } });
  return { service, rooms, packets, savedRooms, history, ws };
}
function payload(harness, type) { return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload; }

test("Bell Tablan uses opposite unique 48-cell boustrophedon routes", () => {
  assert.equal(ROUTES.aurora.length, 48);
  assert.equal(ROUTES.ember.length, 48);
  assert.equal(new Set(ROUTES.aurora).size, 48);
  assert.equal(new Set(ROUTES.ember).size, 48);
  assert.deepEqual(ROUTES.aurora.slice(0,3), ["t3-0","t3-1","t3-2"]);
  assert.deepEqual(ROUTES.aurora.slice(12,15), ["t2-11","t2-10","t2-9"]);
  assert.deepEqual(ROUTES.ember.slice(0,3), ["t0-11","t0-10","t0-9"]);
  assert.equal(ROUTES.aurora.at(-1), "t0-0");
  assert.equal(ROUTES.ember.at(-1), "t3-11");
});

test("the Bell stick table scores only 2, 8 and 12", () => {
  assert.deepEqual(scoreSticks([1,0,0,0]), { plainUp: 1, value: 2, scores: true });
  assert.deepEqual(scoreSticks([1,1,1,1]), { plainUp: 4, value: 8, scores: true });
  assert.deepEqual(scoreSticks([0,0,0,0]), { plainUp: 0, value: 12, scores: true });
  assert.equal(scoreSticks([1,1,0,0]).value, 0);
  assert.equal(scoreSticks([1,1,1,0]).value, 0);
});

test("untouched runners require 2 and may split it into two first steps", () => {
  let state = createPolarTablanState();
  state = applyRoll(state, [1,0,0,0], "aurora").state;
  const actions = getLegalActions(state, "aurora");
  assert.equal(actions.some((action) => !action.split && action.value === 2), true);
  assert.equal(actions.some((action) => action.split && action.legs.length === 2 && action.legs.every((leg) => leg.amount === 1)), true);

  const blocked = createPolarTablanState();
  blocked.awaiting = "allocate";
  blocked.pendingRoll = { value: 8, plainUp: 4, faces: [1,1,1,1], splitValue: 4, throwNumber: 1 };
  assert.deepEqual(getLegalActions(blocked, "aurora"), [{ type: "forfeit-roll", value: 8 }]);
});

test("split 8 moves two distinct activated runners four squares each", () => {
  const state = createPolarTablanState();
  state.awaiting = "allocate";
  state.pendingRoll = { value: 8, plainUp: 4, faces: [1,1,1,1], splitValue: 4, throwNumber: 1 };
  state.pieces.aurora[0].started = true;
  state.pieces.aurora[1].started = true;
  const split = getLegalActions(state, "aurora").find((action) => action.split && action.legs[0].pieceId === "aurora-1" && action.legs[1].pieceId === "aurora-2");
  assert.ok(split);
  const result = applyAction(state, split, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.pieces.aurora[0].progress, 4);
  assert.equal(result.state.pieces.aurora[1].progress, 5);
  assert.equal(result.state.currentPlayer, "aurora");
  assert.equal(result.state.awaiting, "roll");
});

test("the finish-row drill captures a home runner, locks and scores the race", () => {
  const state = createFinishRowDrill();
  const action = getLegalActions(state, "aurora").find((candidate) => !candidate.split && candidate.legs[0].pieceId === "aurora-1");
  assert.ok(action);
  const result = applyAction(state, action, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.pieces.aurora[0].status, "locked");
  assert.equal(getPieceCell(result.state.pieces.aurora[0]), "t0-11");
  assert.equal(result.state.pieces.ember[0].status, "captured");
  assert.equal(result.state.winner, "aurora");
  assert.deepEqual(result.state.scores, { aurora: 1, ember: 0 });
});

test("authoritative rooms assign opposite convoys, own stick casts and reject wrong turns", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.ws, "create", { wallet: "0xember", side: "ember", visibility: "public" });
  const created = payload(harness, "pt_room_create_result").room;
  assert.equal(created.gameId, POLAR_TABLAN_RULESET.gameId);
  harness.service.joinRoom(harness.ws, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = payload(harness, "pt_room_join_result").room;
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").side, "aurora");

  harness.service.roll(harness.ws, "wrong", { wallet: "0xember", roomCode: created.roomCode });
  assert.match(payload(harness, "error").message, /not your turn/i);
  harness.service.roll(harness.ws, "roll", { wallet: "0xaurora", roomCode: created.roomCode });
  const rolled = payload(harness, "pt_game_roll_result").room;
  assert.equal(Array.isArray(rolled.gameState.lastRoll.faces), true);
  assert.equal(typeof rolled.gameState.lastRoll.proofHash, "string");
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Polar Tablan rooms restore and reconnect", () => {
  const first = makeHarness();
  first.service.createRoom(first.ws, "create", { wallet: "0xaurora", side: "aurora", visibility: "private" });
  const serialized = JSON.parse(JSON.stringify([...first.rooms.values()][0]));
  const restored = makeHarness(); restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.ws, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  assert.equal(payload(restored, "pt_game_state_result").room.rulesetVersion, POLAR_TABLAN_RULESET.rulesetVersion);
});

test("backend transformer installs Polar Tablan dispatch, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectPolarTablan(injectAuroraVulture(injectTwoStones(injectCowrieKingdoms(injectIceRings(injectSkyTempleRun(injectFortyGlacierGuards(injectCrownRun(injectGlacierTrail(injectSixteenIceWarriors(injectIceHunters(injectBreakTheIce(injectFishflow(injectFourWingIceHunt(injectNineIceForts(transformBackendSource(source))))))))))))))));
  assert.match(transformed, /createPolarTablanService/);
  assert.match(transformed, /type === "pt_game_roll"/);
  assert.match(transformed, /type === "pt_game_action"/);
  assert.match(transformed, /polarTablan\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsPolarTablan: true/);
});
