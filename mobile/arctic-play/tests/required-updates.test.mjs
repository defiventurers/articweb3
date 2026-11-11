import {verifiedAccount} from './account-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),updates=require('../build/updates.cjs');
const {JSDOM,VirtualConsole}=createRequire(new URL('../build-deps/package.json',import.meta.url))('jsdom');
const {APP_VERSION,APP_VERSION_CODE,PACKAGE_NAME,DOWNLOAD_ROOT}=updates;
const future={schemaVersion:1,packageName:PACKAGE_NAME,versionName:'9.0.0',versionCode:APP_VERSION_CODE+1,downloadUrl:DOWNLOAD_ROOT+'ArcticPlay-v9.0.0.apk',sizeBytes:9000000,sha256:'a'.repeat(64),publishedAt:'2026-10-22T16:00:00Z',releaseNotes:['New tables and games.']};
const current={...future,versionName:APP_VERSION,versionCode:APP_VERSION_CODE,downloadUrl:DOWNLOAD_ROOT+`ArcticPlay-v${APP_VERSION}.apk`};
const script=fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8');
const wait=async fn=>{const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Required update UI timed out');await new Promise(r=>setTimeout(r,15));}};
function app({version=APP_VERSION,code=APP_VERSION_CODE,cache,reply=()=>future}={}){
 const errors=[],downloads=[],virtual=new VirtualConsole();virtual.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:virtual,beforeParse(w){
  w.WebSocket=undefined;w.crypto.randomUUID=randomUUID;w.AbortController=AbortController;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.fetch=async()=>{const value=reply();if(value instanceof Error)throw value;return {ok:true,json:async()=>value};};
  w.Android={setDarkTheme(){},appReady(){},getAppInfo:()=>JSON.stringify({packageName:PACKAGE_NAME,versionName:version,versionCode:code}),downloadUpdate:url=>{downloads.push(url);return true;}};
  w.localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'saved-player',name:'Saved Player',avatar:'green'}));
  if(cache)w.localStorage.setItem('arctic-play.v1.required-release',JSON.stringify(cache));
 }});verifiedAccount(dom.window,{fetchImpl:dom.window.fetch});dom.window.eval(script);return {dom,w:dom.window,doc:dom.window.document,errors,downloads};
}

test('A published newer APK blocks play, Back and Escape; downloading, offline retry and stale feeds cannot unlock it',async()=>{
 let response=future;const {dom,w,doc,errors,downloads}=app({reply:()=>response});
 const button=text=>[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
 try{
  await wait(()=>doc.querySelector('[role="alertdialog"]'));assert.match(doc.querySelector('h1').textContent,/Update to continue/);
  assert.equal(doc.querySelector('.bottom-nav'),null);assert.equal(doc.querySelectorAll('[data-cell]').length,0);
  assert.equal(doc.querySelector('[aria-label="Close"]'),null);
  assert.equal(w.arcticBack(),true);w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(doc.querySelector('[role="alertdialog"]'));
  const profile=w.localStorage.getItem('arctic-play.v1.profile');button('Download update').click();await wait(()=>doc.querySelector('.update-download-note'));assert.deepEqual(downloads,[future.downloadUrl]);assert.ok(doc.querySelector('[role="alertdialog"]'));
  response=new TypeError('offline');button('Check again').click();await wait(()=>doc.querySelector('[role="alert"]'));assert.ok(button('Download update'));assert.ok(doc.querySelector('[role="alertdialog"]'));
  response=current;button('Check again').click();await wait(()=>!button('Checking…'));assert.ok(doc.querySelector('[role="alertdialog"]'),'a rolled-back feed cannot unlock the known required version');
  assert.equal(JSON.parse(w.localStorage.getItem('arctic-play.v1.required-release')).versionCode,future.versionCode);
  assert.equal(w.localStorage.getItem('arctic-play.v1.profile'),profile);assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

test('Known required updates survive offline relaunch; only an actually updated native version restores play',async()=>{
 const blocked=app({cache:future,reply:()=>new TypeError('offline')});
 try{await wait(()=>blocked.doc.querySelector('[role="alertdialog"]'));assert.equal(blocked.doc.querySelector('.bottom-nav'),null);}finally{blocked.dom.window.close();}
 const installed=app({version:future.versionName,code:future.versionCode,cache:future,reply:()=>future});
 try{await wait(()=>installed.doc.querySelector('.bottom-nav'));assert.equal(installed.doc.querySelector('[role="alertdialog"]'),null);assert.equal(JSON.parse(installed.w.localStorage.getItem('arctic-play.v1.profile')).name,'Saved Player');assert.deepEqual(installed.errors,[]);}finally{installed.dom.window.close();}
});

test('Top-right night mode persists; the update shortcut opens the working update screen',async()=>{
 const {dom,w,doc,errors}=app({reply:()=>current});
 try{
  await wait(()=>doc.querySelector('[aria-label="Night mode"]'));const toggle=doc.querySelector('[aria-label="Night mode"]');assert.equal(toggle.getAttribute('aria-checked'),'true');toggle.click();await wait(()=>doc.documentElement.dataset.theme==='light');assert.equal(JSON.parse(w.localStorage.getItem('arctic-play.v1.theme')),'light');
  doc.querySelector('[aria-label="App updates"]').click();await wait(()=>doc.querySelector('.app-updates'));await wait(()=>[...doc.querySelectorAll('button')].some(b=>b.textContent==='Download latest APK'));assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});
