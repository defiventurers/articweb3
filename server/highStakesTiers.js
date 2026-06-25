const DEFAULT_ETH_USD = Number(process.env.ETH_ENTRY_PRICE_FALLBACK_USD || 1600);
const DEFAULT_PRICE_SOURCES = [
  { name: "coinbase", url: "https://api.coinbase.com/v2/prices/ETH-USD/spot" },
  { name: "coingecko", url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd" }
];
const REFRESH_MS = Math.max(60_000, Number(process.env.ETH_PRICE_REFRESH_MS || 86_400_000));
const ONE_ETH_WEI = 10n ** 18n;
const USD_TIERS = [1, 4, 16];

let refreshTimer = null;
let snapshot = buildSnapshot({ ethUsd: DEFAULT_ETH_USD, source: "fallback", url: null, error: null });

function getPriceSources() {
  const customUrls = String(process.env.ETH_PRICE_SOURCE_URLS || process.env.ETH_PRICE_SOURCE_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url, index) => ({ name: process.env.ETH_PRICE_SOURCE_NAME || `custom-${index + 1}`, url }));

  const byUrl = new Map();
  [...customUrls, ...DEFAULT_PRICE_SOURCES].forEach((source) => {
    if (!byUrl.has(source.url)) byUrl.set(source.url, source);
  });
  return [...byUrl.values()];
}

function usdToWei(usdAmount, ethUsd) {
  const priceMicros = BigInt(Math.max(1, Math.round(Number(ethUsd) * 1_000_000)));
  return ((BigInt(usdAmount) * 1_000_000n * ONE_ETH_WEI) / priceMicros).toString();
}

function envFallbackWei(usdAmount, calculatedWei) {
  return process.env[`ETH_ENTRY_${usdAmount}_WEI`] || calculatedWei;
}

function safeSourceUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("x_cg_demo_api_key");
    parsed.searchParams.delete("x_cg_pro_api_key");
    parsed.searchParams.delete("api_key");
    return parsed.toString();
  } catch {
    return "custom-price-source";
  }
}

function buildSnapshot({ ethUsd, source, url, error }) {
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
    priceSourceUrl: safeSourceUrl(url),
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

function coingeckoHeaders(url) {
  if (!String(url || "").includes("coingecko")) return {};
  const headers = {};
  const demoKey = process.env.COINGECKO_DEMO_API_KEY || process.env.CG_DEMO_API_KEY || "";
  const proKey = process.env.COINGECKO_PRO_API_KEY || process.env.CG_PRO_API_KEY || "";
  if (proKey) headers["x-cg-pro-api-key"] = proKey;
  else if (demoKey) headers["x-cg-demo-api-key"] = demoKey;
  return headers;
}

function parseEthUsd(data) {
  const candidates = [
    data?.ethereum?.usd,
    data?.data?.amount,
    data?.price,
    data?.ETH?.USD,
    data?.rates?.USD
  ];
  for (const value of candidates) {
    const price = Number(value);
    if (Number.isFinite(price) && price > 0) return price;
  }
  throw new Error("ETH price response did not contain a supported USD price field");
}

async function fetchEthUsdFromSource(source) {
  const response = await fetch(source.url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "articweb3-high-stakes-tiers/1.0",
      ...coingeckoHeaders(source.url)
    }
  });
  if (!response.ok) throw new Error(`${source.name} ETH price fetch failed with HTTP ${response.status}`);
  const data = await response.json();
  return parseEthUsd(data);
}

async function fetchEthUsd() {
  const errors = [];
  for (const source of getPriceSources()) {
    try {
      const ethUsd = await fetchEthUsdFromSource(source);
      return { ethUsd, source: source.name, url: source.url };
    } catch (err) {
      errors.push(err.message || String(err));
    }
  }
  throw new Error(errors.join("; ") || "All ETH price sources failed");
}

async function refreshHighStakesTierSnapshot() {
  try {
    const result = await fetchEthUsd();
    snapshot = buildSnapshot({ ...result, error: null });
    applyHighStakesTierEnv(snapshot);
    console.log(`[high-stakes-tiers] refreshed ethUsd=${result.ethUsd} source=${result.source}`);
  } catch (err) {
    snapshot = buildSnapshot({ ethUsd: snapshot.ethUsd || DEFAULT_ETH_USD, source: "fallback", url: null, error: err });
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
