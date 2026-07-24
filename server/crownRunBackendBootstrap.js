const fs = require("fs");
const path = require("path");
const Module = require("module");
const { transformBackendSource } = require("./loadPrizeBackend.js");
const multiGameBackend = require("./loadMultiGameBackend.js");
const sixteenBackend = require("./sixteenIceWarriorsBackendBootstrap.js");
const glacierBackend = require("./glacierTrailBackendBootstrap.js");

function injectCrownRun(source) {
  let transformed = source;

  const serviceRequire = 'const { createGlacierTrailService } = require("./glacierTrailService.js");';
  if (!transformed.includes('require("./crownRunService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Glacier Trail service require for Crown Run.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createCrownRunService } = require("./crownRunService.js");`);
  }

  const glacierServiceInit = `const glacierTrail = createGlacierTrailService({
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
  const crownServiceInit = `${glacierServiceInit}
const crownRun = createCrownRunService({
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
  if (!transformed.includes("const crownRun = createCrownRunService")) {
    if (!transformed.includes(glacierServiceInit)) throw new Error("Unable to locate Glacier Trail service initializer for Crown Run.");
    transformed = transformed.replace(glacierServiceInit, crownServiceInit);
  }

  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run"].includes(room?.gameId)) return;';
  if (!transformed.includes('"crown-run"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage-game bot scheduler guard for Crown Run.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }

  const dispatchNeedle = `if (type === "gt_my_rooms") return glacierTrail.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "gt_my_rooms") return glacierTrail.myRooms(ws, requestId, payload);
    if (type === "cr_room_list") return crownRun.listRooms(ws, requestId, payload);
    if (type === "cr_room_create") return crownRun.createRoom(ws, requestId, payload);
    if (type === "cr_room_join") return crownRun.joinRoom(ws, requestId, payload);
    if (type === "cr_game_state") return crownRun.getState(ws, requestId, payload);
    if (type === "cr_game_roll") return crownRun.roll(ws, requestId, payload);
    if (type === "cr_game_action") return crownRun.action(ws, requestId, payload);
    if (type === "cr_legal_actions") return crownRun.legalActions(ws, requestId, payload);
    if (type === "cr_history") return crownRun.history(ws, requestId, payload);
    if (type === "cr_my_rooms") return crownRun.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "cr_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate multi-game WebSocket dispatch tail for Crown Run.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }

  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("crownRun.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate multi-game room restoration loop for Crown Run.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }

  const healthNeedle = "supportsGlacierTrail: true, antiCheat:";
  const healthReplacement = "supportsGlacierTrail: true, supportsCrownRun: true, antiCheat:";
  if (!transformed.includes("supportsCrownRun: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate multi-game health capabilities for Crown Run.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }

  return transformed;
}

function loadCrownRunBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectCrownRun(
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
  );
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

function installCrownRunBackend() {
  multiGameBackend.loadMultiGameBackend = loadCrownRunBackend;
  return multiGameBackend;
}

installCrownRunBackend();

module.exports = { injectCrownRun, loadCrownRunBackend, installCrownRunBackend };