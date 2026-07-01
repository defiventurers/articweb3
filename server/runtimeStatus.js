function buildRuntimeStatus(deps = {}) {
  const launch = safeRead(deps.getLaunchStatus, { ok: false, error: "launch status unavailable" });
  const indexer = safeRead(deps.getVaultIndexerHealth, { running: false, lastError: "indexer health unavailable" });
  const tiers = safeRead(deps.getHighStakesTierSnapshot, { ok: false, error: "tier snapshot unavailable" });
  const roomStore = safeRead(deps.roomStoreStatus, { databaseReady: false, error: "room store status unavailable" });
  const historyStore = safeRead(deps.historyStoreStatus, { databaseReady: false, error: "history store status unavailable" });

  const indexerSummary = summarizeIndexer(indexer);
  const tierSummary = summarizeTiers(tiers);

  return {
    ok: true,
    service: "artic-web3-server",
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    launch,
    highStakes: {
      allowed: Boolean(launch.highStakesAllowed),
      blockReason: launch.highStakesBlockReason || "",
      tiers: tierSummary
    },
    indexer: indexerSummary,
    stores: {
      roomStore,
      historyStore
    },
    checks: buildChecks({ launch, indexer: indexerSummary, tiers: tierSummary, roomStore, historyStore })
  };
}

function safeRead(fn, fallback) {
  if (typeof fn !== "function") return fallback;
  try {
    return fn();
  } catch (err) {
    return { ...fallback, error: err.message || String(err) };
  }
}

function summarizeIndexer(health = {}) {
  return {
    running: Boolean(health.running),
    totalRuns: Number(health.totalRuns || 0),
    totalIndexed: Number(health.totalIndexed || 0),
    lastError: health.error || health.lastError || "",
    lastRunOk: health.lastRun?.ok ?? null,
    lastRunLatest: health.lastRun?.latest ?? null,
    lastRunIndexed: health.lastRun?.indexed ?? null,
    store: health.store || null
  };
}

function summarizeTiers(snapshot = {}) {
  const tiers = Array.isArray(snapshot.tiers) ? snapshot.tiers : [];
  return {
    ok: snapshot.ok !== false,
    count: tiers.length,
    source: snapshot.source || null,
    refreshedAt: snapshot.refreshedAt || snapshot.updatedAt || null,
    error: snapshot.error || "",
    tiers: tiers.map((tier) => ({
      code: tier.code,
      label: tier.label,
      entryFeeUsd: tier.entryFeeUsd,
      entryWei: tier.entryWei,
      pointMultiplier: tier.pointMultiplier
    }))
  };
}

function buildChecks({ launch, indexer, tiers, roomStore, historyStore }) {
  return {
    launchStatusReadable: Boolean(launch && launch.ok !== false),
    lockedMatchSwitchReadable: Boolean(launch && launch.lockedMatchMode),
    indexerHealthReadable: Boolean(indexer),
    tierSnapshotReadable: Boolean(tiers && tiers.ok !== false),
    roomStoreReadable: Boolean(roomStore),
    historyStoreReadable: Boolean(historyStore)
  };
}

module.exports = {
  buildRuntimeStatus,
  summarizeIndexer,
  summarizeTiers
};
