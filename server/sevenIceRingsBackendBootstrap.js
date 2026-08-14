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
const twoStonesBackend = require("./twoStonesBackendBootstrap.js");
const auroraVultureBackend = require("./auroraVultureBackendBootstrap.js");
const polarBackend = require("./polarTablanBackendBootstrap.js");
const ganjifaBackend = require("./auroraGanjifaBackendBootstrap.js");
const sigeBackend = require("./sigeBackendBootstrap.js");

function injectSevenIceRings(source) {
  let transformed = source;
  const serviceRequire = 'const { createSigeService } = require("./sigeService.js");';
  if (!transformed.includes('require("./sevenIceRingsService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Sige service require for Seven Ice Rings.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createSevenIceRingsService } = require("./sevenIceRingsService.js");`);
  }
  const sigeInit = `const sige = createSigeService({
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
  const ringInit = `${sigeInit}
const sevenIceRings = createSevenIceRingsService({
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
  if (!transformed.includes("const sevenIceRings = createSevenIceRingsService")) {
    if (!transformed.includes(sigeInit)) throw new Error("Unable to locate Sige initializer for Seven Ice Rings.");
    transformed = transformed.replace(sigeInit, ringInit);
  }
  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones", "aurora-vulture", "polar-tablan", "aurora-ganjifa-academy", "sige"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones", "aurora-vulture", "polar-tablan", "aurora-ganjifa-academy", "sige", "seven-ice-rings"].includes(room?.gameId)) return;';
  if (!transformed.includes('"seven-ice-rings"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage bot guard for Seven Ice Rings.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }
  const dispatchNeedle = `if (type === "sg_my_rooms") return sige.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "sg_my_rooms") return sige.myRooms(ws, requestId, payload);
    if (type === "sir_room_list") return sevenIceRings.listRooms(ws, requestId, payload);
    if (type === "sir_room_create") return sevenIceRings.createRoom(ws, requestId, payload);
    if (type === "sir_room_join") return sevenIceRings.joinRoom(ws, requestId, payload);
    if (type === "sir_game_state") return sevenIceRings.getState(ws, requestId, payload);
    if (type === "sir_game_action") return sevenIceRings.action(ws, requestId, payload);
    if (type === "sir_legal_actions") return sevenIceRings.legalActions(ws, requestId, payload);
    if (type === "sir_history") return sevenIceRings.history(ws, requestId, payload);
    if (type === "sir_my_rooms") return sevenIceRings.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "sir_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate Sige dispatch tail for Seven Ice Rings.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }
  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); auroraVulture.restoreRoom(room); polarTablan.restoreRoom(room); auroraGanjifa.restoreRoom(room); sige.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); auroraVulture.restoreRoom(room); polarTablan.restoreRoom(room); auroraGanjifa.restoreRoom(room); sige.restoreRoom(room); sevenIceRings.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("sevenIceRings.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate room restore loop for Seven Ice Rings.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }
  const healthNeedle = "supportsSige: true, antiCheat:";
  const healthReplacement = "supportsSige: true, supportsSevenIceRings: true, antiCheat:";
  if (!transformed.includes("supportsSevenIceRings: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate Sige health capability.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }
  return transformed;
}

function loadSevenIceRingsBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectSevenIceRings(
    sigeBackend.injectSige(
      ganjifaBackend.injectAuroraGanjifa(
        polarBackend.injectPolarTablan(
          auroraVultureBackend.injectAuroraVulture(
            twoStonesBackend.injectTwoStones(
              cowrieBackend.injectCowrieKingdoms(
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

function installSevenIceRingsBackend() { multiGameBackend.loadMultiGameBackend = loadSevenIceRingsBackend; return multiGameBackend; }
installSevenIceRingsBackend();
module.exports = { injectSevenIceRings, loadSevenIceRingsBackend, installSevenIceRingsBackend };
