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

function injectAuroraVulture(source) {
  let transformed = source;

  const serviceRequire = 'const { createTwoStonesService } = require("./twoStonesService.js");';
  if (!transformed.includes('require("./auroraVultureService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Two Stones service require for Aurora Vulture.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createAuroraVultureService } = require("./auroraVultureService.js");`);
  }

  const twoStonesInit = `const twoStones = createTwoStonesService({
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
  const auroraVultureInit = `${twoStonesInit}
const auroraVulture = createAuroraVultureService({
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
  if (!transformed.includes("const auroraVulture = createAuroraVultureService")) {
    if (!transformed.includes(twoStonesInit)) throw new Error("Unable to locate Two Stones service initializer for Aurora Vulture.");
    transformed = transformed.replace(twoStonesInit, auroraVultureInit);
  }

  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones", "aurora-vulture"].includes(room?.gameId)) return;';
  if (!transformed.includes('"aurora-vulture"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage bot scheduler guard for Aurora Vulture.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }

  const dispatchNeedle = `if (type === "ts_my_rooms") return twoStones.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "ts_my_rooms") return twoStones.myRooms(ws, requestId, payload);
    if (type === "av_room_list") return auroraVulture.listRooms(ws, requestId, payload);
    if (type === "av_room_create") return auroraVulture.createRoom(ws, requestId, payload);
    if (type === "av_room_join") return auroraVulture.joinRoom(ws, requestId, payload);
    if (type === "av_game_state") return auroraVulture.getState(ws, requestId, payload);
    if (type === "av_game_action") return auroraVulture.action(ws, requestId, payload);
    if (type === "av_legal_actions") return auroraVulture.legalActions(ws, requestId, payload);
    if (type === "av_history") return auroraVulture.history(ws, requestId, payload);
    if (type === "av_my_rooms") return auroraVulture.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "av_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate Two Stones dispatch tail for Aurora Vulture.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }

  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); auroraVulture.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("auroraVulture.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate room restoration loop for Aurora Vulture.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }

  const healthNeedle = "supportsTwoStones: true, antiCheat:";
  const healthReplacement = "supportsTwoStones: true, supportsAuroraVulture: true, antiCheat:";
  if (!transformed.includes("supportsAuroraVulture: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate health capabilities for Aurora Vulture.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }

  return transformed;
}

function loadAuroraVultureBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectAuroraVulture(
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
  );
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

function installAuroraVultureBackend() {
  multiGameBackend.loadMultiGameBackend = loadAuroraVultureBackend;
  return multiGameBackend;
}

installAuroraVultureBackend();

module.exports = { injectAuroraVulture, loadAuroraVultureBackend, installAuroraVultureBackend };
