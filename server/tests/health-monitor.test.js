const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { probeHealth, validateHealthPayload } = require('../healthMonitor');

const readiness = (changes = {}) => ({
  schema: 'artic.health.v1', service: 'artic-web3-server', check: 'readiness',
  ok: true, status: 'ready', generatedAt: new Date().toISOString(), ...changes,
  dependencies: { startup: { status: 'ready' }, ...(changes.dependencies || { database: { required: true, status: 'ready' } }) }
});
const fakeFetch = (body, { status = 200, type = 'application/json', redirected = false } = {}) => async (_url, options) => {
  assert.equal(options.redirect, 'manual'); assert.equal(options.cache, 'no-store');
  const result = new Response(body, { status, headers: { 'content-type': type } });
  Object.defineProperty(result, 'redirected', { value: redirected });
  return result;
};

test('monitor accepts the exact live/readiness contract and distinguishes a required DB outage', async () => {
  const up = readiness();
  assert.equal((await probeHealth('https://example.test/readyz', { fetchImpl: fakeFetch(JSON.stringify(up)) })).ok, true);
  const down = readiness({ ok: false, status: 'not_ready', dependencies: { database: { required: true, status: 'unavailable' } } });
  assert.deepEqual(await probeHealth('https://example.test/readyz', { fetchImpl: fakeFetch(JSON.stringify(down), { status: 503 }) }),
    { ok: false, check: 'readiness', code: 'DEPENDENCY_UNAVAILABLE', status: 503 });
  const live = readiness({ check: 'liveness', status: 'alive' }); delete live.dependencies;
  assert.equal((await probeHealth('https://example.test/healthz', { check: 'liveness', fetchImpl: fakeFetch(JSON.stringify(live)) })).ok, true);
});

test('monitor rejects HTML, redirects, malformed/oversized bodies and inconsistent HTTP statuses', async () => {
  const scenarios = [
    ['<html>Coming soon</html>', { type: 'text/html' }, 'INVALID_CONTENT_TYPE'],
    ['<html>Coming soon</html>', {}, 'INVALID_JSON'],
    ['{', {}, 'INVALID_JSON'],
    [JSON.stringify(readiness()), { status: 307 }, 'UNEXPECTED_REDIRECT'],
    [JSON.stringify(readiness()), { redirected: true }, 'UNEXPECTED_REDIRECT'],
    [JSON.stringify(readiness()), { status: 503 }, 'STATUS_MISMATCH'],
    [JSON.stringify(readiness()), { status: 404 }, 'HTTP_STATUS'],
    ['x'.repeat(8193), {}, 'BODY_TOO_LARGE'],
    ['{"ok":true}', {}, 'INVALID_SCHEMA']
  ];
  for (const [body, options, code] of scenarios) {
    const result = await probeHealth('https://example.test/api/health', { fetchImpl: fakeFetch(body, options) });
    assert.equal(result.ok, false); assert.equal(result.code, code);
    assert.doesNotMatch(JSON.stringify(result), /Coming soon/);
  }
});

test('schema requires identity, freshness, booleans and consistent dependency status', () => {
  const invalid = [
    null, [], true, readiness({ schema: 'another-schema' }), readiness({ service: 'another-service' }),
    readiness({ check: 'liveness' }), readiness({ ok: 'true' }), readiness({ generatedAt: 'yesterday' }),
    readiness({ generatedAt: new Date(Date.now() - 61000).toISOString() }),
    readiness({ generatedAt: new Date(Date.now() + 31000).toISOString() }),
    readiness({ dependencies: {} }), readiness({ dependencies: { database: { required: 'true', status: 'ready' } } }),
    readiness({ dependencies: { database: { required: true, status: 'unavailable' } } }),
    readiness({ dependencies: { database: { required: false, status: 'not_configured' } } }),
    readiness({ dependencies: { database: { required: true, status: 'ready' }, startup: { status: 'failed' } } }),
    readiness({ dependencies: { database: { required: true, status: 'ready' }, startup: null } }),
    readiness({ status: 'not_ready' })
  ];
  for (const payload of invalid) assert.equal(validateHealthPayload(payload), false, JSON.stringify(payload));
  const memory = readiness({ dependencies: { database: { required: false, status: 'not_configured' } } });
  assert.equal(validateHealthPayload(memory, { requireDatabase: false }), true);
  assert.equal(validateHealthPayload(readiness({ dependencies: { database: { required: false, status: 'ready' } } }), { requireDatabase: false }), false);
});

test('monitor never follows a real redirect to a successful HTML page; deadlines bound fetch/body waits', async t => {
  let htmlHits = 0;
  const server = http.createServer((req, res) => {
    if (req.url === '/redirect') { res.writeHead(307, { Location: '/coming-soon.html' }); res.end(); }
    else if (req.url === '/coming-soon.html') { htmlHits++; res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<h1>Coming soon</h1>'); }
    else if (req.url === '/body-timeout') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.write('{'); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await probeHealth(`${base}/redirect`)).code, 'UNEXPECTED_REDIRECT');
  assert.equal(htmlHits, 0);
  assert.equal((await probeHealth(`${base}/coming-soon.html`)).code, 'INVALID_CONTENT_TYPE');
  for (const suffix of ['/timeout', '/body-timeout']) assert.equal((await probeHealth(base + suffix, { timeoutMs: 40 })).code, 'TIMEOUT');
  assert.equal((await probeHealth('http://127.0.0.1:1/readyz')).code, 'NETWORK_ERROR');
});

test('monitor validates targets and CLI returns machine-usable success/failure exits without response dumps', async t => {
  for (const url of ['invalid', 'file:///tmp/health', 'https://user:secret@example.test/readyz', 'https://example.test/readyz?key=secret']) {
    assert.equal((await probeHealth(url, { fetchImpl: () => assert.fail('Invalid URL reached fetch.') })).code, 'INVALID_URL');
  }
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': req.url === '/readyz' ? 'application/json' : 'text/html' });
    res.end(req.url === '/readyz' ? JSON.stringify(readiness()) : '<h1>Coming soon</h1>');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  for (const [suffix, expected] of [['/readyz', 0], ['/html', 1]]) {
    const child = spawn(process.execPath, [path.join(__dirname, '../../scripts/check-health.mjs'), `http://127.0.0.1:${server.address().port}${suffix}`]);
    let stdout = ''; child.stdout.on('data', data => { stdout += data; });
    const [code] = await once(child, 'exit');
    assert.equal(code, expected); assert.equal(JSON.parse(stdout).ok, expected === 0);
    assert.doesNotMatch(stdout, /Coming soon/);
  }
});
