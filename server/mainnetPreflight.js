const { ethers } = require("ethers");
const { historyStoreStatus } = require("./historyStore.js");
const { profileStoreStatus } = require("./profileStore.js");
const { roomStoreStatus } = require("./roomStore.js");
const { vaultActivityStoreStatus } = require("./vaultActivityStore.js");
const { vaultEventStoreStatus } = require("./vaultEventStore.js");
const { getVaultIndexerHealth } = require("./vaultEventIndexer.js");

const MAINNET_CHAIN_ID = 2741;
const TESTNET_CHAIN_ID = 11124;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function getMainnetPreflight() {
  const chainId = Number(process.env.ABSTRACT_CHAIN_ID || TESTNET_CHAIN_ID);
  const chainEnv = process.env.CHAIN_ENV || (chainId === MAINNET_CHAIN_ID ? "mainnet" : "testnet");
  const rpcUrl = process.env.ABSTRACT_RPC_URL || "";
  const vaultAddress = process.env.ETH_VAULT_ADDRESS || process.env.VITE_ETH_VAULT_ADDRESS || "";
  const signer = settlementSignerSnapshot();
  const rpc = await rpcSnapshot(rpcUrl, chainId);
  const stores = storeSnapshot();
  const indexer = getVaultIndexerHealth();
  const highStakesEnabled = process.env.HIGH_STAKES_ENABLED === "true" || Boolean(vaultAddress);

  const gates = {
    chainIsMainnet: chainId === MAINNET_CHAIN_ID && chainEnv === "mainnet",
    rpcReachable: rpc.ok,
    vaultConfigured: isUsableAddress(vaultAddress),
    settlementSignerConfigured: signer.configured && signer.valid,
    databaseConfigured: stores.databaseConfigured,
    databaseReady: stores.databaseReady,
    indexerEnabled: process.env.ETH_INDEXER_AUTO_RUN !== "false",
    indexerHasRun: Boolean(indexer.lastRun),
    highStakesEnabled
  };

  const readyForCappedMainnetRehearsal = Object.values(gates).every(Boolean);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    readiness: readyForCappedMainnetRehearsal ? "READY_FOR_CAPPED_MAINNET_REHEARSAL" : "HOLD",
    chain: {
      env: chainEnv,
      chainId,
      expectedMainnetChainId: MAINNET_CHAIN_ID,
      expectedTestnetChainId: TESTNET_CHAIN_ID,
      isMainnet: chainId === MAINNET_CHAIN_ID,
      isTestnet: chainId === TESTNET_CHAIN_ID
    },
    rpc,
    vault: {
      address: vaultAddress || null,
      configured: Boolean(vaultAddress),
      usableAddress: isUsableAddress(vaultAddress)
    },
    settlementSigner: signer,
    highStakes: {
      enabled: highStakesEnabled,
      settlementMaxAttempts: Number(process.env.SETTLEMENT_MAX_ATTEMPTS || 3)
    },
    database: stores,
    indexer: compactIndexer(indexer),
    gates,
    notes: [
      "This endpoint never returns private keys.",
      "READY means capped internal mainnet rehearsal only, not public paid launch approval."
    ]
  };
}

function storeSnapshot() {
  const stores = {
    history: historyStoreStatus(),
    profiles: profileStoreStatus(),
    rooms: roomStoreStatus(),
    vaultActivity: vaultActivityStoreStatus(),
    vaultEvents: vaultEventStoreStatus()
  };
  const values = Object.values(stores);
  return {
    databaseConfigured: values.some((status) => Boolean(status.databaseConfigured)),
    databaseReady: values.every((status) => !status.databaseConfigured || status.databaseReady),
    stores
  };
}

function settlementSignerSnapshot() {
  const secret = process.env.ETH_SETTLEMENT_SIGNER || "";
  if (!secret) return { configured: false, valid: false, address: null };
  try {
    const wallet = new ethers.Wallet(normalizeSecret(secret));
    return { configured: true, valid: true, address: wallet.address };
  } catch {
    return { configured: true, valid: false, address: "invalid" };
  }
}

async function rpcSnapshot(rpcUrl, expectedChainId) {
  if (!rpcUrl) return { ok: false, configured: false, urlConfigured: false, chainId: null, latestBlock: null, error: "ABSTRACT_RPC_URL is not configured." };
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl, expectedChainId);
    const [network, latestBlock] = await withTimeout(Promise.all([provider.getNetwork(), provider.getBlockNumber()]), 7000);
    const chainId = Number(network.chainId);
    return {
      ok: chainId === expectedChainId && Number.isFinite(latestBlock),
      configured: true,
      urlConfigured: true,
      chainId,
      expectedChainId,
      chainMatches: chainId === expectedChainId,
      latestBlock,
      error: null
    };
  } catch (err) {
    return { ok: false, configured: true, urlConfigured: true, chainId: null, expectedChainId, chainMatches: false, latestBlock: null, error: err.message || String(err) };
  }
}

function compactIndexer(indexer) {
  return {
    running: Boolean(indexer.running),
    totalRuns: Number(indexer.totalRuns || 0),
    totalIndexed: Number(indexer.totalIndexed || 0),
    lastError: indexer.lastError || null,
    lastRun: indexer.lastRun ? {
      ok: Boolean(indexer.lastRun.ok),
      chainId: indexer.lastRun.chainId || null,
      contract: indexer.lastRun.contract || null,
      latest: indexer.lastRun.latest || null,
      indexed: indexer.lastRun.indexed || 0,
      finishedAt: indexer.lastRun.finishedAt || null
    } : null,
    store: indexer.store || null
  };
}

function isUsableAddress(value) {
  const text = String(value || "").trim();
  return ethers.isAddress(text) && text.toLowerCase() !== ZERO_ADDRESS.toLowerCase();
}

function normalizeSecret(value) {
  const text = String(value || "").trim();
  return text.startsWith("0x") ? text : `0x${text}`;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms))
  ]);
}

module.exports = { getMainnetPreflight };
