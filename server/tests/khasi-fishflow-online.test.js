const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { KHASI_FISHFLOW_RULESET, applyAction, createKhasiFishflowState, getLegalActions, assertInvariant } = require("../khasiFishflowRules.js");
const { createKhasiFishflowService } = require("../khasiFishflowService.js");
const { injectKhasiFishflow } = require("../khasiFishflowBackendBootstrap.js");
const sevenBackend = require("../sevenIceRingsBackendBootstrap.js");
const sigeBackend = require("../sigeBackendBootstrap.js");
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

function harness() {
  const rooms = new Map();
  const profiles = new Map([["0xblue", { wallet: "0xblue", name: "Blue" }], ["0xcoral", { wallet: "0xcoral", name: "Coral" }]]);
  const packets = []; const savedRooms = []; const history = []; const sockets = new Map(); const ws = { send() {} };
  const service = createKhasiFishflowService({ rooms, profiles, sockets, send(_ws, packet) { packets.push(packet); }, ok(_ws, requestId, type, payload) { packets.push({ requestId, type, payload }); }, fail(_ws, requestId, message) { packets.push({ requestId, type: "error", payload: { message } }); }, walletOf(value) { return String(value || "").toLowerCase(); }, profileFor(wallet) { return profiles.get(String(wallet).toLowerCase()); }, saveRoomSafe(room) { savedRooms.push(JSON.parse(JSON.stringify(room))); }, saveHistoryEntry(entry) { history.push(entry); }, async getHistoryForWallet(wallet, gameId) { return history.filter((entry) => entry.wallet === wallet && entry.gameId === gameId); } });
  return { service, rooms, packets, savedRooms, history, ws };
}
const last = (h, type) => [...h.packets].reverse().find((packet) => packet.type === type)?.payload;

test("Mawkar Katiya opens with two rows of seven and seventy counters", () => {
  const state = createKhasiFishflowState();
  assert.equal(state.rows.blue.length, 7);
  assert.equal(state.rows.coral.length, 7);
  assert.equal(state.rows.blue.reduce((a, b) => a + b, 0), 35);
  assert.equal(state.rows.coral.reduce((a, b) => a + b, 0), 35);
  assert.equal(assertInvariant(state), true);
});

test("clockwise move relays from the following occupied pit and conserves counters", () => {
  const state = createKhasiFishflowState();
  const action = getLegalActions(state, "blue")[0];
  const result = applyAction(state, action, "blue");
  assert.equal(result.error, null);
  assert.ok(result.state.lastTurn.relays >= 1);
  assert.equal(assertInvariant(result.state), true);
  assert.equal(result.state.currentPlayer, "coral");
});

test("service assigns opposite rows and rejects the wrong player", () => {
  const h = harness();
  h.service.createRoom(h.ws, "create", { wallet: "0xcoral", visibility: "private", side: "coral" });
  const created = last(h, "kf_room_create_result").room;
  assert.equal(created.gameId, KHASI_FISHFLOW_RULESET.gameId);
  h.service.joinRoom(h.ws, "join", { wallet: "0xblue", roomCode: created.roomCode });
  const joined = last(h, "kf_room_join_result").room;
  assert.equal(joined.status, "playing");
  h.service.action(h.ws, "wrong", { wallet: "0xcoral", roomCode: created.roomCode, action: { type: "sow", pitIndex: 0 } });
  assert.match(last(h, "error").message, /not your turn/i);
  h.service.action(h.ws, "move", { wallet: "0xblue", roomCode: created.roomCode, action: { type: "sow", pitIndex: 0 } });
  assert.ok(last(h, "kf_game_action_result").room.gameState.lastTurn);
  assert.ok(h.savedRooms.length >= 3);
});

test("persisted Khasi rooms restore and reconnect", () => {
  const h = harness();
  h.service.createRoom(h.ws, "create", { wallet: "0xblue", visibility: "private", side: "blue" });
  const room = JSON.parse(JSON.stringify([...h.rooms.values()][0]));
  assert.equal(h.service.restoreRoom(room), true);
  h.rooms.set(room.roomCode, room);
  h.service.getState(h.ws, "resume", { wallet: "0xblue", roomCode: room.roomCode });
  assert.equal(last(h, "kf_game_state_result").room.rulesetVersion, KHASI_FISHFLOW_RULESET.rulesetVersion);
});

test("backend transformer installs Khasi dispatch, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectKhasiFishflow(sevenBackend.injectSevenIceRings(sigeBackend.injectSige(ganjifaBackend.injectAuroraGanjifa(polarBackend.injectPolarTablan(auroraVultureBackend.injectAuroraVulture(twoStonesBackend.injectTwoStones(cowrieBackend.injectCowrieKingdoms(ringsBackend.injectIceRings(skyBackend.injectSkyTempleRun(guardBackend.injectFortyGlacierGuards(crownBackend.injectCrownRun(glacierBackend.injectGlacierTrail(sixteenBackend.injectSixteenIceWarriors(multiGameBackend.injectIceHunters(multiGameBackend.injectBreakTheIce(multiGameBackend.injectFishflow(multiGameBackend.injectFourWingIceHunt(multiGameBackend.injectNineIceForts(transformBackendSource(source))))))))))))))))))));
  assert.match(transformed, /createKhasiFishflowService/);
  assert.match(transformed, /type === "kf_room_create"/);
  assert.match(transformed, /khasiFishflow\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsKhasiFishflow: true/);
});
