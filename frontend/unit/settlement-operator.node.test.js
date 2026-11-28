import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fetchOperatorJson } from '../src/network/settlementOperator.js';

test('operator requests put credentials only in the authorization header and reject redirects', async () => {
  const url = 'https://backend.example/ops/settlement/rooms?includeAll=true&limit=50';
  const key = 'fixture-operator-key-'.repeat(3);
  let request;
  const result = await fetchOperatorJson(url, ` ${key} `, async (target, options) => {
    request = { target, options };
    return { ok: true, status: 200, json: async () => ({ ok: true, rooms: [] }) };
  });
  assert.equal(request.target, url); assert.equal(request.target.includes(key), false);
  assert.equal(request.options.headers.Authorization, 'Bearer ' + key);
  assert.equal(request.options.credentials, 'omit'); assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.redirect, 'error'); assert.deepEqual(result.rooms, []);
  const screen = await fs.readFile(new URL('../src/screens/SettlementAdminScreen.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(screen, /[?&]key=/, 'Operator credentials must not reappear in request URLs.');
});

test('missing credentials and failed or malformed protected responses fail closed', async () => {
  let calls = 0;
  await assert.rejects(() => fetchOperatorJson('https://backend.example/ops/settlement/rooms', '', async () => { calls++; }), /operator key/);
  assert.equal(calls, 0);
  for (const response of [
    { ok: false, status: 403, json: async () => ({ ok: false }) },
    { ok: true, status: 200, json: async () => { throw Error('HTML'); } },
    { ok: true, status: 200, json: async () => null },
    { ok: true, status: 200, json: async () => [] }
  ]) await assert.rejects(() => fetchOperatorJson('https://backend.example/ops/settlement/rooms', 'fixture-only', async () => response));
});
