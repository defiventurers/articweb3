const assert = require("assert");
const { createPublicClient, http, parseAbi } = require("viem");

const backendUrl = String(process.env.BACKEND_URL || "").replace(/\/+$/, "");
const rpcUrl = String(process.env.RPC_URL || "");
const vaultAddress = String(process.env.VAULT_ADDRESS || "");
const expectedServerAddress = String(process.env.GAME_SERVER_ADDRESS || "");
const expectedChainId = Number(process.env.CHAIN_ID || 2741);

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

async function getJson(pathname) {
  const response = await fetch(`${backendUrl}${pathname}`, { headers: { accept: "application/json" } });
  const text = await response.text();
  assert.ok(response.ok, `${pathname} failed: ${response.status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

function findTier(value) {
  const found = [];
  function walk(item) {
    if (!item || typeof item !== "object") return;
    if (!Array.isArray(item) && Object.prototype.hasOwnProperty.call(item, "entryWei")) found.push(item);
    for (const child of Array.isArray(item) ? item : Object.values(item)) walk(child);
  }
  walk(value);
  return found.find((item) => String(item.code || "") === "1" || String(item.label || "") === "$1" || Number(item.entryFeeUsd) === 1);
}

async function main() {
  assert.ok(backendUrl, "BACKEND_URL is required");
  assert.ok(rpcUrl, "RPC_URL is required");
  assert.match(vaultAddress, /^0x[a-fA-F0-9]{40}$/, "VAULT_ADDRESS must be an address");
  assert.match(expectedServerAddress, /^0x[a-fA-F0-9]{40}$/, "GAME_SERVER_ADDRESS must be an address");

  const health = await getJson("/health");
  assert.strictEqual(Number(health.chainId), expectedChainId, "health chain id mismatch");
  assert.strictEqual(health.highStakesEnabled, true, "high stakes must be enabled");
  assert.strictEqual(health.ethVaultConfigured, true, "vault must be configured");
  assert.strictEqual(health.settlementSignerConfigured, true, "server signer must be configured");
  assert.ok(sameAddress(health.settlementSignerAddress, expectedServerAddress), "server address mismatch");

  const client = createPublicClient({ transport: http(rpcUrl) });
  const rpcChainId = await client.getChainId();
  assert.strictEqual(Number(rpcChainId), expectedChainId, "RPC chain id mismatch");

  const abi = parseAbi(["function gameServer() view returns (address)"]);
  const gameServer = await client.readContract({ address: vaultAddress, abi, functionName: "gameServer" });
  assert.ok(sameAddress(gameServer, expectedServerAddress), "vault gameServer mismatch");

  const tiers = await getJson("/high-stakes/tiers");
  const tier = findTier(tiers);
  assert.ok(tier, "could not find $1 tier");
  assert.match(String(tier.entryWei), /^\d+$/, "$1 entryWei must be a decimal string");

  const entry = BigInt(tier.entryWei);
  const evidence = {
    entryWei: entry.toString(),
    poolWei: (entry * 4n).toString(),
    firstWei: (entry * 3n).toString(),
    secondWei: entry.toString(),
    thirdWei: "0",
    fourthWei: "0",
    leftoverWei: "0"
  };

  console.log("PASS: Phase 30 readiness probe completed.");
  console.log(JSON.stringify({ gameServer, tier, evidence }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
