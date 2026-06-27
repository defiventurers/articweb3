const { getAllowedHighStakesTierCodes } = require("./rehearsalTierCap.js");

const VALID_LOCKED_MATCH_MODES = new Set(["off", "testnet", "internal", "public"]);

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

function normalizeLockedMatchMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  return VALID_LOCKED_MATCH_MODES.has(mode) ? mode : "off";
}

function getLockedMatchMode() {
  return normalizeLockedMatchMode(process.env.LOCKED_MATCH_MODE || "off");
}

function getLaunchStatus() {
  const mode = getLockedMatchMode();
  const mainnet = isMainnet();
  const legalPublicMainnetApproved = truthyEnv("LEGAL_PUBLIC_MAINNET_APPROVED", false);

  const status = {
    ok: true,
    mode,
    lockedMatchMode: mode,
    chainId: chainId(),
    isMainnet: mainnet,
    legalPublicMainnetApproved,
    allowedModes: ["off", "testnet", "internal", "public"],
    labels: {
      off: "Off",
      testnet: "Testnet Lock Lab",
      internal: "Internal Mainnet Rehearsal",
      public: "Public Mainnet"
    },
    highStakesAllowed: false,
    highStakesBlockReason: ""
  };

  status.highStakesBlockReason = highStakesBlockReasonForStatus(status);
  status.highStakesAllowed = !status.highStakesBlockReason;
  status.allowedTierCodes = getAllowedHighStakesTierCodes(status);
  status.tierCap = {
    mode,
    allowedTierCodes: status.allowedTierCodes,
    unlockAllEnv: "UNLOCK_ALL_REHEARSAL_TIERS",
    allowedTiersEnv: "ALLOWED_REHEARSAL_TIERS"
  };
  return status;
}

function highStakesBlockReasonForStatus(status = getLaunchStatus()) {
  if (status.mode === "off") return "Locked Match Lab is switched off.";
  if (status.mode === "testnet") return status.isMainnet ? "LOCKED_MATCH_MODE=testnet cannot run on mainnet." : "";
  if (status.mode === "internal") return status.isMainnet ? "" : "LOCKED_MATCH_MODE=internal is only for Abstract Mainnet rehearsal.";
  if (status.mode === "public") {
    if (!status.isMainnet) return "LOCKED_MATCH_MODE=public requires Abstract Mainnet.";
    if (!status.legalPublicMainnetApproved) return "Public mainnet is blocked until LEGAL_PUBLIC_MAINNET_APPROVED=true.";
    return "";
  }
  return "Unknown LOCKED_MATCH_MODE.";
}

function getHighStakesLaunchBlockReason(roomMode) {
  if (roomMode !== "high_stakes") return "";
  return getLaunchStatus().highStakesBlockReason;
}

module.exports = {
  getLockedMatchMode,
  getLaunchStatus,
  getHighStakesLaunchBlockReason,
  normalizeLockedMatchMode,
  normalizeLaunchMode: normalizeLockedMatchMode
};
