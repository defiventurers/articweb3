const FALLBACK_ETH_USD = 1600;

export const FALLBACK_HIGH_STAKES_TIERS = [
  { code: "1", label: "$1", entryFeeUsd: 1, entryWei: "625000000000000", pointMultiplier: 1 },
  { code: "4", label: "$4", entryFeeUsd: 4, entryWei: "2500000000000000", pointMultiplier: 4 },
  { code: "16", label: "$16", entryFeeUsd: 16, entryWei: "10000000000000000", pointMultiplier: 16 }
];

export async function getHighStakesTiers() {
  const response = await fetch(`${apiBaseUrl()}/high-stakes/tiers`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`High stakes tiers failed with HTTP ${response.status}`);
  const packet = await response.json();
  if (!packet?.tiers || !Array.isArray(packet.tiers) || packet.tiers.length === 0) {
    throw new Error(packet?.error || "High stakes tiers response was invalid.");
  }
  return packet;
}

export function getFallbackTierSnapshot() {
  return {
    ok: false,
    source: "frontend-fallback",
    ethUsd: FALLBACK_ETH_USD,
    updatedAt: null,
    error: "Backend tier endpoint unavailable.",
    tiers: FALLBACK_HIGH_STAKES_TIERS
  };
}

function apiBaseUrl() {
  const explicit = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const wsUrl = String(import.meta.env.VITE_WS_URL || "ws://localhost:10000").trim();
  return wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/$/, "");
}
