const { ethers } = require("ethers");
const { saveVaultActivity } = require("./vaultActivityStore.js");
const { initVaultEventStore, saveIndexedVaultEvent, getLastIndexedBlock, setLastIndexedBlock, vaultEventStoreStatus } = require("./vaultEventStore.js");

const VAULT_ABI = [
  "event Deposited(address indexed player, uint256 amount)",
  "event Withdrawn(address indexed player, uint256 amount)",
  "event EntryLocked(bytes32 indexed matchId, address indexed player, uint256 amount, uint256 deadline)",
  "event EntryReleased(bytes32 indexed matchId, address indexed player, uint256 amount)",
  "event ExpiredEntryRefunded(bytes32 indexed matchId, address indexed player, uint256 amount)",
  "event MatchSettled(bytes32 indexed matchId, uint256 totalPayout)",
  "event DepositsPaused(bool paused)",
  "event LocksPaused(bool paused)",
  "event SettlementPaused(bool paused)",
  "event WithdrawalsPaused(bool paused)",
  "event GameServerUpdated(address indexed oldGameServer, address indexed newGameServer)",
  "event OwnerUpdated(address indexed oldOwner, address indexed newOwner)"
];

let running = false;
let lastRun = null;
let lastError = null;
let totalRuns = 0;
let totalIndexed = 0;
const iface = new ethers.Interface(VAULT_ABI);

async function runVaultEventIndexer(options = {}) {
  if (running) return { ok: false, running: true, message: "Indexer is already running.", lastRun, lastError, totalRuns, totalIndexed, store: vaultEventStoreStatus() };
  running = true;
  lastError = null;
  const startedAt = Date.now();

  try {
    const rpcUrl = options.rpcUrl || process.env.ABSTRACT_RPC_URL || "https://api.testnet.abs.xyz";
    const chainId = Number(options.chainId || process.env.ABSTRACT_CHAIN_ID || 11124);
    const vaultAddress = options.vaultAddress || process.env.ETH_VAULT_ADDRESS || process.env.VITE_ETH_VAULT_ADDRESS || "";
    const lookbackBlocks = Math.max(1, Number(options.lookbackBlocks || process.env.ETH_INDEXER_LOOKBACK_BLOCKS || 50000));
    const maxBlockRange = Math.max(10, Number(options.maxBlockRange || process.env.ETH_INDEXER_MAX_BLOCK_RANGE || 2000));
    const fromBlockOverride = options.fromBlock !== undefined ? Number(options.fromBlock) : (process.env.ETH_INDEXER_FROM_BLOCK ? Number(process.env.ETH_INDEXER_FROM_BLOCK) : null);

    if (!vaultAddress) throw new Error("ETH_VAULT_ADDRESS is required for the vault event indexer.");
    await initVaultEventStore();

    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
    const stateKey = `vault:${chainId}:${vaultAddress.toLowerCase()}:lastBlock`;
    const latest = await provider.getBlockNumber();
    const storedLast = await getLastIndexedBlock(stateKey);
    const fromBlock = Number.isInteger(fromBlockOverride)
      ? fromBlockOverride
      : storedLast
        ? storedLast + 1
        : Math.max(0, latest - lookbackBlocks);

    let indexed = 0;
    let scannedRanges = 0;
    if (fromBlock <= latest) {
      let cursor = fromBlock;
      while (cursor <= latest) {
        const toBlock = Math.min(cursor + maxBlockRange - 1, latest);
        const logs = await provider.getLogs({ address: vaultAddress, fromBlock: cursor, toBlock });
        for (const log of logs) {
          const parsed = parseLog(log, { chainId, vaultAddress });
          if (!parsed) continue;
          await saveIndexedVaultEvent(parsed);
          await mirrorActivity(parsed);
          indexed += 1;
        }
        await setLastIndexedBlock(stateKey, toBlock);
        scannedRanges += 1;
        cursor = toBlock + 1;
      }
    }

    totalRuns += 1;
    totalIndexed += indexed;
    lastRun = { ok: true, contract: vaultAddress, chainId, fromBlock, latest, indexed, totalRuns, totalIndexed, scannedRanges, startedAt, finishedAt: Date.now(), store: vaultEventStoreStatus() };
    return lastRun;
  } catch (err) {
    lastError = err.message || String(err);
    totalRuns += 1;
    lastRun = { ok: false, error: lastError, totalRuns, totalIndexed, startedAt, finishedAt: Date.now(), store: vaultEventStoreStatus() };
    return lastRun;
  } finally {
    running = false;
  }
}

function getVaultIndexerHealth() {
  return { ok: true, running, lastRun, lastError, totalRuns, totalIndexed, store: vaultEventStoreStatus() };
}

function parseLog(log, context) {
  try {
    const parsed = iface.parseLog(log);
    const eventName = parsed.name;
    const args = parsed.args;
    const base = {
      id: `${context.chainId}:${context.vaultAddress.toLowerCase()}:${Number(log.blockNumber)}:${Number(log.index ?? log.logIndex ?? 0)}`,
      contractAddress: context.vaultAddress,
      chainId: context.chainId,
      blockNumber: Number(log.blockNumber),
      logIndex: Number(log.index ?? log.logIndex ?? 0),
      txHash: log.transactionHash,
      eventName,
      payloadJson: safeArgs(args)
    };

    if (eventName === "Deposited" || eventName === "Withdrawn") return { ...base, player: args.player, amountWei: args.amount?.toString() };
    if (eventName === "EntryLocked") return { ...base, matchId: args.matchId, player: args.player, amountWei: args.amount?.toString(), deadline: args.deadline?.toString() };
    if (eventName === "EntryReleased" || eventName === "ExpiredEntryRefunded") return { ...base, matchId: args.matchId, player: args.player, amountWei: args.amount?.toString() };
    if (eventName === "MatchSettled") return { ...base, matchId: args.matchId, amountWei: args.totalPayout?.toString() };
    return base;
  } catch {
    return null;
  }
}

async function mirrorActivity(event) {
  if (!event.player) return;
  const typeByEvent = {
    Deposited: "indexed_deposit",
    Withdrawn: "indexed_withdrawal",
    EntryLocked: "indexed_entry_lock",
    EntryReleased: "indexed_entry_release",
    ExpiredEntryRefunded: "indexed_expired_entry_refund"
  };
  const type = typeByEvent[event.eventName];
  if (!type) return;
  await saveVaultActivity({
    id: `indexed-${event.id}`,
    type,
    wallet: event.player,
    currency: "ETH",
    amountWei: event.amountWei || "0",
    contractMatchId: event.matchId || null,
    txHash: event.txHash,
    status: "indexed",
    note: `Indexed ${event.eventName} from block ${event.blockNumber}.`,
    createdAt: Date.now()
  });
}

function safeArgs(args) {
  const out = {};
  Object.keys(args).forEach((key) => {
    if (/^\d+$/.test(key)) return;
    const value = args[key];
    out[key] = typeof value === "bigint" ? value.toString() : String(value);
  });
  return out;
}

module.exports = { runVaultEventIndexer, getVaultIndexerHealth };
