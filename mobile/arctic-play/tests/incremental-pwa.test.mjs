import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
const require = createRequire(new URL('../build-deps/package.json',import.meta.url));
const {JSDOM} = require('jsdom');
const swSource = await fs.readFile(new URL('../src/pwa-game-assets-sw.js',import.meta.url),'utf8');
const controls = await fs.readFile(new URL('../src/pwa-tools.js',import.meta.url),'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');

function worker({badFile=null}={}) {
  const listeners = new Map(), stores = new Map(), calls = [], requestOptions = [];
  const bodies = new Map([['index.html','<h1>Approved startup</h1>'],['app.js','window.release="one"'],['art/board.webp','public artwork']]);
  const config = {id:'release-one',shell:['index.html','app.js'],files:[...bodies].map(([url,body])=>({url,sha256:sha256(body)}))};
  const scope = 'https://example.test/play/';
  const self = {registration:{scope},addEventListener:(name,fn)=>listeners.set(name,fn),skipWaiting:()=>{throw Error('Must not interrupt an open game');},clients:{claim:()=>{throw Error('Must not replace active client');}}};
  const caches = {
    open:async name=>{
      if (!stores.has(name)) stores.set(name,new Map());
      const store = stores.get(name);
      return {match:async key=>store.get(String(key))?.clone(),put:async(key,response)=>{store.set(String(key),response.clone());}};
    },
    keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name)
  };
  const fetch = async (url,options)=>{
    calls.push(url); requestOptions.push(options); const relative=String(url).slice(scope.length);
    return new Response(relative===badFile?'changed mid-deploy':bodies.get(relative),{status:bodies.has(relative)?200:404});
  };
  vm.runInNewContext(swSource.replace('__AK_WEB_BUILD__',JSON.stringify(config)),{self,caches,fetch,crypto:webcrypto,URL,Map,Set,Uint8Array,Promise,Error});
  return {
    stores,calls,requestOptions,listeners,caches,
    event:async(name,data={})=>{let promise;listeners.get(name)({...data,waitUntil:value=>{promise=value;}});await promise;},
    get:async(url,{mode='cors',method='GET',range=false}={})=>{
      let promise;listeners.get('fetch')({request:{url,mode,method,headers:new Headers(range?{range:'bytes=0-3'}:{})},respondWith:value=>{promise=value;}});return promise ? await promise : null;
    }
  };
}

test('offline navigation and workers use one verified shell, while private/API traffic bypasses caching',async()=>{
  const w=worker(); await w.event('install'); await w.event('activate');
  assert.ok(w.requestOptions.every(options=>options.credentials==='same-origin'&&options.redirect==='error'&&options.cache==='no-store'));
  const callCount=w.calls.length;
  assert.equal(await (await w.get('https://example.test/play/?room=ABC123',{mode:'navigate'})).text(),'<h1>Approved startup</h1>');
  assert.equal(await (await w.get('https://example.test/play/app.js')).text(),'window.release="one"');
  assert.equal(w.calls.length,callCount);
  for (const url of ['https://example.test/play/api/passport','https://example.test/api/users','https://example.test/play/art/private.webp','https://example.test/play/art/board.webp?token=private','https://elsewhere.test/play/app.js']) assert.equal(await w.get(url),null,url);
  assert.equal(await w.get('https://example.test/play/app.js',{method:'POST'}),null);
  assert.equal(await w.get('https://example.test/play/art/board.webp',{range:true}),null);
});

test('a mixed-version deployment cannot install a partial shell or delete an existing release',async()=>{
  const w=worker({badFile:'app.js'});w.stores.set('previous-complete-release',new Map());
  await assert.rejects(w.event('install'),/changed during update/);
  assert.deepEqual([...w.stores.keys()],['previous-complete-release']);
});

test('art warming ignores arbitrary URLs and rejects changed public bytes',async()=>{
  const w=worker({badFile:'art/board.webp'});await w.event('install');
  await w.event('message',{data:{type:'WARM_GAME_ASSETS',urls:['art/board.webp','api/passport','https://elsewhere.test/secret']}});
  assert.equal(w.calls.filter(url=>url.includes('secret')||url.includes('passport')).length,0);
  const artStore=[...w.stores].find(([name])=>name.endsWith('-art'))?.[1];
  assert.equal(artStore.size,0);
});

test('cache cleanup stays inside this app scope; updates never force a running board to reload',async()=>{
  const w=worker();w.stores.set('ak-inc-v1-%2Fplay%2F-old-shell',new Map());w.stores.set('ak-inc-v1-%2Fother%2F-old-shell',new Map());
  await w.event('install');await w.event('activate');
  assert.equal(w.stores.has('ak-inc-v1-%2Fplay%2F-old-shell'),false);
  assert.equal(w.stores.has('ak-inc-v1-%2Fother%2F-old-shell'),true);
});

function browser({native=false}={}) {
  const dom=new JSDOM('<!doctype html><html><body><section id="startup-panel" data-startup-state="loading"><h1>Opening Antarctic Kingdoms…</h1></section><div id="root"><header class="lobby-header"><div class="header-controls"></div></header></div></body></html>',{url:'https://example.test/play/',runScripts:'outside-only'});
  dom.window.matchMedia=()=>({matches:false});if(native)dom.window.Android={};
  dom.window.eval(controls);return dom;
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('install controls wait for approved startup, attach to lobby only and preserve native UI',async()=>{
  const dom=browser(); const document=dom.window.document;
  assert.equal(document.querySelector('.ak-pwa-open'),null);
  document.querySelector('#startup-panel').dataset.startupState='ready';await tick();
  assert.equal(document.querySelectorAll('.header-controls .ak-pwa-open').length,1);
  assert.equal(document.querySelector('#startup-panel h1').textContent,'Opening Antarctic Kingdoms…');
  document.querySelector('#root').innerHTML='<div data-screen="match"><svg class="game-board"></svg></div>';await tick();
  assert.equal(document.querySelector('.ak-pwa-open'),null);
  dom.window.close();
  const native=browser({native:true});native.window.document.querySelector('#startup-panel').dataset.startupState='ready';await tick();
  assert.equal(native.window.document.querySelector('.ak-pwa-dialog'),null);native.window.close();
});

test('browser installation prompt remains optional and unsupported browsers receive honest instructions',async()=>{
  const dom=browser();const document=dom.window.document;document.querySelector('#startup-panel').dataset.startupState='ready';await tick();
  const dialog=document.querySelector('dialog');dialog.showModal=()=>dialog.setAttribute('open','');
  document.querySelector('.ak-pwa-open').click();
  assert.match(document.querySelector('.ak-pwa-guide').textContent,/if offered/);
  let prompted=0;const event=new dom.window.Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{prompted++;};event.userChoice=Promise.resolve({outcome:'dismissed'});dom.window.dispatchEvent(event);
  assert.equal(event.defaultPrevented,true);
  document.querySelector('.ak-pwa-install').click();await tick();assert.equal(prompted,1);
  assert.equal(document.querySelector('.ak-pwa-install').hidden,true);dom.window.close();
});

test('initial sign-in landing exposes installation after loading without changing its contents or adding a match control',async()=>{
  const dom=browser();const document=dom.window.document;
  const landing='<main class="passport-entry harbor-entry"><header class="passport-heading"><h1>Welcome to Lantern Harbor</h1></header><section class="passport-entry-card"><button id="signin">Get your Antarctic Passport</button></section></main>';
  document.querySelector('#root').innerHTML=landing;await tick();
  assert.equal(document.querySelector('.harbor-entry .ak-pwa-open'),null);
  document.querySelector('#startup-panel').dataset.startupState='ready';await tick();
  const action=document.querySelector('.harbor-entry>.ak-pwa-entry');
  assert.ok(action);assert.equal(action.getAttribute('aria-label'),'Install Antarctic Kingdoms');
  assert.equal(document.querySelector('#signin').textContent,'Get your Antarctic Passport');
  assert.equal(document.querySelector('.harbor-entry').getAttribute('style'),null);
  const dialog=document.querySelector('dialog');dialog.showModal=()=>dialog.setAttribute('open','');action.click();
  assert.equal(dialog.hasAttribute('open'),true);
  assert.match(document.querySelector('.ak-pwa-guide').textContent,/Install app or Add to Home screen/);
  document.querySelector('#root').innerHTML='<div data-screen="match"><svg class="game-board"></svg></div>';await tick();
  assert.equal(document.querySelector('.ak-pwa-open'),null);dom.window.close();
});
