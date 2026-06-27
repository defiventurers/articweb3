const DEFAULT_INTERNAL_ALLOWED_TIERS = ["1"];
const ALL_TIER_CODES = ["1", "4", "16"];

function truthyEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
}

function csvEnv(name, fallback = []) {
  const raw = process.env[name];
  if (!raw) return [...fallback];
  return String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTierCode(value) {
  const code = String(value || "1").trim();
  return ALL_TIER_CODES.includes(code) ? code : "1";
}

function getAllowedHighStakesTierCodes(launchStatus = {}) {
  const mode = launchStatus.lockedMatchMode || launchStatus.mode || "off";
  if (mode === "internal") {
    if (truthyEnv("UNLOCK_ALL_REHEARSAL_TIERS", false)) return [...ALL_TIER_CODES];
    const configured = csvEnv("ALLOWED_REHEARSAL_TIERS", DEFAULT_INTERNAL_ALLOWED_TIERS)
      .map(normalizeTierCode)
      .filter((code, index, arr) => arr.indexOf(code) === index);
    return configured.length ? configured : [...DEFAULT_INTERNAL_ALLOWED_TIERS];
  }
  return [...ALL_TIER_CODES];
}

function isHighStakesTierAllowed(code, launchStatus = {}) {
  return getAllowedHighStakesTierCodes(launchStatus).includes(normalizeTierCode(code));
}

function getHighStakesTierBlockReason(code, launchStatus = {}) {
  const normalized = normalizeTierCode(code);
  if (isHighStakesTierAllowed(normalized, launchStatus)) return "";
  return `Entry tier $${normalized} is locked during internal mainnet rehearsal. Use the $1 tier until higher tiers are explicitly unlocked.`;
}

function applyTierCapToSnapshot(snapshot = {}, launchStatus = {}) {
  const allowedTierCodes = getAllowedHighStakesTierCodes(launchStatus);
  const tiers = Array.isArray(snapshot.tiers) ? snapshot.tiers : [];
  return {
    ...snapshot,
    allowedTierCodes,
    tierCap: {
      mode: launchStatus.lockedMatchMode || launchStatus.mode || "off",
      allowedTierCodes,
      unlockAllEnv: "UNLOCK_ALL_REHEARSAL_TIERS",
      allowedTiersEnv: "ALLOWED_REHEARSAL_TIERS"
    },
    tiers: tiers.map((tier) => ({
      ...tier,
      enabled: allowedTierCodes.includes(String(tier.code)),
      disabledReason: allowedTierCodes.includes(String(tier.code)) ? "" : getHighStakesTierBlockReason(tier.code, launchStatus)
    }))
  };
}

module.exports = {
  ALL_TIER_CODES,
  DEFAULT_INTERNAL_ALLOWED_TIERS,
  applyTierCapToSnapshot,
  getAllowedHighStakesTierCodes,
  getHighStakesTierBlockReason,
  isHighStakesTierAllowed,
  normalizeTierCode
};
