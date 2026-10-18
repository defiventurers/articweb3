import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);
const updates=require('../build/updates.cjs');
const {APP_VERSION,APP_VERSION_CODE,PACKAGE_NAME,DOWNLOAD_ROOT,UPDATE_FEED_URL,validateRelease,installedVersion,fetchLatestRelease,releaseStatus,openReleaseDownload}=updates;
const fixture=(versionName='1.5.0',versionCode=6)=>({schemaVersion:1,packageName:PACKAGE_NAME,versionName,versionCode,downloadUrl:DOWNLOAD_ROOT+`ArcticPlay-v${versionName}.apk`,sizeBytes:9000000,sha256:'a'.repeat(64),publishedAt:'2026-10-12T16:00:00Z',releaseNotes:['Better phone gameplay.']});

test('Update decisions use the actual installed version code and never offer a downgrade',()=>{
  const native={getAppInfo:()=>JSON.stringify({packageName:PACKAGE_NAME,versionName:'1.9.0',versionCode:10})};
  const installed=installedVersion(native);
  assert.equal(releaseStatus(fixture('1.10.0',11),installed),'available');
  assert.equal(releaseStatus(fixture('1.9.0',10),installed),'current');
  assert.equal(releaseStatus(fixture('1.8.0',9),installed),'current');
  assert.throws(()=>openReleaseDownload(fixture('1.8.0',9),installed,{}),/older/);
  assert.throws(()=>openReleaseDownload(fixture('1.8.0',10),installed,{}),/do not match/);
  assert.equal(installedVersion({getAppInfo:()=>'{broken'}).versionCode,APP_VERSION_CODE);
  assert.equal(installedVersion({getAppInfo:()=>JSON.stringify({...installed,packageName:'other.app'})}).versionName,APP_VERSION);
});

test('Update metadata rejects other apps, untrusted URLs, missing hashes and malformed versions',()=>{
  assert.equal(validateRelease(fixture()).versionCode,6);
  for(const change of [{packageName:'another.app'},{downloadUrl:'javascript:alert(1)'},{downloadUrl:DOWNLOAD_ROOT+'../../evil.apk'},{downloadUrl:DOWNLOAD_ROOT+'ArcticPlay-v1.5.0.apk?source=bad'},{downloadUrl:'http://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/ArcticPlay-v1.5.0.apk'},{versionCode:1.5},{versionCode:-1},{versionName:'1.5'},{sha256:''},{sizeBytes:200*1048576},{releaseNotes:['x'.repeat(301)]},{publishedAt:'unknown'}])assert.throws(()=>validateRelease({...fixture(),...change}));
});

test('Update checks bypass caches, handle service/JSON failures, time out and cancel',async()=>{
  const latest=await fetchLatestRelease({fetchImpl:async(url,options)=>{assert.ok(url.startsWith(UPDATE_FEED_URL+'?check='));assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');return {ok:true,json:async()=>fixture()};}});
  assert.equal(latest.versionName,'1.5.0');
  await assert.rejects(fetchLatestRelease({fetchImpl:async()=>({ok:false})}),/unavailable/);
  await assert.rejects(fetchLatestRelease({fetchImpl:async()=>{throw new TypeError('offline');}}),/internet connection/);
  await assert.rejects(fetchLatestRelease({fetchImpl:async()=>({ok:true,json:async()=>{throw new SyntaxError('bad json');}})}),/update service/);
  const untilAbort=async(url,{signal})=>new Promise((resolve,reject)=>{if(signal.aborted)reject(new Error('cancelled'));else signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});});
  await assert.rejects(fetchLatestRelease({fetchImpl:untilAbort,timeoutMs:5}),/timed out/);
  const controller=new AbortController();controller.abort();await assert.rejects(fetchLatestRelease({fetchImpl:untilAbort,signal:controller.signal}),/cancelled/);
});

test('One download tap hands the exact trusted APK to Android or the browser',()=>{
  const calls=[];
  openReleaseDownload(fixture(),{versionName:APP_VERSION,versionCode:APP_VERSION_CODE},{Android:{downloadUpdate:url=>{calls.push(url);return true;}}});
  assert.deepEqual(calls,[fixture().downloadUrl]);
  openReleaseDownload(fixture(),undefined,{location:{assign:url=>calls.push(url)}});
  assert.equal(calls.length,2);
  assert.throws(()=>openReleaseDownload(fixture(),undefined,{Android:{downloadUpdate:()=>false}}),/Could not open/);
});

test('Phone update screen: automatically check, retry offline, download once and keep saved data',{timeout:15000},async()=>{
  const {JSDOM,VirtualConsole}=createRequire(new URL('../../../frontend/package.json',import.meta.url))('jsdom');
  const errors=[],downloads=[];let response='available';
  const virtual=new VirtualConsole();virtual.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:virtual,beforeParse(window){
    window.crypto.randomUUID=randomUUID;window.AbortController=globalThis.AbortController;
    window.fetch=async()=>{if(response==='offline')throw new TypeError('offline');return {ok:true,json:async()=>response==='current'?fixture(APP_VERSION,APP_VERSION_CODE):fixture()};};
    window.Android={setDarkTheme(){},appReady(){},getAppInfo:()=>JSON.stringify({packageName:PACKAGE_NAME,versionName:APP_VERSION,versionCode:APP_VERSION_CODE}),downloadUpdate:url=>{downloads.push(url);return true;}};
    window.HTMLElement.prototype.scrollIntoView=function(){};
    window.localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'kept',name:'Update Tester',avatar:'blue'}));
  }});
  const {window}=dom,doc=window.document;
  const waitFor=async predicate=>{const deadline=Date.now()+4000;while(!predicate()){if(Date.now()>deadline)throw new Error('Update UI timed out');await new Promise(resolve=>setTimeout(resolve,15));}};
  const button=text=>[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
  try{
    window.eval(fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8'));
    await waitFor(()=>button('Profile'));button('Profile').click();await waitFor(()=>doc.querySelector('.profile-options'));
    const profileBefore=window.localStorage.getItem('arctic-play.v1.profile');
    const open=()=>[...doc.querySelectorAll('.profile-options button')].find(b=>b.textContent.includes('App updates')).click();
    open();await waitFor(()=>button('Download update'));assert.match(doc.querySelector('.update-details').textContent,/1\.4\.0/);button('Download update').click();await waitFor(()=>doc.querySelector('.update-download-note'));assert.deepEqual(downloads,[fixture().downloadUrl]);
    response='offline';button('Check for updates').click();await waitFor(()=>button('Retry update check'));assert.ok(doc.querySelector('[role="alert"]'));assert.equal(button('Download update'),undefined,'a failed check cannot retain an outdated download target');
    response='current';button('Retry update check').click();await waitFor(()=>button('Download latest APK'));assert.match(doc.querySelector('.update-status').textContent,/up to date/);
    window.arcticBack();await waitFor(()=>!doc.querySelector('.app-updates'));assert.ok(doc.querySelector('.profile-card'));
    assert.equal(window.localStorage.getItem('arctic-play.v1.profile'),profileBefore);assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
});
