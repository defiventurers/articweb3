const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

const stores = [
  ['roomStore', 'initRoomStore', 'roomStoreStatus', 'loadRooms'],
  ['historyStore', 'initHistoryStore', 'historyStoreStatus', 'getHistoryForWallet'],
  ['profileStore', 'initProfileStore', 'profileStoreStatus', 'getLeaderboard'],
  ['vaultActivityStore', 'initVaultActivityStore', 'vaultActivityStoreStatus', 'getVaultActivityForWallet'],
  ['vaultEventStore', 'initVaultEventStore', 'vaultEventStoreStatus', 'getRecentIndexedVaultEvents']
];

function fixture(name, configured = true) {
  let online = false, clock = 1000, queries = 0;
  const pools = [], logs = [], module = { exports: {} };
  class Pool extends EventEmitter {
    constructor() { super(); pools.push(this); }
    async query() { queries++; if (!online) throw Error('private database connection detail'); return { rows: [] }; }
    async end() {}
  }
  const localRequire = value => {
    if (value === 'pg') return { Pool };
    if (value === './databaseRuntime') return { createStoreRuntime: options => require('../databaseRuntime').createStoreRuntime({ ...options, now: () => clock, logger: line => logs.push(line) }) };
    return require(path.resolve(__dirname, '..', value));
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', name + '.js'), 'utf8'), {
    module, exports: module.exports, require: localRequire,
    process: { env: configured ? { DATABASE_URL: 'postgresql://fixture:fixture-only@localhost/recovery_fixture' } : {} },
    console: { error: (...values) => logs.push(values.join(' ')) }, Date, Map, Set
  }, { filename: name + '.js' });
  return { store: module.exports, pools, logs, queries: () => queries, online: value => { online = value; }, advance: () => { clock += 2000; } };
}

for (const [name, init, status, read] of stores) {
  test(name + ' retries failed initialization, rejects unavailable durable reads, and handles later pool failures', async () => {
    const f = fixture(name);
    assert.equal(await f.store[init](), false);
    assert.equal(f.store[status]().databaseReady, false);
    await assert.rejects(f.store[read](), error => error.code === 'DATABASE_UNAVAILABLE' && error.status === 503);
    const before = f.queries();
    f.online(true);
    f.advance();
    assert.deepEqual(await Promise.all([f.store[init](), f.store[init]()]), [true, true]);
    assert.ok(f.queries() > before, 'the failed initialization must not be permanently cached');
    assert.equal(f.store[status]().databaseReady, true);
    f.online(false);
    await assert.rejects(f.store[read](), error => error.code === 'DATABASE_UNAVAILABLE');
    assert.equal(f.store[status]().databaseReady, false);
    assert.doesNotThrow(() => f.pools[0].emit('error', Error('private idle connection detail')));
    f.online(true); f.advance();
    assert.equal(await f.store[init](), true);
    assert.doesNotMatch(JSON.stringify(f.logs), /private|postgresql:\/\//);
  });
}

test('explicitly unconfigured local stores preserve memory operation', async () => {
  for (const [name, init, status, read] of stores) {
    const f = fixture(name, false);
    assert.equal(await f.store[init](), false);
    assert.equal(f.store[status]().databaseConfigured, false);
    assert.equal((await f.store[read]()).length, 0);
    assert.equal(f.queries(), 0);
  }
});

test('free match completion survives a failed history write and supports synchronous injected stores', async () => {
  const { createTwoStonesService } = require('../twoStonesService');
  const { createLockDrill, getLegalActions } = require('../twoStonesRules');
  const originalError = console.error, logs = [];
  console.error = line => logs.push(line);
  try {
    for (const failWrite of [false, true]) {
      const rooms = new Map(), profiles = new Map([['blue', { name: 'Blue Fixture' }], ['coral', { name: 'Coral Fixture' }]]), packets = [];
      const service = createTwoStonesService({ rooms, profiles, sockets: new Map(), send() {},
        ok(_ws, _id, type, payload) { packets.push({ type, payload }); }, fail() { assert.fail('Unexpected game rejection'); },
        walletOf: value => value, profileFor: wallet => profiles.get(wallet), saveRoomSafe() {},
        saveHistoryEntry() { return failWrite ? Promise.reject(Error('private fixture failure')) : undefined; },
        getHistoryForWallet: async () => [] });
      service.createRoom({}, 'create', { wallet: 'blue' });
      const room = [...rooms.values()][0];
      service.joinRoom({}, 'join', { wallet: 'coral', roomCode: room.roomCode });
      room.gameState = createLockDrill();
      const action = getLegalActions(room.gameState, 'blue').find(value => value.from === 'nw' && value.to === 'c');
      service.action({}, 'win', { wallet: 'blue', roomCode: room.roomCode, action });
      assert.equal(packets.at(-1).payload.room.status, 'finished');
      await new Promise(resolve => setImmediate(resolve));
    }
    assert.equal(logs.length, 2); assert.doesNotMatch(logs.join('\n'), /private/);
  } finally { console.error = originalError; }
});

test('local recovery rehearsal rejects external or arbitrary database targets', () => {
  const { assertFixtureTarget } = require('../scripts/rehearse-database-recovery.cjs');
  assert.doesNotThrow(() => assertFixtureTarget('postgresql://fixture@127.0.0.1:5432/fonso_recovery_target'));
  for (const url of ['postgresql://fixture@db.example.test/fonso_recovery_target', 'postgresql://fixture@127.0.0.1/production', 'postgresql://fixture@127.0.0.1/fonso_recovery_target?host=db.example.test']) assert.throws(() => assertFixtureTarget(url), /loopback/);
});
