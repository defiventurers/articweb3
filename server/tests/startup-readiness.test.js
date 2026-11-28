const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createStartupReadiness } = require('../startupReadiness');
const { injectStartupReadiness, transformBackendSource } = require('../loadPrizeBackend');

test('startup latch starts closed and a failed initial restore needs a controlled restart', () => {
  const state = createStartupReadiness(); assert.equal(state.status(), 'starting');
  state.complete(false); assert.equal(state.status(), 'failed');
  state.complete(true); assert.equal(state.status(), 'failed');
  const restarted = createStartupReadiness(); restarted.complete(true); assert.equal(restarted.status(), 'ready');
  restarted.fail(); restarted.complete(true); assert.equal(restarted.status(), 'failed');
});

test('startup source anchors fail closed if the required initialization/restoration contract drifts', () => {
  const source = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
  const transformed = transformBackendSource(source);
  assert.match(transformed, /startupReadiness\.complete/);
  assert.match(transformed, /startupReadiness\.fail\(\)/);
  assert.ok(transformed.indexOf('await loadRooms()') < transformed.indexOf('startupReadiness.complete'));
  assert.equal(injectStartupReadiness(injectStartupReadiness(source)), injectStartupReadiness(source));
  for (const changed of [source.replace('async function boot()', 'async function changedBoot()'), source.replace('await loadRooms()', 'await changedLoad()'), source.replace('boot().catch((err)', 'boot().catch((failure)')]) {
    assert.throws(() => injectStartupReadiness(changed), /readiness/);
  }
});
