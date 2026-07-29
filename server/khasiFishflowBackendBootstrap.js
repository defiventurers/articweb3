const fs = require("fs");
const path = require("path");
const Module = require("module");
const { transformBackendSource } = require("./loadPrizeBackend.js");
const multiGameBackend = require("./loadMultiGameBackend.js");
const sixteenBackend = require("./sixteenIceWarriorsBackendBootstrap.js");
const glacierBackend = require("./glacierTrailBackendBootstrap.js");

function injectKhasiFishflow(source) {
  let transformed = source;

  const serviceRequire = 'const { createGlacierTrailService } = require("./glacierTrailService.js");';
  if (!transformed.includes('require("./khasiFishflowService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Glacier Trail service require for Khasi Fishflow.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createKhasiFishflowService } = require("./khasiFishflowService.js");`);
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
  const khasiServiceInit = `${glacierServiceInit}
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
    if (!transformed.includes(glacierServiceInit)) throw new Error("Unable to locate Glacier Trail service initializer for Khasi Fishflow.");
    transformed = transformed.replace(glacierServiceInit, khasiServiceInit);
  }

  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "khasi-fishflow"].includes(room?.gameId)) return;';
  if (!transformed.includes('"khasi-fishflow"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage-game bot scheduler guard for Khasi Fishflow.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }

  const dispatchNeedle = `if (type === "gt_my_rooms") return glacierTrail.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "gt_my_rooms") return glacierTrail.myRooms(ws, requestId, payload);
    if (type === "kf_room_list") return khasiFishflow.listRooms(ws, requestId, payload);
    if (type === "kf_room_create") return khasiFishflow.createRoom(ws, requestId, payload);
    if (type === "kf_room_join") return khasiFishflow.joinRoom(ws, requestId, payload);
    if (type === "kf_game_state") return khasiFishflow.getState(ws, requestId, payload);
    if (type === "kf_game_action") return khasiFishflow.action(ws, requestId, payload);
    if (type === "kf_legal_actions") return khasiFishflow.legalActions(ws, requestId, payload);
    if (type === "kf_history") return khasiFishflow.history(ws, requestId, payload);
    if (type === "kf_my_rooms") return khasiFishflow.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "kf_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate WebSocket dispatch tail for Khasi Fishflow.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }

  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); khasiFishflow.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("khasiFishflow.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate room restoration loop for Khasi Fishflow.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }

  const healthNeedle = "supportsGlacierTrail: true, antiCheat:";
  const healthReplacement = "supportsGlacierTrail: true, supportsKhasiFishflow: true, antiCheat:";
  if (!transformed.includes("supportsKhasiFishflow: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate health capability list for Khasi Fishflow.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }

  return transformed;
}

function loadKhasiFishflowBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectKhasiFishflow(
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

function installKhasiFishflowBackend() {
  multiGameBackend.loadMultiGameBackend = loadKhasiFishflowBackend;
  return multiGameBackend;
}

installKhasiFishflowBackend();
module.exports = { injectKhasiFishflow, loadKhasiFishflowBackend, installKhasiFishflowBackend };
