const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

// Exercise the real store with independently completing pooled SQL operations.
// The older room query can be held while another connection finishes a newer
// upsert, reproducing the ordering that left twelve acknowledged plies at ten.
function fixture({ beforeRoomWrite = async () => {} } = {}) {
  const saved = new Map(), roomWrites = [], playerWrites = [], attempts = [], logs = [];
  let clock = 1000;
  class Pool extends EventEmitter {
    async query(sql, values = []) {
      if (/^INSERT INTO rooms\s/.test(sql)) {
        const snapshot = JSON.parse(values[8]);
        attempts.push(snapshot);
        await beforeRoomWrite(snapshot);
        saved.set(values[0], snapshot);
        roomWrites.push(snapshot);
      } else if (/^INSERT INTO room_players\s/.test(sql)) {
        playerWrites.push(structuredClone(values));
      }
      return { rows: [] };
    }
    async end() {}
  }
  const module = { exports: {} };
  const localRequire = name => {
    if (name === 'pg') return { Pool };
    if (name === './databaseRuntime') return {
      createStoreRuntime: options => require('../databaseRuntime').createStoreRuntime({
        ...options, now: () => clock, logger: line => logs.push(line)
      })
    };
    return require(path.resolve(__dirname, '..', name));
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../roomStore.js'), 'utf8'), {
    module, exports: module.exports, require: localRequire,
    process: { env: { DATABASE_URL: 'postgresql://fixture@127.0.0.1/fonso_ordering' } },
    console, Date, Map, Set
  }, { filename: 'roomStore.js' });
  return { store: module.exports, saved, roomWrites, playerWrites, attempts, logs,
    advance: () => { clock += 2000; } };
}

function room(ply, roomCode = 'FROST') {
  return {
    roomCode, roomMode: 'open_ice', status: 'playing', matchId: 'fixture-' + roomCode,
    contractMatchId: null, visibility: 'private', gameId: 'two-stones', rulesetVersion: 'fixture',
    createdAt: 1000, gameState: { ply }, auditLog: [{ ply }],
    acceptedActionRequestHashes: Array.from({ length: ply }, (_, n) => n.toString(16).padStart(64, '0')),
    players: { blue: { wallet: 'blue', seat: 'blue', entryLocked: true, joinedAt: 1000 } }
  };
}

test('a slow older room upsert cannot overwrite newer board state or replay receipts', async t => {
  const entered = deferred(), release = deferred();
  t.after(() => release.resolve());
  const f = fixture({ beforeRoomWrite: async snapshot => {
    if (snapshot.gameState.ply === 10) { entered.resolve(); await release.promise; }
  } });
  await f.store.initRoomStore();
  const older = f.store.saveRoom(room(10));
  await entered.promise;
  const newer = f.store.saveRoom(room(12));
  // Drain the newer call's microtasks without releasing the deliberately slow
  // older SQL operation. A store without ordering commits twelve before ten.
  await new Promise(resolve => setImmediate(resolve));
  release.resolve();
  await Promise.all([older, newer]);
  assert.equal(f.saved.get('FROST').gameState.ply, 12);
  assert.equal(f.saved.get('FROST').acceptedActionRequestHashes.length, 12);
  assert.deepEqual(f.roomWrites.map(value => value.gameState.ply), [10, 12]);
});

test('room and player snapshots are captured at each call before any asynchronous initialization or write', async () => {
  const f = fixture(), current = room(10);
  const timer = {}; timer.self = timer;
  current.botTimer = timer; current.refundInFlight = true;
  const older = f.store.saveRoom(current);
  current.gameState.ply = 12;
  current.auditLog.push({ ply: 12 });
  current.acceptedActionRequestHashes.push('a'.repeat(64), 'b'.repeat(64));
  current.players.blue.seat = 'coral'; current.players.blue.entryLocked = false;
  const newer = f.store.saveRoom(current);
  await Promise.all([older, newer]);
  assert.deepEqual(f.roomWrites.map(value => value.gameState.ply), [10, 12]);
  assert.deepEqual(f.roomWrites.map(value => value.auditLog.length), [1, 2]);
  assert.deepEqual(f.roomWrites.map(value => value.acceptedActionRequestHashes.length), [10, 12]);
  assert.deepEqual(f.playerWrites.map(values => [values[2], values[3]]), [['blue', true], ['coral', false]]);
  for (const snapshot of f.roomWrites) {
    assert.equal(Object.hasOwn(snapshot, 'botTimer'), false);
    assert.equal(Object.hasOwn(snapshot, 'refundInFlight'), false);
  }
});

test('a blocked room does not serialize independent rooms', async t => {
  const entered = deferred(), release = deferred();
  t.after(() => release.resolve());
  const f = fixture({ beforeRoomWrite: async snapshot => {
    if (snapshot.roomCode === 'SLOW') { entered.resolve(); await release.promise; }
  } });
  await f.store.initRoomStore();
  const blocked = f.store.saveRoom(room(10, 'SLOW'));
  await entered.promise;
  await f.store.saveRoom(room(12, 'FAST'));
  assert.equal(f.saved.get('FAST').gameState.ply, 12);
  assert.equal(f.saved.has('SLOW'), false);
  release.resolve(); await blocked;
});

test('a failed room write rejects safely and does not poison later saves or replay the failed snapshot', async () => {
  let fail = true;
  const f = fixture({ beforeRoomWrite: async () => { if (fail) throw Error('private connection detail'); } });
  await f.store.initRoomStore();
  await assert.rejects(f.store.saveRoom(room(10)), error => {
    assert.equal(error.code, 'DATABASE_UNAVAILABLE');
    assert.equal(error.status, 503);
    assert.doesNotMatch(error.message, /private/);
    return true;
  });
  assert.equal(f.saved.has('FROST'), false);
  fail = false; f.advance();
  await f.store.saveRoom(room(12));
  assert.deepEqual(f.attempts.map(value => value.gameState.ply), [10, 12]);
  assert.deepEqual(f.roomWrites.map(value => value.gameState.ply), [12]);
  assert.equal(f.saved.get('FROST').acceptedActionRequestHashes.length, 12);
});
