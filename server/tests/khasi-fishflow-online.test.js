const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  KHASI_FISHFLOW_RULESET,
  activeRoute,
  applyAction,
  assertCounterInvariant,
  createKhasiCaptureDrill,
  createKhasiFishflowState,
  getCounts,
  getLegalActions
} = require("../khasiFishflowRules.js");
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
  const profiles = new Map([
    ["0xaurora", { wallet: "0xaurora", name: "Aurora Sower" }],
    ["0xember", { wallet: "0xember", name: "Ember Sower" }]
  ]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const ws = { readyState: 1, send() {} };
  const service = createKhasiFishflowService({
    rooms, profiles, sockets,
    send(_socket, packet) { packets.push(packet); },
    ok(_socket, requestId, type, payload) { packets.push({ requestId, type, payload }); },
    fail(_socket, requestId, message) { packets.push({ requestId, type: "error", payload: { message } }); },
    walletOf(value) { return String(value || "").toLowerCase(); },
    profileFor(wallet) { return profiles.get(String(wallet || "").toLowerCase()); },
    saveRoomSafe(room) { savedRooms.push(JSON.parse(JSON.stringify(room))); },
    async saveHistoryEntry(entry) { history.push(entry); },
    async getHistoryForWallet(wallet, gameId) { return history.filter((entry) => entry.wallet === wallet && (!gameId || entry.gameId === gameId)); }
  });
  return { service, rooms, packets, savedRooms, history, ws };
}
function lastPayload(h, type) { return [...h.packets].reverse().find((packet) => packet.type === type)?.payload; }

 test("Mawkar Katiya opens with two rows of seven and five stones per pit", () => {
  const state = createKhasiFishflowState();
  assert.equal(state.rows.aurora.length, 7);
  assert.equal(state.rows.ember.length, 7);
  assert.deepEqual(state.rows.aurora, Array(7).fill(5));
  assert.equal(getCounts(state).aurora.total, 35);
  assert.equal(getCounts(state).ember.total, 35);
  assert.equal(activeRoute(state).length, 14);
  assert.equal(assertCounterInvariant(state), true);
});

test("relay from an occupied landing ends on an empty pit and captures the opposite pit", () => {
  const state = createKhasiCaptureDrill();
  const action = getLegalActions(state, "aurora").find((candidate) => candidate.pitIndex === 0);
  assert.ok(action);
  const result = applyAction(state, action, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.lastTurn.relays, 1);
  assert.equal(result.state.lastTurn.captured, 5);
  assert.deepEqual(result.state.lastTurn.capturePit, { player: "ember", pitIndex: 3 });
  assert.equal(result.state.rows.ember[3], 0);
  assert.equal(result.state.stores.aurora, 35);
  assert.equal(assertCounterInvariant(result.state), true);
});

test("round refill creates inactive handicap pits and alternates the starter", () => {
  const state = createKhasiFishflowState();
  state.rows.aurora = [1, 0, 0, 0, 0, 0, 0];
  state.rows.ember = [0, 0, 0, 0, 0, 0, 0];
  state.stores = { aurora: 39, ember: 30 };
  state.currentPlayer = "aurora";
  const result = applyAction(state, { type: "sow", pitIndex: 0 }, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.round, 2);
  assert.equal(result.state.roundStarter, "ember");
  assert.equal(result.state.activePits.aurora, 7);
  assert.equal(result.state.activePits.ember, 6);
  assert.equal(result.state.rows.ember[6], 0);
  assert.equal(assertCounterInvariant(result.state), true);
});

test("match ends when one side cannot refill a five-stone pit", () => {
  const state = createKhasiFishflowState();
  state.rows.aurora = [1, 0, 0, 0, 0, 0, 0];
  state.rows.ember = [0, 0, 0, 0, 0, 0, 0];
  state.stores = { aurora: 65, ember: 4 };
  const result = applyAction(state, { type: "sow", pitIndex: 0 }, "aurora");
  assert.equal(result.state.winner, "aurora");
  assert.equal(result.state.winReason, "cannot-refill-pit");
});

test("service assigns opposite sides, rejects wrong turn and persists rooms", () => {
  const h = harness();
  h.service.createRoom(h.ws, "create", { wallet: "0xember", visibility: "public", side: "ember" });
  const created = lastPayload(h, "kf_room_create_result").room;
  assert.equal(created.gameId, KHASI_FISHFLOW_RULESET.gameId);
  h.service.joinRoom(h.ws, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = lastPayload(h, "kf_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").side, "aurora");
  h.service.action(h.ws, "wrong", { wallet: "0xember", roomCode: created.roomCode, action: { type: "sow", pitIndex: 0 } });
  assert.match(lastPayload(h, "error").message, /not your turn/i);
  h.service.action(h.ws, "move", { wallet: "0xaurora", roomCode: created.roomCode, action: { type: "sow", pitIndex: 0 } });
  assert.equal(lastPayload(h, "kf_game_action_result").room.gameState.turn, 2);
  assert.ok(h.savedRooms.length >= 3);
});

test("persisted Khasi Fishflow rooms restore and reconnect", () => {
  const h = harness();
  h.service.createRoom(h.ws, "create", { wallet: "0xaurora", visibility: "private", side: "aurora" });
  const serialized = JSON.parse(JSON.stringify([...h.rooms.values()][0]));
  const restored = harness();
  restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.ws, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  assert.equal(lastPayload(restored, "kf_game_state_result").room.rulesetVersion, KHASI_FISHFLOW_RULESET.rulesetVersion);
});

test("backend transformer installs kf dispatch, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectKhasiFishflow(
    sevenBackend.injectSevenIceRings(
      sigeBackend.injectSige(
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
      )
    )
  );
  assert.match(transformed, /createKhasiFishflowService/);
  assert.match(transformed, /type === "kf_room_create"/);
  assert.match(transformed, /khasiFishflow\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsKhasiFishflow: true/);
});
