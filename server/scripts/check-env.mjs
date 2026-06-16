import { config } from "dotenv";

const mode = process.argv[2];

if (!mode || !["testnet", "mainnet"].includes(mode)) {
  throw new Error("Usage: node scripts/check-env.mjs <testnet|mainnet>");
}

config({ path: `.env.${mode}` });

const env = process.env;
const ZERO = "0x0000000000000000000000000000000000000000";
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function fail(message) {
  throw new Error(`[server env:${mode}] ${message}`);
}

function bool(name) {
  const value = String(env[name] || "false").toLowerCase();
  if (value !== "true" && value !== "false") fail(`${name} must be true or false, got ${value}`);
  return value === "true";
}

const chainEnv = env.CHAIN_ENV;
const chainId = env.ABSTRACT_CHAIN_ID;
const rpc = env.ABSTRACT_RPC_URL || "";
const ws = env.ABSTRACT_WS_URL || "";
const explorer = env.ABSTRACT_EXPLORER_URL || "";
const highStakes = bool("HIGH_STAKES_ENABLED");
const ethVault = env.ETH_VAULT_ADDRESS || "";
const settlementSigner = env.ETH_SETTLEMENT_SIGNER || "";

if (chainEnv !== mode) fail(`CHAIN_ENV must be ${mode}, got ${chainEnv}`);

if (mode === "mainnet") {
  if (chainId !== "2741") fail(`wrong Abstract mainnet chain ID: ${chainId}`);
  if (!rpc.includes("api.mainnet.abs.xyz")) fail(`wrong Abstract mainnet RPC: ${rpc}`);
  if (!ws.includes("api.mainnet.abs.xyz/ws")) fail(`wrong Abstract mainnet websocket: ${ws}`);
  if (!explorer.includes("abscan.org")) fail(`wrong Abstract mainnet explorer: ${explorer}`);

  if (highStakes) {
    if (!ADDRESS_RE.test(ethVault)) fail("HIGH_STAKES_ENABLED=true but ETH_VAULT_ADDRESS is invalid");
    if (ethVault.toLowerCase() === ZERO.toLowerCase()) fail("HIGH_STAKES_ENABLED=true but ETH_VAULT_ADDRESS is zero");
    if (!settlementSigner.trim()) fail("HIGH_STAKES_ENABLED=true but ETH_SETTLEMENT_SIGNER is missing");
  }
}

if (mode === "testnet") {
  if (chainId !== "11124") fail(`wrong Abstract testnet chain ID: ${chainId}`);
  if (!rpc.includes("api.testnet.abs.xyz")) fail(`wrong Abstract testnet RPC: ${rpc}`);
  if (!ws.includes("api.testnet.abs.xyz/ws")) fail(`wrong Abstract testnet websocket: ${ws}`);
  if (!explorer.includes("sepolia.abscan.org")) fail(`wrong Abstract testnet explorer: ${explorer}`);
}

console.log(`[server env:${mode}] Abstract environment check passed`);
