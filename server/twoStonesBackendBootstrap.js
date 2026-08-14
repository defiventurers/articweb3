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

function injectTwoStones(source) {
  let transformed = source;
  const serviceRequire = 'const { createCowrieKingdomsService } = require("./cowrieKingdomsService.js");';
  if (!transformed.includes('require("./twoStonesService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Cowrie Kingdoms service require for Two Stones.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createTwoStonesService } = require("./twoStonesService.js");`);
  }
  const cowrieInit = `const cowrieKingdoms = createCowrieKingdomsService({
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
  const twoStonesInit = `${cowrieInit}
const twoStones = createTwoStonesService({
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
  if (!transformed.includes("const twoStones = createTwoStonesService")) {
    if (!transformed.includes(cowrieInit)) throw new Error("Unable to locate Cowrie Kingdoms service initializer for Two Stones.");
    transformed = transformed.replace(cowrieInit, twoStonesInit);
  }
  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones"].includes(room?.gameId)) return;';
  if (!transformed.includes('"two-stones"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage bot scheduler guard for Two Stones.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }
  const dispatchNeedle = `if (type === "ck_my_rooms") return cowrieKingdoms.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "ck_my_rooms") return cowrieKingdoms.myRooms(ws, requestId, payload);
    if (type === "ts_room_list") return twoStones.listRooms(ws, requestId, payload);
    if (type === "ts_room_create") return twoStones.createRoom(ws, requestId, payload);
    if (type === "ts_room_join") return twoStones.joinRoom(ws, requestId, payload);
    if (type === "ts_game_state") return twoStones.getState(ws, requestId, payload);
    if (type === "ts_game_action") return twoStones.action(ws, requestId, payload);
    if (type === "ts_legal_actions") return twoStones.legalActions(ws, requestId, payload);
    if (type === "ts_history") return twoStones.history(ws, requestId, payload);
    if (type === "ts_my_rooms") return twoStones.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "ts_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate Cowrie Kingdoms dispatch tail for Two Stones.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }
  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("twoStones.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate room restoration loop for Two Stones.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }
  const healthNeedle = "supportsCowrieKingdoms: true, antiCheat:";
  const healthReplacement = "supportsCowrieKingdoms: true, supportsTwoStones: true, antiCheat:";
  if (!transformed.includes("supportsTwoStones: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate health capabilities for Two Stones.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }
  return transformed;
}

function loadTwoStonesBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectTwoStones(cowrieBackend.injectCowrieKingdoms(ringsBackend.injectIceRings(skyBackend.injectSkyTempleRun(guardBackend.injectFortyGlacierGuards(crownBackend.injectCrownRun(glacierBackend.injectGlacierTrail(sixteenBackend.injectSixteenIceWarriors(multiGameBackend.injectIceHunters(multiGameBackend.injectBreakTheIce(multiGameBackend.injectFishflow(multiGameBackend.injectFourWingIceHunt(multiGameBackend.injectNineIceForts(transformBackendSource(source))))))))))))));
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}
function installTwoStonesBackend() { multiGameBackend.loadMultiGameBackend = loadTwoStonesBackend; return multiGameBackend; }
installTwoStonesBackend();
module.exports = { injectTwoStones, loadTwoStonesBackend, installTwoStonesBackend };
