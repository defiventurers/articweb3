require("dotenv").config();

const http = require("http");
const { runVaultEventIndexer, getVaultIndexerHealth } = require("../vaultEventIndexer.js");
const { getRecentIndexedVaultEvents, getIndexedVaultEventStats } = require("../vaultEventStore.js");
const { getMainnetPreflight } = require("../mainnetPreflight.js");
const { getHighStakesTierSnapshot, refreshHighStakesTierSnapshot } = require("../highStakesTiers.js");
const { getLaunchStatus } = require("../launchMode.js");
const { loadRooms, roomStoreStatus } = require("../roomStore.js");
const { historyStoreStatus } = require("../historyStore.js");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const RUN_KEY = process.env.ETH_INDEXER_RUN_KEY || process.env.EVENT_INDEXER_ADMIN_KEY || "";
const SETTLEMENT_OPERATOR_KEY = process.env.SETTLEMENT_OPERATOR_KEY || RUN_KEY;
const SETTLEMENT_PENDING_STALE_MS = Math.max(60000, Number(process.env.SETTLEMENT_PENDING_STALE_MS || 10 * 60 * 1000));
const originalCreateServer = http.createServer.bind(http);

http.createServer = function createServerWithIndexerControls(listener) {
  return originalCreateServer(async (req, res) => {
    const fullUrl = new URL(req.url || "/", "http://localhost");
    const path = fullUrl.pathname;
    const isSettlementOpsPath = path === "/ops/settlement/rooms" || path === "/ops/settlement/debug";
    const isControlPath = path === "/indexer/health" || path === "/indexer/run" || path === "/indexer/events" || path === "/indexer/stats" || path === "/mainnet/preflight" || path === "/high-stakes/tiers" || path === "/launch/status" || isSettlementOpsPath;

    if (req.method === "OPTIONS" && isControlPath) {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (req.method === "GET" && path === "/launch/status") {
      res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(getLaunchStatus()));
      return;
    }

    if (req.method === "GET" && path === "/high-stakes/tiers") {
      res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(getHighStakesTierSnapshot()));
      return;
    }

    if (req.method === "GET" && path === "/mainnet/preflight") {
      try {
        const result = await getMainnetPreflight();
        res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { ...CORS_HEADERS, "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message || "Mainnet preflight failed." }));
      }
      return;
    }

    if (req.method === "GET" && path === "/ops/settlement/rooms") {
      if (!operatorAuthorized(fullUrl)) return writeJson(res, 403, { ok: false, error: "Invalid settlement operator key." });
      try {
        const result = await listSettlementRooms({ limit: fullUrl.searchParams.get("limit"), includeAll: fullUrl.searchParams.get("includeAll") });
        return writeJson(res, 200, result);
      } catch (err) {
        return writeJson(res, 500, { ok: false, error: err.message || "Could not list settlement rooms." });
      }
    }

    if (req.method === "GET" && path === "/ops/settlement/debug") {
      if (!operatorAuthorized(fullUrl)) return writeJson(res, 403, { ok: false, error: "Invalid settlement operator key." });
      try {
        const result = await getSettlementDebugPacket({ roomCode: fullUrl.searchParams.get("roomCode"), contractMatchId: fullUrl.searchParams.get("contractMatchId") || fullUrl.searchParams.get("matchId") });
        return writeJson(res, result.ok ? 200 : 404, result);
      } catch (err) {
        return writeJson(res, 500, { ok: false, error: err.message || "Could not build settlement debug packet." });
      }
    }

    if (req.method === "GET" && path === "/indexer/health") {
      res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" });
      res.end(JSON.stringify(getVaultIndexerHealth()));
      return;
    }

    if (req.method === "GET" && path === "/indexer/events") {
      const limit = Number(fullUrl.searchParams.get("limit") || 25);
      const player = fullUrl.searchParams.get("player") || "";
      const eventName = fullUrl.searchParams.get("eventName") || "";
      const matchId = fullUrl.searchParams.get("matchId") || "";
      const events = await getRecentIndexedVaultEvents({ limit, player, eventName, matchId });
      res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, events }));
      return;
    }

    if (req.method === "GET" && path === "/indexer/stats") {
      const player = fullUrl.searchParams.get("player") || "";
      const stats = await getIndexedVaultEventStats({ player });
      res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, stats }));
      return;
    }

    if (req.method === "GET" && path === "/indexer/run") {
      if (!RUN_KEY) {
        res.writeHead(503, { ...CORS_HEADERS, "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "ETH_INDEXER_RUN_KEY is not configured." }));
        return;
      }
      if (fullUrl.searchParams.get("key") !== RUN_KEY) {
        res.writeHead(403, { ...CORS_HEADERS, "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid indexer key." }));
        return;
      }
      const fromBlock = fullUrl.searchParams.get("fromBlock");
      const options = fromBlock ? { fromBlock: Number(fromBlock) } : {};
      const result = await runVaultEventIndexer(options);
      res.writeHead(result.ok ? 200 : 500, { ...CORS_HEADERS, "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    return listener(req, res);
  });
};

async function boot() {
  await refreshHighStakesTierSnapshot();

  console.log("[vault-indexer] wrapper loaded");
  require("../loadMultiGameBackend.js").loadMultiGameBackend();
  console.log("[vault-indexer] backend loaded");

  const AUTO_RUN = process.env.ETH_INDEXER_AUTO_RUN !== "false";
  const SCHEDULED_RUN = process.env.ETH_INDEXER_SCHEDULED_RUN !== "false";
  const HEARTBEAT_RUN = process.env.ETH_INDEXER_HEARTBEAT !== "false";
  const DELAY_MS = Math.max(1000, Number(process.env.ETH_INDEXER_BOOT_DELAY_MS || 2000));
  const INTERVAL_MS = Math.max(60000, Number(process.env.ETH_INDEXER_INTERVAL_MS || 300000));
  const HEARTBEAT_MS = Math.max(60000, Number(process.env.ETH_INDEXER_HEARTBEAT_MS || 300000));

  console.log("[vault-indexer] auto run", AUTO_RUN, "delay", DELAY_MS);
  console.log("[vault-indexer] scheduled run", SCHEDULED_RUN, "interval", INTERVAL_MS);
  console.log("[vault-indexer] heartbeat", HEARTBEAT_RUN, "interval", HEARTBEAT_MS);
  console.log("[vault-indexer] health endpoint /indexer/health enabled");
  console.log("[vault-indexer] events endpoint /indexer/events enabled");
  console.log("[vault-indexer] stats endpoint /indexer/stats enabled");
  console.log("[vault-indexer] mainnet preflight endpoint /mainnet/preflight enabled");
  console.log("[vault-indexer] high stakes tiers endpoint /high-stakes/tiers enabled");
  console.log("[vault-indexer] launch status endpoint /launch/status enabled", JSON.stringify(getLaunchStatus()));
  console.log("[vault-indexer] settlement ops endpoints enabled", Boolean(SETTLEMENT_OPERATOR_KEY));
  console.log("[vault-indexer] protected run endpoint /indexer/run", Boolean(RUN_KEY));

  async function runIndexer(label) {
    try {
      console.log(`[vault-indexer] ${label} run starting`);
      const result = await runVaultEventIndexer();
      console.log(`[vault-indexer] ${label} run finished`, JSON.stringify(result));
    } catch (err) {
      console.error(`[vault-indexer] ${label} run error`, err.message || err);
    }
  }

  function logHeartbeat() {
    const health = getVaultIndexerHealth();
    console.log("[vault-indexer] heartbeat", JSON.stringify({
      running: health.running,
      totalRuns: health.totalRuns,
      totalIndexed: health.totalIndexed,
      lastError: health.lastError,
      lastRunOk: health.lastRun?.ok ?? null,
      lastRunLatest: health.lastRun?.latest ?? null,
      lastRunIndexed: health.lastRun?.indexed ?? null,
      databaseReady: health.store?.databaseReady ?? false
    }));
  }

  if (AUTO_RUN) {
    setTimeout(() => runIndexer("boot"), DELAY_MS);
  } else {
    console.log("[vault-indexer] boot run disabled");
  }

  if (SCHEDULED_RUN) {
    setInterval(() => runIndexer("scheduled"), INTERVAL_MS);
  } else {
    console.log("[vault-indexer] scheduled run disabled");
  }

  if (HEARTBEAT_RUN) {
    setTimeout(logHeartbeat, DELAY_MS + 5000);
    setInterval(logHeartbeat, HEARTBEAT_MS);
  } else {
    console.log("[vault-indexer] heartbeat disabled");
  }
}

function writeJson(res, status, body) {
  res.writeHead(status, { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function operatorAuthorized(url) {
  return Boolean(SETTLEMENT_OPERATOR_KEY && url.searchParams.get("key") === SETTLEMENT_OPERATOR_KEY);
}

async function listSettlementRooms(options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit || 50)));
  const includeAll = String(options.includeAll || "") === "true";
  const rooms = await loadRooms();
  const rows = rooms
    .filter((room) => room?.roomMode === "high_stakes")
    .filter((room) => includeAll || room.status === "finished" || room.settlementStatus)
    .sort((a, b) => Number(b.finalizedAt || b.createdAt || 0) - Number(a.finalizedAt || a.createdAt || 0))
    .slice(0, limit)
    .map(settlementRoomSummary);
  return { ok: true, count: rows.length, pendingStaleMs: SETTLEMENT_PENDING_STALE_MS, stores: { roomStore: roomStoreStatus(), historyStore: historyStoreStatus() }, rooms: rows };
}

async function getSettlementDebugPacket(identifier = {}) {
  const room = await findSettlementRoom(identifier);
  if (!room) return { ok: false, error: "High Stakes room not found." };
  const duplicatePrevention = duplicateSettlementSummary(room);
  const recovery = recoveryAdvice(room, duplicatePrevention);
  return { ok: true, generatedAt: new Date().toISOString(), room: debugRoom(room), settlement: settlementRoomSummary(room), duplicatePrevention, recovery, debugPacket: copyableDebugPacket(room, duplicatePrevention, recovery) };
}

async function findSettlementRoom(identifier = {}) {
  const roomCode = String(identifier.roomCode || "").trim().toUpperCase();
  const contractMatchId = String(identifier.contractMatchId || "").trim().toLowerCase();
  const rooms = await loadRooms();
  return rooms.find((room) => {
    if (!room || room.roomMode !== "high_stakes") return false;
    if (roomCode && String(room.roomCode || "").toUpperCase() === roomCode) return true;
    if (contractMatchId && String(room.contractMatchId || "").toLowerCase() === contractMatchId) return true;
    return false;
  }) || null;
}

function settlementRoomSummary(room) {
  const status = room.settlementStatus || null;
  const submittedAt = lastAuditAt(room, "settlement_submitted") || lastAuditAt(room, "manual_recovery_submitted");
  const pendingAgeMs = submittedAt ? Date.now() - submittedAt : null;
  const pendingTooLong = Boolean(["submitted", "settlement_pending", "submitting"].includes(status || "") && pendingAgeMs !== null && pendingAgeMs > SETTLEMENT_PENDING_STALE_MS);
  return { roomCode: room.roomCode, matchId: room.matchId, contractMatchId: room.contractMatchId, status: room.status, settlementStatus: status, settlementTxHash: room.settlementTxHash || null, settlementError: room.settlementError || null, settlementAttempts: Number(room.settlementAttempts || 0), submittedAt, pendingAgeMs, pendingTooLong, reviewNeeded: ["failed", "needs_settlement_review", "needs_settlement_signer", "needs_game_server_update"].includes(status || "") || pendingTooLong, entryWei: room.entryWei || "0", payoutTotalWei: payoutTotalWei(room), payoutCount: Array.isArray(room.payoutPlan) ? room.payoutPlan.length : 0, playerCount: Object.keys(room.players || {}).length, finalizedAt: room.finalizedAt || null };
}

function debugRoom(room) {
  return { roomCode: room.roomCode, matchId: room.matchId, contractMatchId: room.contractMatchId, roomMode: room.roomMode, status: room.status, entryTier: room.entryTier || null, entryWei: room.entryWei || "0", finalizedAt: room.finalizedAt || null, proofHash: room.proofHash || null, placements: room.placements || [], payoutPlan: room.payoutPlan || [], players: Object.values(room.players || {}).map((player) => ({ wallet: player.wallet, team: player.team || null, entryLocked: Boolean(player.entryLocked), entryTxHash: player.entryTxHash || null })), auditTail: (room.auditLog || []).slice(-25) };
}

function duplicateSettlementSummary(room) {
  const submitted = (room.auditLog || []).filter((event) => ["settlement_submitted", "settlement_already_onchain", "settlement_duplicate_skipped"].includes(event.type));
  return { submittedCount: submitted.filter((event) => event.type === "settlement_submitted").length, hasSettlementTx: Boolean(room.settlementTxHash), settled: room.settlementStatus === "settled", safeToRetryAutomatically: room.settlementStatus === "failed" && !room.settlementTxHash, events: submitted.slice(-10) };
}

function recoveryAdvice(room, duplicatePrevention) {
  if (room.settlementStatus === "settled") return { action: "none", message: "Match already settled." };
  if (duplicatePrevention.hasSettlementTx) return { action: "verify_onchain", message: "A settlement transaction already exists. Verify it before any retry." };
  if (room.settlementStatus === "needs_settlement_signer") return { action: "configure_signer", message: "Configure ETH_SETTLEMENT_SIGNER and restart the server." };
  if (room.settlementStatus === "needs_game_server_update") return { action: "update_vault_game_server", message: "Set the vault gameServer to the configured settlement signer." };
  if (room.settlementStatus === "needs_settlement_review") return { action: "manual_review", message: "Retry limit reached. Review the debug packet and on-chain state." };
  if (room.settlementStatus === "failed") return { action: "restart_or_manual_retry", message: "No settlement transaction is recorded. Correct the error before retrying." };
  return { action: "monitor", message: "Monitor current settlement state." };
}

function copyableDebugPacket(room, duplicatePrevention, recovery) {
  return JSON.stringify({ roomCode: room.roomCode, matchId: room.matchId, contractMatchId: room.contractMatchId, settlementStatus: room.settlementStatus || null, settlementTxHash: room.settlementTxHash || null, settlementError: room.settlementError || null, settlementAttempts: room.settlementAttempts || 0, payoutPlan: room.payoutPlan || [], proofHash: room.proofHash || null, duplicatePrevention, recovery, auditTail: (room.auditLog || []).slice(-25) }, null, 2);
}

function lastAuditAt(room, type) {
  const found = [...(room.auditLog || [])].reverse().find((event) => event.type === type);
  return found?.at || null;
}

function payoutTotalWei(room) {
  return (room.payoutPlan || []).reduce((total, item) => total + BigInt(item.payoutWei || "0"), 0n).toString();
}

boot().catch((err) => {
  console.error("[vault-indexer] boot failed", err);
  process.exitCode = 1;
});
