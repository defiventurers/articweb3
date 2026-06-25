const DEFAULT_ETH_USD = Number(process.env.ETH_ENTRY_PRICE_FALLBACK_USD || 1600);
const PRICE_SOURCE_URL = process.env.ETH_PRICE_SOURCE_URL || "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
const PRICE_SOURCE_NAME = process.env.ETH_PRICE_SOURCE_NAME || "coingecko";
const REFRESH_MS = Math.max(60_000, Number(process.env.ETH_PRICE_REFRESH_MS || 86_400_000));
const ONE_ETH_WEI = 10n ** 18n;
const USD_TIERS = [1, 4, 16];

let refreshTimer = null;
let snapshot = buildSnapshot(DEFAULT_ETH_USD, "fallback", null);

function usdToWei(usdAmount, ethUsd) {
  const priceMicros = BigInt(Math.max(1, Math.round(Number(ethUsd) * 1_000_000)));
  return ((BigInt(usdAmount) * 1_000_000n * ONE_ETH_WEI) / priceMicros).toString();
}

function envFallbackWei(usdAmount, calculatedWei) {
  return process.env[`ETH_ENTRY_${usdAmount}_WEI`] || calculatedWei;
}

function buildSnapshot(ethUsd, source, error) {
  const normalizedPrice = Number(ethUsd);
  const safePrice = Number.isFinite(normalizedPrice) && normalizedPrice > 0 ? normalizedPrice : DEFAULT_ETH_USD;
  const tiers = USD_TIERS.map((usd) => {
    const calculatedWei = usdToWei(usd, safePrice);
    const entryWei = source === "fallback" ? envFallbackWei(usd, calculatedWei) : calculatedWei;
    return { code: String(usd), label: `$${usd}`, entryFeeUsd: usd, entryWei, pointMultiplier: usd };
  });

  return {
    ok: !error,
    source,
    priceSourceUrl: PRICE_SOURCE_URL,
    ethUsd: safePrice,
    updatedAt: new Date().toISOString(),
    refreshMs: REFRESH_MS,
    error: error ? String(error.message || error) : null,
    tiers
  };
}

function applyHighStakesTierEnv(nextSnapshot = snapshot) {
  for (const tier of nextSnapshot.tiers || []) {
    process.env[`ETH_ENTRY_${tier.code}_WEI`] = String(tier.entryWei || "0");
  }
}

async function fetchEthUsd() {
  const response = await fetch(PRICE_SOURCE_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`ETH price fetch failed with HTTP ${response.status}`);
  const data = await response.json();
  const price = Number(data?.ethereum?.usd);
  if (!Number.isFinite(price) || price <= 0) throw new Error("ETH price response did not contain ethereum.usd");
  return price;
}

async function refreshHighStakesTierSnapshot() {
  try {
    const ethUsd = await fetchEthUsd();
    snapshot = buildSnapshot(ethUsd, PRICE_SOURCE_NAME, null);
    applyHighStakesTierEnv(snapshot);
    console.log(`[high-stakes-tiers] refreshed ethUsd=${ethUsd}`);
  } catch (err) {
    snapshot = { ...snapshot, ok: false, error: err.message || String(err) };
    applyHighStakesTierEnv(snapshot);
    console.error(`[high-stakes-tiers] refresh failed: ${snapshot.error}`);
  }
  return snapshot;
}

function startHighStakesTierRefresh() {
  if (refreshTimer) return;
  refreshTimer = setInterval(refreshHighStakesTierSnapshot, REFRESH_MS);
  if (typeof refreshTimer.unref === "function") refreshTimer.unref();
}

function getHighStakesTierSnapshot() {
  return snapshot;
}

function getHighStakesTier(code) {
  return snapshot.tiers.find((tier) => tier.code === String(code || "1")) || snapshot.tiers[0];
}

module.exports = {
  applyHighStakesTierEnv,
  getHighStakesTier,
  getHighStakesTierSnapshot,
  refreshHighStakesTierSnapshot,
  startHighStakesTierRefresh,
  usdToWei
};
