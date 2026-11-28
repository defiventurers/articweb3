const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createHealthStatus, databaseRequired } = require('../healthStatus');

function fixture(options = {}) {
  const calls = { connected: 0, queries: [], releases: [], schemas: 0 };
  const client = {
    query: async text => { calls.queries.push(text); return { rows: [{ healthy: 1, writable: true }] }; },
    release: destroy => calls.releases.push(Boolean(destroy))
  };
  const pool = Object.assign(new EventEmitter(), {
    connect: async () => { calls.connected++; return client; }, end: async () => {}
  });
  let clock = 1000;
  const health = createHealthStatus({
    env: { DATABASE_URL: 'postgres://health_fixture@database.example.test/game' },
    now: () => clock,
    poolFactory: config => { calls.options = config; return pool; },
    startupStatus: () => 'ready',
    checkPrivileges: async () => true,
    inspectSchema: async (actual, config) => {
      assert.equal(actual, client); assert.deepEqual(config, { scope: 'gameplay' }); calls.schemas++; return { ok: true };
    }, ...options
  });
  return { health, calls, client, pool, advance: ms => { clock += ms; } };
}

test('readiness requires any configured DB and missing production DB; local memory mode stays available', async () => {
  for (const env of [
    { DATABASE_URL: 'configured' }, { DATABASE_REQUIRED: 'true' },
    { NODE_ENV: 'production', DATABASE_REQUIRED: 'false' }, { RENDER: 'true', DATABASE_REQUIRED: 'false' }
  ]) assert.equal(databaseRequired(env), true);
  assert.equal(databaseRequired({ NODE_ENV: 'test', DATABASE_REQUIRED: 'false' }), false);
  for (const [env, ok] of [[{}, true], [{ NODE_ENV: 'production' }, false], [{ DATABASE_REQUIRED: 'true' }, false]]) {
    const service = createHealthStatus({ env, startupStatus: () => 'ready', poolFactory: () => assert.fail('Missing URL must not connect.') });
    assert.equal(service.liveness().ok, true);
    const result = await service.readiness();
    assert.equal(result.ok, ok);
    assert.deepEqual(result.dependencies.database, { required: !ok, status: 'not_configured' });
  }
});

test('healthy readiness performs a live read and read-only gameplay schema check using one bounded TLS pool', async () => {
  const f = fixture();
  const response = await f.health.readiness();
  assert.deepEqual(response, {
    schema: 'artic.health.v1', service: 'artic-web3-server', check: 'readiness', ok: true,
    status: 'ready', generatedAt: '1970-01-01T00:00:01.000Z',
    dependencies: { database: { required: true, status: 'ready' }, startup: { status: 'ready' } }
  });
  assert.deepEqual(f.calls.queries, ["SELECT 1 AS healthy, current_setting('transaction_read_only') = 'off' AS writable"]);
  assert.equal(f.calls.schemas, 1);
  assert.equal(f.calls.options.max, 1);
  assert.equal(f.calls.options.ssl.rejectUnauthorized, true);
  assert.equal(f.calls.options.connectionTimeoutMillis, 2000);
  assert.equal(f.calls.options.query_timeout, 2000);
  assert.equal(f.calls.options.statement_timeout, 2000);
  assert.deepEqual(f.calls.releases, [false]);
  await f.health.close();
});

test('live failures and incompatible schema fail readiness without leaking connection details', async () => {
  for (const failure of ['connect', 'query', 'wrong-ping', 'read-only', 'schema']) {
    const f = fixture(failure === 'schema' ? { inspectSchema: async () => ({ ok: false, errors: ['private table detail'] }) } : {});
    if (failure === 'connect') f.pool.connect = async () => { throw Error('private credential and host detail'); };
    if (failure === 'query') f.client.query = async () => { throw Error('private credential and host detail'); };
    if (failure === 'wrong-ping') f.client.query = async () => ({ rows: [] });
    if (failure === 'read-only') f.client.query = async () => ({ rows: [{ healthy: 1, writable: false }] });
    const result = await f.health.readiness();
    assert.equal(result.ok, false, failure);
    assert.equal(result.dependencies.database.status, 'unavailable');
    assert.doesNotMatch(JSON.stringify(result), /private|example|credential|postgres/);
    assert.equal(f.health.liveness().ok, true);
    await f.health.close();
  }
  const malformed = createHealthStatus({ env: { DATABASE_URL: 'invalid secret value' } });
  assert.equal((await malformed.readiness()).ok, false);
});

test('concurrent probes share work, short cache expires, and later DB outage and recovery are observed', async () => {
  const f = fixture();
  const results = await Promise.all(Array.from({ length: 12 }, () => f.health.readiness()));
  assert.ok(results.every(result => result.ok)); assert.equal(f.calls.connected, 1);
  await f.health.readiness(); assert.equal(f.calls.connected, 1);
  f.client.query = async () => { throw Error('outage'); };
  f.advance(501);
  assert.equal((await f.health.readiness()).ok, false);
  assert.deepEqual(f.calls.releases, [false, true]);
  f.client.query = async () => ({ rows: [{ healthy: 1, writable: true }] });
  f.advance(501);
  assert.equal((await f.health.readiness()).ok, true);
  f.client.query = async () => { throw Error('outage again'); };
  f.pool.emit('error', Error('idle connection failed'));
  assert.equal((await f.health.readiness()).ok, false);
  await f.health.close();
});

test('a hung query or schema probe times out, destroys its client and can recover', async () => {
  for (const stage of ['query', 'schema']) {
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    let schemaHealthy = false;
    const f = fixture({ timeoutMs: 20, cacheMs: 0, ...(stage === 'schema' ? { inspectSchema: () => schemaHealthy ? Promise.resolve({ ok: true }) : pending } : {}) });
    if (stage === 'query') f.client.query = () => pending;
    const result = await f.health.readiness();
    assert.equal(result.ok, false); assert.deepEqual(f.calls.releases, [true]);
    finish(stage === 'query' ? { rows: [{ healthy: 1, writable: true }] } : { ok: true });
    await Promise.resolve();
    schemaHealthy = true;
    f.client.query = async () => ({ rows: [{ healthy: 1, writable: true }] });
    assert.equal((await f.health.readiness()).ok, true);
    assert.deepEqual(f.calls.releases, [true, false]);
    await f.health.close();
  }
});

test('late connection after a total probe timeout is destroyed and cannot turn readiness green', async () => {
  const f = fixture({ timeoutMs: 20, cacheMs: 0 });
  let connect;
  f.pool.connect = () => new Promise(resolve => { connect = resolve; });
  const result = await f.health.readiness();
  assert.equal(result.ok, false);
  connect(f.client);
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(f.calls.releases, [true]);
  assert.equal(f.calls.queries.length, 0);
  await f.health.close();
  assert.equal((await f.health.readiness()).ok, false);
});

test('readiness consumes the actual gameplay schema inspector and fails when a required account column disappears', async () => {
  const { inspectDatabaseSchema, requiredTables, COLUMN_SQL, INDEX_SQL } = require('../databaseSchema');
  const columns = [], indexes = [];
  for (const [table_name, table] of requiredTables('gameplay')) {
    for (const [column_name, shape] of Object.entries(table.columns)) columns.push({ table_name, column_name, udt_name: shape.type, is_nullable: shape.nullable ? 'YES' : 'NO' });
    indexes.push({ table_name, columns: table.primary, is_primary: true, valid: true, predicate: null });
    for (const unique of table.unique) indexes.push({ table_name, ...unique, is_primary: false, valid: true });
  }
  const f = fixture({ inspectSchema: inspectDatabaseSchema, cacheMs: 0 });
  const sql = [];
  f.client.query = async (text, values) => {
    sql.push(text);
    if (text === COLUMN_SQL || text === INDEX_SQL) {
      assert.equal(values[0].length, 6);
      return { rows: text === COLUMN_SQL ? columns : indexes };
    }
    return { rows: [{ healthy: 1, writable: true }] };
  };
  assert.equal((await f.health.readiness()).ok, true);
  columns.splice(columns.findIndex(column => column.table_name === 'ak_documents' && column.column_name === 'body'), 1);
  assert.equal((await f.health.readiness()).ok, false);
  assert.ok(sql.every(text => /^SELECT/.test(text)), 'Readiness must never run DDL or modify data.');
  await f.health.close();
});

test('healthy database cannot override pending or failed startup restoration', async () => {
  for (const status of ['starting', 'failed', 'unexpected']) {
    const f = fixture({ startupStatus: () => status });
    const result = await f.health.readiness();
    assert.equal(result.dependencies.database.status, 'ready'); assert.equal(result.ok, false);
    assert.equal(result.dependencies.startup.status, status === 'unexpected' ? 'failed' : status);
    assert.equal(f.health.liveness().ok, true);
    await f.health.close();
  }
  const denied = fixture({ checkPrivileges: async () => false });
  assert.equal((await denied.health.readiness()).ok, false);
  await denied.health.close();
});
