import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {workerResponse} from './worker-helper.mjs';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url)),{JSDOM,VirtualConsole}=require('jsdom');
const script=fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8');
const settle=()=>new Promise(r=>setTimeout(r,35));

test('Owner logout clears the active credential, keeps saved boards and accepts recovery again offline',{skip:!process.env.AK_TEST_OWNER_CODE_FILE,timeout:30000},async t=>{
 const code=fs.readFileSync(process.env.AK_TEST_OWNER_CODE_FILE,'utf8').trim(),vault={value:JSON.stringify({ownerRecovery:code})},errors=[],requests=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});Object.defineProperty(w.navigator,'onLine',{get:()=>false});w.WebSocket=undefined;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.Android={getCloudSession:()=>vault.value,setCloudSession:value=>{vault.value=value;return true;},setDarkTheme(){}};w.fetch=async url=>{requests.push(String(url));return{ok:false,json:async()=>({error:'Offline fixture'})};};w.localStorage.setItem('arctic-play.v1.practice.sanyou','{"saved":"board-to-keep"}');
 }});t.after(()=>dom.window.close());const w=dom.window,doc=w.document;w.eval(script);await waitFor(()=>doc.querySelector('.home-landing'));
 const button=text=>[...doc.querySelectorAll('button')].find(n=>n.textContent.trim()===text);
 button('Profile').click();await waitFor(()=>doc.querySelector('.profile-logout-pill'));doc.querySelector('.profile-logout-pill').click();await waitFor(()=>doc.querySelector('.logout-panel'));doc.querySelector('.logout-panel .primary').click();await waitFor(()=>!doc.querySelector('.bottom-nav')&&doc.querySelector('.av-screen'));
 assert.equal(JSON.parse(vault.value),null);assert.equal(w.localStorage.getItem('arctic-play.v1.practice.sanyou'),'{"saved":"board-to-keep"}');
 button('Already an explorer? Use a recovery code').click();await waitFor(()=>doc.querySelector('#entry-recovery'));const input=doc.querySelector('#entry-recovery');Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(input,code);input.dispatchEvent(new w.Event('input',{bubbles:true}));await settle();doc.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>doc.querySelector('.home-landing'));
 assert.ok(JSON.parse(vault.value).ownerRecovery===code,'The existing private owner recovery credential is restored');assert.equal(requests.filter(url=>url.endsWith('/recover')).length,0);assert.deepEqual(errors,[]);
});
async function waitFor(fn){const until=Date.now()+10000;while(!fn()){if(Date.now()>until)throw Error('Owner entry did not reach the expected screen.');await settle();}}
test('Owner recovery opens every hall offline, persists securely, and edited positions apply without changing the saved game',{skip:!process.env.AK_TEST_OWNER_CODE_FILE,timeout:30000},async t=>{
 const code=fs.readFileSync(process.env.AK_TEST_OWNER_CODE_FILE,'utf8').trim(),requests=[],errors=[],vault={value:'null'},console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w.crypto,'randomUUID',{value:undefined,configurable:true});Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});
  Object.defineProperty(w.navigator,'onLine',{get:()=>false});w.WebSocket=undefined;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.Android={getCloudSession:()=>vault.value,setCloudSession:v=>{vault.value=v;return true;},setDarkTheme(){}};
  w.fetch=async url=>{requests.push(String(url));return {ok:false,json:async()=>({error:'Offline test'})};};
  w.Worker=class{postMessage(data){setTimeout(()=>{try{this.onmessage?.({data:workerResponse(data)});}catch(e){this.onmessage?.({data:{requestId:data.requestId,error:e.message}});}},0);}terminate(){}};
 }});t.after(()=>dom.window.close());const w=dom.window,doc=w.document;w.eval(script);await settle();
 const button=text=>{const b=[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()===text);assert.ok(b,'Missing control: '+text);return b;};
 function fill(selector,value){const n=doc.querySelector(selector);assert.ok(n);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(n,value);n.dispatchEvent(new w.Event('input',{bubbles:true}));n.dispatchEvent(new w.Event('change',{bubbles:true}));}
 button('Already an explorer? Use a recovery code').click();await settle();fill('#entry-recovery','AK-OWNER-'+Array(8).fill('000000').join('-'));await settle();doc.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>doc.querySelector('[role=alert]'));assert.equal(doc.querySelector('.bottom-nav'),null);
 fill('#entry-recovery',code);await settle();doc.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>doc.querySelector('.home-landing'));assert.equal(JSON.parse(vault.value).ownerRecovery,code);assert.equal(requests.filter(s=>s.endsWith('/recover')).length,0);
 button('Games').click();await settle();assert.equal(doc.querySelectorAll('.game-card').length,7);assert.equal(doc.querySelectorAll('.hall-card[data-access=locked]').length,0);
 doc.querySelector('[aria-label="Play San You Qi"]').click();await settle();button('On this phonePass the phone between players').click();await waitFor(()=>doc.querySelectorAll('[data-cell]').length===156);await waitFor(()=>doc.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.');
 const central=doc.querySelectorAll('.game-board [data-cell^="C"]');assert.equal(central.length,21);assert.equal(doc.querySelectorAll('.game-board .sanyou-center-point').length,0);
 for(const id of ['C8','C12','C14','C18','C20','C22','C24']){const cell=doc.querySelector('.game-board [data-cell="'+id+'"]');assert.ok(cell,'Missing playable central point '+id);assert.equal(cell.getAttribute('role'),'button');assert.equal(cell.querySelector('circle').getAttribute('fill'),'transparent');}
 const before=w.localStorage.getItem('arctic-play.v1.practice.sanyou');doc.querySelector('[aria-label="Match options"]').click();await settle();button('Board positionsAdjust points or import your web editor file').click();await waitFor(()=>doc.querySelector('.board-calibrator'));fill('[aria-label="X position"]','442.5');await settle();button('Apply to my app · Unsaved').click();await settle();assert.match(doc.querySelector('.cal-status').textContent,/Applied/);button('Back to game').click();await settle();assert.equal(w.localStorage.getItem('arctic-play.v1.practice.sanyou'),before);
 const cell=doc.querySelector('[data-cell="red:L1-1"]');assert.equal(Number(cell.querySelector('circle').getAttribute('cx')),442.5);assert.match(doc.querySelector('.game-board image').getAttribute('href'),/sanyou-ice-white-v2.png$/);
 w.dispatchEvent(new w.Event('offline'));await settle();assert.ok(doc.querySelector('.match-header'));assert.deepEqual(errors,[]);
});

test('A securely restored owner-only session reopens all halls offline without an entitlement cache',{skip:!process.env.AK_TEST_OWNER_CODE_FILE,timeout:30000},async t=>{
 const code=fs.readFileSync(process.env.AK_TEST_OWNER_CODE_FILE,'utf8').trim(),vault=JSON.stringify({ownerRecovery:code}),requests=[],errors=[];
 const profile={id:'75fd76d1-c16d-460b-a3a7-ce94ae7d50fb',name:'Saved Player',avatar:'green'},savedPractice=JSON.stringify({fixture:'previous saved game'});
 const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
  Object.defineProperty(w.crypto,'randomUUID',{value:undefined,configurable:true});Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});
  Object.defineProperty(w.navigator,'onLine',{get:()=>false});w.WebSocket=undefined;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.Android={getCloudSession:()=>vault,setCloudSession(){throw Error('Startup must not rewrite the existing owner session.');},setDarkTheme(){}};
  w.fetch=async url=>{requests.push(String(url));return {ok:false,json:async()=>({error:'Offline test'})};};
  w.localStorage.setItem('arctic-play.v1.profile',JSON.stringify(profile));w.localStorage.setItem('arctic-play.v1.practice.sanyou',savedPractice);
 }});t.after(()=>dom.window.close());const w=dom.window,doc=w.document;
 w.eval(script);await waitFor(()=>doc.querySelector('.home-landing'));
 const games=[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()==='Games');assert.ok(games);games.click();await waitFor(()=>doc.querySelectorAll('.game-card').length===7);
 assert.equal(doc.querySelectorAll('.hall-card[data-access=locked]').length,0);
 assert.equal(doc.querySelector('.account-entry'),null);
 assert.equal(w.localStorage.getItem('arctic-play.v1.cloud-entitlements'),null);
 assert.deepEqual(JSON.parse(w.localStorage.getItem('arctic-play.v1.profile')),profile);
 assert.equal(w.localStorage.getItem('arctic-play.v1.practice.sanyou'),savedPractice);
 assert.equal(w.Android.getCloudSession(),vault);assert.equal(requests.filter(s=>s.endsWith('/recover')).length,0);
 assert.deepEqual(errors,[]);
});
