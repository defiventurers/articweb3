const DEFAULT_EXPECTED_MODE = "internal";
const DEFAULT_EXPECTED_CHAIN_ID = 2741;
const { probeHealth } = require('./healthMonitor');

async function runLiveMainnetSmoke(options = {}) {
  const backendUrl = normalizeBaseUrl(options.backendUrl || process.env.BACKEND_URL || process.env.RENDER_BACKEND_URL || "");
  const expectedMode = options.expectedMode || process.env.EXPECTED_LOCKED_MATCH_MODE || DEFAULT_EXPECTED_MODE;
  const expectedChainId = Number(options.expectedChainId || process.env.EXPECTED_ABSTRACT_CHAIN_ID || DEFAULT_EXPECTED_CHAIN_ID);

  if (!backendUrl) throw new Error("BACKEND_URL is required.");

  const results = [];
  const health = await probeHealth(`${backendUrl}/healthz`, { check: 'liveness' });
  results.push(check("healthz schema and liveness", health.ok, health.code));
  const readiness = await probeHealth(`${backendUrl}/readyz`);
  results.push(check("readyz schema and required database", readiness.ok, readiness.code));

  const runtime = await fetchJson(`${backendUrl}/runtime/status`);
  results.push(check("runtime status ok", runtime.ok === true));
  results.push(check("runtime chain id", Number(runtime.launch?.chainId) === expectedChainId, `chainId=${runtime.launch?.chainId}`));
  results.push(check("runtime is mainnet", runtime.launch?.isMainnet === true));
  results.push(check("locked match mode", runtime.launch?.lockedMatchMode === expectedMode, `mode=${runtime.launch?.lockedMatchMode}`));
  results.push(check("high stakes allowed", runtime.highStakes?.allowed === true, runtime.highStakes?.blockReason || "blocked"));
  results.push(check("legal public approval false for rehearsal", runtime.launch?.legalPublicMainnetApproved === false, `legalPublicMainnetApproved=${runtime.launch?.legalPublicMainnetApproved}`));
  results.push(check("tier snapshot has tiers", Number(runtime.highStakes?.tiers?.count || 0) >= 1, `count=${runtime.highStakes?.tiers?.count}`));
  results.push(check("room store readable", runtime.checks?.roomStoreReadable === true));
  results.push(check("history store readable", runtime.checks?.historyStoreReadable === true));

  const launch = await fetchJson(`${backendUrl}/launch/status`);
  results.push(check("launch endpoint mode matches runtime", launch.lockedMatchMode === runtime.launch?.lockedMatchMode, `launch=${launch.lockedMatchMode} runtime=${runtime.launch?.lockedMatchMode}`));
  results.push(check("launch endpoint allows high stakes", launch.highStakesAllowed === true, launch.highStakesBlockReason || "blocked"));

  const tiers = await fetchJson(`${backendUrl}/high-stakes/tiers`);
  results.push(check("tiers endpoint readable", tiers.ok !== false));
  results.push(check("tiers endpoint has 3 tiers", Array.isArray(tiers.tiers) && tiers.tiers.length === 3, `tiers=${Array.isArray(tiers.tiers) ? tiers.tiers.length : "none"}`));

  const indexer = await fetchJson(`${backendUrl}/indexer/health`);
  results.push(check("indexer endpoint readable", typeof indexer.running === "boolean"));
  results.push(check("indexer store ready", indexer.store?.databaseReady === true, `databaseReady=${indexer.store?.databaseReady}`));
  results.push(check("indexer last error empty", !indexer.lastError, indexer.lastError || ""));

  const failed = results.filter((item) => !item.ok);
  return {
    ok: failed.length === 0,
    backendUrl,
    expectedMode,
    expectedChainId,
    generatedAt: new Date().toISOString(),
    passed: results.length - failed.length,
    failed: failed.length,
    results
  };
}

function check(name, ok, detail = "") {
  return { name, ok: Boolean(ok), detail };
}

async function fetchJson(url) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" } });
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw new Error('Endpoint returned an unexpected content type.');
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error('Endpoint returned invalid JSON.');
  }
  if (!response.ok) throw new Error(`Endpoint returned HTTP ${response.status}.`);
  return payload;
}

function normalizeBaseUrl(value) {
  let url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("wss://")) url = `https://${url.slice(6)}`;
  if (url.startsWith("ws://")) url = `http://${url.slice(5)}`;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

module.exports = {
  runLiveMainnetSmoke,
  normalizeBaseUrl
};
