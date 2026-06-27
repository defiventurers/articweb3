const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  replaceSessionAndRateLimitGates,
  replaceReplayEvidence,
  replaceLeaderboardIntegrity,
  replaceHighStakesUxStatus,
  transformBackendSource
} = require("../loadPrizeBackend.js");

const backendSource = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
const transformed = transformBackendSource(backendSource);

// Phase 46: wallet session hardening.
assert.match(transformed, /ws\.authorizedWallet = wallet/, "login must bind the socket to the wallet");
assert.match(transformed, /Login with this wallet before using this action\./, "protected actions must require login");
assert.match(transformed, /Wallet session mismatch\. Log in again with this wallet\./, "payload wallet must match the logged-in socket wallet");
assert.match(transformed, /type !== "profile_login" && payloadWallet/, "profile_login must still be able to rebind the socket wallet");

// Phase 47: rate limits / abuse protection.
assert.match(transformed, /Too many requests\. Slow down\./, "per-socket action rate limit must be present");
assert.match(transformed, /Too many room create attempts\. Try again later\./, "room-create abuse limit must be present");
assert.match(transformed, /rateLimitedWsActions: true/, "health anti-cheat flags must expose WS rate limits");

// Phase 48: match replay evidence.
assert.match(transformed, /lastAuditHash/, "rooms must track the latest audit hash");
assert.match(transformed, /previousHash/, "audit events must preserve previous hash links");
assert.match(transformed, /eventHash/, "audit events must include event hashes");
assert.match(transformed, /auditHashChain: true/, "health anti-cheat flags must expose audit hash chaining");

// Phase 49: leaderboard integrity.
assert.match(transformed, /isBotWallet\(normalizedWallet\)/, "bot wallets must not receive leaderboard stats");
assert.match(transformed, /if \(profile\)/, "in-memory profile stats should update only when a profile is loaded");
assert.match(transformed, /addProfileStats\(normalizedWallet, points, won\)/, "legitimate DB profiles should still receive match stats after restarts");
assert.match(transformed, /leaderboardServerAwardOnly: true/, "health anti-cheat flags must expose server-only awards");

// Phase 50: mainnet rehearsal UX status.
assert.match(transformed, /function highStakesRoomStatus\(room\)/, "room view must include a high-stakes status helper");
assert.match(transformed, /highStakesStatus: highStakesRoomStatus\(room\)/, "room payloads must expose high-stakes status");
assert.match(transformed, /waiting_for_entry_locks/, "high-stakes status must explain entry-lock waiting state");
assert.match(transformed, /settlementError: room\.settlementError \|\| null/, "high-stakes status must expose settlement errors");

const sessionOnly = replaceSessionAndRateLimitGates(backendSource);
assert.match(sessionOnly, /protectedTypes = new Set/, "session transform should add protected action set");

const replayOnly = replaceReplayEvidence(backendSource);
assert.match(replayOnly, /eventHash/, "replay transform should hash audit events");

const leaderboardOnly = replaceLeaderboardIntegrity(backendSource);
assert.match(leaderboardOnly, /isBotWallet\(normalizedWallet\)/, "leaderboard transform should block bot stats");

const uxOnly = replaceHighStakesUxStatus(backendSource);
assert.match(uxOnly, /highStakesStatus/, "UX transform should expose high-stakes status");

console.log("[server-hardening] phases 46-50 evidence passed");
