const EXPECTED_CHAIN_ID = 2741;
const EXPECTED_LOCKED_MODE = "internal";
const EXPECTED_ENTRY_TIER = "1";

async function collectLockedMatchRehearsalEvidence(options = {}) {
  const backendUrl = normalizeBaseUrl(options.backendUrl || process.env.BACKEND_URL || "");
  const operatorKey = options.operatorKey || process.env.SETTLEMENT_OPERATOR_KEY || process.env.EVENT_INDEXER_ADMIN_KEY || "";
  const roomCode = String(options.roomCode || process.env.ROOM_CODE || "").trim().toUpperCase();
  const expectedEntryTier = String(options.expectedEntryTier || process.env.EXPECTED_ENTRY_TIER || EXPECTED_ENTRY_TIER);
  const expectedChainId = Number(options.expectedChainId || process.env.EXPECTED_ABSTRACT_CHAIN_ID || EXPECTED_CHAIN_ID);
  const expectedMode = String(options.expectedMode || process.env.EXPECTED_LOCKED_MATCH_MODE || EXPECTED_LOCKED_MODE);
  const notes = String(options.notes || process.env.REHEARSAL_NOTES || "").trim();

  if (!backendUrl) throw new Error("BACKEND_URL is required.");
  if (!operatorKey) throw new Error("SETTLEMENT_OPERATOR_KEY secret is required.");
  if (!roomCode) throw new Error("ROOM_CODE is required.");

  const runtime = await fetchJson(`${backendUrl}/runtime/status`);
  const debug = await fetchJson(`${backendUrl}/ops/settlement/debug?key=${encodeURIComponent(operatorKey)}&roomCode=${encodeURIComponent(roomCode)}`);
  const checks = validateEvidence({ runtime, debug, expectedEntryTier, expectedChainId, expectedMode, roomCode });
  const failed = checks.filter((item) => !item.ok);

  return {
    ok: failed.length === 0,
    generatedAt: new Date().toISOString(),
    backendUrl,
    roomCode,
    expectedEntryTier,
    expectedChainId,
    expectedMode,
    notes,
    passed: checks.length - failed.length,
    failed: failed.length,
    checks,
    runtime: summarizeRuntime(runtime),
    room: debug.room || null,
    settlement: debug.settlement || null,
    duplicatePrevention: debug.duplicatePrevention || null,
    recovery: debug.recovery || null,
    debugPacket: debug.debugPacket || null
  };
}

function validateEvidence({ runtime, debug, expectedEntryTier, expectedChainId, expectedMode, roomCode }) {
  const room = debug.room || {};
  const settlement = debug.settlement || {};
  const packet = debug.debugPacket || {};
  const players = Array.isArray(room.players) ? room.players : [];
  const lockTxs = players.filter((player) => player.entryTxHash);
  const payouts = Array.isArray(packet.payouts) ? packet.payouts : [];
  const orderedWallets = Array.isArray(packet.orderedWallets) ? packet.orderedWallets : [];

  return [
    check("runtime mainnet chain", Number(runtime.launch?.chainId) === expectedChainId, `chainId=${runtime.launch?.chainId}`),
    check("runtime locked mode", runtime.launch?.lockedMatchMode === expectedMode, `mode=${runtime.launch?.lockedMatchMode}`),
    check("runtime high stakes allowed", runtime.highStakes?.allowed === true, runtime.highStakes?.blockReason || "blocked"),
    check("runtime public approval remains false", runtime.launch?.legalPublicMainnetApproved === false, `legalPublicMainnetApproved=${runtime.launch?.legalPublicMainnetApproved}`),
    check("debug endpoint ok", debug.ok === true, debug.error || ""),
    check("room code matches", String(room.roomCode || "").toUpperCase() === roomCode, `roomCode=${room.roomCode}`),
    check("room is high stakes", room.roomMode === "high_stakes", `roomMode=${room.roomMode}`),
    check("expected $1 tier", String(room.entryTier || "") === expectedEntryTier, `entryTier=${room.entryTier}`),
    check("contract match id exists", /^0x[0-9a-fA-F]{64}$/.test(String(room.contractMatchId || "")), `contractMatchId=${room.contractMatchId}`),
    check("four players captured", players.length === 4, `players=${players.length}`),
    check("all players locked", players.length === 4 && players.every((player) => player.entryLocked === true), `locked=${players.filter((player) => player.entryLocked).length}`),
    check("all lock txs captured", lockTxs.length === 4, `lockTxs=${lockTxs.length}`),
    check("placements captured", Array.isArray(room.placements) && room.placements.length === 4, `placements=${Array.isArray(room.placements) ? room.placements.length : "none"}`),
    check("payout plan has four rows", Array.isArray(room.payoutPlan) && room.payoutPlan.length === 4, `payoutRows=${Array.isArray(room.payoutPlan) ? room.payoutPlan.length : "none"}`),
    check("debug packet has ordered wallets", orderedWallets.length === 4, `orderedWallets=${orderedWallets.length}`),
    check("debug packet has payouts", payouts.length === 4, `payouts=${payouts.length}`),
    check("settlement summary has payout total", Boolean(settlement.payoutTotalWei), `payoutTotalWei=${settlement.payoutTotalWei || ""}`),
    check("duplicate prevention present", Boolean(debug.duplicatePrevention), ""),
    check("recovery advice present", Boolean(debug.recovery?.action), `action=${debug.recovery?.action || ""}`)
  ];
}

function summarizeRuntime(runtime = {}) {
  return {
    generatedAt: runtime.generatedAt || null,
    nodeVersion: runtime.nodeVersion || null,
    uptimeSeconds: runtime.uptimeSeconds || null,
    launch: runtime.launch || null,
    highStakes: runtime.highStakes || null,
    indexer: runtime.indexer || null,
    stores: runtime.stores || null,
    checks: runtime.checks || null
  };
}

function buildMarkdownEvidence(report) {
  const rows = report.checks
    .map((item) => `| ${item.ok ? "PASS" : "FAIL"} | ${escapePipe(item.name)} | ${escapePipe(item.detail || "")} |`)
    .join("\n");
  const lockRows = (report.room?.players || [])
    .map((player) => `| ${escapePipe(player.wallet)} | ${escapePipe(player.team || "")} | ${player.entryLocked ? "true" : "false"} | ${escapePipe(player.entryTxHash || "")} |`)
    .join("\n");
  const payoutRows = (report.room?.payoutPlan || [])
    .map((item) => `| ${item.position || ""} | ${escapePipe(item.team || "")} | ${escapePipe(item.wallet || "")} | ${escapePipe(item.payoutWei || "0")} | ${item.points || 0} |`)
    .join("\n");

  return `# $1 Locked Match Rehearsal Evidence\n\n` +
    `| Field | Value |\n` +
    `| --- | --- |\n` +
    `| Status | ${report.ok ? "PASS" : "FAIL"} |\n` +
    `| Backend | ${escapePipe(report.backendUrl)} |\n` +
    `| Room code | ${escapePipe(report.roomCode)} |\n` +
    `| Contract match ID | ${escapePipe(report.room?.contractMatchId || "")} |\n` +
    `| Expected tier | ${escapePipe(report.expectedEntryTier)} |\n` +
    `| Room status | ${escapePipe(report.room?.status || "")} |\n` +
    `| Settlement status | ${escapePipe(report.settlement?.settlementStatus || "")} |\n` +
    `| Settlement tx | ${escapePipe(report.settlement?.settlementTxHash || "")} |\n` +
    `| Passed | ${report.passed} |\n` +
    `| Failed | ${report.failed} |\n` +
    `| Generated at | ${report.generatedAt} |\n\n` +
    `## Checks\n\n` +
    `| Result | Check | Detail |\n` +
    `| --- | --- | --- |\n` +
    `${rows}\n\n` +
    `## Lock Transactions\n\n` +
    `| Wallet | Team | Locked | Tx |\n` +
    `| --- | --- | --- | --- |\n` +
    `${lockRows}\n\n` +
    `## Payout Plan\n\n` +
    `| Position | Team | Wallet | Payout Wei | Points |\n` +
    `| --- | --- | --- | --- | --- |\n` +
    `${payoutRows}\n\n` +
    `## Recovery Advice\n\n` +
    `${escapePipe(report.recovery?.action || "none")}: ${escapePipe(report.recovery?.reason || "")}\n`;
}

function check(name, ok, detail = "") {
  return { name, ok: Boolean(ok), detail };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`${url} returned non-JSON response: ${text.slice(0, 120)}`);
  }
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${payload.error || text}`);
  return payload;
}

function normalizeBaseUrl(value) {
  let url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("wss://")) url = `https://${url.slice(6)}`;
  if (url.startsWith("ws://")) url = `http://${url.slice(5)}`;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function escapePipe(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

module.exports = {
  collectLockedMatchRehearsalEvidence,
  validateEvidence,
  buildMarkdownEvidence,
  normalizeBaseUrl
};
