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

function injectAuroraGanjifa(source) {
  let transformed = source;
  const serviceRequire = 'const { createPolarTablanService } = require("./polarTablanService.js");';
  if (!transformed.includes('require("./auroraGanjifaService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Polar Tablan service require for Aurora Ganjifa.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createAuroraGanjifaService } = require("./auroraGanjifaService.js");`);
  }
  const polarInit = `const polarTablan = createPolarTablanService({
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
  const ganjifaInit = `${polarInit}
const auroraGanjifa = createAuroraGanjifaService({
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
  if (!transformed.includes("const auroraGanjifa = createAuroraGanjifaService")) {
    if (!transformed.includes(polarInit)) throw new Error("Unable to locate Polar Tablan initializer for Aurora Ganjifa.");
    transformed = transformed.replace(polarInit, ganjifaInit);
  }
  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones", "aurora-vulture", "polar-tablan"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones", "aurora-vulture", "polar-tablan", "aurora-ganjifa-academy"].includes(room?.gameId)) return;';
  if (!transformed.includes('"aurora-ganjifa-academy"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage bot guard for Aurora Ganjifa.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }
  const dispatchNeedle = `if (type === "pt_my_rooms") return polarTablan.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "pt_my_rooms") return polarTablan.myRooms(ws, requestId, payload);
    if (type === "ag_room_list") return auroraGanjifa.listRooms(ws, requestId, payload);
    if (type === "ag_room_create") return auroraGanjifa.createRoom(ws, requestId, payload);
    if (type === "ag_room_join") return auroraGanjifa.joinRoom(ws, requestId, payload);
    if (type === "ag_game_state") return auroraGanjifa.getState(ws, requestId, payload);
    if (type === "ag_game_action") return auroraGanjifa.action(ws, requestId, payload);
    if (type === "ag_legal_actions") return auroraGanjifa.legalActions(ws, requestId, payload);
    if (type === "ag_history") return auroraGanjifa.history(ws, requestId, payload);
    if (type === "ag_my_rooms") return auroraGanjifa.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "ag_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate Polar Tablan dispatch tail for Aurora Ganjifa.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }
  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); auroraVulture.restoreRoom(room); polarTablan.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); auroraVulture.restoreRoom(room); polarTablan.restoreRoom(room); auroraGanjifa.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("auroraGanjifa.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate room restoration loop for Aurora Ganjifa.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }
  const healthNeedle = "supportsPolarTablan: true, antiCheat:";
  const healthReplacement = "supportsPolarTablan: true, supportsAuroraGanjifa: true, privateCardState: true, antiCheat:";
  if (!transformed.includes("supportsAuroraGanjifa: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate health capability list for Aurora Ganjifa.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }
  return transformed;
}

function loadAuroraGanjifaBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectAuroraGanjifa(
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
  );
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}
function installAuroraGanjifaBackend() { multiGameBackend.loadMultiGameBackend = loadAuroraGanjifaBackend; return multiGameBackend; }
installAuroraGanjifaBackend();
module.exports = { injectAuroraGanjifa, loadAuroraGanjifaBackend, installAuroraGanjifaBackend };
