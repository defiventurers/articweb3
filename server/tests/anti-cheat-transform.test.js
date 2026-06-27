const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  replaceAntiCheatGates,
  transformBackendSource
} = require("../loadPrizeBackend.js");

const backendSource = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
const transformed = transformBackendSource(backendSource);

assert.match(
  transformed,
  /Client-side vault activity writes are disabled\. Vault activity is recorded by verified server flows only\./,
  "client-submitted vault activity writes must be blocked"
);

assert.match(
  transformed,
  /Roll dice before ending your turn\./,
  "players must roll before ending a turn"
);

assert.match(
  transformed,
  /You still have a legal move\./,
  "players must not skip a turn while a legal move exists"
);

assert.match(
  transformed,
  /hasAnyLegalMoveForTeam\(room\.gameState, activeTeam\)/,
  "end-turn guard must use server-side legal move detection"
);

assert.match(
  transformed,
  /serverOnlyVaultActivity: true/,
  "health anti-cheat flags should expose server-only vault activity"
);

assert.match(
  transformed,
  /noVoluntarySkipWithLegalMoves: true/,
  "health anti-cheat flags should expose no-skip enforcement"
);

assert.match(
  transformed,
  /getHighStakesLaunchBlockReason/,
  "anti-cheat transform must preserve launch-mode backend gate"
);

assert.match(
  transformed,
  /const payouts = \[entry \* 3n, entry \* 1n, 0n, 0n\]/,
  "anti-cheat transform must preserve high-stakes payout correction"
);

const antiCheatOnly = replaceAntiCheatGates(backendSource);
assert.doesNotMatch(
  antiCheatOnly,
  /saveVaultActivity\(payload\)/,
  "client payloads must not be directly persisted as vault activity"
);

console.log("[anti-cheat] transform evidence passed");
