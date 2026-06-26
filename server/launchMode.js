const VALID_LAUNCH_MODES = new Set([
  "free_play",
  "testnet_lock_lab",
  "capped_mainnet_rehearsal",
  "closed_beta_mainnet",
  "public_mainnet"
]);

function truthyEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
}

function chainId() {
  return Number(process.env.ABSTRACT_CHAIN_ID || 11124);
}

function isMainnet() {
  return chainId() === 2741;
}

function normalizeLaunchMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (VALID_LAUNCH_MODES.has(mode)) return mode;
  return isMainnet() ? "capped_mainnet_rehearsal" : "testnet_lock_lab";
}

function getLaunchMode() {
  return normalizeLaunchMode(process.env.APP_LAUNCH_MODE || process.env.LAUNCH_MODE || process.env.PUBLIC_LAUNCH_MODE || "");
}

function getLaunchStatus() {
  const mode = getLaunchMode();
  const mainnet = isMainnet();
  const internalMainnetRehearsalEnabled = truthyEnv("INTERNAL_MAINNET_REHEARSAL_ENABLED", false);
  const closedBetaMainnetEnabled = truthyEnv("CLOSED_BETA_MAINNET_ENABLED", false);
  const legalPublicMainnetApproved = truthyEnv("LEGAL_PUBLIC_MAINNET_APPROVED", false) || truthyEnv("PUBLIC_MAINNET_APPROVED", false);

  const status = {
    ok: true,
    mode,
    chainId: chainId(),
    isMainnet: mainnet,
    labels: {
      free_play: "Free Play",
      testnet_lock_lab: "Testnet Lock Lab",
      capped_mainnet_rehearsal: "Capped Internal Mainnet Rehearsal",
      closed_beta_mainnet: "Closed Beta Mainnet",
      public_mainnet: "Public Mainnet"
    },
    controls: {
      internalMainnetRehearsalEnabled,
      closedBetaMainnetEnabled,
      legalPublicMainnetApproved
    },
    publicMainnetDisabledUntilApproval: !legalPublicMainnetApproved,
    highStakesAllowed: false,
    highStakesBlockReason: ""
  };

  status.highStakesBlockReason = highStakesBlockReasonForMode(status);
  status.highStakesAllowed = !status.highStakesBlockReason;
  return status;
}

function highStakesBlockReasonForMode(status = getLaunchStatus()) {
  if (status.mode === "free_play") return "Locked Match Lab is disabled in Free Play launch mode.";
  if (status.mode === "testnet_lock_lab") {
    return status.isMainnet ? "Testnet Lock Lab cannot run on mainnet." : "";
  }
  if (status.mode === "capped_mainnet_rehearsal") {
    if (!status.isMainnet) return "Capped mainnet rehearsal mode requires Abstract Mainnet.";
    if (!status.controls.internalMainnetRehearsalEnabled) return "Internal mainnet rehearsal is disabled by launch controls.";
    return "";
  }
  if (status.mode === "closed_beta_mainnet") {
    if (!status.isMainnet) return "Closed Beta Mainnet mode requires Abstract Mainnet.";
    if (!status.controls.closedBetaMainnetEnabled) return "Closed Beta Mainnet is disabled by launch controls.";
    return "";
  }
  if (status.mode === "public_mainnet") {
    if (!status.isMainnet) return "Public Mainnet mode requires Abstract Mainnet.";
    if (!status.controls.legalPublicMainnetApproved) return "Public Mainnet is disabled until legal/compliance approval is recorded.";
    return "";
  }
  return "Unknown launch mode.";
}

function getHighStakesLaunchBlockReason(roomMode) {
  if (roomMode !== "high_stakes") return "";
  return getLaunchStatus().highStakesBlockReason;
}

module.exports = {
  getLaunchMode,
  getLaunchStatus,
  getHighStakesLaunchBlockReason,
  normalizeLaunchMode
};
