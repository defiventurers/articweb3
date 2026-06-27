const fs = require("fs");
const path = require("path");
const Module = require("module");

const HIGH_STAKES_PAYOUT_MULTIPLIERS = [3n, 1n, 0n, 0n];
const HIGH_STAKES_POINTS = [3000, 2000, 1000, 100];

function findFunctionEnd(source, startIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  throw new Error("Unable to locate function end.");
}

function replaceFunctionByName(source, signature, replacement) {
  const start = source.indexOf(signature);
  if (start === -1) throw new Error(`Unable to locate ${signature}.`);
  const openBrace = source.indexOf("{", start);
  if (openBrace === -1) throw new Error(`Unable to locate ${signature} body.`);
  const end = findFunctionEnd(source, openBrace);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

function replaceBuildPayoutPlan(source) {
  const replacement = `function buildPayoutPlan(room, placements) {
  const entry = BigInt(room.entryWei || "0");
  const payouts = [entry * 3n, entry * 1n, 0n, 0n];
  const points = [3000, 2000, 1000, 100];
  return placements.map((team, index) => ({
    position: index + 1,
    team,
    wallet: teamWallet(room, team),
    payoutWei: payouts[index].toString(),
    points: points[index]
  }));
}`;

  return replaceFunctionByName(source, "function buildPayoutPlan(room, placements)", replacement);
}

function injectLaunchModeRequire(source) {
  if (source.includes("getHighStakesLaunchBlockReason")) return source;

  const roomStoreRequirePattern = /const\s+\{[^}]*\bloadRooms\b[^}]*\bsaveRoom\b[^}]*\}\s*=\s*require\(\"\.\/roomStore\.js\"\);|const\s+\{[^}]*\bsaveRoom\b[^}]*\bloadRooms\b[^}]*\}\s*=\s*require\(\"\.\/roomStore\.js\"\);/;
  const match = source.match(roomStoreRequirePattern);
  if (!match) throw new Error("Unable to locate roomStore require for launch mode gate.");

  return source.replace(match[0], `${match[0]}\nconst { getHighStakesLaunchBlockReason } = require("./launchMode.js");`);
}

function replaceLaunchModeGate(source) {
  let transformed = injectLaunchModeRequire(source);

  const listNeedle = 'function list(ws, requestId, payload = {}) { const roomMode = normalizeRoomMode(payload.roomMode); const publicRooms = [...rooms.values()]';
  const listReplacement = 'function list(ws, requestId, payload = {}) { const roomMode = normalizeRoomMode(payload.roomMode); const launchReason = getHighStakesLaunchBlockReason(roomMode); if (launchReason) return ok(ws, requestId, "room_list_result", { rooms: [], launchBlocked: true, reason: launchReason }); const publicRooms = [...rooms.values()]';
  if (!transformed.includes(listReplacement)) {
    if (!transformed.includes(listNeedle)) throw new Error("Unable to locate room list for launch mode gate.");
    transformed = transformed.replace(listNeedle, listReplacement);
  }

  const createNeedle = 'const roomMode = normalizeRoomMode(payload.roomMode); const entryTier = normalizeEntryTier(payload.entryTier); if (roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) return fail(ws, requestId, "High Stakes rooms are not enabled yet.");';
  const createReplacement = 'const roomMode = normalizeRoomMode(payload.roomMode); const entryTier = normalizeEntryTier(payload.entryTier); const launchReason = getHighStakesLaunchBlockReason(roomMode); if (launchReason) return fail(ws, requestId, launchReason); if (roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) return fail(ws, requestId, "High Stakes rooms are not enabled yet.");';
  if (!transformed.includes(createReplacement)) {
    if (!transformed.includes(createNeedle)) throw new Error("Unable to locate createRoom for launch mode gate.");
    transformed = transformed.replace(createNeedle, createReplacement);
  }

  const joinNeedle = 'if (room.roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) return fail(ws, requestId, "High Stakes rooms are not enabled yet."); sockets.set(wallet, ws);';
  const joinReplacement = 'const launchReason = getHighStakesLaunchBlockReason(room.roomMode); if (launchReason) return fail(ws, requestId, launchReason); if (room.roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) return fail(ws, requestId, "High Stakes rooms are not enabled yet."); sockets.set(wallet, ws);';
  if (!transformed.includes(joinReplacement)) {
    if (!transformed.includes(joinNeedle)) throw new Error("Unable to locate joinRoom for launch mode gate.");
    transformed = transformed.replace(joinNeedle, joinReplacement);
  }

  const confirmNeedle = 'if (room.roomMode !== ROOM_MODES.HIGH_STAKES) return fail(ws, requestId, "Entry locking is only for High Stakes."); if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");';
  const confirmReplacement = 'if (room.roomMode !== ROOM_MODES.HIGH_STAKES) return fail(ws, requestId, "Entry locking is only for High Stakes."); const launchReason = getHighStakesLaunchBlockReason(room.roomMode); if (launchReason) return fail(ws, requestId, launchReason); if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");';
  if (!transformed.includes(confirmReplacement)) {
    if (!transformed.includes(confirmNeedle)) throw new Error("Unable to locate confirmEntryLock for launch mode gate.");
    transformed = transformed.replace(confirmNeedle, confirmReplacement);
  }

  return transformed;
}

function replaceClientVaultActivityWrites(source) {
  const replacement = 'async function recordVaultActivity(ws, requestId, payload = {}) { return fail(ws, requestId, "Client-side vault activity writes are disabled. Vault activity is recorded by verified server flows only."); }';
  return replaceFunctionByName(source, "async function recordVaultActivity(ws, requestId, payload = {})", replacement);
}

function replaceEndTurnGate(source) {
  const replacement = 'function gameEndTurn(ws, requestId, payload) { const room = requirePlayingRoom(ws, requestId, payload); if (!room) return; const activeTeam = currentTeam(room.gameState); if (!room.gameState.dice.rolled) return fail(ws, requestId, "Roll dice before ending your turn."); if (hasAnyLegalMoveForTeam(room.gameState, activeTeam)) return fail(ws, requestId, "You still have a legal move."); audit(room, { type: "turn_ended", wallet: walletOf(payload.wallet), team: activeTeam }); room.gameState = endTurn(room.gameState); finalizeGameIfOver(room); ok(ws, requestId, "game_action_result", { room: view(room) }); broadcast(room); scheduleBotIfNeeded(room); }';
  return replaceFunctionByName(source, "function gameEndTurn(ws, requestId, payload)", replacement);
}

function replaceHealthAntiCheatFlags(source) {
  const needle = "settlementOnce: true, onChainSettlementCheck: true";
  const replacement = "settlementOnce: true, onChainSettlementCheck: true, serverOnlyVaultActivity: true, noVoluntarySkipWithLegalMoves: true";
  if (!source.includes(needle) || source.includes("serverOnlyVaultActivity")) return source;
  return source.replace(needle, replacement);
}

function replaceAntiCheatGates(source) {
  return replaceHealthAntiCheatFlags(replaceEndTurnGate(replaceClientVaultActivityWrites(source)));
}

function transformBackendSource(source) {
  return replaceAntiCheatGates(replaceLaunchModeGate(replaceBuildPayoutPlan(source)));
}

function loadPrizeBackend() {
  const indexPath = require.resolve("./index.js");
  if (require.cache[indexPath]) return require.cache[indexPath].exports;

  const source = fs.readFileSync(indexPath, "utf8");
  const transformed = transformBackendSource(source);
  const backendModule = new Module(indexPath, module.parent);
  backendModule.filename = indexPath;
  backendModule.paths = Module._nodeModulePaths(path.dirname(indexPath));
  require.cache[indexPath] = backendModule;
  backendModule._compile(transformed, indexPath);
  return backendModule.exports;
}

module.exports = {
  loadPrizeBackend,
  replaceBuildPayoutPlan,
  replaceLaunchModeGate,
  replaceAntiCheatGates,
  replaceClientVaultActivityWrites,
  replaceEndTurnGate,
  transformBackendSource,
  HIGH_STAKES_PAYOUT_MULTIPLIERS,
  HIGH_STAKES_POINTS
};
