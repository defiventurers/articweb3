import { loadEnv } from "vite";

const mode = process.argv[2];

if (!mode || !["testnet", "mainnet"].includes(mode)) {
  throw new Error("Usage: node scripts/check-env.mjs <testnet|mainnet>");
}

const env = loadEnv(mode, process.cwd(), "");

const chainEnv = env.VITE_CHAIN_ENV;
const chainId = env.VITE_ABSTRACT_CHAIN_ID;
const rpc = env.VITE_ABSTRACT_RPC || "";
const ws = env.VITE_ABSTRACT_WS || "";
const explorer = env.VITE_ABSTRACT_EXPLORER || "";
const highStakes = String(env.VITE_ENABLE_HIGH_STAKES || "false").toLowerCase();
const sessionKeys = String(env.VITE_ENABLE_SESSION_KEYS || "false").toLowerCase();
const ethVault = env.VITE_ETH_VAULT_ADDRESS || "";

const ZERO = "0x0000000000000000000000000000000000000000";
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function fail(message) {
  throw new Error(`[env:${mode}] ${message}`);
}

function ensureBoolean(name, value) {
  if (value !== "true" && value !== "false") fail(`${name} must be true or false, got ${value}`);
}

ensureBoolean("VITE_ENABLE_HIGH_STAKES", highStakes);
ensureBoolean("VITE_ENABLE_SESSION_KEYS", sessionKeys);

if (chainEnv !== mode) fail(`VITE_CHAIN_ENV must be ${mode}, got ${chainEnv}`);

if (mode === "mainnet") {
  if (chainId !== "2741") fail(`wrong Abstract mainnet chain ID: ${chainId}`);
  if (!rpc.includes("api.mainnet.abs.xyz")) fail(`wrong Abstract mainnet RPC: ${rpc}`);
  if (!ws.includes("api.mainnet.abs.xyz/ws")) fail(`wrong Abstract mainnet websocket: ${ws}`);
  if (!explorer.includes("abscan.org")) fail(`wrong Abstract mainnet explorer: ${explorer}`);
  if (sessionKeys === "true") fail("mainnet session keys must stay disabled until Abstract policy approval is complete");

  if (highStakes === "true") {
    if (!ADDRESS_RE.test(ethVault)) fail("High Stakes enabled but VITE_ETH_VAULT_ADDRESS is invalid");
    if (ethVault.toLowerCase() === ZERO.toLowerCase()) fail("High Stakes enabled but VITE_ETH_VAULT_ADDRESS is zero");
  }
}

if (mode === "testnet") {
  if (chainId !== "11124") fail(`wrong Abstract testnet chain ID: ${chainId}`);
  if (!rpc.includes("api.testnet.abs.xyz")) fail(`wrong Abstract testnet RPC: ${rpc}`);
  if (!ws.includes("api.testnet.abs.xyz/ws")) fail(`wrong Abstract testnet websocket: ${ws}`);
  if (!explorer.includes("sepolia.abscan.org")) fail(`wrong Abstract testnet explorer: ${explorer}`);
}

console.log(`[env:${mode}] Abstract environment check passed`);
