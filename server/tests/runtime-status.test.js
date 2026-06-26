const assert = require("assert/strict");
const { buildRuntimeStatus, summarizeIndexer, summarizeTiers } = require("../runtimeStatus.js");

const status = buildRuntimeStatus({
  getLaunchStatus: () => ({ ok: true, lockedMatchMode: "internal", highStakesAllowed: true, highStakesBlockReason: "" }),
  getVaultIndexerHealth: () => ({ running: false, totalRuns: 2, totalIndexed: 7, lastRun: { ok: true, latest: 123, indexed: 4 }, store: { databaseReady: true } }),
  getHighStakesTierSnapshot: () => ({ ok: true, source: "test", tiers: [{ code: "1", label: "$1", entryFeeUsd: 1, entryWei: "100", pointMultiplier: 1 }] }),
  roomStoreStatus: () => ({ databaseReady: true }),
  historyStoreStatus: () => ({ databaseReady: true })
});

assert.equal(status.ok, true);
assert.equal(status.service, "artic-web3-server");
assert.equal(status.launch.lockedMatchMode, "internal");
assert.equal(status.highStakes.allowed, true);
assert.equal(status.highStakes.tiers.count, 1);
assert.equal(status.indexer.totalRuns, 2);
assert.equal(status.indexer.totalIndexed, 7);
assert.equal(status.stores.roomStore.databaseReady, true);
assert.equal(status.checks.launchStatusReadable, true);
assert.equal(status.checks.lockedMatchSwitchReadable, true);
assert.equal(status.checks.tierSnapshotReadable, true);

const failed = buildRuntimeStatus({
  getLaunchStatus: () => { throw new Error("boom"); },
  getVaultIndexerHealth: () => { throw new Error("bad indexer"); },
  getHighStakesTierSnapshot: () => ({ ok: false, error: "no tiers" })
});

assert.equal(failed.ok, true);
assert.equal(failed.launch.ok, false);
assert.match(failed.launch.error, /boom/);
assert.match(failed.indexer.lastError, /bad indexer/);
assert.equal(failed.highStakes.tiers.ok, false);

assert.deepEqual(summarizeIndexer({ lastRun: { ok: false, latest: 10, indexed: 0 } }).lastRunOk, false);
assert.equal(summarizeTiers({ tiers: [] }).count, 0);

console.log("[runtime-status] evidence passed");
