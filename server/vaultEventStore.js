const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL || "";
const DATABASE_SSL = process.env.DATABASE_SSL === "true" || /sslmode=require/i.test(DATABASE_URL);
const memoryEvents = new Map();
const memoryState = new Map();
let pool = null;
let ready = false;
let initPromise = null;
let initError = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined });
  return pool;
}

async function initVaultEventStore() {
  if (!DATABASE_URL) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS vault_indexed_events (
          id TEXT PRIMARY KEY,
          contract_address TEXT NOT NULL,
          chain_id INTEGER NOT NULL,
          block_number BIGINT NOT NULL,
          log_index INTEGER NOT NULL,
          tx_hash TEXT NOT NULL,
          event_name TEXT NOT NULL,
          player TEXT,
          match_id TEXT,
          amount_wei TEXT,
          deadline TEXT,
          payload_json JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await getPool().query(`CREATE INDEX IF NOT EXISTS vault_indexed_events_contract_block_idx ON vault_indexed_events (contract_address, block_number DESC)`);
      await getPool().query(`CREATE INDEX IF NOT EXISTS vault_indexed_events_player_idx ON vault_indexed_events (player, block_number DESC)`);
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS vault_indexer_state (
          state_key TEXT PRIMARY KEY,
          state_value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      ready = true;
      initError = null;
      return true;
    } catch (err) {
      ready = false;
      initError = err.message || "Vault event database initialization failed.";
      console.error(`[vault-event-db] init failed: ${initError}`);
      return false;
    }
  })();
  return initPromise;
}

async function saveIndexedVaultEvent(event) {
  const entry = normalizeEvent(event);
  memoryEvents.set(entry.id, entry);
  if (!(await initVaultEventStore())) return entry;
  await getPool().query(
    `INSERT INTO vault_indexed_events (id, contract_address, chain_id, block_number, log_index, tx_hash, event_name, player, match_id, amount_wei, deadline, payload_json, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
     ON CONFLICT (id) DO UPDATE SET payload_json = EXCLUDED.payload_json`,
    [entry.id, entry.contractAddress, entry.chainId, entry.blockNumber, entry.logIndex, entry.txHash, entry.eventName, entry.player, entry.matchId, entry.amountWei, entry.deadline, entry.payloadJson]
  );
  return entry;
}

async function getLastIndexedBlock(stateKey) {
  if (await initVaultEventStore()) {
    const result = await getPool().query(`SELECT state_value FROM vault_indexer_state WHERE state_key = $1`, [stateKey]);
    return result.rows[0]?.state_value ? Number(result.rows[0].state_value) : null;
  }
  return memoryState.has(stateKey) ? Number(memoryState.get(stateKey)) : null;
}

async function setLastIndexedBlock(stateKey, blockNumber) {
  const value = String(blockNumber);
  memoryState.set(stateKey, value);
  if (!(await initVaultEventStore())) return;
  await getPool().query(
    `INSERT INTO vault_indexer_state (state_key, state_value, updated_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (state_key) DO UPDATE SET state_value = EXCLUDED.state_value, updated_at = NOW()`,
    [stateKey, value]
  );
}

function vaultEventStoreStatus() {
  return { databaseConfigured: Boolean(DATABASE_URL), databaseReady: ready, databaseError: initError, memoryEvents: memoryEvents.size };
}

function normalizeEvent(event) {
  const contractAddress = String(event.contractAddress || "").toLowerCase();
  const chainId = Number(event.chainId || 0);
  const blockNumber = Number(event.blockNumber || 0);
  const logIndex = Number(event.logIndex || 0);
  const txHash = String(event.txHash || "").toLowerCase();
  const eventName = String(event.eventName || "Unknown");
  return {
    id: event.id || `${chainId}:${contractAddress}:${blockNumber}:${logIndex}`,
    contractAddress,
    chainId,
    blockNumber,
    logIndex,
    txHash,
    eventName,
    player: event.player ? String(event.player).toLowerCase() : null,
    matchId: event.matchId || null,
    amountWei: event.amountWei ? String(event.amountWei) : null,
    deadline: event.deadline ? String(event.deadline) : null,
    payloadJson: event.payloadJson || {}
  };
}

module.exports = { initVaultEventStore, saveIndexedVaultEvent, getLastIndexedBlock, setLastIndexedBlock, vaultEventStoreStatus };
