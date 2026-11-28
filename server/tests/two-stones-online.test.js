const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { TWO_STONES_RULESET, POINTS, EDGES, ADJACENCY, applyAction, createLockDrill, createTwoStonesState, getLegalActions, solveGameGraph } = require("../twoStonesRules.js");
const { createTwoStonesService } = require("../twoStonesService.js");
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
  const profiles = new Map([["0xblue", { wallet: "0xblue", name: "Blue" }], ["0xcoral", { wallet: "0xcoral", name: "Coral" }]]);
  const packets = []; const savedRooms = []; const history = []; const sockets = new Map(); const ws = { readyState: 1, authorizedWallet: '0xblue', send() {} };
  const service = createTwoStonesService({ rooms, profiles, sockets, send(_ws, packet) { packets.push(packet); }, ok(_ws, requestId, type, payload) { packets.push({ requestId, type, payload }); }, fail(_ws, requestId, message) { packets.push({ requestId, type: "error", payload: { message } }); }, walletOf(value) { return String(value || "").toLowerCase(); }, profileFor(wallet) { return profiles.get(String(wallet || "").toLowerCase()); }, saveRoomSafe(room) { savedRooms.push(JSON.parse(JSON.stringify(room))); }, async saveHistoryEntry(entry) { history.push(entry); }, async getHistoryForWallet(wallet, gameId) { return history.filter((entry) => entry.wallet === wallet && (!gameId || entry.gameId === gameId)); } });
  return { service, rooms, packets, savedRooms, history, ws };
}
function payload(harness, type) { return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload; }

test("Do-guti uses five points, seven links, two stones each and no top edge", () => {
  assert.equal(POINTS.length, 5); assert.equal(EDGES.length, 7); assert.equal(ADJACENCY.nw.includes("ne"), false); assert.equal(ADJACENCY.nw.includes("c"), true);
  const state = createTwoStonesState(); assert.equal(state.pieces.blue.length, 2); assert.equal(state.pieces.coral.length, 2); assert.equal(state.phase, "placement");
});

test("placement alternates, movement follows links and there is no capture", () => {
  let state = createTwoStonesState();
  for (const to of ["nw", "ne", "sw", "se"]) { const action = getLegalActions(state).find((candidate) => candidate.to === to); const result = applyAction(state, action); assert.equal(result.error, null); state = result.state; }
  assert.equal(state.phase, "movement"); assert.equal(state.pieces.blue.every((piece) => piece.point), true); assert.equal(state.pieces.coral.every((piece) => piece.point), true);
  assert.equal(getLegalActions(state).every((action) => action.type === "move" && EDGES.some(([a,b]) => (a === action.from && b === action.to) || (b === action.from && a === action.to))), true);
});

test("the one-move drill has one winning lock", () => {
  const state = createLockDrill(); const actions = getLegalActions(state, "blue"); assert.equal(actions.length, 2);
  const winning = actions.find((action) => action.from === "nw" && action.to === "c"); const result = applyAction(state, winning, "blue");
  assert.equal(result.error, null); assert.equal(result.state.winner, "blue"); assert.equal(result.state.winReason, "immobilization"); assert.equal(result.state.pieces.coral.length, 2);
});

test("complete graph solution marks the empty opening as a draw", () => {
  const solved = solveGameGraph(); assert.equal(solved.reachableStates, 114); assert.equal(solved.win, 12); assert.equal(solved.loss, 4); assert.equal(solved.draw, 98); assert.equal(solved.opening, "draw");
});

test("authoritative rooms assign opposite sides and reject wrong turns", () => {
  const harness = makeHarness(); harness.ws.authorizedWallet = '0xcoral'; harness.service.createRoom(harness.ws, "create", { wallet: "0xcoral", side: "coral", visibility: "public" }); const created = payload(harness, "ts_room_create_result").room;
  assert.equal(created.gameId, TWO_STONES_RULESET.gameId); assert.equal(created.players[0].side, "coral");
  harness.ws.authorizedWallet = '0xblue';
  harness.service.joinRoom(harness.ws, "join", { wallet: "0xblue", roomCode: created.roomCode }); const joined = payload(harness, "ts_room_join_result").room; assert.equal(joined.status, "playing");
  harness.ws.authorizedWallet = '0xcoral';
  harness.service.action(harness.ws, "wrong", { wallet: "0xcoral", roomCode: created.roomCode, action: { type: "place", pieceId: "coral-1", to: "c" } }); assert.match(payload(harness, "error").message, /not your turn/i);
  harness.ws.authorizedWallet = '0xblue';
  const action = getLegalActions(joined.gameState, "blue").find((candidate) => candidate.to === "c"); harness.service.action(harness.ws, "move", { wallet: "0xblue", roomCode: created.roomCode, action }); const updated = payload(harness, "ts_game_action_result").room; assert.equal(updated.gameState.pieces.blue[0].point, "c"); assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Two Stones rooms restore and reconnect", () => {
  const first = makeHarness(); first.service.createRoom(first.ws, "create", { wallet: "0xblue", side: "blue", visibility: "private" }); const serialized = JSON.parse(JSON.stringify([...first.rooms.values()][0]));
  const restored = makeHarness(); restored.rooms.set(serialized.roomCode, serialized); assert.equal(restored.service.restoreRoom(serialized), true); restored.service.getState(restored.ws, "resume", { wallet: "0xblue", roomCode: serialized.roomCode }); assert.equal(payload(restored, "ts_game_state_result").room.rulesetVersion, TWO_STONES_RULESET.rulesetVersion);
});

test('Two Stones rejects missing IDs and malformed replay metadata without advancing the board', () => {
  const h = makeHarness();
  h.service.createRoom(h.ws, 'create', { wallet: '0xblue' });
  const room = [...h.rooms.values()][0];
  h.ws.authorizedWallet = '0xcoral'; h.service.joinRoom(h.ws, 'join', { wallet: '0xcoral', roomCode: room.roomCode });
  h.ws.authorizedWallet = '0xblue';
  const move = { wallet: '0xblue', roomCode: room.roomCode, action: { type: 'place', pieceId: 'blue-1', to: 'nw' } };
  for (const requestId of [undefined, null, '', 'x'.repeat(129), 1.5]) {
    h.service.action(h.ws, requestId, move);
    assert.match(payload(h, 'error').message, /unique request identifier/);
    assert.equal(room.gameState.ply, 0);
  }
  for (const invalid of [null, false, 0, '', {}, ['bad-hash']]) {
    room.acceptedActionRequestHashes = invalid;
    h.service.action(h.ws, 'new-action', move);
    assert.match(payload(h, 'error').message, /Saved move receipts/);
    assert.equal(room.gameState.ply, 0);
  }
});

test('Two Stones retains every accepted request through the 44-ply bound and distinguishes identifier types', () => {
  const h = makeHarness();
  h.service.createRoom(h.ws, 'create', { wallet: '0xblue' });
  const room = [...h.rooms.values()][0];
  h.ws.authorizedWallet = '0xcoral'; h.service.joinRoom(h.ws, 'join', { wallet: '0xcoral', roomCode: room.roomCode });
  const moves = [['0xblue', 1, 'blue-1', 'nw'], ['0xcoral', 'coral', 'coral-1', 'ne'], ['0xblue', '1', 'blue-2', 'sw']];
  for (const [wallet, requestId, pieceId, to] of moves) {
    h.ws.authorizedWallet = wallet;
    h.service.action(h.ws, requestId, { wallet, roomCode: room.roomCode, action: { type: 'place', pieceId, to } });
    assert.equal(payload(h, 'ts_game_action_result').room.gameState.ply, room.gameState.ply);
  }
  assert.equal(room.gameState.ply, 3); assert.equal(new Set(room.acceptedActionRequestHashes).size, 3);
  const limit = TWO_STONES_RULESET.players * TWO_STONES_RULESET.piecesPerPlayer + TWO_STONES_RULESET.movementPlyLimit;
  assert.equal(limit, 44);
  room.acceptedActionRequestHashes = Array.from({ length: limit }, (_, i) => i.toString(16).padStart(64, '0'));
  const before = JSON.stringify(room), records = room.acceptedActionRequestHashes.slice();
  h.ws.authorizedWallet = '0xcoral';
  h.service.action(h.ws, 'new', { wallet: '0xcoral', roomCode: room.roomCode, action: { type: 'place', pieceId: 'coral-2', to: 'se' } });
  assert.match(payload(h, 'error').message, /recorded move limit/);
  assert.equal(JSON.stringify(room), before); assert.deepEqual(room.acceptedActionRequestHashes, records);
});

test("backend transformer installs Two Stones dispatch restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectTwoStones(injectCowrieKingdoms(injectIceRings(injectSkyTempleRun(injectFortyGlacierGuards(injectCrownRun(injectGlacierTrail(injectSixteenIceWarriors(injectIceHunters(injectBreakTheIce(injectFishflow(injectFourWingIceHunt(injectNineIceForts(transformBackendSource(source))))))))))))));
  assert.match(transformed, /createTwoStonesService/); assert.match(transformed, /type === "ts_room_create"/); assert.match(transformed, /type === "ts_game_action"/); assert.match(transformed, /twoStones\.restoreRoom\(room\)/); assert.match(transformed, /supportsTwoStones: true/);
});
