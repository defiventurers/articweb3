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
  let parameterDepth = 0;
  let sawParameterList = false;
  let openBrace = -1;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") { parameterDepth += 1; sawParameterList = true; continue; }
    if (char === ")") { parameterDepth -= 1; continue; }
    if (char === "{" && sawParameterList && parameterDepth === 0) { openBrace = index; break; }
  }
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

  const confirmNeedle = 'if (room.roomMode !== ROOM_MODES.HIGH_STAKES) return fail(ws, requestId, "Entry locking is only for High Stakes.");';
  const confirmReplacement = 'if (room.roomMode !== ROOM_MODES.HIGH_STAKES) return fail(ws, requestId, "Entry locking is only for High Stakes."); const launchReason = getHighStakesLaunchBlockReason(room.roomMode); if (launchReason) return fail(ws, requestId, launchReason);';
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

function replaceLoginSessionBinding(source) {
  const needle = 'profiles.set(wallet, profile); sockets.set(wallet, ws); return ok(ws, requestId, "profile_login_result", { profile });';
  const replacement = 'profiles.set(wallet, profile); ws.authorizedWallet = wallet; sockets.set(wallet, ws); return ok(ws, requestId, "profile_login_result", { profile });';
  if (!source.includes(needle) || source.includes("ws.authorizedWallet = wallet")) return source;
  return source.replace(needle, replacement);
}

function injectWalletAuthentication(source) {
  let transformed = source;
  const viemNeedle = 'const { createPublicClient, http: viemHttp, parseAbi } = require("viem");';
  const viemReplacement = 'const { createPublicClient, http: viemHttp, parseAbi, verifyMessage } = require("viem");';
  if (!transformed.includes("verifyMessage } = require(\"viem\")")) {
    if (!transformed.includes(viemNeedle)) throw new Error("Unable to locate viem import for wallet authentication.");
    transformed = transformed.replace(viemNeedle, viemReplacement);
  }

  const socketAnchor = "const sockets = new Map();";
  const socketAddition = `${socketAnchor}
const WALLET_ADDRESS_RE = /^0x[a-f0-9]{40}$/i;
const AUTH_CHALLENGE_TTL_MS = Math.min(300000, Math.max(30000, Number(process.env.AUTH_CHALLENGE_TTL_MS || 120000)));`;
  if (!transformed.includes("const WALLET_ADDRESS_RE")) {
    if (!transformed.includes(socketAnchor)) throw new Error("Unable to locate socket map for wallet authentication.");
    transformed = transformed.replace(socketAnchor, socketAddition);
  }

  const loginSignature = "async function login(ws, requestId, payload)";
  const loginReplacement = `async function createAuthChallenge(ws, requestId, payload = {}) {
  const wallet = walletOf(payload.address);
  if (!WALLET_ADDRESS_RE.test(wallet)) return fail(ws, requestId, "Provide a valid wallet address.");
  const nonce = randomBytes(24).toString("hex");
  const expiresAt = Date.now() + AUTH_CHALLENGE_TTL_MS;
  const message = \`Arctic Dominion sign-in\\nWallet: \${wallet}\\nNonce: \${nonce}\\nExpires: \${expiresAt}\`;
  ws.authChallenge = { wallet, message, expiresAt };
  return ok(ws, requestId, "profile_auth_challenge_result", { challenge: message, expiresAt });
}
async function login(ws, requestId, payload = {}) {
  const wallet = walletOf(payload.address);
  const name = String(payload.name || "").trim();
  if (!WALLET_ADDRESS_RE.test(wallet)) return fail(ws, requestId, "Provide a valid wallet address.");
  if (!/^[\\p{L}\\p{N} ._-]{3,20}$/u.test(name)) return fail(ws, requestId, "Name must use 3–20 letters, numbers, spaces, dots, underscores, or hyphens.");
  const challenge = ws.authChallenge;
  if (!challenge || challenge.wallet !== wallet || challenge.message !== String(payload.challenge || "") || Date.now() > challenge.expiresAt) return fail(ws, requestId, "Wallet sign-in challenge expired. Please try again.");
  let signatureValid = false;
  try { signatureValid = await verifyMessage({ address: wallet, message: challenge.message, signature: String(payload.signature || "") }); } catch (err) { console.error("[auth] signature verification failed", err?.message || err); }
  if (!signatureValid) return fail(ws, requestId, "Wallet signature could not be verified.");
  delete ws.authChallenge;
  try { const profile = await upsertProfile({ wallet, name }); profiles.set(wallet, profile); sockets.set(wallet, ws); return ok(ws, requestId, "profile_login_result", { profile }); } catch (err) { return fail(ws, requestId, err.message || "Could not save profile."); }
}`;
  if (!transformed.includes("async function createAuthChallenge")) {
    if (!transformed.includes(loginSignature)) throw new Error("Unable to locate profile login for wallet authentication.");
    transformed = replaceFunctionByName(transformed, loginSignature, loginReplacement);
  }
  return transformed;
}

function injectRateLimitConfig(source) {
  const anchor = "const sockets = new Map();";
  const addition = `${anchor}
const accountRateBuckets = new Map();
const ipRateBuckets = new Map();
function boundedPositiveEnv(name, fallback, min, max) { const parsed = Number(process.env[name]); return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.floor(parsed))) : fallback; }
const RATE_LIMITS = {
  maxPayloadBytes: boundedPositiveEnv("WS_MAX_PAYLOAD_BYTES", 65536, 1024, 1048576),
  actionWindowMs: boundedPositiveEnv("WS_ACTION_WINDOW_MS", 10000, 1000, 300000),
  actionsPerWindow: boundedPositiveEnv("WS_ACTION_LIMIT", 120, 10, 1000),
  authWindowMs: boundedPositiveEnv("WS_AUTH_WINDOW_MS", 60000, 10000, 3600000),
  authPerWindow: boundedPositiveEnv("WS_AUTH_LIMIT", 12, 3, 100),
  roomCreateWindowMs: boundedPositiveEnv("WS_ROOM_CREATE_WINDOW_MS", 60000, 10000, 3600000),
  roomCreatePerWindow: boundedPositiveEnv("WS_ROOM_CREATE_LIMIT", 8, 1, 100)
};
function consumeRateLimit(bucketMap, key, now, limit, windowMs) { const existing = bucketMap.get(key); const bucket = !existing || now - existing.startedAt >= windowMs ? { startedAt: now, count: 0 } : existing; bucket.count += 1; bucketMap.set(key, bucket); return bucket.count <= limit; }`;
  if (source.includes("const accountRateBuckets = new Map();")) return source;
  if (!source.includes(anchor)) throw new Error("Unable to locate socket map for rate-limit configuration.");
  return source.replace(anchor, addition);
}

function replaceMessageBodyLimit(source) {
  const needle = 'new WebSocket.Server({ server }).on("connection", (ws) => { ws.on("message", async (raw) => { let packet;';
  const replacement = 'new WebSocket.Server({ server, maxPayload: RATE_LIMITS.maxPayloadBytes }).on("connection", (ws) => { ws.on("message", async (raw) => { if (Buffer.byteLength(raw) > RATE_LIMITS.maxPayloadBytes) return fail(ws, null, "Request payload is too large."); let packet;';
  if (!source.includes(needle) || source.includes("Request payload is too large.")) return source;
  return source.replace(needle, replacement);
}

function replaceMessageIngressGates(source) {
  const needle = 'const { type, requestId, payload = {} } = packet; if (type === "profile_login")';
  const replacement = 'if (!packet || typeof packet !== "object" || Array.isArray(packet)) return fail(ws, null, "Invalid request envelope."); const { type, requestId, payload = {} } = packet; if (typeof type !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(type)) return fail(ws, requestId, "Invalid request type."); if (requestId !== undefined && typeof requestId !== "string" && typeof requestId !== "number") return fail(ws, null, "Invalid request identifier."); if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.getPrototypeOf(payload) !== Object.prototype || Object.keys(payload).length > 40) return fail(ws, requestId, "Invalid request payload."); const now = Date.now(); const payloadWallet = walletOf(payload.wallet || payload.address); const clientIp = String(ws?._socket?.remoteAddress || "unknown"); const rateIdentity = payloadWallet || ws.authorizedWallet || `ip:${clientIp}`; const isAuthAction = type === "profile_login" || type === "profile_auth_challenge"; const actionLimit = isAuthAction ? RATE_LIMITS.authPerWindow : RATE_LIMITS.actionsPerWindow; const actionWindowMs = isAuthAction ? RATE_LIMITS.authWindowMs : RATE_LIMITS.actionWindowMs; if (!consumeRateLimit(ipRateBuckets, `${clientIp}:${isAuthAction ? "auth" : "action"}`, now, actionLimit, actionWindowMs) || !consumeRateLimit(accountRateBuckets, `${rateIdentity}:${isAuthAction ? "auth" : "action"}`, now, actionLimit, actionWindowMs)) return fail(ws, requestId, isAuthAction ? "Too many attempts. Please wait before trying again." : "Too many requests. Slow down."); if (type === "room_create" && (!consumeRateLimit(ipRateBuckets, `${clientIp}:room_create`, now, RATE_LIMITS.roomCreatePerWindow, RATE_LIMITS.roomCreateWindowMs) || !consumeRateLimit(accountRateBuckets, `${rateIdentity}:room_create`, now, RATE_LIMITS.roomCreatePerWindow, RATE_LIMITS.roomCreateWindowMs))) return fail(ws, requestId, "Too many room create attempts. Try again later."); const protectedTypes = new Set(["game_history", "my_rooms", "vault_activity", "vault_activity_record", "room_create", "room_join", "room_confirm_entry", "room_select_team", "dev_fill_room", "game_state", "game_roll_dice", "game_select_square", "game_end_turn"]); if (protectedTypes.has(type) && !ws.authorizedWallet) return fail(ws, requestId, "Login with this wallet before using this action."); if (type !== "profile_login" && type !== "profile_auth_challenge" && payloadWallet && ws.authorizedWallet && payloadWallet !== ws.authorizedWallet) return fail(ws, requestId, "Wallet session mismatch. Log in again with this wallet."); if (type === "profile_auth_challenge") return createAuthChallenge(ws, requestId, payload); if (type === "profile_login")';
  if (!source.includes(needle) || source.includes("Wallet session mismatch. Log in again with this wallet.")) return source;
  return source.replace(needle, replacement);
}

function replaceAuditHashChain(source) {
  const replacement = 'function audit(room, event) { room.auditLog = room.auditLog || []; const seq = room.auditLog.length + 1; const previousHash = room.lastAuditHash || room.auditLog[room.auditLog.length - 1]?.eventHash || null; const eventBody = { at: Date.now(), seq, previousHash, ...event }; const eventHash = sha256(JSON.stringify({ roomCode: room.roomCode, matchId: room.matchId, contractMatchId: room.contractMatchId, event: eventBody })); room.lastAuditHash = eventHash; room.auditLog.push({ ...eventBody, eventHash }); }';
  return replaceFunctionByName(source, "function audit(room, event)", replacement);
}

function replaceLeaderboardAwardGuard(source) {
  const replacement = 'function addPoints(wallet, points, won) { const normalizedWallet = walletOf(wallet); if (!normalizedWallet || isBotWallet(normalizedWallet)) return; const profile = profileFor(normalizedWallet); if (profile) { profile.points += points; profile.gamesPlayed += 1; if (won) profile.wins += 1; profiles.set(normalizedWallet, profile); } addProfileStats(normalizedWallet, points, won).catch((err) => console.error(`[profile-db] stat update failed wallet=${normalizedWallet}: ${err.message}`)); }';
  return replaceFunctionByName(source, "function addPoints(wallet, points, won)", replacement);
}

function replaceClientErrorDisclosure(source) {
  let transformed = source;
  const replacements = [
    ['return fail(ws, requestId, err.message || "Could not save profile.");', 'console.error("[profile] save failed", err?.message || err); return fail(ws, requestId, "Could not save profile.");'],
    ['return fail(ws, requestId, err.message || "Could not load leaderboard.");', 'console.error("[leaderboard] load failed", err?.message || err); return fail(ws, requestId, "Could not load leaderboard.");'],
    ['return fail(ws, requestId, err.shortMessage || err.message || "Could not verify entry lock.");', 'console.error("[entry-lock] verification failed", err?.message || err); return fail(ws, requestId, "Could not verify entry lock.");']
  ];
  replacements.forEach(([needle, replacement]) => { if (transformed.includes(needle)) transformed = transformed.replace(needle, replacement); });
  return transformed;
}

function replaceSettlementErrorDisclosure(source) {
  const replacement = 'function settlementErrorMessage(err) { console.error("[settlement] operation failed", err?.shortMessage || err?.message || err); return "Settlement failed. Check the room status or contact support."; }';
  return replaceFunctionByName(source, "function settlementErrorMessage(err)", replacement);
}

function injectHighStakesRoomStatus(source) {
  if (source.includes("function highStakesRoomStatus(room)")) return source;
  const needle = 'function highStakesReady(room) { const ps = players(room); return ps.length === 4 && realPlayers(room).length === 4 && ps.every((p) => p.entryLocked) && teamsAreReady(room); }';
  const helper = `${needle}\nfunction highStakesRoomStatus(room) { if (room.roomMode !== ROOM_MODES.HIGH_STAKES) return null; const ps = players(room); const lockedCount = ps.filter((p) => p.entryLocked).length; const requiredCount = 4; let nextAction = "waiting_for_players"; if (ps.length === 4 && lockedCount < requiredCount) nextAction = "waiting_for_entry_locks"; else if (ps.length === 4 && !teamsAreReady(room)) nextAction = "waiting_for_teams"; else if (room.status === "playing") nextAction = "match_in_progress"; else if (room.status === "finished" && room.settlementStatus === "settled") nextAction = "settled"; else if (room.status === "finished") nextAction = room.settlementStatus || "settlement_pending"; else if (roomCanCountdown(room)) nextAction = "ready_countdown"; return { enabled: true, lockedCount, requiredCount, allEntriesLocked: lockedCount === requiredCount, realPlayerCount: realPlayers(room).length, settlementStatus: room.settlementStatus || null, settlementTxHash: room.settlementTxHash || null, settlementError: room.settlementError || null, settlementAttempts: room.settlementAttempts || 0, nextAction }; }`;
  if (!source.includes(needle)) throw new Error("Unable to locate highStakesReady for room status helper.");
  return source.replace(needle, helper);
}

function injectHighStakesStatusInView(source) {
  const needle = 'settlementCheckedAt: room.settlementCheckedAt || null, proofHash: room.proofHash || null,';
  const replacement = 'settlementCheckedAt: room.settlementCheckedAt || null, highStakesStatus: highStakesRoomStatus(room), proofHash: room.proofHash || null,';
  if (!source.includes(needle) || source.includes("highStakesStatus: highStakesRoomStatus(room)")) return source;
  return source.replace(needle, replacement);
}

function appendAntiCheatFlag(source, anchor, flag) {
  if (source.includes(flag)) return source;
  if (!source.includes(anchor)) throw new Error(`Unable to locate anti-cheat health flag anchor: ${anchor}`);
  return source.replace(anchor, `${anchor}, ${flag}`);
}

function replaceHealthAntiCheatFlags(source) {
  let transformed = source;
  transformed = appendAntiCheatFlag(transformed, "onChainSettlementCheck: true", "serverOnlyVaultActivity: true");
  transformed = appendAntiCheatFlag(transformed, "serverOnlyVaultActivity: true", "noVoluntarySkipWithLegalMoves: true");
  transformed = appendAntiCheatFlag(transformed, "noVoluntarySkipWithLegalMoves: true", "walletSessionBound: true");
  transformed = appendAntiCheatFlag(transformed, "walletSessionBound: true", "rateLimitedWsActions: true");
  transformed = appendAntiCheatFlag(transformed, "rateLimitedWsActions: true", "auditHashChain: true");
  transformed = appendAntiCheatFlag(transformed, "auditHashChain: true", "leaderboardServerAwardOnly: true");
  return transformed;
}

function replaceAntiCheatGates(source) {
  return replaceHealthAntiCheatFlags(replaceEndTurnGate(replaceClientVaultActivityWrites(source)));
}

function replaceSessionAndRateLimitGates(source) {
  return replaceMessageIngressGates(replaceMessageBodyLimit(replaceLoginSessionBinding(injectRateLimitConfig(source))));
}

function replaceReplayEvidence(source) {
  return replaceAuditHashChain(source);
}

function replaceLeaderboardIntegrity(source) {
  return replaceLeaderboardAwardGuard(source);
}

function replaceHighStakesUxStatus(source) {
  return injectHighStakesStatusInView(injectHighStakesRoomStatus(source));
}

function transformBackendSource(source) {
  let transformed = injectWalletAuthentication(source);
  transformed = replaceBuildPayoutPlan(transformed);
  transformed = replaceLaunchModeGate(transformed);
  transformed = replaceAntiCheatGates(transformed);
  transformed = replaceSessionAndRateLimitGates(transformed);
  transformed = replaceReplayEvidence(transformed);
  transformed = replaceLeaderboardIntegrity(transformed);
  transformed = replaceClientErrorDisclosure(transformed);
  transformed = replaceSettlementErrorDisclosure(transformed);
  transformed = replaceHighStakesUxStatus(transformed);
  return transformed;
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
  replaceSessionAndRateLimitGates,
  replaceLoginSessionBinding,
  injectWalletAuthentication,
  replaceMessageIngressGates,
  replaceReplayEvidence,
  replaceLeaderboardIntegrity,
  replaceClientErrorDisclosure,
  replaceSettlementErrorDisclosure,
  replaceHighStakesUxStatus,
  transformBackendSource,
  HIGH_STAKES_PAYOUT_MULTIPLIERS,
  HIGH_STAKES_POINTS
};
