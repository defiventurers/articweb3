const fs = require("fs");
const path = require("path");
const Module = require("module");
const sevenBackend = require("./sevenIceRingsBackendBootstrap.js");
const multiGameBackend = require("./loadMultiGameBackend.js");

function injectKhasiFishflow(source) {
  let transformed = source;
  const serviceRequire = 'const { createSevenIceRingsService } = require("./sevenIceRingsService.js");';
  if (!transformed.includes('require("./khasiFishflowService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Seven Ice Rings service require for Khasi Fishflow.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createKhasiFishflowService } = require("./khasiFishflowService.js");`);
  }
  const ringInit = `const sevenIceRings = createSevenIceRingsService({
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
  const khasiInit = `${ringInit}
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
    if (!transformed.includes(ringInit)) throw new Error("Unable to locate Seven Ice Rings initializer for Khasi Fishflow.");
    transformed = transformed.replace(ringInit, khasiInit);
  }
  const scheduleNeedle = '"seven-ice-rings"].includes(room?.gameId)';
  if (!transformed.includes('"khasi-fishflow"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage bot guard for Khasi Fishflow.");
    transformed = transformed.replace(scheduleNeedle, '"seven-ice-rings", "khasi-fishflow"].includes(room?.gameId)');
  }
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
  if (!transformed.includes('type === "kf_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate Seven Ice Rings dispatch tail for Khasi Fishflow.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }
  const restoreNeedle = "sevenIceRings.restoreRoom(room); if (room.status === \"waiting\"";
  if (!transformed.includes("khasiFishflow.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate Seven Ice Rings restore loop for Khasi Fishflow.");
    transformed = transformed.replace(restoreNeedle, 'sevenIceRings.restoreRoom(room); khasiFishflow.restoreRoom(room); if (room.status === "waiting"');
  }
  const healthNeedle = "supportsSevenIceRings: true, antiCheat:";
  if (!transformed.includes("supportsKhasiFishflow: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate Seven Ice Rings health capability.");
    transformed = transformed.replace(healthNeedle, "supportsSevenIceRings: true, supportsKhasiFishflow: true, antiCheat:");
  }
  return transformed;
}

function loadKhasiFishflowBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectKhasiFishflow(sevenBackend.injectSevenIceRings(source));
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
