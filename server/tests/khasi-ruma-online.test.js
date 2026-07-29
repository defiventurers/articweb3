const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { KHASI_FISHFLOW_RULESET, PIT_IDS, applyAction, createKhasiCaptureDrill, createKhasiFishflowState, getLegalActions, assertStateInvariant } = require("../khasiFishflowRules.js");
const { createKhasiFishflowService } = require("../khasiFishflowService.js");
const { RUMA_RULESET, applyRumaMove, createLastPebbleDrill, createRumaState, getWinningStarts } = require("../rumaIcePuzzleRules.js");
const { injectKhasiFishflow } = require("../khasiRumaBackendBootstrap.js");
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
const multi = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function harness() {
  const rooms = new Map();
  const profiles = new Map([["0xaurora", { name: "Aurora" }], ["0xember", { name: "Ember" }]]);
  const sockets = new Map();
  const packets = [];
  const saved = [];
  const history = [];
  const service = createKhasiFishflowService({
    rooms, profiles, sockets,
    send(_ws, packet) { packets.push(packet); },
    ok(_ws, requestId, type, payload) { packets.push({ requestId, type, payload }); },
    fail(_ws, requestId, message) { packets.push({ requestId, type: "error", payload: { message } }); },
    walletOf(value) { return String(value || "").toLowerCase(); },
    profileFor(wallet) { return profiles.get(wallet); },
    saveRoomSafe(room) { saved.push(JSON.parse(JSON.stringify(room))); },
    async saveHistoryEntry(entry) { history.push(entry); },
    async getHistoryForWallet(wallet, gameId) { return history.filter((entry) => entry.wallet === wallet && entry.gameId === gameId); }
  });
  return { service, rooms, packets, saved, history, wsA: {}, wsE: {} };
}
function payload(h, type) { return [...h.packets].reverse().find((packet) => packet.type === type)?.payload; }

test("Mawkar Katiya opens with fourteen pits, five stones each and seventy total", () => {
  const state = createKhasiFishflowState();
  assert.equal(PIT_IDS.length, 14);
  assert.equal(PIT_IDS.reduce((sum, id) => sum + state.pits[id], 0), 70);
  assert.equal(getLegalActions(state, "aurora").length, 7);
  assert.equal(assertStateInvariant(state), true);
});

test("the relay stops beside an empty pit and captures from the opposite row", () => {
  const state = createKhasiCaptureDrill();
  const result = applyAction(state, { type: "sow", pitId: "a0" }, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.lastMove.gapPit, "a2");
  assert.equal(result.state.lastMove.capturePit, "e2");
  assert.equal(result.state.lastMove.captured, 4);
  assert.equal(result.state.stores.aurora, 4);
});

test("reactive handicap capture and shrinking round setup are deterministic", () => {
  const state = createKhasiFishflowState();
  for (const id of PIT_IDS) state.pits[id] = 0;
  state.pits.a0 = 1;
  state.pits.a1 = 1;
  state.pits.e2 = 68;
  state.handicapValue.ember = 2;
  const result = applyAction(state, { type: "sow", pitId: "a0" }, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.lastMove.opponentHandicapCapture, 2);
  assert.equal(result.state.round, 2);
  assert.equal(result.state.fullSide, "aurora");
  assert.equal(result.state.reserves.aurora, 33);
  assert.equal(result.state.partialPit.ember, "e6");
  assert.equal(result.state.pits.e6, 2);
  assert.equal(result.state.active.e5, false);
  assert.equal(assertStateInvariant(result.state), true);
});

test("Khasi service assigns opposite sides and rejects a wrong turn", () => {
  const h = harness();
  h.service.createRoom(h.wsE, "create", { wallet: "0xember", visibility: "public", side: "ember" });
  const room = payload(h, "kf_room_create_result").room;
  h.service.joinRoom(h.wsA, "join", { wallet: "0xaurora", roomCode: room.roomCode });
  const joined = payload(h, "kf_room_join_result").room;
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").side, "aurora");
  h.service.action(h.wsE, "wrong", { wallet: "0xember", roomCode: room.roomCode, action: { type: "sow", pitId: "e6" } });
  assert.match(payload(h, "error").message, /not your turn/i);
  h.service.action(h.wsA, "move", { wallet: "0xaurora", roomCode: room.roomCode, action: { type: "sow", pitId: "a0" } });
  assert.equal(payload(h, "kf_game_action_result").room.gameState.turn, 2);
  assert.ok(h.saved.length >= 3);
});

test("classic Tchuka Ruma has winning starts and loses on an empty ordinary pit", () => {
  const state = createRumaState();
  const winning = getWinningStarts(state);
  assert.ok(winning.length >= 1);
  const losingStart = [0, 1, 2, 3].find((pit) => !winning.includes(pit));
  if (losingStart !== undefined) assert.equal(applyRumaMove(state, losingStart).state.status, "lost");
  assert.equal(RUMA_RULESET.totalSeeds, 8);
});

test("the last-pebble drill finishes directly in the Ruma", () => {
  const result = applyRumaMove(createLastPebbleDrill(), 3);
  assert.equal(result.error, null);
  assert.equal(result.state.status, "won");
  assert.deepEqual(result.state.pits, [0, 0, 0, 0]);
  assert.equal(result.state.ruma, 8);
});

test("backend transformer installs Khasi dispatch, restoration and both capabilities", () => {
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
                              multi.injectIceHunters(
                                multi.injectBreakTheIce(
                                  multi.injectFishflow(
                                    multi.injectFourWingIceHunt(
                                      multi.injectNineIceForts(transformBackendSource(source))
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
  assert.match(transformed, /type === "kf_game_action"/);
  assert.match(transformed, /khasiFishflow\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsKhasiFishflow: true/);
  assert.match(transformed, /supportsRumaIcePuzzle: true/);
});
