const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  getLaunchStatus,
  getHighStakesLaunchBlockReason,
  normalizeLockedMatchMode,
  normalizeLaunchMode
} = require("../launchMode.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

const ORIGINAL_ENV = { ...process.env };

function resetEnv(overrides = {}) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
  for (const key of [
    "LOCKED_MATCH_MODE",
    "ABSTRACT_CHAIN_ID",
    "LEGAL_PUBLIC_MAINNET_APPROVED"
  ]) {
    if (!(key in overrides)) delete process.env[key];
  }
}

function assertAllowed(label, overrides) {
  resetEnv(overrides);
  const status = getLaunchStatus();
  assert.equal(status.highStakesAllowed, true, `${label}: should allow Locked Match Lab`);
  assert.equal(getHighStakesLaunchBlockReason("high_stakes"), "", `${label}: should not return block reason`);
}

function assertBlocked(label, overrides, expectedText) {
  resetEnv(overrides);
  const status = getLaunchStatus();
  assert.equal(status.highStakesAllowed, false, `${label}: should block Locked Match Lab`);
  assert.match(status.highStakesBlockReason, expectedText, `${label}: should explain block reason`);
  assert.match(getHighStakesLaunchBlockReason("high_stakes"), expectedText, `${label}: block helper should match`);
}

assert.equal(normalizeLockedMatchMode("bad-value"), "off");
assert.equal(normalizeLaunchMode("bad-value"), "off");
assert.equal(getHighStakesLaunchBlockReason("open_ice"), "");

assertBlocked("default off", {
  ABSTRACT_CHAIN_ID: "11124"
}, /switched off/);

assertBlocked("explicit off", {
  ABSTRACT_CHAIN_ID: "2741",
  LOCKED_MATCH_MODE: "off"
}, /switched off/);

assertAllowed("testnet mode on testnet", {
  ABSTRACT_CHAIN_ID: "11124",
  LOCKED_MATCH_MODE: "testnet"
});

assertBlocked("testnet mode on mainnet", {
  ABSTRACT_CHAIN_ID: "2741",
  LOCKED_MATCH_MODE: "testnet"
}, /cannot run on mainnet/);

assertAllowed("internal mode on mainnet", {
  ABSTRACT_CHAIN_ID: "2741",
  LOCKED_MATCH_MODE: "internal"
});

assertBlocked("internal mode on testnet", {
  ABSTRACT_CHAIN_ID: "11124",
  LOCKED_MATCH_MODE: "internal"
}, /only for Abstract Mainnet/);

assertBlocked("public mainnet without approval", {
  ABSTRACT_CHAIN_ID: "2741",
  LOCKED_MATCH_MODE: "public"
}, /LEGAL_PUBLIC_MAINNET_APPROVED=true/);

assertAllowed("public mainnet with approval", {
  ABSTRACT_CHAIN_ID: "2741",
  LOCKED_MATCH_MODE: "public",
  LEGAL_PUBLIC_MAINNET_APPROVED: "true"
});

assertBlocked("public mode on testnet", {
  ABSTRACT_CHAIN_ID: "11124",
  LOCKED_MATCH_MODE: "public",
  LEGAL_PUBLIC_MAINNET_APPROVED: "true"
}, /requires Abstract Mainnet/);

const backendSource = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
const transformedBackend = transformBackendSource(backendSource);
assert.match(transformedBackend, /getHighStakesLaunchBlockReason/);
assert.match(transformedBackend, /launchBlocked: true/);
assert.match(transformedBackend, /const entry = BigInt\(room\.entryWei \|\| "0"\)/);

resetEnv();
console.log("[launch-mode] simple switch evidence passed");