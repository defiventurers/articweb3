#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const recordPath = path.resolve(repoRoot, process.argv[2] || "ops/mainnet/deployment-record.json");
const preflightUrl = process.argv[3] || "https://articweb3.onrender.com/mainnet/preflight";

main().catch((err) => {
  console.error(`[mainnet-preflight-import] ${err.message || err}`);
  process.exit(1);
});

async function main() {
  if (!fs.existsSync(recordPath)) {
    throw new Error(`Missing deployment record ${relative(recordPath)}. Create it from ops/mainnet/deployment-record.template.json first.`);
  }

  const response = await fetch(preflightUrl);
  const preflight = await response.json();
  if (!response.ok || preflight?.ok === false) {
    throw new Error(preflight?.error || `Preflight request failed with HTTP ${response.status}`);
  }

  const failedGates = Object.entries(preflight.gates || {})
    .filter(([, value]) => !value)
    .map(([key]) => key);

  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  const now = new Date().toISOString();

  record.updatedAt = now;
  record.preflight = {
    ...(record.preflight || {}),
    backendPreflightUrl: preflightUrl,
    lastReadiness: preflight.readiness || "UNKNOWN",
    lastCheckedAt: preflight.generatedAt || now,
    importedAt: now,
    failedGates,
    chain: {
      env: preflight.chain?.env || null,
      chainId: preflight.chain?.chainId || null,
      isMainnet: Boolean(preflight.chain?.isMainnet)
    },
    rpc: {
      ok: Boolean(preflight.rpc?.ok),
      latestBlock: preflight.rpc?.latestBlock || null,
      chainMatches: Boolean(preflight.rpc?.chainMatches),
      error: preflight.rpc?.error || null
    },
    vault: {
      address: preflight.vault?.address || null,
      usableAddress: Boolean(preflight.vault?.usableAddress)
    },
    settlementSigner: {
      configured: Boolean(preflight.settlementSigner?.configured),
      valid: Boolean(preflight.settlementSigner?.valid),
      address: preflight.settlementSigner?.address || null
    },
    database: {
      databaseReady: Boolean(preflight.database?.databaseReady)
    },
    indexer: {
      totalRuns: Number(preflight.indexer?.totalRuns || 0),
      totalIndexed: Number(preflight.indexer?.totalIndexed || 0),
      lastError: preflight.indexer?.lastError || null,
      lastRun: preflight.indexer?.lastRun || null
    }
  };

  record.notes = Array.isArray(record.notes) ? record.notes : [];
  record.notes.push(`Imported live preflight at ${now}: ${record.preflight.lastReadiness}; failed gates: ${failedGates.join(", ") || "none"}.`);

  if (record.preflight.lastReadiness === "READY_FOR_CAPPED_MAINNET_REHEARSAL" && record.status === "DRAFT") {
    record.status = "READY_FOR_REHEARSAL";
  }
  if (record.preflight.lastReadiness === "HOLD" && record.status === "READY_FOR_REHEARSAL") {
    record.status = "BLOCKED";
  }

  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + "\n");

  console.log(JSON.stringify({
    ok: true,
    record: relative(recordPath),
    preflightUrl,
    readiness: record.preflight.lastReadiness,
    failedGates,
    status: record.status,
    next: `node scripts/validate-mainnet-deployment.mjs ${relative(recordPath)}`
  }, null, 2));
}

function relative(value) {
  return path.relative(repoRoot, value).replaceAll("\\", "/");
}
