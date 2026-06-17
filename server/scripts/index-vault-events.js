require("dotenv").config();

const { ethers } = require("ethers");
const { saveVaultActivity } = require("../vaultActivityStore.js");
const { initVaultEventStore, saveIndexedVaultEvent, getLastIndexedBlock, setLastIndexedBlock, vaultEventStoreStatus } = require("../vaultEventStore.js");

const ABSTRACT_RPC_URL = process.env.ABSTRACT_RPC_URL || "https://api.testnet.abs.xyz";
const ABSTRACT_CHAIN_ID = Number(process.env.ABSTRACT_CHAIN_ID || 11124);
const ETH_VAULT_ADDRESS = process.env.ETH_VAULT_ADDRESS || process.env.VITE_ETH_VAULT_ADDRESS || "";
const LOOKBACK_BLOCKS = Math.max(1, Number(process.env.ETH_INDEXER_LOOKBACK_BLOCKS || 50000));
const MAX_BLOCK_RANGE = Math.max(10, Number(process.env.ETH_INDEXER_MAX_BLOCK_RANGE || 2000));
const FROM_BLOCK_ENV = process.env.ETH_INDEXER_FROM_BLOCK ? Number(process.env.ETH_INDEXER_FROM_BLOCK) : null;

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

const iface = new ethers.Interface(VAULT_ABI);
const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC_URL, ABSTRACT_CHAIN_ID);

async function main() {
  if (!ETH_VAULT_ADDRESS) throw new Error("ETH_VAULT_ADDRESS is required for the vault event indexer.");
  await initVaultEventStore();

  const stateKey = `vault:${ABSTRACT_CHAIN_ID}:${ETH_VAULT_ADDRESS.toLowerCase()}:lastBlock`;
  const latest = await provider.getBlockNumber();
  const storedLast = await getLastIndexedBlock(stateKey);
  const fromBlock = Number.isInteger(FROM_BLOCK_ENV)
    ? FROM_BLOCK_ENV
    : storedLast
      ? storedLast + 1
      : Math.max(0, latest - LOOKBACK_BLOCKS);

  if (fromBlock > latest) {
    console.log(JSON.stringify({ ok: true, message: "Already indexed to latest block.", latest, storedLast, store: vaultEventStoreStatus() }, null, 2));
    return;
  }

  let indexed = 0;
  let cursor = fromBlock;
  while (cursor <= latest) {
    const toBlock = Math.min(cursor + MAX_BLOCK_RANGE - 1, latest);
    const logs = await provider.getLogs({ address: ETH_VAULT_ADDRESS, fromBlock: cursor, toBlock });
    for (const log of logs) {
      const parsed = parseLog(log);
      if (!parsed) continue;
      await saveIndexedVaultEvent(parsed);
      await mirrorActivity(parsed);
      indexed += 1;
    }
    await setLastIndexedBlock(stateKey, toBlock);
    cursor = toBlock + 1;
  }

  console.log(JSON.stringify({ ok: true, contract: ETH_VAULT_ADDRESS, chainId: ABSTRACT_CHAIN_ID, fromBlock, latest, indexed, store: vaultEventStoreStatus() }, null, 2));
}

function parseLog(log) {
  try {
    const parsed = iface.parseLog(log);
    const eventName = parsed.name;
    const args = parsed.args;
    const base = {
      id: `${ABSTRACT_CHAIN_ID}:${ETH_VAULT_ADDRESS.toLowerCase()}:${Number(log.blockNumber)}:${Number(log.index ?? log.logIndex ?? 0)}`,
      contractAddress: ETH_VAULT_ADDRESS,
      chainId: ABSTRACT_CHAIN_ID,
      blockNumber: Number(log.blockNumber),
      logIndex: Number(log.index ?? log.logIndex ?? 0),
      txHash: log.transactionHash,
      eventName,
      payloadJson: safeArgs(args)
    };

    if (eventName === "Deposited" || eventName === "Withdrawn") {
      return { ...base, player: args.player, amountWei: args.amount?.toString() };
    }
    if (eventName === "EntryLocked") {
      return { ...base, matchId: args.matchId, player: args.player, amountWei: args.amount?.toString(), deadline: args.deadline?.toString() };
    }
    if (eventName === "EntryReleased" || eventName === "ExpiredEntryRefunded") {
      return { ...base, matchId: args.matchId, player: args.player, amountWei: args.amount?.toString() };
    }
    if (eventName === "MatchSettled") {
      return { ...base, matchId: args.matchId, amountWei: args.totalPayout?.toString() };
    }
    return base;
  } catch (err) {
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

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message || String(err) }, null, 2));
  process.exitCode = 1;
});
