const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  SAT_GOL_VARIANTS,
  SEVEN_ICE_RINGS_RULESET,
  applyAction,
  createDistantCaptureDrill,
  createSevenIceRingsState,
  forcedStartPit,
  getLegalActions,
  simulateSow
} = require("../sevenIceRingsRules.js");
const { createSevenIceRingsService } = require("../sevenIceRingsService.js");
const { injectSevenIceRings } = require("../sevenIceRingsBackendBootstrap.js");
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
  const profiles = new Map([["0xaurora", { wallet: "0xaurora", name: "Aurora" }], ["0xember", { wallet: "0xember", name: "Ember" }]]);
  const sockets = new Map(); const packets = []; const savedRooms = []; const history = []; const ws = { readyState: 1, send() {} };
  const service = createSevenIceRingsService({
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

test("Sat-gol opens with seven shared rings and twenty-eight stones", () => {
  const state = createSevenIceRingsState();
  assert.deepEqual(state.pits, [4, 4, 4, 4, 4, 4, 4]);
  assert.equal(state.pits.reduce((sum, value) => sum + value, 0), 28);
  assert.equal(getLegalActions(state).filter((action) => action.type === "sow").length, 7);
});

test("relay continues from the next ring and captures beyond the empty ring", () => {
  const result = simulateSow([1, 0, 0, 4, 0, 0, 0], 0);
  assert.equal(result.error, undefined);
  assert.equal(result.endpoint, 1);
  assert.equal(result.emptyPit, 2);
  assert.equal(result.capturePit, 3);
  assert.equal(result.captured, 4);
  assert.deepEqual(result.pits, [0, 1, 0, 0, 0, 0, 0]);
});

test("distant capture drill credits four stones and preserves the total", () => {
  const state = createDistantCaptureDrill();
  const action = getLegalActions(state, "aurora").find((candidate) => candidate.type === "sow" && candidate.pit === 0);
  assert.ok(action);
  const result = applyAction(state, action, "aurora");
  assert.equal(result.error, null);
  assert.equal(result.state.stores.aurora, 14);
  assert.equal(result.state.lastTurn.captured, 4);
  assert.equal(result.state.pits.reduce((sum, value) => sum + value, 0) + result.state.stores.aurora + result.state.stores.ember, 28);
});

test("forced-start variant chooses the first occupied ring after the previous endpoint", () => {
  const state = createSevenIceRingsState({ variant: "forced" });
  state.pits = [3, 0, 2, 0, 1, 0, 0]; state.stores = { aurora: 11, ember: 11 }; state.lastEndpoint = 0;
  assert.equal(forcedStartPit(state), 2);
  assert.deepEqual(getLegalActions(state).filter((action) => action.type === "sow").map((action) => action.pit), [2]);
  assert.equal(state.rulesetVersion, SAT_GOL_VARIANTS.forced.rulesetVersion);
});

test("mutual end agreement scores captures and ignores stones left on board", () => {
  const state = createSevenIceRingsState();
  state.pits = [1, 0, 0, 0, 0, 0, 0]; state.stores = { aurora: 15, ember: 12 }; state.captureQuietTurns = 2;
  const claim = getLegalActions(state, "aurora").find((action) => action.type === "claim-end");
  const claimed = applyAction(state, claim, "aurora").state;
  const accept = getLegalActions(claimed, "ember").find((action) => action.type === "accept-end");
  const ended = applyAction(claimed, accept, "ember").state;
  assert.equal(ended.winner, "aurora");
  assert.equal(ended.winReason, "mutual-no-more-captures");
  assert.equal(ended.pits[0], 1);
});

test("service creates labelled variants, rejects wrong turns and reconnects", () => {
  const h = harness();
  h.service.createRoom(h.ws, "create", { wallet: "0xember", visibility: "public", side: "ember", variant: "forced" });
  const created = lastPayload(h, "sir_room_create_result").room;
  assert.equal(created.gameId, SEVEN_ICE_RINGS_RULESET.gameId);
  assert.equal(created.rulesetVersion, SAT_GOL_VARIANTS.forced.rulesetVersion);
  h.service.joinRoom(h.ws, "join", { wallet: "0xaurora", roomCode: created.roomCode });
  const joined = lastPayload(h, "sir_room_join_result").room;
  assert.equal(joined.players.find((player) => player.wallet === "0xaurora").side, "aurora");
  h.service.action(h.ws, "wrong", { wallet: "0xember", roomCode: created.roomCode, action: { type: "sow", pit: 0 } });
  assert.match(lastPayload(h, "error").message, /not your turn/i);
  h.service.action(h.ws, "move", { wallet: "0xaurora", roomCode: created.roomCode, action: { type: "sow", pit: 0 } });
  const moved = lastPayload(h, "sir_game_action_result").room;
  assert.ok(moved.gameState.lastTurn);
  const serialized = JSON.parse(JSON.stringify([...h.rooms.values()][0]));
  const restored = harness(); restored.rooms.set(serialized.roomCode, serialized);
  assert.equal(restored.service.restoreRoom(serialized), true);
  restored.service.getState(restored.ws, "resume", { wallet: "0xaurora", roomCode: serialized.roomCode });
  assert.equal(lastPayload(restored, "sir_game_state_result").room.roomCode, serialized.roomCode);
});

test("backend transformer installs Seven Ice Rings dispatch, restore and health capability", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const transformed = injectSevenIceRings(
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
  );
  assert.match(transformed, /createSevenIceRingsService/);
  assert.match(transformed, /type === "sir_room_create"/);
  assert.match(transformed, /sevenIceRings\.restoreRoom\(room\)/);
  assert.match(transformed, /supportsSevenIceRings: true/);
});
