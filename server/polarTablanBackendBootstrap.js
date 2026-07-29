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

function injectPolarTablan(source) {
  let transformed = source;
  const serviceRequire = 'const { createAuroraVultureService } = require("./auroraVultureService.js");';
  if (!transformed.includes('require("./polarTablanService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Aurora Vulture service require for Polar Tablan.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createPolarTablanService } = require("./polarTablanService.js");`);
  }
  const auroraInit = `const auroraVulture = createAuroraVultureService({
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
  const polarInit = `${auroraInit}
const polarTablan = createPolarTablanService({
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
  if (!transformed.includes("const polarTablan = createPolarTablanService")) {
    if (!transformed.includes(auroraInit)) throw new Error("Unable to locate Aurora Vulture service initializer for Polar Tablan.");
    transformed = transformed.replace(auroraInit, polarInit);
  }
  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones", "aurora-vulture"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones", "aurora-vulture", "polar-tablan"].includes(room?.gameId)) return;';
  if (!transformed.includes('"polar-tablan"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage bot scheduler guard for Polar Tablan.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }
  const dispatchNeedle = `if (type === "av_my_rooms") return auroraVulture.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "av_my_rooms") return auroraVulture.myRooms(ws, requestId, payload);
    if (type === "pt_room_list") return polarTablan.listRooms(ws, requestId, payload);
    if (type === "pt_room_create") return polarTablan.createRoom(ws, requestId, payload);
    if (type === "pt_room_join") return polarTablan.joinRoom(ws, requestId, payload);
    if (type === "pt_game_state") return polarTablan.getState(ws, requestId, payload);
    if (type === "pt_game_roll") return polarTablan.roll(ws, requestId, payload);
    if (type === "pt_game_action") return polarTablan.action(ws, requestId, payload);
    if (type === "pt_legal_actions") return polarTablan.legalActions(ws, requestId, payload);
    if (type === "pt_history") return polarTablan.history(ws, requestId, payload);
    if (type === "pt_my_rooms") return polarTablan.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "pt_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate Aurora Vulture dispatch tail for Polar Tablan.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }
  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); auroraVulture.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); auroraVulture.restoreRoom(room); polarTablan.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("polarTablan.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate room restoration loop for Polar Tablan.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }
  const healthNeedle = "supportsAuroraVulture: true, antiCheat:";
  const healthReplacement = "supportsAuroraVulture: true, supportsPolarTablan: true, antiCheat:";
  if (!transformed.includes("supportsPolarTablan: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate health capabilities for Polar Tablan.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }
  return transformed;
}

function loadPolarTablanBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectPolarTablan(
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
  );
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}
function installPolarTablanBackend() { multiGameBackend.loadMultiGameBackend = loadPolarTablanBackend; return multiGameBackend; }
installPolarTablanBackend();
module.exports = { injectPolarTablan, loadPolarTablanBackend, installPolarTablanBackend };
