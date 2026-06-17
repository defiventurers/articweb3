require("dotenv").config();

console.log("[vault-indexer] wrapper loaded");
require("../index.js");
console.log("[vault-indexer] backend loaded");

const { runVaultEventIndexer, getVaultIndexerHealth } = require("../vaultEventIndexer.js");

const AUTO_RUN = process.env.ETH_INDEXER_AUTO_RUN !== "false";
const SCHEDULED_RUN = process.env.ETH_INDEXER_SCHEDULED_RUN !== "false";
const HEARTBEAT_RUN = process.env.ETH_INDEXER_HEARTBEAT !== "false";
const DELAY_MS = Math.max(1000, Number(process.env.ETH_INDEXER_BOOT_DELAY_MS || 2000));
const INTERVAL_MS = Math.max(60000, Number(process.env.ETH_INDEXER_INTERVAL_MS || 300000));
const HEARTBEAT_MS = Math.max(60000, Number(process.env.ETH_INDEXER_HEARTBEAT_MS || 300000));

console.log("[vault-indexer] auto run", AUTO_RUN, "delay", DELAY_MS);
console.log("[vault-indexer] scheduled run", SCHEDULED_RUN, "interval", INTERVAL_MS);
console.log("[vault-indexer] heartbeat", HEARTBEAT_RUN, "interval", HEARTBEAT_MS);

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
