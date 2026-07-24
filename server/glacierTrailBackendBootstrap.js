const fs = require("fs");
const path = require("path");
const Module = require("module");
const { transformBackendSource } = require("./loadPrizeBackend.js");
const multiGameBackend = require("./loadMultiGameBackend.js");
const sixteenBackend = require("./sixteenIceWarriorsBackendBootstrap.js");

function injectGlacierTrail(source) {
  let transformed = source;

  const serviceRequire = 'const { createSixteenIceWarriorsService } = require("./sixteenIceWarriorsService.js");';
  if (!transformed.includes('require("./glacierTrailService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Sixteen Ice Warriors service require for Glacier Trail.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createGlacierTrailService } = require("./glacierTrailService.js");`);
  }

  const sixteenServiceInit = `const sixteenIceWarriors = createSixteenIceWarriorsService({
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
  const glacierServiceInit = `${sixteenServiceInit}
const glacierTrail = createGlacierTrailService({
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
  if (!transformed.includes("const glacierTrail = createGlacierTrailService")) {
    if (!transformed.includes(sixteenServiceInit)) throw new Error("Unable to locate Sixteen Ice Warriors service initializer for Glacier Trail.");
    transformed = transformed.replace(sixteenServiceInit, glacierServiceInit);
  }

  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail"].includes(room?.gameId)) return;';
  if (!transformed.includes('"glacier-trail"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage-game bot scheduler guard for Glacier Trail.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }

  const dispatchNeedle = `if (type === "siw_my_rooms") return sixteenIceWarriors.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "siw_my_rooms") return sixteenIceWarriors.myRooms(ws, requestId, payload);
    if (type === "gt_room_list") return glacierTrail.listRooms(ws, requestId, payload);
    if (type === "gt_room_create") return glacierTrail.createRoom(ws, requestId, payload);
    if (type === "gt_room_join") return glacierTrail.joinRoom(ws, requestId, payload);
    if (type === "gt_game_state") return glacierTrail.getState(ws, requestId, payload);
    if (type === "gt_game_roll") return glacierTrail.roll(ws, requestId, payload);
    if (type === "gt_game_action") return glacierTrail.action(ws, requestId, payload);
    if (type === "gt_legal_actions") return glacierTrail.legalActions(ws, requestId, payload);
    if (type === "gt_history") return glacierTrail.history(ws, requestId, payload);
    if (type === "gt_my_rooms") return glacierTrail.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "gt_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate multi-game WebSocket dispatch tail for Glacier Trail.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }

  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("glacierTrail.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate multi-game room restoration loop for Glacier Trail.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }

  const healthNeedle = "supportsSixteenIceWarriors: true, antiCheat:";
  const healthReplacement = "supportsSixteenIceWarriors: true, supportsGlacierTrail: true, antiCheat:";
  if (!transformed.includes("supportsGlacierTrail: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate multi-game health capabilities for Glacier Trail.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }

  return transformed;
}

function loadGlacierTrailBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectGlacierTrail(
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
  );
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

function installGlacierTrailBackend() {
  multiGameBackend.loadMultiGameBackend = loadGlacierTrailBackend;
  return multiGameBackend;
}

installGlacierTrailBackend();

module.exports = { injectGlacierTrail, loadGlacierTrailBackend, installGlacierTrailBackend };
