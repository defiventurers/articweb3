const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL || "";
const DATABASE_SSL = process.env.DATABASE_SSL === "true" || /sslmode=require/i.test(DATABASE_URL);
const memoryActivities = new Map();
const memoryByWallet = new Map();
let pool = null;
let ready = false;
let initPromise = null;
let initError = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined });
  }
  return pool;
}

async function initVaultActivityStore() {
  if (!DATABASE_URL) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS vault_activity (
          id TEXT PRIMARY KEY,
          wallet TEXT NOT NULL,
          type TEXT NOT NULL,
          currency TEXT,
          amount_wei TEXT NOT NULL DEFAULT '0',
          room_code TEXT,
          match_id TEXT,
          contract_match_id TEXT,
          tx_hash TEXT,
          status TEXT,
          note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await getPool().query(`CREATE INDEX IF NOT EXISTS vault_activity_wallet_time_idx ON vault_activity (wallet, created_at DESC)`);
      ready = true;
      initError = null;
      return true;
    } catch (err) {
      ready = false;
      initError = err.message || "Vault activity database initialization failed.";
      console.error(`[vault-activity-db] init failed: ${initError}`);
      return false;
    }
  })();
  return initPromise;
}

async function saveVaultActivity(activity) {
  const entry = normalizeActivity(activity);
  saveMemory(entry);
  if (!(await initVaultActivityStore())) return entry;
  await getPool().query(
    `INSERT INTO vault_activity (id, wallet, type, currency, amount_wei, room_code, match_id, contract_match_id, tx_hash, status, note, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,to_timestamp($12 / 1000.0))
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, tx_hash = EXCLUDED.tx_hash, note = EXCLUDED.note`,
    [entry.id, entry.wallet, entry.type, entry.currency, entry.amountWei, entry.roomCode, entry.matchId, entry.contractMatchId, entry.txHash, entry.status, entry.note, entry.createdAt]
  );
  return entry;
}

async function getVaultActivityForWallet(wallet, limit = 100) {
  const key = normalizeWallet(wallet);
  if (await initVaultActivityStore()) {
    const result = await getPool().query(
      `SELECT * FROM vault_activity WHERE wallet = $1 ORDER BY created_at DESC LIMIT $2`,
      [key, Math.min(Number(limit) || 100, 100)]
    );
    return result.rows.map(rowToActivity);
  }
  const ids = memoryByWallet.get(key) || [];
  return ids.map((id) => memoryActivities.get(id)).filter(Boolean).slice(0, Math.min(Number(limit) || 100, 100));
}

function vaultActivityStoreStatus() {
  return { databaseConfigured: Boolean(DATABASE_URL), databaseReady: ready, databaseError: initError };
}

function saveMemory(entry) {
  memoryActivities.set(entry.id, entry);
  const ids = memoryByWallet.get(entry.wallet) || [];
  memoryByWallet.set(entry.wallet, [entry.id, ...ids.filter((id) => id !== entry.id)].slice(0, 100));
}

function normalizeActivity(activity) {
  const wallet = normalizeWallet(activity.wallet);
  const createdAt = Number(activity.createdAt || Date.now());
  const type = String(activity.type || "activity");
  const txHash = activity.txHash || null;
  return {
    id: activity.id || `${type}-${wallet}-${txHash || createdAt}`,
    wallet,
    type,
    currency: activity.currency || "ETH",
    amountWei: String(activity.amountWei || "0"),
    roomCode: activity.roomCode || null,
    matchId: activity.matchId || null,
    contractMatchId: activity.contractMatchId || null,
    txHash,
    status: activity.status || null,
    note: activity.note || null,
    createdAt
  };
}

function rowToActivity(row) {
  return {
    id: row.id,
    wallet: row.wallet,
    type: row.type,
    currency: row.currency,
    amountWei: row.amount_wei || "0",
    roomCode: row.room_code,
    matchId: row.match_id,
    contractMatchId: row.contract_match_id,
    txHash: row.tx_hash,
    status: row.status,
    note: row.note,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null
  };
}

function normalizeWallet(wallet) {
  return String(wallet || "").toLowerCase();
}

module.exports = { initVaultActivityStore, saveVaultActivity, getVaultActivityForWallet, vaultActivityStoreStatus };
