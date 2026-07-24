const { Pool } = require("pg");

const MAX_HISTORY_PER_WALLET = 50;
const DATABASE_URL = process.env.DATABASE_URL || "";
const DATABASE_SSL = process.env.DATABASE_SSL === "true" || /sslmode=require/i.test(DATABASE_URL);
const memoryEntries = new Map();
const memoryByWallet = new Map();
let pool = null;
let ready = false;
let initPromise = null;
let initError = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined });
  return pool;
}

async function initHistoryStore() {
  if (!DATABASE_URL) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await getPool().query(`CREATE TABLE IF NOT EXISTS match_history (id TEXT PRIMARY KEY, wallet TEXT NOT NULL, room_code TEXT NOT NULL, match_id TEXT NOT NULL, contract_match_id TEXT, room_mode TEXT NOT NULL, currency TEXT, entry_tier TEXT, entry_wei TEXT NOT NULL DEFAULT '0', entry_tx_hash TEXT, player_name TEXT, team TEXT, position INTEGER, won BOOLEAN NOT NULL DEFAULT false, payout_wei TEXT NOT NULL DEFAULT '0', points INTEGER NOT NULL DEFAULT 0, settlement_status TEXT, settlement_tx_hash TEXT, settlement_error TEXT, finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
      await getPool().query(`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS game_id TEXT NOT NULL DEFAULT 'arctic-dominion'`);
      await getPool().query(`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS ruleset_version TEXT`);
      await getPool().query(`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS result_json TEXT`);
      await getPool().query(`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS players_json TEXT`);
      await getPool().query(`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS final_state_json TEXT`);
      await getPool().query(`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS audit_log_json TEXT`);
      await getPool().query(`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS proof_hash TEXT`);
      await getPool().query(`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS randomness_json TEXT`);
      await getPool().query(`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS withdrawal_tx_hash TEXT`);
      await getPool().query(`ALTER TABLE match_history ADD COLUMN IF NOT EXISTS withdrawal_status TEXT`);
      await getPool().query(`CREATE INDEX IF NOT EXISTS match_history_wallet_finished_idx ON match_history (wallet, finished_at DESC)`);
      await getPool().query(`CREATE INDEX IF NOT EXISTS match_history_wallet_game_finished_idx ON match_history (wallet, game_id, finished_at DESC)`);
      await getPool().query(`CREATE INDEX IF NOT EXISTS match_history_wallet_payout_withdrawal_idx ON match_history (wallet, payout_wei, withdrawal_tx_hash, finished_at DESC)`);
      ready = true;
      initError = null;
      return true;
    } catch (err) {
      ready = false;
      initError = err.message || "Database initialization failed.";
      console.error(`[history-db] init failed: ${initError}`);
      return false;
    }
  })();
  return initPromise;
}

async function saveHistoryEntry(entry) {
  saveMemory(entry);
  if (!(await initHistoryStore())) return;
  await getPool().query(
    `INSERT INTO match_history (id,wallet,room_code,match_id,contract_match_id,room_mode,currency,entry_tier,entry_wei,entry_tx_hash,player_name,team,position,won,payout_wei,points,settlement_status,settlement_tx_hash,settlement_error,game_id,ruleset_version,result_json,players_json,final_state_json,audit_log_json,proof_hash,randomness_json,withdrawal_tx_hash,withdrawal_status,finished_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,to_timestamp($30 / 1000.0),NOW())
     ON CONFLICT (id) DO UPDATE SET settlement_status=EXCLUDED.settlement_status, settlement_tx_hash=EXCLUDED.settlement_tx_hash, settlement_error=EXCLUDED.settlement_error, game_id=EXCLUDED.game_id, ruleset_version=EXCLUDED.ruleset_version, result_json=EXCLUDED.result_json, players_json=EXCLUDED.players_json, final_state_json=EXCLUDED.final_state_json, audit_log_json=EXCLUDED.audit_log_json, proof_hash=EXCLUDED.proof_hash, randomness_json=EXCLUDED.randomness_json, withdrawal_tx_hash=COALESCE(EXCLUDED.withdrawal_tx_hash, match_history.withdrawal_tx_hash), withdrawal_status=COALESCE(EXCLUDED.withdrawal_status, match_history.withdrawal_status), updated_at=NOW()`,
    entryToParams(entry)
  );
}

async function updateHistoryEntries(ids, patch) {
  ids.forEach((id) => {
    const existing = memoryEntries.get(id);
    if (existing) memoryEntries.set(id, { ...existing, ...patch });
  });
  if (!ids.length || !(await initHistoryStore())) return;
  await getPool().query(
    `UPDATE match_history SET settlement_status=COALESCE($2, settlement_status), settlement_tx_hash=COALESCE($3, settlement_tx_hash), settlement_error=$4, withdrawal_tx_hash=COALESCE($5, withdrawal_tx_hash), withdrawal_status=COALESCE($6, withdrawal_status), updated_at=NOW() WHERE id=ANY($1::text[])`,
    [ids, patch.settlementStatus || null, patch.settlementTxHash || null, patch.settlementError || null, patch.withdrawalTxHash || null, patch.withdrawalStatus || null]
  );
}

async function linkWithdrawalToHistory({ wallet, amountWei, txHash }) {
  const key = normalizeWallet(wallet);
  const amount = String(amountWei || "0");
  const hash = txHash ? String(txHash).toLowerCase() : null;
  if (!key || !amount || amount === "0") return null;
  if (await initHistoryStore()) {
    const result = await getPool().query(
      `SELECT id, room_code, match_id, contract_match_id, payout_wei FROM match_history WHERE wallet = $1 AND payout_wei = $2 AND contract_match_id IS NOT NULL AND room_mode = 'high_stakes' AND (withdrawal_tx_hash IS NULL OR withdrawal_tx_hash = $3) AND COALESCE(settlement_status, '') IN ('submitted', 'settlement_pending', 'settled') ORDER BY CASE WHEN withdrawal_tx_hash = $3 THEN 0 ELSE 1 END, finished_at DESC LIMIT 1`,
      [key, amount, hash]
    );
    if (result.rows.length !== 1) return null;
    const row = result.rows[0];
    await getPool().query(`UPDATE match_history SET withdrawal_tx_hash = COALESCE($2, withdrawal_tx_hash), withdrawal_status = 'indexed', updated_at = NOW() WHERE id = $1`, [row.id, hash]);
    updateMemoryWithdrawal(row.id, hash);
    return { id: row.id, roomCode: row.room_code, matchId: row.match_id, contractMatchId: row.contract_match_id, payoutWei: row.payout_wei, withdrawalTxHash: hash, attributionSource: "latest_unmatched_high_stakes_history" };
  }
  return linkMemoryWithdrawal(key, amount, hash);
}

async function getHistoryForWallet(wallet, gameId = null) {
  const key = normalizeWallet(wallet);
  const normalizedGameId = gameId ? String(gameId) : null;
  if (await initHistoryStore()) {
    const result = normalizedGameId
      ? await getPool().query(`SELECT * FROM match_history WHERE wallet=$1 AND game_id=$2 ORDER BY finished_at DESC LIMIT $3`, [key, normalizedGameId, MAX_HISTORY_PER_WALLET])
      : await getPool().query(`SELECT * FROM match_history WHERE wallet=$1 ORDER BY finished_at DESC LIMIT $2`, [key, MAX_HISTORY_PER_WALLET]);
    return result.rows.map(rowToEntry);
  }
  const ids = memoryByWallet.get(key) || [];
  return ids.map((id) => memoryEntries.get(id)).filter(Boolean).filter((entry) => !normalizedGameId || entry.gameId === normalizedGameId);
}

function historyStoreStatus() { return { databaseConfigured: Boolean(DATABASE_URL), databaseReady: ready, databaseError: initError }; }
function saveMemory(entry) { const key = normalizeWallet(entry.wallet); const normalized = { gameId: "arctic-dominion", ...entry, wallet: key }; memoryEntries.set(normalized.id, normalized); const ids = memoryByWallet.get(key) || []; memoryByWallet.set(key, [normalized.id, ...ids.filter((id) => id !== normalized.id)].slice(0, MAX_HISTORY_PER_WALLET)); }
function updateMemoryWithdrawal(id, txHash) { const existing = memoryEntries.get(id); if (existing) memoryEntries.set(id, { ...existing, withdrawalTxHash: txHash || existing.withdrawalTxHash || null, withdrawalStatus: "indexed" }); }
function linkMemoryWithdrawal(wallet, amountWei, txHash) { const ids = memoryByWallet.get(wallet) || []; const matches = ids.map((id) => memoryEntries.get(id)).filter(Boolean).filter((entry) => entry.roomMode === "high_stakes").filter((entry) => entry.contractMatchId).filter((entry) => ["submitted", "settlement_pending", "settled"].includes(entry.settlementStatus || "")).filter((entry) => String(entry.payoutWei || "0") === amountWei).filter((entry) => !entry.withdrawalTxHash || entry.withdrawalTxHash === txHash).slice(0, 1); if (matches.length !== 1) return null; const match = matches[0]; updateMemoryWithdrawal(match.id, txHash); return { id: match.id, roomCode: match.roomCode, matchId: match.matchId, contractMatchId: match.contractMatchId, payoutWei: match.payoutWei, withdrawalTxHash: txHash, attributionSource: "latest_unmatched_high_stakes_memory" }; }
function entryToParams(entry) { return [entry.id, normalizeWallet(entry.wallet), entry.roomCode, entry.matchId, entry.contractMatchId || null, entry.roomMode, entry.currency || null, entry.entryTier || null, entry.entryWei || "0", entry.entryTxHash || null, entry.playerName || null, entry.team || null, entry.position || null, Boolean(entry.won), entry.payoutWei || "0", Number(entry.points || 0), entry.settlementStatus || null, entry.settlementTxHash || null, entry.settlementError || null, entry.gameId || "arctic-dominion", entry.rulesetVersion || null, JSON.stringify(entry.result || null), JSON.stringify(entry.players || []), JSON.stringify(entry.finalBoardState || null), JSON.stringify(entry.auditLog || []), entry.proofHash || null, JSON.stringify(entry.randomness || null), entry.withdrawalTxHash || null, entry.withdrawalStatus || null, Number(entry.finishedAt || Date.now())]; }
function parseJson(value, fallback) { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
function rowToEntry(row) { return { id: row.id, gameId: row.game_id || "arctic-dominion", rulesetVersion: row.ruleset_version || null, wallet: row.wallet, roomCode: row.room_code, matchId: row.match_id, contractMatchId: row.contract_match_id, roomMode: row.room_mode, currency: row.currency, entryTier: row.entry_tier, entryWei: row.entry_wei || "0", entryTxHash: row.entry_tx_hash, playerName: row.player_name, team: row.team, position: row.position, won: row.won, payoutWei: row.payout_wei || "0", points: row.points || 0, settlementStatus: row.settlement_status, settlementTxHash: row.settlement_tx_hash, settlementError: row.settlement_error, result: parseJson(row.result_json, null), players: parseJson(row.players_json, []), finalBoardState: parseJson(row.final_state_json, null), auditLog: parseJson(row.audit_log_json, []), proofHash: row.proof_hash, randomness: parseJson(row.randomness_json, null), withdrawalTxHash: row.withdrawal_tx_hash, withdrawalStatus: row.withdrawal_status, finishedAt: row.finished_at ? new Date(row.finished_at).getTime() : null }; }
function normalizeWallet(wallet) { return String(wallet || "").toLowerCase(); }

module.exports = { initHistoryStore, saveHistoryEntry, updateHistoryEntries, linkWithdrawalToHistory, getHistoryForWallet, historyStoreStatus };
