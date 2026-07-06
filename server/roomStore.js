const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL || "";
const DATABASE_SSL = process.env.DATABASE_SSL === "true" || /sslmode=require/i.test(DATABASE_URL);
let pool = null;
let ready = false;
let initPromise = null;
let initError = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined });
  return pool;
}

async function initRoomStore() {
  if (!DATABASE_URL) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS rooms (
          room_code TEXT PRIMARY KEY,
          room_mode TEXT NOT NULL,
          status TEXT NOT NULL,
          match_id TEXT,
          contract_match_id TEXT,
          visibility TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          room_json JSONB NOT NULL
        )
      `);
      await getPool().query(`CREATE INDEX IF NOT EXISTS rooms_status_idx ON rooms (status, updated_at DESC)`);
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS room_players (
          room_code TEXT NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
          wallet TEXT NOT NULL,
          team TEXT,
          entry_locked BOOLEAN NOT NULL DEFAULT false,
          entry_tx_hash TEXT,
          joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (room_code, wallet)
        )
      `);
      ready = true;
      initError = null;
      return true;
    } catch (err) {
      ready = false;
      initError = err.message || "Room database initialization failed.";
      console.error(`[room-db] init failed: ${initError}`);
      return false;
    }
  })();
  return initPromise;
}

async function saveRoom(room) {
  if (!room || !(await initRoomStore())) return;
  const serializableRoom = sanitizeRoom(room);
  const roomJson = JSON.stringify(serializableRoom);
  await getPool().query(
    `INSERT INTO rooms (room_code, room_mode, status, match_id, contract_match_id, visibility, room_json, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,to_timestamp($8 / 1000.0),NOW())
     ON CONFLICT (room_code) DO UPDATE SET
       room_mode = EXCLUDED.room_mode,
       status = EXCLUDED.status,
       match_id = EXCLUDED.match_id,
       contract_match_id = EXCLUDED.contract_match_id,
       visibility = EXCLUDED.visibility,
       room_json = EXCLUDED.room_json,
       updated_at = NOW()`,
    [room.roomCode, room.roomMode, room.status, room.matchId, room.contractMatchId, room.visibility, roomJson, Number(room.createdAt || Date.now())]
  );
  const players = Object.values(room.players || {});
  for (const player of players) {
    await getPool().query(
      `INSERT INTO room_players (room_code, wallet, team, entry_locked, entry_tx_hash, joined_at)
       VALUES ($1,$2,$3,$4,$5,to_timestamp($6 / 1000.0))
       ON CONFLICT (room_code, wallet) DO UPDATE SET
         team = EXCLUDED.team,
         entry_locked = EXCLUDED.entry_locked,
         entry_tx_hash = EXCLUDED.entry_tx_hash`,
      [room.roomCode, player.wallet, player.team || null, Boolean(player.entryLocked), player.entryTxHash || null, Number(player.joinedAt || Date.now())]
    );
  }
}

async function loadRooms() {
  if (!(await initRoomStore())) return [];
  const result = await getPool().query(`SELECT room_json, created_at FROM rooms WHERE status IN ('waiting','playing','finished','cancelled') ORDER BY updated_at DESC LIMIT 200`);
  return result.rows.map(rowToRoom).filter(Boolean).map(sanitizeRoom);
}

function rowToRoom(row) {
  const room = row?.room_json;
  if (!room) return null;
  const dbCreatedAt = row.created_at ? new Date(row.created_at).getTime() : null;
  if (!Number(room.createdAt || 0) && dbCreatedAt) return { ...room, createdAt: dbCreatedAt };
  return room;
}

function sanitizeRoom(room) {
  const { botTimer, refundInFlight, ...safeRoom } = room || {};
  return safeRoom;
}

function roomStoreStatus() {
  return { databaseConfigured: Boolean(DATABASE_URL), databaseReady: ready, databaseError: initError };
}

module.exports = { initRoomStore, saveRoom, loadRooms, roomStoreStatus };
