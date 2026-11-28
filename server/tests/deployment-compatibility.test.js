const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { createServer } = require('node:net');
const { generateKeyPairSync, createHash, randomBytes, randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const WebSocket = require('ws');
const { ENDPOINTS, publicKeyId, publicFields, reviewedRequirements, checkedBase, probeCompatibility, assessCompatibility } = require('../deploymentCompatibility');

const commit = 'a'.repeat(40);
const expected = () => reviewedRequirements({ backendCommit: commit, paraEnvironment: 'BETA', paraChainId: 46630 });
function validResponses(requirements = expected()) {
  const bodies = {
    games: { ok: true, version: requirements.gameVersion, buildCommit: requirements.backendCommit, capabilities: [...requirements.capabilities], games: requirements.games },
    cloud: { version: 2, cloud: true, accountPlay: true, commerce: false },
    para: { enabled: true, ...requirements.para },
    fair: { enabled: true, protocol: requirements.fair.protocol, rulesHash: requirements.fair.rulesHash, serverKeyId: requirements.fair.serverKeyIds[0], payouts: false },
    launch: { ok: true, mode: 'off', lockedMatchMode: 'off', chainId: 2741, highStakesAllowed: false, legalPublicMainnetApproved: false },
    legacy: { ok: true, chainId: 2741, highStakesEnabled: false }
  };
  return Object.fromEntries(Object.entries(bodies).map(([kind, body]) => [kind, { path: ENDPOINTS[kind], status: 200, contentType: 'application/json', body, error: null }]));
}

test('a matching reviewed contract and closed free-release policy pass the bounded preflight', () => {
  const result = assessCompatibility(validResponses(), expected());
  assert.equal(result.ok, true);
  assert.ok(result.checks.every(check => check.status === 'pass'));
  assert.match(result.scope, /excludes consent, gameplay, database recovery, physical APK acceptance and deployment approval/);
  const optionalCommerce = validResponses(); optionalCommerce.cloud.body.commerce = true;
  assert.equal(assessCompatibility(optionalCommerce, expected()).ok, true, 'Non-match commerce is not the funded-game launch switch.');
});

test('commit skew is unresolved identity evidence, not an invented protocol incompatibility', () => {
  const responses = validResponses(); responses.games.body.buildCommit = 'b'.repeat(40);
  const result = assessCompatibility(responses, expected());
  assert.equal(result.ok, false);
  assert.deepEqual(result.checks.filter(check => check.status !== 'pass').map(({ name, status }) => ({ name, status })), [{ name: 'backend.commit', status: 'unresolved' }]);
});

test('wrong API version, rules authority, Para binding and game seat counts are incompatible', () => {
  for (const [kind, field, changed, name] of [
    ['games', 'version', 'arctic-play-2.0.0', 'games.version'],
    ['cloud', 'version', 3, 'cloud.version'],
    ['fair', 'rulesHash', '0'.repeat(64), 'fair.rulesHash'],
    ['para', 'environment', 'PRODUCTION', 'para.environment'],
    ['para', 'chainId', 4663, 'para.chainId'],
    ['games', 'games', [{ id: 'dominion', players: 2 }], 'games.catalogue']
  ]) {
    const responses = validResponses(); responses[kind].body[field] = changed;
    const result = assessCompatibility(responses, expected());
    assert.equal(result.ok, false, name);
    assert.equal(result.checks.find(check => check.name === name).status, 'incompatible', name);
  }
});

test('disabled capabilities, unpinned key, missing fields and a launch pause never pass', () => {
  for (const [kind, field, value] of [['cloud', 'cloud', false], ['para', 'enabled', false], ['fair', 'enabled', false], ['fair', 'serverKeyId', '0'.repeat(64)], ['legacy', 'highStakesEnabled', null], ['games', 'capabilities', []]]) {
    const responses = validResponses(); responses[kind].body[field] = value;
    assert.equal(assessCompatibility(responses, expected()).ok, false, kind + '.' + field);
  }
  const responses = validResponses(); responses.fair = { status: 503, contentType: 'application/json', body: { code: 'LAUNCH_RESET_PAUSED', paused: true }, error: null };
  const result = assessCompatibility(responses, expected());
  assert.equal(result.ok, false);
  assert.equal(result.checks.find(check => check.name === 'fair.response').status, 'unresolved');
  assert.equal(result.checks.some(check => check.name === 'fair.rulesHash'), false, 'A hidden authority must never be guessed from health flags.');
});

test('free release remains held for internal/public switches even when interfaces agree', () => {
  const responses = validResponses();
  responses.launch.body.mode = 'internal'; responses.launch.body.lockedMatchMode = 'internal'; responses.launch.body.highStakesAllowed = true;
  responses.legacy.body.highStakesEnabled = true;
  const result = assessCompatibility(responses, expected());
  assert.equal(result.ok, false);
  assert.equal(result.checks.find(check => check.name === 'free.launchGate').status, 'blocked');
  assert.equal(result.checks.find(check => check.name === 'free.highStakesDisabled').status, 'blocked');
});

test('probe accepts only exact JSON responses and never follows a redirect or sends credentials', async () => {
  const samples = [
    [() => new Response('<html>Coming soon</html>', { headers: { 'content-type': 'text/html' } }), 'EXPECTED_JSON'],
    [() => new Response('{}', { status: 302, headers: { 'content-type': 'application/json', location: 'https://elsewhere.example/' } }), 'UNEXPECTED_REDIRECT'],
    [() => { const response = new Response('{}', { headers: { 'content-type': 'application/json' } }); Object.defineProperty(response, 'redirected', { value: true }); return response; }, 'UNEXPECTED_REDIRECT'],
    [() => new Response('not-json', { headers: { 'content-type': 'application/json' } }), 'INVALID_JSON'],
    [() => new Response('[]', { headers: { 'content-type': 'application/json' } }), 'INVALID_SCHEMA'],
    [() => new Response(JSON.stringify({ extra: 'x'.repeat(70000) }), { headers: { 'content-type': 'application/json' } }), 'RESPONSE_TOO_LARGE'],
    [() => { throw Object.assign(Error('do not log this secret'), { name: 'TimeoutError' }); }, 'TIMEOUT']
  ];
  for (const [response, error] of samples) {
    const seen = [];
    const result = await probeCompatibility({ baseUrl: 'https://service.example', expected: expected(), fetcher: async (url, options) => {
      seen.push(url); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'manual'); assert.equal(options.headers, undefined); assert.equal(options.body, undefined); return response();
    } });
    assert.equal(seen.length, Object.keys(ENDPOINTS).length);
    assert.ok(Object.values(result.responses).every(value => value.error === error), error);
    assert.equal(result.assessment.ok, false);
    assert.equal(JSON.stringify(result).includes('do not log this secret'), false);
  }
});

test('snapshots discard keys, sessions, infrastructure locations and arbitrary errors', () => {
  const privateKey = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ format: 'jwk' });
  const fields = publicFields('fair', { ...validResponses().fair.body, serverKey: privateKey, apiKey: 'secret-value', session: 'session-value', error: 'postgres://user:password@database.example.test/db' });
  assert.equal(fields.serverKeyId, publicKeyId(privateKey));
  const serialized = JSON.stringify(fields);
  for (const value of [privateKey.d, 'secret-value', 'session-value', 'postgres://']) assert.equal(serialized.includes(value), false);
  assert.throws(() => checkedBase('https://username:password@service.example'));
  assert.throws(() => checkedBase('https://service.example/?key=secret'));
  assert.throws(() => checkedBase('http://service.example'));
  assert.throws(() => reviewedRequirements({ backendCommit: 'abc123', paraEnvironment: 'BETA', paraChainId: 46630 }));
  assert.equal(checkedBase('http://127.0.0.1:9000'), 'http://127.0.0.1:9000');
});

test('real transformed startup preserves public contracts, saved sessions and socket envelopes with paid workers disabled', { timeout: 20000 }, async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fonso-compatibility-'));
  const file = path.join(directory, 'accounts.json');
  const accountId = randomUUID(), secret = randomBytes(32).toString('base64url');
  const session = accountId + '.' + secret;
  const previousExpiry = Date.now() + 3600000;
  // Historical session has no issuedAt/lastSeen: the existing bounded migration
  // must preserve its expiry and the saved progress revision.
  await fs.writeFile(file, JSON.stringify({ ['account:' + accountId]: { id: accountId, sessions: [{ hash: createHash('sha256').update(secret).digest('hex'), expires: previousExpiry }], progress: { fixtureSavedGame: 'retained' }, revision: 7, entitlements: {}, metrics: [] } }), { mode: 0o600 });
  const privateKey = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ format: 'jwk' });
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const boot = `
    globalThis.fetch = async () => { throw Error('External network is disabled in this isolated fixture.'); };
    const tiers = require('./highStakesTiers'); tiers.refreshHighStakesTierSnapshot = async () => tiers.getHighStakesTierSnapshot();
    const store = require('./companyStore').createCompanyStore({file: process.env.FONSO_COMPAT_FIXTURE_STORE, development:true});
    const privateKey = JSON.parse(process.env.FONSO_COMPAT_FIXTURE_KEY);
    const module = require('./arcticPlayService'), create = module.createArcticPlayService;
    module.createArcticPlayService = options => create({...options, companyOptions:{store, authOptions:{paraOptions:{enabled:true,apiKey:'beta_isolated-fixture',audience:'isolated-fixture',environment:'BETA',chainId:46630}}}, fairOptions:{privateKey,trustedKeys:[privateKey]}});
    require('./scripts/start-with-runtime-status.js');
  `;
  const child = spawn(process.execPath, ['-r', './allGamesBackendBootstrap.js', '-e', boot], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), DATABASE_URL: '', RENDER_GIT_COMMIT: commit,
      ETH_SETTLEMENT_SIGNER: '', ETH_VAULT_ADDRESS: '', VITE_ETH_VAULT_ADDRESS: '', HIGH_STAKES_ENABLED: 'false',
      LOCKED_MATCH_MODE: 'off', LEGAL_PUBLIC_MAINNET_APPROVED: 'false', LOCKED_MATCH_INTERNAL_WALLETS: '', ABSTRACT_CHAIN_ID: '2741',
      ETH_INDEXER_AUTO_RUN: 'false', ETH_INDEXER_SCHEDULED_RUN: 'false', ETH_INDEXER_HEARTBEAT: 'false',
      AK_PASSPORT_RUNTIME_ENABLED: 'false', AK_RH_EVENT_INDEX_ENABLED: 'false', AK_VISA_DELIVERY_ENABLED: 'false', AK_EARLY_AUTO_ENROLL_ENABLED: 'false',
      AK_LAUNCH_RESET_PAUSED: 'false', AK_RAZORPAY_ENABLED: 'false',
      FONSO_COMPAT_FIXTURE_STORE: file, FONSO_COMPAT_FIXTURE_KEY: JSON.stringify(privateKey)
    }, stdio: ['ignore', 'pipe', 'pipe']
  });
  const sockets = [];
  let output = ''; child.stdout.on('data', value => { output += value; }); child.stderr.on('data', value => { output += value; });
  t.after(async () => { for (const ws of sockets) ws.terminate(); if (child.exitCode === null) { child.kill(); await once(child, 'exit'); } await fs.rm(directory, { recursive: true, force: true }); });
  const origin = 'http://127.0.0.1:' + port;
  let available = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) assert.fail('Isolated production bootstrap failed.');
    try { const response = await fetch(origin + '/arctic-play/health'); available = response.status === 200; if (available) break; }
    catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(available, true, 'The real transformed startup should become available.');
  const requirements = expected(); requirements.fair.serverKeyIds = [publicKeyId(privateKey)];
  const result = await probeCompatibility({ baseUrl: origin, expected: requirements });
  const failures = result.assessment.checks.filter(check => check.status !== 'pass');
  // This fixture does not build or pretend to contain the approved APK/browser
  // artwork. A checkout with no generated browser assets must stay held.
  const browserBuilt = require('node:fs').existsSync(path.join(__dirname, '../arcticPlayWeb/index.html'));
  assert.deepEqual(failures.map(({ name }) => name), browserBuilt ? [] : ['capability.browser-play-v1']);
  assert.equal(result.assessment.ok, browserBuilt);
  for (const [url, responseField] of [['/arctic-play/v3/account', 'accountId'], ['/arctic-play/v3/progress', 'progress']]) {
    assert.equal((await fetch(origin + url)).status, 401);
    const response = await fetch(origin + url, { headers: { Authorization: 'Bearer ' + session } });
    assert.equal(response.status, 200); const body = await response.json(); assert.ok(body[responseField]); assert.equal(body.revision, 7);
    if (responseField === 'progress') assert.equal(body.progress.fixtureSavedGame, 'retained');
  }
  const saved = JSON.parse(await fs.readFile(file, 'utf8'))['account:' + accountId];
  assert.equal(saved.sessions[0].expires, previousExpiry); assert.ok(saved.sessions[0].issuedAt); assert.ok(saved.sessions[0].lastSeen);
  const ws = new WebSocket(origin.replace('http:', 'ws:')); sockets.push(ws); await once(ws, 'open');
  async function request(type, payload) {
    const requestId = randomUUID();
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { ws.off('message', handler); reject(Error('Socket contract timed out.')); }, 3000);
      const handler = data => { const packet = JSON.parse(data); if (packet.requestId !== requestId) return; clearTimeout(timer); ws.off('message', handler); resolve(packet); };
      ws.on('message', handler);
    });
    ws.send(JSON.stringify({ type, requestId, payload })); return response;
  }
  const free = await request('room_list', { roomMode: 'open_ice' }); assert.equal(free.type, 'room_list_result'); assert.deepEqual(free.payload.rooms, []);
  const denied = await request('ap_room_create', { tableId: 'dominion', playerId: randomUUID(), capabilities: requirements.capabilities }); assert.equal(denied.type, 'error'); assert.equal(typeof denied.payload.message, 'string');
  assert.equal(output.includes('External network is disabled'), false, 'Read-only fixture requests should need no external call.');
});
