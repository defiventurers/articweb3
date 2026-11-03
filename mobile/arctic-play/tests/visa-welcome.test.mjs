import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
const {JSDOM,VirtualConsole}=createRequire(new URL('../build-deps/package.json',import.meta.url))('jsdom');
const assets=new URL('../android/app/src/main/assets/',import.meta.url);
const bundle=fs.readFileSync(new URL('app.js',assets),'utf8');
async function until(fn){const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Welcome flow timed out');await new Promise(r=>setTimeout(r,5));}}
function fixture(t,{manifestFails=false,artFails=false,authFails=false}={}){
 const images=[],files=[],errors=[];let opened,releaseAuth,manifestRequests=0;
 const virtual=new VirtualConsole();virtual.on('jsdomError',e=>errors.push(e.message));
 const urls=['art/boards/sanguo.webp','art/shogi/board.webp','art/sanyou-gold-v2/red-king.webp','art/ice/daylight.webp','bot.js','learn.js','fair-worker.js'];
 const dom=new JSDOM('<div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:virtual,beforeParse(w){
  Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.WebSocket=undefined;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.Image=class {naturalWidth=64;naturalHeight=64;decode(){return Promise.resolve();}set src(url){if(!url)return;images.push(url);w.setTimeout(()=>artFails?this.onerror?.():this.onload?.(),20);}};
  w.Android={getCloudSession:()=>null,setCloudSession:()=>true,openAuth:url=>{opened=url;return true;},setDarkTheme(){}};
  w.fetch=async(input,options={})=>{
   const u=new URL(input,w.location.href),ok=value=>({ok:true,json:async()=>value,arrayBuffer:async()=>new ArrayBuffer(1)});
   if(u.pathname.endsWith('/game-assets.json')){manifestRequests++;if(manifestFails){manifestFails=false;throw Error('Offline manifest');}return ok({assets:urls.map(url=>({url,bytes:1}))});}
   if(urls.some(url=>u.pathname.endsWith('/'+url))){files.push(u.pathname);return ok({});}
   if(u.pathname.endsWith('/auth/para/start')){await new Promise(r=>{releaseAuth=r;});if(authFails)return {ok:false,status:503,json:async()=>({error:'Sign-in is temporarily unavailable.'})};return ok({url:'https://articweb3.onrender.com/arctic-play/wallet/?attempt='+'a'.repeat(43)+'&provider=para'});}
   if(u.pathname.endsWith('/auth/providers'))return ok({});
   throw Error('Offline fixture');
  };
 }});t.after(()=>dom.window.close());dom.window.eval(bundle);
 return {w:dom.window,images,files,errors,get opened(){return opened;},get manifestRequests(){return manifestRequests;},get authPending(){return !!releaseAuth;},completeAuth:()=>releaseAuth()};
}
test('welcome uses the supplied artwork and warms all assets while sign-in is still pending',async t=>{
 const f=fixture(t),d=f.w.document;await until(()=>d.querySelector('.visa-art-signin'));
 assert.equal(d.querySelector('.visa-art-image').getAttribute('src'),'art/visa-welcome-v1/screen.png');
 d.querySelector('.visa-art-signin').click();await until(()=>f.authPending);assert.equal(f.opened,undefined);assert.equal(d.querySelector('.visa-art-signin').getAttribute('aria-label'),'Opening sign-in…');assert.ok(d.querySelector('.visa-art-busy'));
 await until(()=>d.querySelector('.visa-art-loading').textContent==='Games ready');
 assert.equal(f.images.length,4);assert.equal(f.files.length,3);assert.ok(f.files.some(p=>p.endsWith('/fair-worker.js')));
 f.completeAuth();await until(()=>f.opened);assert.equal(f.manifestRequests,1);assert.deepEqual(f.errors,[]);
});
test('recovery and returning to welcome share the in-flight asset queue',async t=>{
 const f=fixture(t),d=f.w.document;await until(()=>d.querySelector('.visa-art-recovery'));
 d.querySelector('.visa-art-recovery').click();await until(()=>d.querySelector('#entry-recovery'));
 [...d.querySelectorAll('button')].find(b=>b.textContent==='Back to sign in').click();
 await until(()=>d.querySelector('.visa-art-loading')?.textContent==='Games ready');
 assert.equal(f.images.length,4);assert.equal(f.manifestRequests,1);assert.deepEqual(f.errors,[]);
});
test('a failed manifest retries on resume and artwork failure never blocks sign-in',async t=>{
 const f=fixture(t,{manifestFails:true,artFails:true}),d=f.w.document;
 await until(()=>f.manifestRequests===1);f.w.dispatchEvent(new f.w.Event('pageshow'));
 await until(()=>f.manifestRequests===2);await until(()=>d.querySelector('.visa-art-loading').textContent.includes('Artwork will retry'));
 d.querySelector('.visa-art-signin').click();await until(()=>f.authPending);f.completeAuth();await until(()=>f.opened);
 await until(()=>d.querySelector('.visa-art-signin').disabled===false);assert.equal(f.images.length,4);assert.deepEqual(f.errors,[]);
});
test('sign-in errors stay visible and retryable over the welcome artwork',async t=>{
 const f=fixture(t,{authFails:true}),d=f.w.document;await until(()=>d.querySelector('.visa-art-signin'));
 d.querySelector('.visa-art-signin').click();await until(()=>f.authPending);f.completeAuth();
 await until(()=>d.querySelector('[role=alert]'));assert.match(d.querySelector('[role=alert]').textContent,/temporarily unavailable/);
 assert.equal(d.querySelector('.visa-art-signin').disabled,false);assert.ok(d.querySelector('.visa-art-recovery'));assert.deepEqual(f.errors,[]);
});
