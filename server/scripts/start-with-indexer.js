require("dotenv").config();

const http = require("http");
const { runVaultEventIndexer, getVaultIndexerHealth } = require("../vaultEventIndexer.js");
const { getRecentIndexedVaultEvents, getIndexedVaultEventStats } = require("../vaultEventStore.js");
const { getMainnetPreflight } = require("../mainnetPreflight.js");
const { getHighStakesTierSnapshot, refreshHighStakesTierSnapshot } = require("../highStakesTiers.js");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const RUN_KEY = process.env.ETH_INDEXER_RUN_KEY || process.env.EVENT_INDEXER_ADMIN_KEY || "";
const originalCreateServer = http.createServer.bind(http);

http.createServer = function createServerWithIndexerControls(listener) {
  return originalCreateServer(async (req, res) => {
    const fullUrl = new URL(req.url || "/", "http://localhost");
    const path = fullUrl.pathname;
    const isControlPath = path === "/indexer/health" || path === "/indexer/run" || path === "/indexer/events" || path === "/indexer/stats" || path === "/mainnet/preflight" || path === "/high-stakes/tiers";

    if (req.method === "OPTIONS" && isControlPath) {
      res.writeHead(204, CORS_HEADERS);
      res.end();
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

    if (req.method === "GET" && path === "/indexer/health") {
      res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" });
      res.end(JSON.stringify(getVaultIndexerHealth()));
      return;
    }

    if (req.method === "GET" && path === "/indexer/events") {
      const limit = Number(fullUrl.searchParams.get("limit") || 25);
      const player = fullUrl.searchParams.get("player") || "";
      const eventName = fullUrl.searchParams.get("eventName") || "";
      const events = await getRecentIndexedVaultEvents({ limit, player, eventName });
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
  require("../index.js");
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

boot().catch((err) => {
  console.error("[vault-indexer] boot failed", err.message || err);
  process.exitCode = 1;
});
