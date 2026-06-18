#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const args = parseArgs(process.argv.slice(2));
const backendUrl = normalizeBaseUrl(args.backend || process.env.TESTNET_BACKEND_URL || "https://articweb3.onrender.com");
const eventLimit = Math.max(10, Number(args.eventLimit || args.limit || 100));
const outDir = path.resolve(repoRoot, args.out || `ops/evidence/testnet/${new Date().toISOString().slice(0, 10)}`);
const generatedAt = new Date().toISOString();

main().catch((err) => {
  console.error(`[testnet-evidence] ${err.message || err}`);
  process.exit(1);
});

async function main() {
  const [health, preflight, stats, latestEvents] = await Promise.all([
    fetchJson(`${backendUrl}/health`),
    fetchJson(`${backendUrl}/mainnet/preflight`),
    fetchJson(`${backendUrl}/indexer/stats`),
    fetchJson(`${backendUrl}/indexer/events?limit=${eventLimit}`)
  ]);

  const events = Array.isArray(latestEvents.events) ? latestEvents.events : [];
  const eventSummary = summarizeEvents(events);
  const detectedCleanLockedCycles = eventSummary.matches.filter((match) => match.entryLockedCount >= 4 && match.matchSettledCount >= 1).length;
  const manualCleanCycles = args.cleanCycles === undefined ? null : Number(args.cleanCycles);
  const uiPassed = parseOptionalBool(args.uiPassed);

  const packet = {
    schema: "artic.testnet.evidence.v1",
    generatedAt,
    backendUrl,
    commits: {
      frontendCommit: args.frontendCommit || process.env.FRONTEND_COMMIT || "",
      backendCommit: args.backendCommit || process.env.BACKEND_COMMIT || "",
      evidenceCommit: args.evidenceCommit || process.env.EVIDENCE_COMMIT || ""
    },
    readinessPercent: {
      cappedInternalMainnetRehearsal: args.mainnetRehearsalPct || "93-94%",
      closedCappedMainnetBeta: args.closedBetaPct || "85-87%",
      publicMainnetLaunch: args.publicLaunchPct || "63-67%"
    },
    manualClaims: {
      cleanLockedCycles: manualCleanCycles,
      uiPassed,
      notes: args.notes || ""
    },
    backend: {
      health,
      preflight,
      indexerStats: stats.stats || stats,
      latestEvents
    },
    evidence: {
      detectedCleanLockedCycles,
      eventSummary,
      gates: buildGates({ health, preflight, stats: stats.stats || stats, events, detectedCleanLockedCycles, manualCleanCycles, uiPassed })
    },
    blockers: buildBlockers({ preflight, detectedCleanLockedCycles, manualCleanCycles, uiPassed })
  };

  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "testnet-evidence.json");
  const markdownPath = path.join(outDir, "testnet-evidence.md");
  fs.writeFileSync(jsonPath, JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(markdownPath, renderMarkdown(packet) + "\n");

  console.log(JSON.stringify({
    ok: true,
    outDir: relative(outDir),
    json: relative(jsonPath),
    markdown: relative(markdownPath),
    detectedCleanLockedCycles,
    manualCleanCycles,
    uiPassed,
    blockers: packet.blockers,
    next: "Attach the Markdown/JSON to the mainnet rehearsal issue or deployment record."
  }, null, 2));
}

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 120)}`);
  }
  if (!response.ok || data?.ok === false) {
    throw new Error(`Endpoint failed ${url}: ${data?.error || response.status}`);
  }
  return data;
}

function summarizeEvents(events) {
  const byEvent = {};
  const byPlayer = new Set();
  const matchMap = new Map();
  let latestBlock = 0;

  for (const event of events) {
    const name = event.eventName || "Unknown";
    byEvent[name] = (byEvent[name] || 0) + 1;
    if (event.player) byPlayer.add(String(event.player).toLowerCase());
    latestBlock = Math.max(latestBlock, Number(event.blockNumber || 0));
    if (!event.matchId) continue;
    const matchId = event.matchId;
    const current = matchMap.get(matchId) || {
      matchId,
      entryLockedCount: 0,
      matchSettledCount: 0,
      depositedCount: 0,
      withdrawnCount: 0,
      totalEntryLockedWei: "0",
      settlementWei: "0",
      txHashes: []
    };
    if (name === "EntryLocked") {
      current.entryLockedCount += 1;
      current.totalEntryLockedWei = (BigInt(current.totalEntryLockedWei) + BigInt(event.amountWei || "0")).toString();
    }
    if (name === "MatchSettled") {
      current.matchSettledCount += 1;
      current.settlementWei = (BigInt(current.settlementWei) + BigInt(event.amountWei || "0")).toString();
    }
    if (name === "Deposited") current.depositedCount += 1;
    if (name === "Withdrawn") current.withdrawnCount += 1;
    if (event.txHash && !current.txHashes.includes(event.txHash)) current.txHashes.push(event.txHash);
    matchMap.set(matchId, current);
  }

  const matches = [...matchMap.values()].sort((a, b) => b.entryLockedCount + b.matchSettledCount - (a.entryLockedCount + a.matchSettledCount));
  return {
    totalEvents: events.length,
    byEvent,
    uniquePlayersInLatestEvents: byPlayer.size,
    latestBlock,
    matches
  };
}

function buildGates({ health, preflight, stats, events, detectedCleanLockedCycles, manualCleanCycles, uiPassed }) {
  const totalEvents = Number(stats?.totalEvents || events.length || 0);
  return {
    backendHealthOk: Boolean(health?.ok),
    databaseReady: Boolean(preflight?.database?.databaseReady || stats?.store?.databaseReady),
    testnetChainConfirmed: preflight?.chain?.env === "testnet" && Number(preflight?.chain?.chainId) === 11124,
    mainnetCorrectlyBlocked: preflight?.readiness === "HOLD" && preflight?.gates?.chainIsMainnet === false,
    indexerHasEvents: totalEvents > 0,
    indexerHasEntryLocked: Boolean(stats?.byEvent?.some?.((row) => row.eventName === "EntryLocked" && Number(row.count) > 0)),
    indexerHasMatchSettled: Boolean(stats?.byEvent?.some?.((row) => row.eventName === "MatchSettled" && Number(row.count) > 0)),
    detectedCleanLockedCyclesMet: detectedCleanLockedCycles >= 3,
    manualCleanLockedCyclesMet: manualCleanCycles === null ? null : manualCleanCycles >= 3,
    uiPassed: uiPassed === null ? null : Boolean(uiPassed)
  };
}

function buildBlockers({ preflight, detectedCleanLockedCycles, manualCleanCycles, uiPassed }) {
  const blockers = [];
  if (preflight?.readiness !== "HOLD") blockers.push("Testnet evidence expected /mainnet/preflight to remain HOLD before mainnet switch.");
  if (detectedCleanLockedCycles < 1) blockers.push("No detected locked cycle with both EntryLocked and MatchSettled in the fetched event window.");
  if (manualCleanCycles !== null && manualCleanCycles < 3) blockers.push("Manual clean locked cycle count is below 3.");
  if (uiPassed === false) blockers.push("Manual UI pass flag is false.");
  return blockers;
}

function renderMarkdown(packet) {
  const stats = packet.backend.indexerStats || {};
  const gates = packet.evidence.gates;
  const matches = packet.evidence.eventSummary.matches || [];
  const byEvent = packet.evidence.eventSummary.byEvent || {};
  const lines = [];

  lines.push("# Testnet Evidence Packet");
  lines.push("");
  lines.push(`Generated: ${packet.generatedAt}`);
  lines.push(`Backend: ${packet.backendUrl}`);
  lines.push("");
  lines.push("## Readiness Percentages");
  lines.push("");
  lines.push(`- Capped internal mainnet rehearsal: ${packet.readinessPercent.cappedInternalMainnetRehearsal}`);
  lines.push(`- Closed capped mainnet beta: ${packet.readinessPercent.closedCappedMainnetBeta}`);
  lines.push(`- Public mainnet launch: ${packet.readinessPercent.publicMainnetLaunch}`);
  lines.push("");
  lines.push("## Backend / Preflight");
  lines.push("");
  lines.push(`- Backend health OK: ${yesNo(gates.backendHealthOk)}`);
  lines.push(`- Database ready: ${yesNo(gates.databaseReady)}`);
  lines.push(`- Testnet chain confirmed: ${yesNo(gates.testnetChainConfirmed)}`);
  lines.push(`- Mainnet correctly blocked: ${yesNo(gates.mainnetCorrectlyBlocked)}`);
  lines.push(`- Preflight readiness: ${packet.backend.preflight?.readiness || "unknown"}`);
  lines.push(`- Chain ID: ${packet.backend.preflight?.chain?.chainId || "unknown"}`);
  lines.push("");
  lines.push("## Indexer Evidence");
  lines.push("");
  lines.push(`- Total indexed events: ${stats.totalEvents ?? packet.evidence.eventSummary.totalEvents}`);
  lines.push(`- Unique players: ${stats.uniquePlayers ?? packet.evidence.eventSummary.uniquePlayersInLatestEvents}`);
  lines.push(`- Latest indexed block: ${stats.latestBlock ?? packet.evidence.eventSummary.latestBlock}`);
  lines.push(`- EntryLocked present: ${yesNo(gates.indexerHasEntryLocked)}`);
  lines.push(`- MatchSettled present: ${yesNo(gates.indexerHasMatchSettled)}`);
  lines.push("");
  lines.push("### Event Counts");
  lines.push("");
  Object.entries(byEvent).forEach(([name, count]) => lines.push(`- ${name}: ${count}`));
  lines.push("");
  lines.push("## Detected Locked Cycles");
  lines.push("");
  lines.push(`Detected clean locked cycles from fetched events: ${packet.evidence.detectedCleanLockedCycles}`);
  lines.push(`Manual clean locked cycles: ${packet.manualClaims.cleanLockedCycles ?? "not provided"}`);
  lines.push(`Manual UI passed: ${packet.manualClaims.uiPassed ?? "not provided"}`);
  lines.push("");
  matches.slice(0, 10).forEach((match, index) => {
    lines.push(`### Match ${index + 1}`);
    lines.push(`- matchId: ${match.matchId}`);
    lines.push(`- EntryLocked count: ${match.entryLockedCount}`);
    lines.push(`- MatchSettled count: ${match.matchSettledCount}`);
    lines.push(`- Total locked wei: ${match.totalEntryLockedWei}`);
    lines.push(`- Settlement wei: ${match.settlementWei}`);
    lines.push(`- Tx hashes: ${match.txHashes.join(", ") || "none"}`);
    lines.push("");
  });
  lines.push("## Blockers");
  lines.push("");
  if (packet.blockers.length) packet.blockers.forEach((item) => lines.push(`- ${item}`));
  else lines.push("- No evidence-packet blockers from fetched public data.");
  lines.push("");
  lines.push("## Public Launch Status");
  lines.push("");
  lines.push("This evidence supports capped internal mainnet rehearsal only. It does not approve public paid launch, real-money rewards, or token rewards.");
  return lines.join("\n");
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      index += 1;
    }
  }
  return out;
}

function parseOptionalBool(value) {
  if (value === undefined) return null;
  const text = String(value).toLowerCase();
  if (["true", "1", "yes", "pass", "passed"].includes(text)) return true;
  if (["false", "0", "no", "fail", "failed"].includes(text)) return false;
  return null;
}

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

function yesNo(value) {
  if (value === null || value === undefined) return "n/a";
  return value ? "yes" : "no";
}

function relative(value) {
  return path.relative(repoRoot, value).replaceAll("\\", "/");
}
