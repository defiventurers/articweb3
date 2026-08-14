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

function injectSige(source) {
  let transformed = source;
  const serviceRequire = 'const { createAuroraGanjifaService } = require("./auroraGanjifaService.js");';
  if (!transformed.includes('require("./sigeService.js")')) {
    if (!transformed.includes(serviceRequire)) throw new Error("Unable to locate Aurora Ganjifa service require for Sige.");
    transformed = transformed.replace(serviceRequire, `${serviceRequire}\nconst { createSigeService } = require("./sigeService.js");`);
  }
  const ganjifaInit = `const auroraGanjifa = createAuroraGanjifaService({
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
  const sigeInit = `${ganjifaInit}
const sige = createSigeService({
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
  if (!transformed.includes("const sige = createSigeService")) {
    if (!transformed.includes(ganjifaInit)) throw new Error("Unable to locate Aurora Ganjifa initializer for Sige.");
    transformed = transformed.replace(ganjifaInit, sigeInit);
  }
  const scheduleNeedle = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones", "aurora-vulture", "polar-tablan", "aurora-ganjifa-academy"].includes(room?.gameId)) return;';
  const scheduleReplacement = 'function scheduleBotIfNeeded(room) { if (["nine-ice-forts", "four-wing-ice-hunt", "fishflow", "break-the-ice", "ice-hunters", "sixteen-ice-warriors", "glacier-trail", "crown-run", "forty-glacier-guards", "sky-temple-run", "ice-rings", "cowrie-kingdoms", "two-stones", "aurora-vulture", "polar-tablan", "aurora-ganjifa-academy", "sige"].includes(room?.gameId)) return;';
  if (!transformed.includes('"sige"].includes(room?.gameId)')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate heritage bot guard for Sige.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }
  const dispatchNeedle = `if (type === "ag_my_rooms") return auroraGanjifa.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  const dispatchReplacement = `if (type === "ag_my_rooms") return auroraGanjifa.myRooms(ws, requestId, payload);
    if (type === "sg_room_list") return sige.listRooms(ws, requestId, payload);
    if (type === "sg_room_create") return sige.createRoom(ws, requestId, payload);
    if (type === "sg_room_join") return sige.joinRoom(ws, requestId, payload);
    if (type === "sg_game_state") return sige.getState(ws, requestId, payload);
    if (type === "sg_game_roll") return sige.roll(ws, requestId, payload);
    if (type === "sg_game_action") return sige.action(ws, requestId, payload);
    if (type === "sg_legal_actions") return sige.legalActions(ws, requestId, payload);
    if (type === "sg_history") return sige.history(ws, requestId, payload);
    if (type === "sg_my_rooms") return sige.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "sg_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate Aurora Ganjifa dispatch tail for Sige.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }
  const restoreNeedle = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); auroraVulture.restoreRoom(room); polarTablan.restoreRoom(room); auroraGanjifa.restoreRoom(room); if (room.status === "waiting"';
  const restoreReplacement = 'rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); fourWingIceHunt.restoreRoom(room); fishflow.restoreRoom(room); breakTheIce.restoreRoom(room); iceHunters.restoreRoom(room); sixteenIceWarriors.restoreRoom(room); glacierTrail.restoreRoom(room); crownRun.restoreRoom(room); fortyGlacierGuards.restoreRoom(room); skyTempleRun.restoreRoom(room); iceRings.restoreRoom(room); cowrieKingdoms.restoreRoom(room); twoStones.restoreRoom(room); auroraVulture.restoreRoom(room); polarTablan.restoreRoom(room); auroraGanjifa.restoreRoom(room); sige.restoreRoom(room); if (room.status === "waiting"';
  if (!transformed.includes("sige.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate room restoration loop for Sige.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }
  const healthNeedle = "supportsAuroraGanjifa: true, privateCardState: true, antiCheat:";
  const healthReplacement = "supportsAuroraGanjifa: true, privateCardState: true, supportsSige: true, antiCheat:";
  if (!transformed.includes("supportsSige: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate health capability list for Sige.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }
  return transformed;
}

function loadSigeBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectSige(
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
  );
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

function installSigeBackend() { multiGameBackend.loadMultiGameBackend = loadSigeBackend; return multiGameBackend; }
installSigeBackend();
module.exports = { injectSige, loadSigeBackend, installSigeBackend };
