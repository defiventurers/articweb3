const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const { probeHealth } = require('../healthMonitor');

async function fixture(t, env = {}, setup = '') {
  const reserved = net.createServer();
  reserved.listen(0, '127.0.0.1'); await once(reserved, 'listening');
  const port = reserved.address().port;
  await new Promise(resolve => reserved.close(resolve));
  const boot = `
    // Skip only the unrelated external price fetch. Use the supported backend
    // startup, real transformations, HTTP security, routing and pg client.
    const tiers = require('./highStakesTiers');
    tiers.refreshHighStakesTierSnapshot = async () => tiers.getHighStakesTierSnapshot();
    ${setup}
    require('./scripts/start-with-runtime-status');
  `;
  const child = spawn(process.execPath, ['-r', './allGamesBackendBootstrap.js', '-e', boot], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: String(port), NODE_ENV: 'test', RENDER: '',
      DATABASE_URL: '', DATABASE_REQUIRED: 'false', DATABASE_SSL: 'false',
      LOCKED_MATCH_MODE: 'off', HIGH_STAKES_ENABLED: 'false', LEGAL_PUBLIC_MAINNET_APPROVED: 'false',
      ETH_VAULT_ADDRESS: '', VITE_ETH_VAULT_ADDRESS: '', ETH_SETTLEMENT_SIGNER: '',
      ETH_INDEXER_AUTO_RUN: 'false', ETH_INDEXER_SCHEDULED_RUN: 'false', ETH_INDEXER_HEARTBEAT: 'false',
      AK_PASSPORT_RUNTIME_ENABLED: 'false', AK_RH_EVENT_INDEX_ENABLED: 'false', ...env
    }, stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
  t.after(async () => { if (child.exitCode === null) { child.kill(); await once(child, 'exit'); } });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw Error(`Local fixture exited: ${output}`);
    try { const response = await fetch(base + '/healthz'); ready = response.ok; await response.body?.cancel(); if (ready) break; }
    catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.ok(ready, 'Local backend failed to start.');
  return { base, async send(command) { const reply = once(child, 'message'); child.send(command); return (await reply)[0]; } };
}

test('supported startup serves schema-checked liveness/readiness and preserves game routes/security', { timeout: 15000 }, async t => {
  const { base } = await fixture(t);
  assert.equal((await probeHealth(base + '/healthz', { check: 'liveness' })).ok, true);
  assert.equal((await probeHealth(base + '/readyz', { requireDatabase: false })).ok, true);
  assert.equal((await probeHealth(base + '/readyz')).code, 'INVALID_SCHEMA', 'Production monitor must not accept optional-memory readiness.');
  const ready = await fetch(base + '/readyz');
  assert.equal(ready.headers.get('cache-control'), 'no-store');
  assert.equal(ready.headers.get('cdn-cache-control'), 'no-store');
  assert.equal(ready.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual((await ready.json()).dependencies.database, { required: false, status: 'not_configured' });
  for (const route of ['/healthz', '/readyz']) {
    const head = await fetch(base + route, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(await head.text(), '');
    const options = await fetch(base + route, { method: 'OPTIONS' }); assert.equal(options.status, 204);
    const post = await fetch(base + route, { method: 'POST' }); assert.equal(post.status, 405); assert.equal(post.headers.get('allow'), 'GET, HEAD, OPTIONS'); await post.body?.cancel();
    const denied = await fetch(base + route, { headers: { Origin: 'https://untrusted.example.test' } }); assert.equal(denied.status, 403); await denied.body?.cancel();
  }
  const legacy = await (await fetch(base + '/health')).json();
  assert.equal(legacy.supportsSpectator, true); assert.equal(legacy.supportsShogi, true); assert.equal(legacy.supportsXiangqi, true);
  const game = await (await fetch(base + '/arctic-play/health')).json(); assert.equal(game.ok, true); assert.ok(game.games.length > 0);
  const runtime = await (await fetch(base + '/runtime/status')).json(); assert.equal(runtime.ok, true); assert.equal(runtime.launch.lockedMatchMode, 'off');
  assert.equal((await probeHealth(base + '/readyz/extra')).ok, false);
});

test('unreachable configured DB yields readiness503 while liveness and free lobby stay available', { timeout: 15000 }, async t => {
  const { base } = await fixture(t, { DATABASE_URL: 'postgres://health_fixture@127.0.0.1:1/offline' });
  const response = await fetch(base + '/readyz');
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, false); assert.deepEqual(body.dependencies.database, { required: true, status: 'unavailable' });
  assert.doesNotMatch(JSON.stringify(body), /127\.0\.0\.1|health_fixture|offline|ECONN|password/);
  assert.equal((await probeHealth(base + '/readyz')).code, 'DEPENDENCY_UNAVAILABLE');
  assert.equal((await probeHealth(base + '/healthz', { check: 'liveness' })).ok, true);
  const legacy = await (await fetch(base + '/health')).json(); assert.equal(legacy.ok, true); assert.equal(legacy.highStakesEnabled, false);
});

test('explicit required DB setting fails readiness when its URL is missing', { timeout: 15000 }, async t => {
  const { base } = await fixture(t, { DATABASE_REQUIRED: 'true' });
  const response = await fetch(base + '/readyz'); assert.equal(response.status, 503);
  assert.deepEqual((await response.json()).dependencies.database, { required: true, status: 'not_configured' });
  assert.equal((await probeHealth(base + '/healthz', { check: 'liveness' })).ok, true);
});

test('real transformed boot gates readiness until restore finishes and never clears an initial failed restore after DB recovery', { timeout: 20000 }, async t => {
  for (const scenario of ['restore-delayed', 'init-failed', 'restore-failed']) {
    const setup = `
      const scenario = ${JSON.stringify(scenario)};
      let recovered = false, restoreCount = 0, finishRestore;
      const stores = [['./historyStore','initHistoryStore'],['./profileStore','initProfileStore'],['./vaultActivityStore','initVaultActivityStore'],['./roomStore','initRoomStore']];
      for (const [file, method] of stores) require(file)[method] = async () => scenario !== 'init-failed' || recovered;
      require('./roomStore').loadRooms = async () => {
        restoreCount++;
        if (scenario === 'restore-failed' && !recovered) throw Error('isolated restore failure');
        if (scenario === 'restore-delayed' && !recovered) return new Promise(resolve => { finishRestore = resolve; });
        return [];
      };
      // The DB dependency reports healthy; the real production boot latch must
      // independently gate readiness. No pool/query/storage operation is live.
      const pool = Object.assign(new (require('node:events').EventEmitter)(), {
        connect: async () => ({ query: async () => ({rows:[{healthy:1,writable:true}]}), release() {} }), end: async () => {}
      });
      const health = require('./healthStatus').createHealthStatus({ poolFactory: () => pool,
        inspectSchema: async () => ({ok:true}), checkPrivileges: async () => true });
      const runtime = require('./runtimeStatusBootstrap');
      const originalInstall = runtime.installRuntimeStatusEndpoints;
      runtime.installRuntimeStatusEndpoints = () => originalInstall({health});
      process.on('message', () => {
        recovered = true; if (finishRestore) finishRestore([]);
        setImmediate(() => process.send({restoreCount}));
      });
    `;
    const f = await fixture(t, { DATABASE_URL: 'postgres://health_fixture@127.0.0.1:1/isolated' }, setup);
    const before = await fetch(f.base + '/readyz'); assert.equal(before.status, 503, scenario);
    const body = await before.json(); assert.equal(body.dependencies.database.status, 'ready');
    assert.equal(body.dependencies.startup.status, scenario === 'restore-delayed' ? 'starting' : 'failed');
    const recovered = await f.send('recover');
    assert.equal(recovered.restoreCount, scenario === 'init-failed' ? 0 : 1);
    const after = await fetch(f.base + '/readyz');
    assert.equal(after.status, scenario === 'restore-delayed' ? 200 : 503, scenario);
    assert.equal((await after.json()).dependencies.startup.status, scenario === 'restore-delayed' ? 'ready' : 'failed');
    assert.equal((await probeHealth(f.base + '/healthz', { check: 'liveness' })).ok, true);
  }
});
