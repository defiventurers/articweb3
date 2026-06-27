const assert = require("assert/strict");
const {
  validateEvidence,
  buildMarkdownEvidence,
  normalizeBaseUrl
} = require("../lockedMatchRehearsalEvidence.js");

const runtime = {
  launch: {
    chainId: 2741,
    lockedMatchMode: "internal",
    legalPublicMainnetApproved: false
  },
  highStakes: {
    allowed: true,
    blockReason: ""
  }
};

const debug = {
  ok: true,
  room: {
    roomCode: "ABCD",
    roomMode: "high_stakes",
    status: "finished",
    entryTier: "1",
    contractMatchId: "0x" + "a".repeat(64),
    placements: ["green", "red", "blue", "yellow"],
    players: [
      { wallet: "0x1", team: "green", entryLocked: true, entryTxHash: "0xtx1" },
      { wallet: "0x2", team: "red", entryLocked: true, entryTxHash: "0xtx2" },
      { wallet: "0x3", team: "blue", entryLocked: true, entryTxHash: "0xtx3" },
      { wallet: "0x4", team: "yellow", entryLocked: true, entryTxHash: "0xtx4" }
    ],
    payoutPlan: [
      { position: 1, team: "green", wallet: "0x1", payoutWei: "300", points: 3000 },
      { position: 2, team: "red", wallet: "0x2", payoutWei: "100", points: 2000 },
      { position: 3, team: "blue", wallet: "0x3", payoutWei: "0", points: 1000 },
      { position: 4, team: "yellow", wallet: "0x4", payoutWei: "0", points: 100 }
    ]
  },
  settlement: {
    payoutTotalWei: "400",
    settlementStatus: "submitted",
    settlementTxHash: "0xsettle"
  },
  duplicatePrevention: {
    duplicateRisk: true
  },
  recovery: {
    action: "verify_existing_tx",
    reason: "Existing settlement transaction/status is active or final."
  },
  debugPacket: {
    orderedWallets: ["0x1", "0x2", "0x3", "0x4"],
    payouts: ["300", "100", "0", "0"]
  }
};

const checks = validateEvidence({ runtime, debug, expectedEntryTier: "1", expectedChainId: 2741, expectedMode: "internal", roomCode: "ABCD" });
assert.equal(checks.every((item) => item.ok), true, checks.filter((item) => !item.ok).map((item) => item.name).join(", "));

const failedChecks = validateEvidence({ runtime, debug, expectedEntryTier: "4", expectedChainId: 2741, expectedMode: "internal", roomCode: "ABCD" });
assert.equal(failedChecks.find((item) => item.name === "expected $1 tier").ok, false);

const markdown = buildMarkdownEvidence({
  ok: true,
  backendUrl: "https://example.com",
  roomCode: "ABCD",
  expectedEntryTier: "1",
  passed: checks.length,
  failed: 0,
  generatedAt: "2026-06-27T00:00:00.000Z",
  checks,
  room: debug.room,
  settlement: debug.settlement,
  recovery: debug.recovery
});
assert.match(markdown, /Locked Match Rehearsal Evidence/);
assert.match(markdown, /Lock Transactions/);
assert.match(markdown, /Payout Plan/);

assert.equal(normalizeBaseUrl("wss://example.com"), "https://example.com");

console.log("[locked-match-rehearsal-evidence] evidence passed");
