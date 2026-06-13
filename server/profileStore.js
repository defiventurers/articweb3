const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL || "";
const DATABASE_SSL = process.env.DATABASE_SSL === "true" || /sslmode=require/i.test(DATABASE_URL);
const memoryProfiles = new Map();
let pool = null;
let ready = false;
let initPromise = null;
let initError = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

async function initProfileStore() {
  if (!DATABASE_URL) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS player_profiles (
          wallet TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          points INTEGER NOT NULL DEFAULT 0,
          games_played INTEGER NOT NULL DEFAULT 0,
          wins INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await getPool().query(`CREATE INDEX IF NOT EXISTS player_profiles_rank_idx ON player_profiles (points DESC, wins DESC, games_played ASC)`);
      ready = true;
      initError = null;
      return true;
    } catch (err) {
      ready = false;
      initError = err.message || "Profile database initialization failed.";
      console.error(`[profile-db] init failed: ${initError}`);
      return false;
    }
  })();
  return initPromise;
}

async function upsertProfile({ wallet, name }) {
  const key = normalizeWallet(wallet);
  const cleanName = String(name || "Player").trim().slice(0, 20) || "Player";
  const existing = memoryProfiles.get(key);
  const fallback = { wallet: key, name: cleanName, points: existing?.points || 0, gamesPlayed: existing?.gamesPlayed || 0, wins: existing?.wins || 0, createdAt: existing?.createdAt || Date.now() };
  memoryProfiles.set(key, fallback);
  if (!(await initProfileStore())) return fallback;
  const result = await getPool().query(
    `INSERT INTO player_profiles (wallet, name) VALUES ($1, $2)
     ON CONFLICT (wallet) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
     RETURNING wallet, name, points, games_played, wins, created_at`,
    [key, cleanName]
  );
  const profile = rowToProfile(result.rows[0]);
  memoryProfiles.set(key, profile);
  return profile;
}

async function addProfileStats(wallet, points, won) {
  const key = normalizeWallet(wallet);
  const existing = memoryProfiles.get(key);
  if (existing) {
    existing.points += Number(points || 0);
    existing.gamesPlayed += 1;
    if (won) existing.wins += 1;
    memoryProfiles.set(key, existing);
  }
  if (!(await initProfileStore())) return existing || null;
  const result = await getPool().query(
    `UPDATE player_profiles SET points = points + $2, games_played = games_played + 1, wins = wins + $3, updated_at = NOW()
     WHERE wallet = $1 RETURNING wallet, name, points, games_played, wins, created_at`,
    [key, Number(points || 0), won ? 1 : 0]
  );
  if (!result.rows[0]) return existing || null;
  const profile = rowToProfile(result.rows[0]);
  memoryProfiles.set(key, profile);
  return profile;
}

async function getLeaderboard(limit = 100) {
  if (await initProfileStore()) {
    const result = await getPool().query(
      `SELECT wallet, name, points, games_played, wins, created_at FROM player_profiles
       ORDER BY points DESC, wins DESC, games_played ASC, updated_at ASC LIMIT $1`,
      [Math.min(Number(limit) || 100, 100)]
    );
    return result.rows.map((row, index) => ({ rank: index + 1, ...rowToProfile(row) }));
  }
  return [...memoryProfiles.values()]
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.gamesPlayed - b.gamesPlayed)
    .slice(0, Math.min(Number(limit) || 100, 100))
    .map((profile, index) => ({ rank: index + 1, ...profile }));
}

function profileStoreStatus() {
  return { databaseConfigured: Boolean(DATABASE_URL), databaseReady: ready, databaseError: initError };
}

function rowToProfile(row) {
  return {
    wallet: row.wallet,
    name: row.name,
    points: row.points || 0,
    gamesPlayed: row.games_played || 0,
    wins: row.wins || 0,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
  };
}

function normalizeWallet(wallet) {
  return String(wallet || "").toLowerCase();
}

module.exports = { initProfileStore, upsertProfile, addProfileStats, getLeaderboard, profileStoreStatus };
