const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createIceHuntersService } = require("../iceHuntersService.js");
const {
  ICE_HUNTERS_RULESET,
  NODES,
  STARTING_TIGERS,
  applyAction,
  createIceHuntersState,
  getLegalActions,
  getTigerActions
} = require("../iceHuntersRules.js");
const {
  injectBreakTheIce,
  injectFishflow,
  injectFourWingIceHunt,
  injectIceHunters,
  injectNineIceForts
} = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function makeHarness() {
  const rooms = new Map();
  const profiles = new Map([
    ["0xgoats", { wallet: "0xgoats", name: "Colony Player" }],
    ["0xtigers", { wallet: "0xtigers", name: "Hunter Player" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const wsGoats = { readyState: 1, send() {} };
  const wsTigers = { readyState: 1, send() {} };
  const service = createIceHuntersService({
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
    }
  });
  return { service, rooms, packets, savedRooms, history, wsGoats, wsTigers };
}

function lastPayload(harness, type) {
  return [...harness.packets].reverse().find((packet) => packet.type === type)?.payload;
}

test("standard opening places four tigers at the corners and gives goats the first turn", () => {
  const state = createIceHuntersState();
  assert.equal(NODES.length, 25);
  assert.deepEqual(STARTING_TIGERS, ["n00", "n40", "n04", "n44"]);
  STARTING_TIGERS.forEach((nodeId) => assert.equal(state.board[nodeId], "tigers"));
  assert.equal(state.currentPlayer, "goats");
  assert.equal(getLegalActions(state).length, 21);
});

test("goats deploy before moving and tigers move immediately", () => {
  const state = createIceHuntersState();
  const placed = applyAction(state, { type: "place", nodeId: "n22" }, "goats");
  assert.equal(placed.error, null);
  assert.equal(placed.state.goatsPlaced, 1);
  assert.equal(placed.state.currentPlayer, "tigers");
  assert.equal(getLegalActions(placed.state, "tigers").some((action) => action.type === "move"), true);

  const goatTurn = { ...placed.state, currentPlayer: "goats" };
  assert.equal(getLegalActions(goatTurn, "goats").every((action) => action.type === "place"), true);
});

test("a hunter jumps one adjacent goat and the turn passes without a capture chain", () => {
  const state = createIceHuntersState();
  const placed = applyAction(state, { type: "place", nodeId: "n11" }, "goats");
  const capture = getLegalActions(placed.state, "tigers").find((action) => action.type === "capture" && action.from === "n00" && action.over === "n11" && action.to === "n22");
  assert.ok(capture);
  const result = applyAction(placed.state, capture, "tigers");
  assert.equal(result.error, null);
  assert.equal(result.state.board.n11, null);
  assert.equal(result.state.board.n22, "tigers");
  assert.equal(result.state.goatsCaptured, 1);
  assert.equal(result.state.currentPlayer, "goats");
});

test("capturing the fifth goat wins for the hunters", () => {
  const state = createIceHuntersState();
  state.currentPlayer = "tigers";
  state.goatsCaptured = 4;
  state.goatsPlaced = 5;
  state.board.n11 = "goats";
  const capture = getLegalActions(state, "tigers").find((action) => action.type === "capture" && action.from === "n00" && action.to === "n22");
  const result = applyAction(state, capture, "tigers");
  assert.equal(result.state.winner, "tigers");
  assert.equal(result.state.winReason, "five-goats-captured");
});

test("the colony wins when all four hunters have no move or capture", () => {
  const state = createIceHuntersState();
  const nonCorners = NODES.map((node) => node.id).filter((nodeId) => !STARTING_TIGERS.includes(nodeId));
  const emptyAfterPlacement = "n21";
  const finalPlacement = "n12";
  nonCorners
    .filter((nodeId) => nodeId !== emptyAfterPlacement && nodeId !== finalPlacement)
    .forEach((nodeId) => { state.board[nodeId] = "goats"; });
  state.goatsPlaced = 19;
  state.currentPlayer = "goats";

  const result = applyAction(state, { type: "place", nodeId: finalPlacement }, "goats");
  assert.equal(result.error, null);
  assert.equal(getTigerActions({ ...result.state, currentPlayer: "tigers", winner: null }).length, 0);
  assert.equal(result.state.winner, "goats");
  assert.equal(result.state.winReason, "all-tigers-trapped");
});

test("service assigns opposite roles and rejects out-of-turn actions", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsGoats, "create", { wallet: "0xgoats", visibility: "public", role: "goats" });
  const created = lastPayload(harness, "ih_room_create_result").room;
  assert.equal(created.gameId, ICE_HUNTERS_RULESET.gameId);
  assert.equal(created.status, "waiting");
  assert.equal(created.players[0].role, "goats");

  harness.service.joinRoom(harness.wsTigers, "join", { wallet: "0xtigers", roomCode: created.roomCode });
  const joined = lastPayload(harness, "ih_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xtigers").role, "tigers");

  harness.service.action(harness.wsTigers, "wrong", { wallet: "0xtigers", roomCode: created.roomCode, action: { type: "move", from: "n00", to: "n10" } });
  assert.match(lastPayload(harness, "error").message, /not your turn/i);

  harness.service.action(harness.wsGoats, "place", { wallet: "0xgoats", roomCode: created.roomCode, action: { type: "place", nodeId: "n22" } });
  const updated = lastPayload(harness, "ih_game_action_result").room;
  assert.equal(updated.gameState.board.n22, "goats");
  assert.equal(updated.gameState.currentPlayer, "tigers");
  assert.ok(harness.savedRooms.length >= 3);
});

test("persisted Ice Hunters rooms restore and reconnect", () => {
  const harness = makeHarness();
  harness.service.createRoom(harness.wsTigers, "create", { wallet: "0xtigers", visibility: "private", role: "tigers" });
  const original = [...harness.rooms.values()][0];
  const serialized = JSON.parse(JSON.stringify(original));
  const restoredHarness = makeHarness();
  restoredHarness.rooms.set(serialized.roomCode, serialized);
  assert.equal(restoredHarness.service.restoreRoom(serialized), true);
  restoredHarness.service.getState(restoredHarness.wsTigers, "resume", { wallet: "0xtigers", roomCode: serialized.roomCode });
  const resumed = lastPayload(restoredHarness, "ih_game_state_result").room;
  assert.equal(resumed.roomCode, serialized.roomCode);
  assert.equal(resumed.rulesetVersion, ICE_HUNTERS_RULESET.rulesetVersion);
  assert.equal(resumed.players[0].role, "tigers");
});

test("backend transformer installs Ice Hunters handlers, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectIceHunters(
    injectBreakTheIce(
      injectFishflow(
        injectFourWingIceHunt(
          injectNineIceForts(transformBackendSource(source))
        )
      )
    )
  );
  assert.match(transformed, /createIceHuntersService/);
  assert.match(transformed, /type === "ih_room_create"/);
  assert.match(transformed, /type === "ih_game_action"/);
  assert.match(transformed, /iceHunters\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsIceHunters: true/);
});
