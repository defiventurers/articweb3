import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {secureUuid} from '../src/uuid.js';
const require=createRequire(new URL('../build-deps/package.json',import.meta.url)),{JSDOM,VirtualConsole,requestInterceptor}=require('jsdom');
const assets=new URL('../android/app/src/main/assets/',import.meta.url);
const html=()=>fs.readFileSync(new URL('index.html',assets),'utf8');
async function waitFor(fn){const until=Date.now()+10000;while(!fn()){if(Date.now()>until)throw Error('The packaged app did not reach its expected startup screen.');await new Promise(r=>setTimeout(r,20));}}

test('UUID fallback uses secure random bytes with the required v4 version and variant',()=>{
 let calls=0;const source={getRandomValues(bytes){calls++;bytes.fill(255);return bytes;}};
 assert.equal(secureUuid(source),'ffffffff-ffff-4fff-bfff-ffffffffffff');assert.equal(calls,1);
 const ids=new Set(Array.from({length:1000},()=>secureUuid({getRandomValues:bytes=>webcrypto.getRandomValues(bytes)})));
 assert.equal(ids.size,1000);for(const id of ids)assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
test('Native UUID support is retained and missing secure entropy never falls back to Math.random',()=>{
 assert.equal(secureUuid({randomUUID:()=> 'native-id',getRandomValues(){throw Error('Should not run');}}),'native-id');
 assert.throws(()=>secureUuid({}),/Secure random numbers/);
});

async function packagedApp(t,{saved=false,missingScript=false,noEntropy=false,nativeUuid=false,legacy=false,ownerSession=false}={}){
 const requested=[],network=[],errors=[];
 const localAssets=requestInterceptor(request=>{
   const url=request.url;
   requested.push(url);const u=new URL(url);
   assert.equal(u.origin,'https://appassets.androidplatform.net');assert.ok(u.pathname.startsWith('/assets/'));
   const file=u.pathname.slice('/assets/'.length);assert.ok(!file.includes('..'));
   if(missingScript&&file==='app.js')return new Response('Fixture: unavailable application script',{status:404});
   return new Response(fs.readFileSync(new URL(file,assets)),{headers:{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'}});
 });
 const virtual=new VirtualConsole();virtual.on('jsdomError',e=>errors.push(e));
 const profile={id:'75fd76d1-c16d-460b-a3a7-ce94ae7d50fb',name:'Saved Player',avatar:'green'},practice={fixture:'saved practice must remain unchanged'};
 const dom=new JSDOM(html(),{url:'https://appassets.androidplatform.net/assets/index.html',resources:{interceptors:[localAssets]},runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:virtual,beforeParse(w){
  Object.defineProperty(w.crypto,'randomUUID',{value:undefined,configurable:true});
  if(noEntropy)Object.defineProperty(w.crypto,'getRandomValues',{value:undefined,configurable:true});
  if(nativeUuid)w.Android={newUuid:()=>webcrypto.randomUUID(),setDarkTheme(){}};
  if(ownerSession)w.Android={...w.Android,getCloudSession:()=>JSON.stringify({ownerRecovery:'AK-OWNER-invalid-fixture'}),setDarkTheme(){}};
  if(legacy){w.Object.hasOwn=undefined;w.Array.prototype.at=undefined;}
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.WebSocket=undefined;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.fetch=async url=>{network.push(String(url));return {ok:false,json:async()=>({error:'Offline fixture'})};};
  if(saved){w.localStorage.setItem('arctic-play.v1.profile',JSON.stringify(profile));w.localStorage.setItem('arctic-play.v1.theme','"light"');w.localStorage.setItem('arctic-play.v1.practice.sanyou',JSON.stringify(practice));}
 }});t.after(()=>dom.window.close());
 return {dom,w:dom.window,doc:dom.window.document,profile,practice,requested,network,errors};
}
test('The real packaged HTML starts without crypto.randomUUID and reaches recovery entry',async t=>{
 const {w,doc,requested,network}=await packagedApp(t);
 await waitFor(()=>doc.querySelector('[data-testid=antarctic-visa]'));
 await waitFor(()=>doc.querySelector('#startup-panel').hidden);
 assert.equal(typeof w.crypto.randomUUID,'undefined');
 await waitFor(()=>network.includes('game-assets.json'));
 assert.ok(doc.querySelector('[data-testid=antarctic-visa]'));
 const profile=JSON.parse(w.localStorage.getItem('arctic-play.v1.profile'));assert.match(profile.id,/^[a-f0-9-]{36}$/);
 assert.equal(doc.querySelector('#startup-panel').getAttribute('data-startup-state'),'ready');
 assert.ok(requested.indexOf('https://appassets.androidplatform.net/assets/startup.js')<requested.indexOf('https://appassets.androidplatform.net/assets/app.js'));
 const recovery=[...doc.querySelectorAll('button')].find(b=>b.textContent.includes('Use a recovery code'));assert.ok(recovery);recovery.click();await waitFor(()=>doc.querySelector('#entry-recovery'));
});
test('An existing light-mode profile and saved San You Qi data survive startup without UUID support',async t=>{
 const {w,doc,profile,practice}=await packagedApp(t,{saved:true});await waitFor(()=>doc.querySelector('[data-testid=antarctic-visa]'));await waitFor(()=>doc.querySelector('#startup-panel').hidden);
 assert.deepEqual(JSON.parse(w.localStorage.getItem('arctic-play.v1.profile')),profile);
 assert.deepEqual(JSON.parse(w.localStorage.getItem('arctic-play.v1.practice.sanyou')),practice);assert.equal(doc.documentElement.dataset.theme,'light');
});
test('A missing application bundle displays a retry screen and keeps saved data',async t=>{
 const {w,doc,profile}=await packagedApp(t,{saved:true,missingScript:true});await waitFor(()=>doc.querySelector('#startup-panel').getAttribute('data-startup-state')==='failed');
 assert.equal(doc.querySelector('#startup-panel').hidden,false);assert.equal(doc.querySelector('#startup-retry').hidden,false);assert.equal(doc.querySelector('#startup-panel').getAttribute('role'),'alert');
 assert.deepEqual(JSON.parse(w.localStorage.getItem('arctic-play.v1.profile')),profile);
});
test('A fatal first-render error is caught by the startup boundary instead of leaving an empty background',async t=>{
 const {doc}=await packagedApp(t,{noEntropy:true});await waitFor(()=>doc.querySelector('#startup-panel').getAttribute('data-startup-state')==='failed');assert.equal(doc.querySelector('#startup-retry').hidden,false);assert.equal(doc.querySelector('#startup-panel').hidden,false);
});
test('The native secure UUID bridge starts the app even when both Web Crypto UUID and entropy APIs are unavailable',async t=>{
 const {doc}=await packagedApp(t,{noEntropy:true,nativeUuid:true,legacy:true});await waitFor(()=>doc.querySelector('[data-testid=antarctic-visa]'));await waitFor(()=>doc.querySelector('#startup-panel').hidden);
});
test('A successfully mounted app clears an earlier startup failure instead of remaining covered by the retry screen',async t=>{
 const {w,doc}=await packagedApp(t);await waitFor(()=>doc.querySelector('[data-testid=antarctic-visa]'));w.ArcticStartup.fail(Error('temporary startup event'));assert.equal(doc.querySelector('#startup-panel').hidden,false);w.ArcticStartup.ready();assert.equal(doc.querySelector('#startup-panel').hidden,true);
});
test('An owner-only restored session with absent entitlement cache reaches login without a startup error',async t=>{
 const {w,doc,profile,practice,errors}=await packagedApp(t,{ownerSession:true,saved:true,nativeUuid:true,legacy:true});
 await waitFor(()=>doc.querySelector('[data-testid=antarctic-visa]'));
 await waitFor(()=>doc.querySelector('#startup-panel').hidden);
 assert.equal(doc.querySelector('#startup-details'),null);
 assert.equal(doc.querySelector('#startup-panel').getAttribute('data-startup-state'),'ready');
 // This deliberately invalid fixture must never bypass owner verification.
 assert.equal(doc.querySelector('.home-landing'),null);
 assert.deepEqual(JSON.parse(w.localStorage.getItem('arctic-play.v1.profile')),profile);
 assert.deepEqual(JSON.parse(w.localStorage.getItem('arctic-play.v1.practice.sanyou')),practice);
 assert.equal(w.localStorage.getItem('arctic-play.v1.cloud-entitlements'),null);
 assert.deepEqual(errors,[]);
});
