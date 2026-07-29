const fs = require("fs");
const path = require("path");
const Module = require("module");
const { transformBackendSource } = require("./loadPrizeBackend.js");
const multiGameBackend = require("./loadMultiGameBackend.js");
const sixteenBackend = require("./sixteenIceWarriorsBackendBootstrap.js");
const glacierBackend = require("./glacierTrailBackendBootstrap.js");
const crownBackend = require("./crownRunBackendBootstrap.js");
const guardBackend = require("./fortyGlacierGuardsBackendBootstrap.js");
const skyBackend = require("./skyTempleRunBackendBootstrap.js");
const ringsBackend = require("./iceRingsBackendBootstrap.js");
const cowrieBackend = require("./cowrieKingdomsBackendBootstrap.js");
const twoStonesBackend = require("./twoStonesBackendBootstrap.js");
const auroraVultureBackend = require("./auroraVultureBackendBootstrap.js");
const polarBackend = require("./polarTablanBackendBootstrap.js");
const ganjifaBackend = require("./auroraGanjifaBackendBootstrap.js");
const sigeBackend = require("./sigeBackendBootstrap.js");
const sevenBackend = require("./sevenIceRingsBackendBootstrap.js");

function injectKhasiFishflow(source) {
  let transformed = source;
  const serviceRequire = 'const { createSevenIceRingsService } = require("./sevenIceRingsService.js");';
  if (!transformed.includes('require("./khasiFishflowService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Seven Ice Rings service require for Khasi Fishflow.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createKhasiFishflowService } = require("./khasiFishflowService.js");`);
  }
  const previousInit = `const sevenIceRings = createSevenIceRingsService({
  rooms,
  profiles,
  sockets,
  send,
  ok,
  fail,
  walletOf,
  profileFor,
  saveRoomSafe,
  saveHistoryEntry,
  getHistoryForWallet
});`;
  const nextInit = `${previousInit}
const khasiFishflow = createKhasiFishflowService({
  rooms,
  profiles,
  sockets,
  send,
  ok,
  fail,
  walletOf,
  profileFor,
  saveRoomSafe,
  saveHistoryEntry,
  getHistoryForWallet
});`;
  if (!transformed.includes("const khasiFishflow = createKhasiFishflowService")) {
    if (!transformed.includes(previousInit)) throw new Error("Unable to locate Seven Ice Rings initializer for Khasi Fishflow.");
    transformed = transformed.replace(previousInit, nextInit);
  }
  const scheduleNeedle = '"seven-ice-rings"].includes(room?.gameId)) return;';
  if (!transformed.includes('"khasi-fishflow"].includes(room?.gameId)')) transformed = transformed.replace(scheduleNeedle, '"seven-ice-rings", "khasi-fishflow"].includes(room?.gameId)) return;');
  const dispatchNeedle = `if (type === "sir_my_rooms") return sevenIceRings.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "sir_my_rooms") return sevenIceRings.myRooms(ws, requestId, payload);
    if (type === "kf_room_list") return khasiFishflow.listRooms(ws, requestId, payload);
    if (type === "kf_room_create") return khasiFishflow.createRoom(ws, requestId, payload);
    if (type === "kf_room_join") return khasiFishflow.joinRoom(ws, requestId, payload);
    if (type === "kf_game_state") return khasiFishflow.getState(ws, requestId, payload);
    if (type === "kf_game_action") return khasiFishflow.action(ws, requestId, payload);
    if (type === "kf_legal_actions") return khasiFishflow.legalActions(ws, requestId, payload);
    if (type === "kf_history") return khasiFishflow.history(ws, requestId, payload);
    if (type === "kf_my_rooms") return khasiFishflow.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "kf_room_create"')) transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  const restoreNeedle = 'sevenIceRings.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("khasiFishflow.restoreRoom(room)")) transformed = transformed.replace(restoreNeedle, 'sevenIceRings.restoreRoom(room); khasiFishflow.restoreRoom(room); if (room.status === "waiting"');
  const healthNeedle = "supportsSevenIceRings: true, antiCheat:";
  if (!transformed.includes("supportsKhasiFishflow: true")) transformed = transformed.replace(healthNeedle, "supportsSevenIceRings: true, supportsKhasiFishflow: true, antiCheat:");
  return transformed;
}

function loadKhasiFishflowBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
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
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}
function installKhasiFishflowBackend() { multiGameBackend.loadMultiGameBackend = loadKhasiFishflowBackend; return multiGameBackend; }
installKhasiFishflowBackend();
module.exports = { injectKhasiFishflow, loadKhasiFishflowBackend, installKhasiFishflowBackend };
