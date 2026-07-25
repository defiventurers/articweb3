const fs = require("fs");
const path = require("path");
const Module = require("module");
const { transformBackendSource } = require("./loadPrizeBackend.js");
const multiGameBackend = require("./loadMultiGameBackend.js");
const sixteenBackend = require("./sixteenIceWarriorsBackendBootstrap.js");
const glacierBackend = require("./glacierTrailBackendBootstrap.js");
const crownBackend = require("./crownRunBackendBootstrap.js");
const guardBackend = require("./fortyGlacierGuardsBackendBootstrap.js");

function injectSkyTempleRun(source) {
  let transformed = source;

  const serviceRequire = 'const { createFortyGlacierGuardsService } = require("./fortyGlacierGuardsService.js");';
  if (!transformed.includes('require("./skyTempleRunService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Forty Glacier Guards service require for Sky Temple Run.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createSkyTempleRunService } = require("./skyTempleRunService.js");`);
  }

  const guardServiceInit = `const fortyGlacierGuards = createFortyGlacierGuardsService({
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
  const skyServiceInit = `${guardServiceInit}
const skyTempleRun = createSkyTempleRunService({
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
  if (!transformed.includes("const skyTempleRun = createSkyTempleRunService")) {
    if (!transformed.includes(guardServiceInit)) throw new Error("Unable to locate Forty Glacier Guards service initializer for Sky Temple Run.");
    transformed = transformed.replace(guardServiceInit, skyServiceInit);
  }

  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run"].includes(room?.gameId)) return;';
  if (!transformed.includes('"sky-temple-run"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage-game bot scheduler guard for Sky Temple Run.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }

  const dispatchNeedle = `if (type === "fgg_my_rooms") return fortyGlacierGuards.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "fgg_my_rooms") return fortyGlacierGuards.myRooms(ws, requestId, payload);
    if (type === "str_room_list") return skyTempleRun.listRooms(ws, requestId, payload);
    if (type === "str_room_create") return skyTempleRun.createRoom(ws, requestId, payload);
    if (type === "str_room_join") return skyTempleRun.joinRoom(ws, requestId, payload);
    if (type === "str_game_state") return skyTempleRun.getState(ws, requestId, payload);
    if (type === "str_game_roll") return skyTempleRun.roll(ws, requestId, payload);
    if (type === "str_game_action") return skyTempleRun.action(ws, requestId, payload);
    if (type === "str_legal_actions") return skyTempleRun.legalActions(ws, requestId, payload);
    if (type === "str_history") return skyTempleRun.history(ws, requestId, payload);
    if (type === "str_my_rooms") return skyTempleRun.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "str_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate multi-game WebSocket dispatch tail for Sky Temple Run.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }

  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("skyTempleRun.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate multi-game room restoration loop for Sky Temple Run.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }

  const healthNeedle = "supportsFortyGlacierGuards: true, antiCheat:";
  const healthReplacement = "supportsFortyGlacierGuards: true, supportsSkyTempleRun: true, antiCheat:";
  if (!transformed.includes("supportsSkyTempleRun: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate multi-game health capabilities for Sky Temple Run.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }

  return transformed;
}

function loadSkyTempleRunBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectSkyTempleRun(
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
  );
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

function installSkyTempleRunBackend() {
  multiGameBackend.loadMultiGameBackend = loadSkyTempleRunBackend;
  return multiGameBackend;
}

installSkyTempleRunBackend();

module.exports = { injectSkyTempleRun, loadSkyTempleRunBackend, installSkyTempleRunBackend };
