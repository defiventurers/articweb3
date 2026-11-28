#!/usr/bin/env node
'use strict';
// Synthetic data only. This command creates its own loopback-only PostgreSQL
// cluster; it never accepts a source/target database URL or production dump.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { createHash } = require('node:crypto');
const net = require('node:net');
const assert = require('node:assert/strict');
const execute = promisify(execFile);

function assertFixtureTarget(value) {
  const u = new URL(value);
  if (u.protocol !== 'postgresql:' || u.hostname !== '127.0.0.1' || !/^\/fonso_recovery_(source|target)$/.test(u.pathname) || u.password || u.search) throw new Error('Only the generated loopback fixture databases are accepted.');
}

async function freePort() {
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}

async function runRehearsal({ bindir = process.env.PG_BINDIR } = {}) {
  if (!bindir || !path.isAbsolute(bindir)) throw new Error('PG_BINDIR must identify local PostgreSQL binaries.');
  if (process.getuid?.() === 0) throw new Error('Run the local PostgreSQL rehearsal as an unprivileged user.');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fonso-db-rehearsal-'));
  await fs.chmod(root, 0o700);
  const dataDir = path.join(root, 'data'), dump = path.join(root, 'fixture.dump'), port = await freePort();
  const source = `postgresql://fixture@127.0.0.1:${port}/fonso_recovery_source`;
  const target = `postgresql://fixture@127.0.0.1:${port}/fonso_recovery_target`;
  assertFixtureTarget(source); assertFixtureTarget(target);
  const pg = require('pg'), OriginalPool = pg.Pool, pools = [];
  let started = false;
  const binary = (name, args) => execute(path.join(bindir, name), args, { timeout: 30000, maxBuffer: 1024 * 1024, env: { ...process.env, PGCONNECT_TIMEOUT: '5', PGOPTIONS: '', PGPASSWORD: '', PGSSLMODE: 'disable' } });
  async function start() {
    try { await binary('pg_ctl', ['-D', dataDir, '-l', path.join(root, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -c unix_socket_directories=''`, '-w', '-t', '15', 'start']); started = true; }
    catch { throw new Error('Fixture PostgreSQL startup failed: ' + (await fs.readFile(path.join(root, 'postgres.log'), 'utf8').catch(() => 'No fixture log.')).slice(-1200)); }
  }
  async function stop() { await binary('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', '-t', '15', 'stop']); started = false; }
  try {
    const version = (await binary('postgres', ['--version'])).stdout.trim();
    assert.match(version, /PostgreSQL\) 18\./, 'Use PostgreSQL 18 to match the observed database major version.');
    await binary('initdb', ['-D', dataDir, '-U', 'fixture', '-A', 'trust', '--no-locale', '--encoding=UTF8']);
    await start();
    pg.Pool = class extends OriginalPool { constructor(options) { super(options); pools.push(this); this.on('error', () => {}); } };
    const admin = new pg.Pool({ host: '127.0.0.1', port, user: 'fixture', database: 'postgres', max: 1 });
    await admin.query('CREATE DATABASE fonso_recovery_source');
    await admin.query('CREATE DATABASE fonso_recovery_target');
    // Required before importing singleton stores. Never inherit a production URL.
    process.env.DATABASE_URL = source;
    process.env.DATABASE_SSL = 'false';
    const db = new pg.Pool({ connectionString: source, max: 2 });
    const room = require('../roomStore'), profile = require('../profileStore'), history = require('../historyStore');
    const activity = require('../vaultActivityStore'), vault = require('../vaultEventStore');
    const company = require('../companyStore').createCompanyStore({ databaseUrl: source });
    const passports = require('../antarcticPassportStore').createPassportStore({ pool: db, eggsEnabled: false });
    const metrics = require('../launchMetrics').createLaunchMetrics({ pool: db, chainId: 46630, deliveryEnabled: false });
    const operations = require('../launchOperations').createLaunchOperations({ pool: db, env: { AK_VISA_CHAIN_ID: '46630' } });
    const chain = require('../chainEventStore').createChainEventStore({ pool: db });
    assert.ok((await Promise.all([room.initRoomStore(), profile.initProfileStore(), history.initHistoryStore(), activity.initVaultActivityStore(), vault.initVaultEventStore()])).every(Boolean));
    await company.init(); await passports.init(); await operations.init(); await chain.init();
    const wallet = '0x' + '1'.repeat(40), account = '00000000-0000-4000-8000-000000000001';
    await company.transact('account', account, () => ({ id: account, revision: 7, progress: { fixture: { complete: true } }, sessions: [] }));
    await profile.upsertProfile({ wallet, name: 'Restore Fixture' });
    await profile.addProfileStats(wallet, 42, true);
    const saved = { roomCode: 'R3ST', roomMode: 'open_ice', status: 'playing', matchId: 'fixture-match', contractMatchId: null, visibility: 'private', gameId: 'two-stones', rulesetVersion: 'fixture', createdAt: 1700000000000, gameState: { fixture: true, turn: 3 }, players: { [wallet]: { wallet, seat: 'blue', joinedAt: 1700000000000 } } };
    await room.saveRoom(saved);
    await history.saveHistoryEntry({ id: 'fixture-history', wallet, roomCode: saved.roomCode, matchId: saved.matchId, roomMode: 'open_ice', gameId: 'two-stones', points: 42, won: true, finishedAt: 1700000000001 });
    await activity.saveVaultActivity({ id: 'fixture-activity', wallet, type: 'fixture', amountWei: '0', createdAt: 1700000000002 });
    await vault.saveIndexedVaultEvent({ id: 'fixture-event', contractAddress: '0x' + '2'.repeat(40), chainId: 11124, blockNumber: 1, logIndex: 0, txHash: '0x' + '3'.repeat(64), eventName: 'Fixture' });
    await vault.setLastIndexedBlock('fixture-cursor', 1);
    await passports.register(account, { playerName: 'Restore Fixture', wallet, chainId: 46630, consentVersion: 'fixture', walletProvider: 'external', souvenir: false }, 1700000000000);
    await metrics.route({ path: '/launch/visit', method: 'POST', req: {}, body: async () => ({ sessionId: '00000000-0000-4000-8000-000000000002' }) });
    await db.query('INSERT INTO ak_launch_passport_checks(chain_id,contract,delivery_id,verified,checked_at) VALUES($1,$2,$3,$4,$5)', [46630, 'fixture-contract', 'fixture-delivery', false, 1700000000000]);
    const scope = { chainId: 46630, contract: 'fixture-contract' };
    await chain.apply(scope, 0, { from: 1, to: 1, state: { revision: 1, cursor: 1, ready: false }, logs: [{ transactionHash: 'fixture-tx', logIndex: 0, blockNumber: 1, blockHash: 'fixture-block', name: 'Fixture', args: { fixture: true } }] });
    const { inspectDatabaseSchema, requiredTables } = require('../databaseSchema');
    assert.equal((await inspectDatabaseSchema(db, { scope: 'chain' })).ok, true);
    await db.query('CREATE ROLE fixture_insert_update');
    await db.query('GRANT USAGE ON SCHEMA public TO fixture_insert_update');
    await db.query('GRANT INSERT, UPDATE ON room_players TO fixture_insert_update');
    const restricted = await db.connect();
    try {
      await restricted.query('BEGIN'); await restricted.query('SET LOCAL ROLE fixture_insert_update');
      await assert.rejects(restricted.query('INSERT INTO room_players(room_code,wallet,team,entry_locked,entry_tx_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(room_code,wallet) DO UPDATE SET team=EXCLUDED.team,entry_locked=EXCLUDED.entry_locked,entry_tx_hash=EXCLUDED.entry_tx_hash', ['R3ST', wallet, 'blue', false, null]), error => error.code === '42501');
    } finally { await restricted.query('ROLLBACK'); restricted.release(); }
    let health;
    if (require('node:fs').existsSync(path.join(__dirname, '..', 'healthStatus.js'))) {
      const check = require('../healthStatus').createHealthStatus({ env: { DATABASE_URL: source }, startupStatus: () => 'ready' });
      try { health = await check.readiness(); assert.equal(health.body?.ok ?? health.ok, true); }
      finally { await check.close(); }
    }
    // Exercise an actual interrupted connection, then recover without replaying
    // the failed counter update. The database retains exactly 42 points.
    await stop();
    await assert.rejects(profile.addProfileStats(wallet, 99, false), error => error.code === 'DATABASE_UNAVAILABLE');
    await start();
    await new Promise(resolve => setTimeout(resolve, 1100));
    assert.equal((await profile.getLeaderboard()).find(value => value.wallet === wallet).points, 42);
    assert.equal((await room.loadSavedRoom('R3ST')).gameState.turn, 3);
    async function snapshot(pool) {
      const out = {};
      for (const [table] of requiredTables('chain')) {
        const rows = (await pool.query(`SELECT to_jsonb(t) AS row FROM public."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
        out[table] = { rows: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
      }
      return out;
    }
    const before = await snapshot(db);
    await binary('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--dbname', source, '--file', dump]);
    await binary('pg_restore', ['--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '--dbname', target, dump]);
    const restored = new pg.Pool({ connectionString: target, max: 1 });
    const schema = await inspectDatabaseSchema(restored, { scope: 'chain' });
    assert.equal(schema.ok, true);
    const after = await snapshot(restored); assert.deepEqual(after, before);
    return { ok: true, postgres: version, fixtureOnly: true, tablesCompared: Object.keys(after).length, rowsCompared: Object.values(after).reduce((n, table) => n + table.rows, 0), sourceAndRestoreDigestsAgree: true, outageRecovered: true, failedWriteReplayed: false, roomPlayersUpsertRequiresSelect: true, readiness: health?.body || health || null, dumpSha256: createHash('sha256').update(await fs.readFile(dump)).digest('hex') };
  } finally {
    pg.Pool = OriginalPool;
    await Promise.allSettled(pools.map(pool => pool.end()));
    if (started) await stop().catch(() => {});
    await fs.rm(root, { recursive: true, force: true });
  }
}

if (require.main === module) {
  if (process.argv.includes('--help')) console.log('PG_BINDIR=/absolute/path/to/postgres18/bin node server/scripts/rehearse-database-recovery.cjs\nCreates and removes a private local fixture cluster. Never reads a production URL/dump. No live accounts, minting or external calls.');
  else if (process.argv.length !== 2) { console.error('No database URL or other argument is accepted. Use --help.'); process.exitCode = 2; }
  else runRehearsal().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error('Isolated recovery rehearsal failed: ' + error.message); process.exitCode = 1; });
}
module.exports = { assertFixtureTarget, runRehearsal };
