const fs = require("fs");
const path = require("path");
const Module = require("module");
const { transformBackendSource } = require("./loadPrizeBackend.js");

function injectNineIceForts(source) {
  let transformed = source;

  const rulesRequire = 'const { createInitialGameState, currentTeam, rollDiceForState, selectSquare, endTurn, hasAnyLegalMoveForTeam, pickBotMove, applyMove, getPlacements } = require("./gameRules.js");';
  if (!transformed.includes('require("./nineIceFortsService.js")')) {
    if (!transformed.includes(rulesRequire)) throw new Error("Unable to locate gameRules require for Nine Ice Forts.");
    transformed = transformed.replace(rulesRequire, `${rulesRequire}\nconst { createNineIceFortsService } = require("./nineIceFortsService.js");`);
  }

  const socketsNeedle = "const sockets = new Map();";
  const serviceInit = `const sockets = new Map();
const nineIceForts = createNineIceFortsService({
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
  if (!transformed.includes("const nineIceForts = createNineIceFortsService")) {
    if (!transformed.includes(socketsNeedle)) throw new Error("Unable to locate socket map for Nine Ice Forts.");
    transformed = transformed.replace(socketsNeedle, serviceInit);
  }

  const scheduleNeedle = "function scheduleBotIfNeeded(room) { if (!room || room.roomMode !== ROOM_MODES.OPEN_ICE";
  const scheduleReplacement = "function scheduleBotIfNeeded(room) { if (room?.gameId === \"nine-ice-forts\") return; if (!room || room.roomMode !== ROOM_MODES.OPEN_ICE";
  if (!transformed.includes('room?.gameId === "nine-ice-forts"')) {
    if (!transformed.includes(scheduleNeedle)) throw new Error("Unable to locate Arctic Dominion bot scheduler.");
    transformed = transformed.replace(scheduleNeedle, scheduleReplacement);
  }

  const listNeedle = "const publicRooms = [...rooms.values()].filter((room) => room.roomMode === roomMode)";
  const listReplacement = "const publicRooms = [...rooms.values()].filter((room) => !room.gameId || room.gameId === \"arctic-dominion\").filter((room) => room.roomMode === roomMode)";
  if (!transformed.includes(listReplacement)) {
    if (!transformed.includes(listNeedle)) throw new Error("Unable to locate Arctic Dominion room list.");
    transformed = transformed.replace(listNeedle, listReplacement);
  }

  const myRoomsNeedle = "const roomList = [...rooms.values()].filter((room) => room.players[wallet])";
  const myRoomsReplacement = "const roomList = [...rooms.values()].filter((room) => !room.gameId || room.gameId === \"arctic-dominion\").filter((room) => room.players[wallet])";
  if (!transformed.includes(myRoomsReplacement)) {
    if (!transformed.includes(myRoomsNeedle)) throw new Error("Unable to locate Arctic Dominion my rooms list.");
    transformed = transformed.replace(myRoomsNeedle, myRoomsReplacement);
  }

  const dispatchNeedle = 'if (type === "game_end_turn") return gameEndTurn(ws, requestId, payload); return fail(ws, requestId, `Unknown message type: ${type}`);';
  const dispatchReplacement = `if (type === "game_end_turn") return gameEndTurn(ws, requestId, payload);
    if (type === "nif_room_list") return nineIceForts.listRooms(ws, requestId, payload);
    if (type === "nif_room_create") return nineIceForts.createRoom(ws, requestId, payload);
    if (type === "nif_room_join") return nineIceForts.joinRoom(ws, requestId, payload);
    if (type === "nif_game_state") return nineIceForts.getState(ws, requestId, payload);
    if (type === "nif_game_action") return nineIceForts.action(ws, requestId, payload);
    if (type === "nif_legal_actions") return nineIceForts.legalActions(ws, requestId, payload);
    if (type === "nif_history") return nineIceForts.history(ws, requestId, payload);
    if (type === "nif_my_rooms") return nineIceForts.myRooms(ws, requestId, payload);
    return fail(ws, requestId, \`Unknown message type: \${type}\`);`;
  if (!transformed.includes('type === "nif_room_create"')) {
    if (!transformed.includes(dispatchNeedle)) throw new Error("Unable to locate WebSocket dispatch tail.");
    transformed = transformed.replace(dispatchNeedle, dispatchReplacement);
  }

  const restoreNeedle = "rooms.set(room.roomCode, room); if (room.status === \"waiting\"";
  const restoreReplacement = "rooms.set(room.roomCode, room); nineIceForts.restoreRoom(room); if (room.status === \"waiting\"";
  if (!transformed.includes("nineIceForts.restoreRoom(room)")) {
    if (!transformed.includes(restoreNeedle)) throw new Error("Unable to locate room restoration loop.");
    transformed = transformed.replace(restoreNeedle, restoreReplacement);
  }

  const healthNeedle = "supportsCommitRevealDice: true, antiCheat:";
  const healthReplacement = "supportsCommitRevealDice: true, supportsNineIceForts: true, antiCheat:";
  if (!transformed.includes("supportsNineIceForts: true")) {
    if (!transformed.includes(healthNeedle)) throw new Error("Unable to locate health capability list.");
    transformed = transformed.replace(healthNeedle, healthReplacement);
  }

  return transformed;
}

function loadMultiGameBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;
  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = injectNineIceForts(transformBackendSource(source));
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

module.exports = { loadMultiGameBackend, injectNineIceForts };
