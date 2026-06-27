const assert = require("assert/strict");
const {
  applyTierCapToSnapshot,
  getAllowedHighStakesTierCodes,
  getHighStakesTierBlockReason,
  isHighStakesTierAllowed,
  normalizeTierCode
} = require("../rehearsalTierCap.js");

const ORIGINAL_ENV = { ...process.env };

function resetEnv(overrides = {}) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
  for (const key of ["UNLOCK_ALL_REHEARSAL_TIERS", "ALLOWED_REHEARSAL_TIERS"]) {
    if (!(key in overrides)) delete process.env[key];
  }
}

const internal = { lockedMatchMode: "internal" };
const publicMode = { lockedMatchMode: "public" };

resetEnv();
assert.deepEqual(getAllowedHighStakesTierCodes(internal), ["1"]);
assert.equal(isHighStakesTierAllowed("1", internal), true);
assert.equal(isHighStakesTierAllowed("4", internal), false);
assert.match(getHighStakesTierBlockReason("16", internal), /internal mainnet rehearsal/);

resetEnv({ ALLOWED_REHEARSAL_TIERS: "1,4" });
assert.deepEqual(getAllowedHighStakesTierCodes(internal), ["1", "4"]);
assert.equal(isHighStakesTierAllowed("4", internal), true);
assert.equal(isHighStakesTierAllowed("16", internal), false);

resetEnv({ UNLOCK_ALL_REHEARSAL_TIERS: "true" });
assert.deepEqual(getAllowedHighStakesTierCodes(internal), ["1", "4", "16"]);

resetEnv();
assert.deepEqual(getAllowedHighStakesTierCodes(publicMode), ["1", "4", "16"]);
assert.equal(normalizeTierCode("bad"), "1");

const capped = applyTierCapToSnapshot({ ok: true, tiers: [
  { code: "1", label: "$1" },
  { code: "4", label: "$4" },
  { code: "16", label: "$16" }
] }, internal);
assert.deepEqual(capped.allowedTierCodes, ["1"]);
assert.equal(capped.tiers.find((tier) => tier.code === "1").enabled, true);
assert.equal(capped.tiers.find((tier) => tier.code === "4").enabled, false);
assert.match(capped.tiers.find((tier) => tier.code === "4").disabledReason, /Use the \$1 tier/);

resetEnv();
console.log("[rehearsal-tier-cap] evidence passed");
