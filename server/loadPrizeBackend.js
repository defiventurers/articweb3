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

function replaceBuildPayoutPlan(source) {
  const signature = "function buildPayoutPlan(room, placements)";
  const start = source.indexOf(signature);
  if (start === -1) throw new Error("Unable to locate buildPayoutPlan.");

  const openBrace = source.indexOf("{", start);
  if (openBrace === -1) throw new Error("Unable to locate buildPayoutPlan body.");

  const end = findFunctionEnd(source, openBrace);
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

  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

function replaceClosedBetaHighStakesGate(source) {
  let transformed = source;
  const walletOfSignature = 'function walletOf(value) { return String(value || "").toLowerCase(); }';
  const helper = `${walletOfSignature}
function closedBetaHighStakesReason(wallet, roomMode) {
  if (roomMode !== ROOM_MODES.HIGH_STAKES) return "";
  const allowlist = String(process.env.CLOSED_BETA_WALLETS || process.env.HIGH_STAKES_BETA_WALLETS || "")
    .split(",")
    .map(walletOf)
    .filter(Boolean);
  const gateEnabled = process.env.CLOSED_BETA_HIGH_STAKES !== "false" || allowlist.length > 0;
  if (!gateEnabled) return "";
  if (!allowlist.length) return "Closed beta access is not configured for High Stakes rooms.";
  if (!allowlist.includes(walletOf(wallet))) return "Closed beta access required for High Stakes rooms.";
  return "";
}`;

  if (!transformed.includes("function closedBetaHighStakesReason(wallet, roomMode)")) {
    if (!transformed.includes(walletOfSignature)) throw new Error("Unable to locate walletOf for closed beta gate.");
    transformed = transformed.replace(walletOfSignature, helper);
  }

  const createRoomNeedle = 'const roomMode = normalizeRoomMode(payload.roomMode); const entryTier = normalizeEntryTier(payload.entryTier); if (roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) return fail(ws, requestId, "High Stakes rooms are not enabled yet.");';
  const createRoomReplacement = 'const roomMode = normalizeRoomMode(payload.roomMode); const entryTier = normalizeEntryTier(payload.entryTier); const betaReason = closedBetaHighStakesReason(wallet, roomMode); if (betaReason) return fail(ws, requestId, betaReason); if (roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) return fail(ws, requestId, "High Stakes rooms are not enabled yet.");';
  if (!transformed.includes(createRoomReplacement)) {
    if (!transformed.includes(createRoomNeedle)) throw new Error("Unable to locate createRoom high stakes gate.");
    transformed = transformed.replace(createRoomNeedle, createRoomReplacement);
  }

  const joinRoomNeedle = 'if (room.roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) return fail(ws, requestId, "High Stakes rooms are not enabled yet."); sockets.set(wallet, ws);';
  const joinRoomReplacement = 'const betaReason = closedBetaHighStakesReason(wallet, room.roomMode); if (betaReason) return fail(ws, requestId, betaReason); if (room.roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) return fail(ws, requestId, "High Stakes rooms are not enabled yet."); sockets.set(wallet, ws);';
  if (!transformed.includes(joinRoomReplacement)) {
    if (!transformed.includes(joinRoomNeedle)) throw new Error("Unable to locate joinRoom high stakes gate.");
    transformed = transformed.replace(joinRoomNeedle, joinRoomReplacement);
  }

  const confirmNeedle = 'if (room.roomMode !== ROOM_MODES.HIGH_STAKES) return fail(ws, requestId, "Entry locking is only for High Stakes."); if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");';
  const confirmReplacement = 'if (room.roomMode !== ROOM_MODES.HIGH_STAKES) return fail(ws, requestId, "Entry locking is only for High Stakes."); const betaReason = closedBetaHighStakesReason(wallet, room.roomMode); if (betaReason) return fail(ws, requestId, betaReason); if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");';
  if (!transformed.includes(confirmReplacement)) {
    if (!transformed.includes(confirmNeedle)) throw new Error("Unable to locate confirmEntryLock high stakes gate.");
    transformed = transformed.replace(confirmNeedle, confirmReplacement);
  }

  return transformed;
}

function transformBackendSource(source) {
  return replaceClosedBetaHighStakesGate(replaceBuildPayoutPlan(source));
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
  replaceClosedBetaHighStakesGate,
  transformBackendSource,
  HIGH_STAKES_PAYOUT_MULTIPLIERS,
  HIGH_STAKES_POINTS
};
