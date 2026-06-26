const assert = require("assert/strict");
const {
  getLaunchStatus,
  getHighStakesLaunchBlockReason,
  normalizeLaunchMode
} = require("../launchMode.js");

const ORIGINAL_ENV = { ...process.env };

function resetEnv(overrides = {}) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
  for (const key of [
    "APP_LAUNCH_MODE",
    "LAUNCH_MODE",
    "PUBLIC_LAUNCH_MODE",
    "ABSTRACT_CHAIN_ID",
    "INTERNAL_MAINNET_REHEARSAL_ENABLED",
    "CLOSED_BETA_MAINNET_ENABLED",
    "LEGAL_PUBLIC_MAINNET_APPROVED",
    "PUBLIC_MAINNET_APPROVED"
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

assert.equal(normalizeLaunchMode("bad-value"), "testnet_lock_lab");
assert.equal(getHighStakesLaunchBlockReason("open_ice"), "");

assertAllowed("testnet lab", {
  ABSTRACT_CHAIN_ID: "11124",
  APP_LAUNCH_MODE: "testnet_lock_lab"
});

assertBlocked("free play", {
  ABSTRACT_CHAIN_ID: "11124",
  APP_LAUNCH_MODE: "free_play"
}, /Free Play/);

assertBlocked("mainnet rehearsal default blocked", {
  ABSTRACT_CHAIN_ID: "2741",
  APP_LAUNCH_MODE: "capped_mainnet_rehearsal"
}, /rehearsal is disabled/);

assertAllowed("mainnet rehearsal explicitly enabled", {
  ABSTRACT_CHAIN_ID: "2741",
  APP_LAUNCH_MODE: "capped_mainnet_rehearsal",
  INTERNAL_MAINNET_REHEARSAL_ENABLED: "true"
});

assertBlocked("public mainnet without approval", {
  ABSTRACT_CHAIN_ID: "2741",
  APP_LAUNCH_MODE: "public_mainnet"
}, /legal\/compliance approval/);

assertAllowed("public mainnet with approval", {
  ABSTRACT_CHAIN_ID: "2741",
  APP_LAUNCH_MODE: "public_mainnet",
  LEGAL_PUBLIC_MAINNET_APPROVED: "true"
});

assertBlocked("closed beta mainnet disabled", {
  ABSTRACT_CHAIN_ID: "2741",
  APP_LAUNCH_MODE: "closed_beta_mainnet"
}, /Closed Beta Mainnet is disabled/);

assertAllowed("closed beta mainnet enabled", {
  ABSTRACT_CHAIN_ID: "2741",
  APP_LAUNCH_MODE: "closed_beta_mainnet",
  CLOSED_BETA_MAINNET_ENABLED: "true"
});

resetEnv();
console.log("[launch-mode] evidence passed");
