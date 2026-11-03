import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
const {JSDOM,VirtualConsole}=createRequire(new URL('../build-deps/package.json',import.meta.url))('jsdom');
const bundle=fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8');
async function wait(fn){const until=Date.now()+8000;while(!fn()){if(Date.now()>until)throw Error('Sign-in state timed out');await new Promise(r=>setTimeout(r,10));}}
function fixture(t,{providerFails=true,exchangeFails=false}={}){
 const calls=[],errors=[];let opened=null,session=null,exchange=0;
 const virtual=new VirtualConsole();virtual.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:virtual,beforeParse(w){
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w,'crypto',{value:webcrypto});w.WebSocket=undefined;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.Android={getCloudSession:()=>session,setCloudSession:v=>{session=v;return true;},openAuth:url=>{opened=url;return true;},setDarkTheme(){}};
  w.fetch=async(input,options={})=>{const path=new URL(input).pathname.split('/v3')[1];calls.push(path);const ok=value=>({ok:true,json:async()=>value});
   if(path==='/auth/providers'){if(providerFails)throw Error('Network timeout');return ok({google:true,email:false});}
   if(path==='/auth/privy/config')return ok({enabled:false});
   if(path==='/auth/google/start'){const b=JSON.parse(options.body);assert.equal(b.platform,'android');assert.match(b.challenge,/^[\w-]{43}$/);return ok({url:'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'});}
   if(path==='/auth/exchange'){exchange++;await new Promise(r=>setTimeout(r,30));if(exchangeFails)return {ok:false,status:401,json:async()=>({error:'This sign-in belongs to another app session.'})};return ok({accountId:'11111111-1111-4111-8111-111111111111',session:'test-session',displayName:'Explorer',marketingChoiceNeeded:false});}
   if(path==='/progress')return ok({progress:{}});
   if(path==='/account')return ok({entitlements:{}});
   if(path==='/passport')return ok({passport:null,identity:{displayName:'Explorer'}});
   if(path==='/play-access')return ok({accountId:'11111111-1111-4111-8111-111111111111',online:true,leaseSeconds:60});
   throw Error('Offline fixture: '+path);
  };
 }});t.after(()=>dom.window.close());dom.window.eval(bundle);return {w:dom.window,calls,errors,get opened(){return opened;},get session(){return session;},get exchanges(){return exchange;}};
}
test('Google opens after provider-check failure and duplicate native callbacks redeem only once',async t=>{
 const f=fixture(t),d=f.w.document;await wait(()=>d.querySelector('.cv-google'));await wait(()=>d.body.textContent.includes('Couldn’t check sign-in'));
 const google=d.querySelector('.cv-google');assert.equal(google.disabled,false);google.click();await wait(()=>f.opened);
 const handoff=JSON.parse(f.w.localStorage.getItem('arctic-play.v1.auth-handoff'));assert.match(handoff.verifier,/^[\w-]{43}$/);
 await Promise.all([f.w.arcticAuth('t'.repeat(43)),f.w.arcticAuth('t'.repeat(43))]);await wait(()=>d.querySelector('#cv-name'));
 assert.equal(f.exchanges,1);assert.equal(JSON.parse(f.session).displayName,'Explorer');assert.deepEqual(f.errors,[]);
});
test('callback failure is shown on welcome and Google remains retryable',async t=>{
 const f=fixture(t,{providerFails:false,exchangeFails:true}),d=f.w.document;await wait(()=>d.querySelector('.cv-google'));d.querySelector('.cv-google').click();await wait(()=>f.opened);
 await f.w.arcticAuth('t'.repeat(43));await wait(()=>d.body.textContent.includes('another app session'));
 assert.equal(d.querySelector('.cv-google').disabled,false);assert.deepEqual(f.errors,[]);
});
test('online event retries provider discovery without restarting the APK',async t=>{
 const f=fixture(t),d=f.w.document;await wait(()=>d.body.textContent.includes('Couldn’t check sign-in'));const count=f.calls.filter(p=>p==='/auth/providers').length;f.w.dispatchEvent(new f.w.Event('online'));await wait(()=>f.calls.filter(p=>p==='/auth/providers').length>count);assert.equal(d.querySelector('.cv-google').disabled,false);
});
