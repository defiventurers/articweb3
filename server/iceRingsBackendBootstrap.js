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

function injectIceRings(source) {
  let transformed = source;

  const serviceRequire = 'const { createSkyTempleRunService } = require("./skyTempleRunService.js");';
  if (!transformed.includes('require("./iceRingsService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Sky Temple Run service require for Ice Rings.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createIceRingsService } = require("./iceRingsService.js");`);
  }

  const skyServiceInit = `const skyTempleRun = createSkyTempleRunService({
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
  const iceServiceInit = `${skyServiceInit}
const iceRings = createIceRingsService({
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
  if (!transformed.includes("const iceRings = createIceRingsService")) {
    if (!transformed.includes(skyServiceInit)) throw new Error("Unable to locate Sky Temple Run service initializer for Ice Rings.");
    transformed = transformed.replace(skyServiceInit, iceServiceInit);
  }

  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings"].includes(room?.gameId)) return;';
  if (!transformed.includes('"ice-rings"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage-game bot scheduler guard for Ice Rings.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }

  const dispatchNeedle = `if (type === "str_my_rooms") return skyTempleRun.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "str_my_rooms") return skyTempleRun.myRooms(ws, requestId, payload);
    if (type === "ir_room_list") return iceRings.listRooms(ws, requestId, payload);
    if (type === "ir_room_create") return iceRings.createRoom(ws, requestId, payload);
    if (type === "ir_room_join") return iceRings.joinRoom(ws, requestId, payload);
    if (type === "ir_game_state") return iceRings.getState(ws, requestId, payload);
    if (type === "ir_game_action") return iceRings.action(ws, requestId, payload);
    if (type === "ir_legal_actions") return iceRings.legalActions(ws, requestId, payload);
    if (type === "ir_history") return iceRings.history(ws, requestId, payload);
    if (type === "ir_my_rooms") return iceRings.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "ir_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate multi-game WebSocket dispatch tail for Ice Rings.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }

  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("iceRings.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate multi-game room restoration loop for Ice Rings.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }

  const healthNeedle = "supportsSkyTempleRun: true, antiCheat:";
  const healthReplacement = "supportsSkyTempleRun: true, supportsIceRings: true, antiCheat:";
  if (!transformed.includes("supportsIceRings: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate multi-game health capabilities for Ice Rings.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }

  return transformed;
}

function loadIceRingsBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectIceRings(
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
  );
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

function installIceRingsBackend() {
  multiGameBackend.loadMultiGameBackend = loadIceRingsBackend;
  return multiGameBackend;
}

installIceRingsBackend();

module.exports = { injectIceRings, loadIceRingsBackend, installIceRingsBackend };
