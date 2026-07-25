const fs = require("fs");
const path = require("path");
const Module = require("module");
const { transformBackendSource } = require("./loadPrizeBackend.js");
const multiGameBackend = require("./loadMultiGameBackend.js");
const sixteenBackend = require("./sixteenIceWarriorsBackendBootstrap.js");
const glacierBackend = require("./glacierTrailBackendBootstrap.js");
const crownBackend = require("./crownRunBackendBootstrap.js");

function injectFortyGlacierGuards(source) {
  let transformed = source;

  const serviceRequire = 'const { createCrownRunService } = require("./crownRunService.js");';
  if (!transformed.includes('require("./fortyGlacierGuardsService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Crown Run service require for Forty Glacier Guards.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createFortyGlacierGuardsService } = require("./fortyGlacierGuardsService.js");`);
  }

  const crownServiceInit = `const crownRun = createCrownRunService({
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
  const guardServiceInit = `${crownServiceInit}
const fortyGlacierGuards = createFortyGlacierGuardsService({
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
  if (!transformed.includes("const fortyGlacierGuards = createFortyGlacierGuardsService")) {
    if (!transformed.includes(crownServiceInit)) throw new Error("Unable to locate Crown Run service initializer for Forty Glacier Guards.");
    transformed = transformed.replace(crownServiceInit, guardServiceInit);
  }

  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards"].includes(room?.gameId)) return;';
  if (!transformed.includes('"forty-glacier-guards"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage-game bot scheduler guard for Forty Glacier Guards.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }

  const dispatchNeedle = `if (type === "cr_my_rooms") return crownRun.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "cr_my_rooms") return crownRun.myRooms(ws, requestId, payload);
    if (type === "fgg_room_list") return fortyGlacierGuards.listRooms(ws, requestId, payload);
    if (type === "fgg_room_create") return fortyGlacierGuards.createRoom(ws, requestId, payload);
    if (type === "fgg_room_join") return fortyGlacierGuards.joinRoom(ws, requestId, payload);
    if (type === "fgg_game_state") return fortyGlacierGuards.getState(ws, requestId, payload);
    if (type === "fgg_game_action") return fortyGlacierGuards.action(ws, requestId, payload);
    if (type === "fgg_legal_actions") return fortyGlacierGuards.legalActions(ws, requestId, payload);
    if (type === "fgg_history") return fortyGlacierGuards.history(ws, requestId, payload);
    if (type === "fgg_my_rooms") return fortyGlacierGuards.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "fgg_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate multi-game WebSocket dispatch tail for Forty Glacier Guards.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }

  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("fortyGlacierGuards.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate multi-game room restoration loop for Forty Glacier Guards.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }

  const healthNeedle = "supportsCrownRun: true, antiCheat:";
  const healthReplacement = "supportsCrownRun: true, supportsFortyGlacierGuards: true, antiCheat:";
  if (!transformed.includes("supportsFortyGlacierGuards: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate multi-game health capabilities for Forty Glacier Guards.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }

  return transformed;
}

function loadFortyGlacierGuardsBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectFortyGlacierGuards(
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
  );
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

function installFortyGlacierGuardsBackend() {
  multiGameBackend.loadMultiGameBackend = loadFortyGlacierGuardsBackend;
  return multiGameBackend;
}

installFortyGlacierGuardsBackend();

module.exports = { injectFortyGlacierGuards, loadFortyGlacierGuardsBackend, installFortyGlacierGuardsBackend };
