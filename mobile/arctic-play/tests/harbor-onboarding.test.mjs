import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {webcrypto} from 'node:crypto';import {createRequire} from 'node:module';
const {JSDOM,VirtualConsole}=createRequire(new URL('../build-deps/package.json',import.meta.url))('jsdom');
const bundle=fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8');
async function until(fn){const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Harbor integration timed out');await new Promise(r=>setTimeout(r,5));}}
function fixture(t,{holdReady=false,failAuth=false}={}){
 let release,posted=0,opened,probes=0;const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.WebSocket=undefined;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.Android={getCloudSession:()=>null,setCloudSession:()=>true,openAuth:u=>{opened=u;return true;},setDarkTheme(){}};
  w.fetch=async(input,opt={})=>{const u=new URL(input,w.location.href),ok=v=>({ok:true,json:async()=>v});
   if(u.pathname.endsWith('/capabilities')){probes++;if(holdReady)await new Promise(r=>release=r);return ok({version:2,cloud:true,accountPlay:true});}
   if(u.pathname.endsWith('/auth/para/start')){posted++;return failAuth?{ok:false,status:400,json:async()=>({error:'Provider configuration needs attention.'})}:ok({url:'https://articweb3.onrender.com/arctic-play/wallet/?attempt='+'a'.repeat(43)+'&provider=para'});}
   if(u.pathname.endsWith('/auth/providers'))return ok({});
   if(u.pathname.endsWith('/game-assets.json'))return ok({assets:[]});throw Error('Offline fixture');
  };
 }});t.after(()=>dom.window.close());dom.window.eval(bundle);return {w:dom.window,errors,get release(){return release;},get posted(){return posted;},get opened(){return opened;},get probes(){return probes;}};
}
test('one sign-in tap waits for ready and opens the secure portal once',async t=>{
 const f=fixture(t,{holdReady:true}),d=f.w.document;await until(()=>f.release&&d.querySelector('.passport-primary'));
 assert.match(d.querySelector('h1').textContent,/On the way/);d.querySelector('.passport-primary').click();await new Promise(r=>setTimeout(r,30));assert.equal(f.posted,0);assert.equal(f.opened,undefined);
 f.release();await until(()=>f.opened);assert.equal(f.posted,1);assert.equal(f.probes,1);assert.deepEqual(f.errors,[]);
});
test('cancelling a queued request never opens auth on late readiness',async t=>{
 const f=fixture(t,{holdReady:true}),d=f.w.document;await until(()=>f.release);d.querySelector('.passport-primary').click();[...d.querySelectorAll('button')].find(x=>x.textContent==='Cancel connection check').click();f.release();await until(()=>d.querySelector('[data-connection="cancelled"]'));await new Promise(r=>setTimeout(r,50));assert.equal(f.posted,0);assert.equal(f.opened,undefined);assert.deepEqual(f.errors,[]);
});
test('real auth errors remain visible after readiness rather than being hidden as sleep',async t=>{
 const f=fixture(t,{failAuth:true}),d=f.w.document;await until(()=>d.querySelector('[data-connection="ready"]'));d.querySelector('.passport-primary').click();await until(()=>d.querySelector('[role=alert]'));assert.match(d.querySelector('[role=alert]').textContent,/Provider configuration/);assert.equal(f.posted,1);assert.equal(d.querySelector('.passport-primary').disabled,false);assert.deepEqual(f.errors,[]);
});
test('Nova arrival and recovery share the live flow without hook-order errors',async t=>{
 const f=fixture(t),d=f.w.document;await until(()=>d.querySelector('[data-connection="ready"]'));assert.match(d.body.textContent,/Nova/);assert.equal(d.querySelector('.harbor-friends').getAttribute('src'),'art/onboarding-v2/friends-at-arch.webp');
 [...d.querySelectorAll('button')].find(x=>x.textContent==='Use a recovery code').click();await until(()=>d.querySelector('#entry-recovery'));assert.match(d.querySelector('.entry-harbor').getAttribute('src'),/nova-reassure/);
 [...d.querySelectorAll('button')].find(x=>x.textContent==='Back to sign in').click();await until(()=>d.querySelector('.harbor-entry'));assert.deepEqual(f.errors,[]);
});
