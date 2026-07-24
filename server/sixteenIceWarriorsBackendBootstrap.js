const fs = require("fs");
const path = require("path");
const Module = require("module");
const { transformBackendSource } = require("./loadPrizeBackend.js");
const multiGameBackend = require("./loadMultiGameBackend.js");

function injectSixteenIceWarriors(source) {
  let transformed = source;

  const serviceRequire = 'const { createIceHuntersService } = require("./iceHuntersService.js");';
  if (!transformed.includes('require("./sixteenIceWarriorsService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Ice Hunters service require for Sixteen Ice Warriors.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createSixteenIceWarriorsService } = require("./sixteenIceWarriorsService.js");`);
  }

  const iceServiceInit = `const iceHunters = createIceHuntersService({
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
  const sixteenServiceInit = `${iceServiceInit}
const sixteenIceWarriors = createSixteenIceWarriorsService({
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
  if (!transformed.includes("const sixteenIceWarriors = createSixteenIceWarriorsService")) {
    if (!transformed.includes(iceServiceInit)) throw new Error("Unable to locate Ice Hunters service initializer for Sixteen Ice Warriors.");
    transformed = transformed.replace(iceServiceInit, sixteenServiceInit);
  }

  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors"].includes(room?.gameId)) return;';
  if (!transformed.includes('"sixteen-ice-warriors"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage-game bot scheduler guard for Sixteen Ice Warriors.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }

  const dispatchNeedle = `if (type === "ih_my_rooms") return iceHunters.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "ih_my_rooms") return iceHunters.myRooms(ws, requestId, payload);
    if (type === "siw_room_list") return sixteenIceWarriors.listRooms(ws, requestId, payload);
    if (type === "siw_room_create") return sixteenIceWarriors.createRoom(ws, requestId, payload);
    if (type === "siw_room_join") return sixteenIceWarriors.joinRoom(ws, requestId, payload);
    if (type === "siw_game_state") return sixteenIceWarriors.getState(ws, requestId, payload);
    if (type === "siw_game_action") return sixteenIceWarriors.action(ws, requestId, payload);
    if (type === "siw_legal_actions") return sixteenIceWarriors.legalActions(ws, requestId, payload);
    if (type === "siw_history") return sixteenIceWarriors.history(ws, requestId, payload);
    if (type === "siw_my_rooms") return sixteenIceWarriors.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "siw_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate multi-game WebSocket dispatch tail for Sixteen Ice Warriors.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }

  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("sixteenIceWarriors.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate multi-game room restoration loop for Sixteen Ice Warriors.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }

  const healthNeedle = "supportsIceHunters: true, antiCheat:";
  const healthReplacement = "supportsIceHunters: true, supportsSixteenIceWarriors: true, antiCheat:";
  if (!transformed.includes("supportsSixteenIceWarriors: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate multi-game health capabilities for Sixteen Ice Warriors.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }

  return transformed;
}

function loadSixteenIceWarriorsBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectSixteenIceWarriors(
    multiGameBackend.injectIceHunters(
      multiGameBackend.injectBreakTheIce(
        multiGameBackend.injectFishflow(
          multiGameBackend.injectFourWingIceHunt(
            multiGameBackend.injectNineIceForts(transformBackendSource(source))
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

function installSixteenIceWarriorsBackend() {
  multiGameBackend.loadMultiGameBackend = loadSixteenIceWarriorsBackend;
  return multiGameBackend;
}

module.exports = {
  injectSixteenIceWarriors,
  loadSixteenIceWarriorsBackend,
  installSixteenIceWarriorsBackend
};
