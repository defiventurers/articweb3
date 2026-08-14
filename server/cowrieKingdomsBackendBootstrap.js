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

function injectCowrieKingdoms(source) {
  let transformed = source;

  const serviceRequire = 'const { createIceRingsService } = require("./iceRingsService.js");';
  if (!transformed.includes('require("./cowrieKingdomsService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Ice Rings service require for Cowrie Kingdoms.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createCowrieKingdomsService } = require("./cowrieKingdomsService.js");`);
  }

  const ringsServiceInit = `const iceRings = createIceRingsService({
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
  const cowrieServiceInit = `${ringsServiceInit}
const cowrieKingdoms = createCowrieKingdomsService({
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
  if (!transformed.includes("const cowrieKingdoms = createCowrieKingdomsService")) {
    if (!transformed.includes(ringsServiceInit)) throw new Error("Unable to locate Ice Rings service initializer for Cowrie Kingdoms.");
    transformed = transformed.replace(ringsServiceInit, cowrieServiceInit);
  }

  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms"].includes(room?.gameId)) return;';
  if (!transformed.includes('"cowrie-kingdoms"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage-game bot scheduler guard for Cowrie Kingdoms.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }

  const dispatchNeedle = `if (type === "ir_my_rooms") return iceRings.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "ir_my_rooms") return iceRings.myRooms(ws, requestId, payload);
    if (type === "ck_room_list") return cowrieKingdoms.listRooms(ws, requestId, payload);
    if (type === "ck_room_create") return cowrieKingdoms.createRoom(ws, requestId, payload);
    if (type === "ck_room_join") return cowrieKingdoms.joinRoom(ws, requestId, payload);
    if (type === "ck_game_state") return cowrieKingdoms.getState(ws, requestId, payload);
    if (type === "ck_game_roll") return cowrieKingdoms.roll(ws, requestId, payload);
    if (type === "ck_game_action") return cowrieKingdoms.action(ws, requestId, payload);
    if (type === "ck_legal_actions") return cowrieKingdoms.legalActions(ws, requestId, payload);
    if (type === "ck_history") return cowrieKingdoms.history(ws, requestId, payload);
    if (type === "ck_my_rooms") return cowrieKingdoms.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "ck_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate multi-game WebSocket dispatch tail for Cowrie Kingdoms.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }

  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("cowrieKingdoms.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate multi-game room restoration loop for Cowrie Kingdoms.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }

  const healthNeedle = "supportsIceRings: true, antiCheat:";
  const healthReplacement = "supportsIceRings: true, supportsCowrieKingdoms: true, antiCheat:";
  if (!transformed.includes("supportsCowrieKingdoms: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate multi-game health capabilities for Cowrie Kingdoms.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }

  return transformed;
}

function loadCowrieKingdomsBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectCowrieKingdoms(
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
  );
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

function installCowrieKingdomsBackend() {
  multiGameBackend.loadMultiGameBackend = loadCowrieKingdomsBackend;
  return multiGameBackend;
}

installCowrieKingdomsBackend();

module.exports = { injectCowrieKingdoms, loadCowrieKingdomsBackend, installCowrieKingdomsBackend };
