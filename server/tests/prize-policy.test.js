const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const {
  replaceBuildPayoutPlan,
  HIGH_STAKES_PAYOUT_MULTIPLIERS,
  HIGH_STAKES_POINTS
} = require("../loadPrizeBackend.js");

const indexPath = path.join(__dirname, "..", "index.js");
const source = fs.readFileSync(indexPath, "utf8");
const transformed = replaceBuildPayoutPlan(source);
const signature = "function buildPayoutPlan(room, placements)";

function findFunctionEnd(text, openBraceIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openBraceIndex; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  throw new Error("Unable to locate transformed buildPayoutPlan end.");
}

function extractBuildPayoutPlan(text) {
  const starts = [...text.matchAll(/function buildPayoutPlan\(room, placements\)/g)];
  assert.strictEqual(starts.length, 1, "transformed source must contain one buildPayoutPlan function");

  const start = starts[0].index;
  const openBrace = text.indexOf("{", start);
  assert.notStrictEqual(openBrace, -1, "buildPayoutPlan opening brace should exist");

  return text.slice(start, findFunctionEnd(text, openBrace));
}

function teamWallet(room, teamName) {
  return Object.values(room.players || {}).find((player) => player.team === teamName)?.wallet || null;
}

function createRoom(entryWei) {
  return {
    entryWei,
    players: {
      red: { wallet: "0xred", team: "red" },
      green: { wallet: "0xgreen", team: "green" },
      blue: { wallet: "0xblue", team: "blue" },
      yellow: { wallet: "0xyellow", team: "yellow" }
    }
  };
}

function runBuildPayoutPlan(functionText, room, placements) {
  const context = { room, placements, teamWallet, result: null };
  vm.createContext(context);
  vm.runInContext(`${functionText}\nresult = buildPayoutPlan(room, placements);`, context);
  return context.result;
}

assert.deepStrictEqual(HIGH_STAKES_PAYOUT_MULTIPLIERS, [3n, 1n, 0n, 0n], "High Stakes payout multipliers changed");
assert.deepStrictEqual(HIGH_STAKES_POINTS, [3000, 2000, 1000, 100], "High Stakes points changed");

const functionText = extractBuildPayoutPlan(transformed);

assert.match(functionText, /const payouts = \[entry \* 3n, entry \* 1n, 0n, 0n\];/, "transformed payouts must be 3E/1E/0/0");
assert.match(functionText, /const points = \[3000, 2000, 1000, 100\];/, "transformed points must be fixed High Stakes points");
assert.match(functionText, /wallet:\s*teamWallet\(room, team\)/, "wallet resolution must still use teamWallet(room, team)");
assert.match(functionText, /payoutWei:\s*payouts\[index\]\.toString\(\)/, "payoutWei must remain string-compatible");
assert.match(functionText, /position:\s*index \+ 1/, "placement position order must be index based");
assert.match(functionText, /team,/, "placement team order must be preserved");

for (const forbidden of [/50n/, /30n/, /20n/, /\/\s*100n/, /\bpool\b/, /\bfirst\b/, /\bsecond\b/, /\bthird\b/, /\bfourth\b/, /\bremainder\b/]) {
  assert.doesNotMatch(functionText, forbidden, `old 50/30/20 payout logic leaked into transformed buildPayoutPlan: ${forbidden}`);
}

for (const forbidden of [/basePoints/, /pointMultiplier/, /normalizeEntryTier/, /\bmultiplier\b/]) {
  assert.doesNotMatch(functionText, forbidden, `old tier-scaled points leaked into transformed buildPayoutPlan: ${forbidden}`);
}

const placements = ["blue", "yellow", "green", "red"];
const tiers = [
  { label: "$1", entryWei: "1000000000000000", oldMultiplier: 1 },
  { label: "$4", entryWei: "4000000000000000", oldMultiplier: 4 },
  { label: "$16", entryWei: "16000000000000000", oldMultiplier: 16 }
];

for (const tier of tiers) {
  const entry = BigInt(tier.entryWei);
  const pool = entry * 4n;
  const plan = runBuildPayoutPlan(functionText, createRoom(tier.entryWei), placements);
  const expectedPayouts = HIGH_STAKES_PAYOUT_MULTIPLIERS.map((multiplier) => (entry * multiplier).toString());
  const oldTierScaledPoints = [10, 6, 3, 0].map((points) => points * tier.oldMultiplier);

  assert.deepStrictEqual(plan.map((item) => item.position), [1, 2, 3, 4], `${tier.label} placement positions changed`);
  assert.deepStrictEqual(plan.map((item) => item.team), placements, `${tier.label} placement team order changed`);
  assert.deepStrictEqual(plan.map((item) => item.wallet), ["0xblue", "0xyellow", "0xgreen", "0xred"], `${tier.label} wallet resolution changed`);
  assert.deepStrictEqual(plan.map((item) => item.payoutWei), expectedPayouts, `${tier.label} payoutWei plan changed`);
  assert.deepStrictEqual(plan.map((item) => item.points), HIGH_STAKES_POINTS, `${tier.label} fixed points changed`);
  assert.notDeepStrictEqual(plan.map((item) => item.points), oldTierScaledPoints, `${tier.label} old tier-scaled points are still present`);

  for (const item of plan) {
    assert.strictEqual(typeof item.payoutWei, "string", `${tier.label} payoutWei must be a string`);
    assert.strictEqual(BigInt(item.payoutWei).toString(), item.payoutWei, `${tier.label} payoutWei must be BigInt string-compatible`);
  }

  const totalPayout = plan.reduce((sum, item) => sum + BigInt(item.payoutWei), 0n);
  assert.strictEqual(totalPayout, pool, `${tier.label} total payout must equal locked pool`);
  assert.ok(totalPayout <= pool, `${tier.label} payout math creates extra ETH`);
  assert.strictEqual(pool - totalPayout, 0n, `${tier.label} payout math leaves leftover contract balance`);
}

console.log("Prize policy evidence test passed for $1, $4, and $16 High Stakes rooms.");
