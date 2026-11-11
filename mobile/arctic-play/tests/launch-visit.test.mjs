import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(new URL('../build-deps/package.json', import.meta.url));
const {JSDOM} = require('jsdom');
const source = await fs.readFile(new URL('../src/launch-visit.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const expectedId = 'dc140963-b508-42a7-9f5d-452b3fb6a5ef';

function browser({storage = new Map(), native = false, secure = true, entropy = true, blocked = false, endpoint, fetchImpl} = {}) {
  const dom = new JSDOM('<!doctype html><html><body><section id="startup-panel" data-startup-state="loading"><h1>Opening Antarctic Kingdoms…</h1></section><div id="root">Existing game</div></body></html>', {url:'https://example.test/play/?room=PRIVATE',runScripts:'outside-only'});
  const w = dom.window, calls = [];
  Object.defineProperty(w, 'isSecureContext', {value:secure});
  Object.defineProperty(w, 'sessionStorage', {value:{
    getItem(key) {if (blocked) throw Error('Storage unavailable'); return storage.get(key) ?? null;},
    setItem(key,value) {if (blocked) throw Error('Storage unavailable'); storage.set(key,String(value));}
  }});
  Object.defineProperty(w, 'crypto', {value:entropy ? {randomUUID:()=>expectedId} : null});
  w.AbortController = AbortController;
  if (native) w.Android = {};
  const script = w.document.createElement('script');
  if (endpoint !== undefined) script.dataset.metricsEndpoint = endpoint;
  Object.defineProperty(w.document, 'currentScript', {value:script});
  w.fetch = async (url,options) => {calls.push({url,options}); return fetchImpl ? fetchImpl(url,options) : {ok:true};};
  w.localStorage.setItem('account.fixture', 'PRIVATE_ACCOUNT');
  w.document.cookie = 'session=PRIVATE_COOKIE';
  w.eval(source);
  return {dom,w,calls,storage,ready:async()=>{w.document.querySelector('#startup-panel').dataset.startupState='ready';await tick();}};
}

test('ready startup sends one anonymous request without account, room, cookie or URL data', async () => {
  const b = browser();
  try {
    assert.equal(b.calls.length,0);
    await b.ready(); await b.ready();
    b.w.document.querySelector('#root').append(' still playing'); await tick();
    assert.equal(b.calls.length,1);
    const {url,options} = b.calls[0];
    assert.equal(url,'https://articweb3.onrender.com/arctic-play/v3/launch/visit');
    assert.deepEqual(JSON.parse(options.body),{sessionId:expectedId});
    assert.equal(options.method,'POST'); assert.equal(options.credentials,'omit');
    assert.equal(options.referrerPolicy,'no-referrer'); assert.equal(options.redirect,'error');
    assert.equal(options.cache,'no-store'); assert.ok(options.signal);
    assert.equal(/PRIVATE|room|account|cookie/i.test(options.body),false);
  } finally {b.dom.window.close();}
});

test('session identity survives reload without suppressing a later daily/cohort server check', async () => {
  const storage = new Map();
  const first = browser({storage}); await first.ready();
  const id = JSON.parse(first.calls[0].options.body).sessionId; first.dom.window.close();
  const second = browser({storage});
  try {
    await second.ready(); assert.equal(second.calls.length,1);
    assert.equal(JSON.parse(second.calls[0].options.body).sessionId,id);
    assert.equal(storage.size,1,'Do not store a permanent counted flag');
  } finally {second.dom.window.close();}
});

test('native, insecure, no entropy, blocked storage and unsafe endpoints do not track', async () => {
  for (const options of [{native:true},{secure:false},{entropy:false},{blocked:true},{endpoint:'http://example.test/visit'},{endpoint:'https://name:secret@example.test/visit'},{endpoint:'https://example.test/visit?secret=x'},{endpoint:'not a URL'}]) {
    const b = browser(options);
    try {await b.ready(); assert.equal(b.calls.length,0,JSON.stringify(options));}
    finally {b.dom.window.close();}
  }
});

test('404/CORS/network failures and synchronous fetch errors never change or block gameplay', async () => {
  for (const fetchImpl of [async()=>({ok:false,status:404}),async()=>{throw TypeError('CORS blocked');},()=>{throw Error('Network failure');}]) {
    const b = browser({fetchImpl});
    try {
      const before = b.w.document.querySelector('#root').innerHTML;
      await b.ready(); await tick();
      assert.equal(b.calls.length,1); assert.equal(b.w.document.querySelector('#root').innerHTML,before);
      assert.equal(b.w.document.querySelector('#startup-panel').dataset.startupState,'ready');
      assert.equal(b.w.document.querySelector('[role=alert]'),null);
    } finally {b.dom.window.close();}
  }
});
