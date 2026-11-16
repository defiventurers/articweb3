const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto}=require('node:crypto'),{JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../public/early'),html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),code=fs.readFileSync(path.join(dir,'passport-launch.js'),'utf8');
const wallet={provider:'para',address:'0x'+'1'.repeat(40)};
const settle=()=>new Promise(r=>setTimeout(r,30));
function page({session,ticket=false,verifier,fetcher}={}){
 const dom=new JSDOM(html,{url:'https://antarcticgaming.co/early/'+(ticket?'?auth_ticket=test-ticket':''),runScripts:'outside-only'}),w=dom.window,calls=[];
 w.scrollTo=()=>{};w.TextEncoder=TextEncoder;Object.defineProperty(w,'crypto',{value:webcrypto});
 if(session)w.sessionStorage.setItem('ak.first33.session.v1',session);if(verifier)w.sessionStorage.setItem('ak.first33.pkce.v1',verifier);
 w.fetch=async(url,opts={})=>{calls.push({url,opts});return fetcher?fetcher(url,opts):{ok:true,json:async()=>({enabled:true,environment:'BETA'})};};
 w.eval(code);return {dom,w,calls,$:id=>w.document.getElementById(id)};
}
test('new visitor sees loading, then sign-in; Home never flashes or opens from navigation',async()=>{
 let release;const p=page({fetcher:()=>new Promise(r=>{release=r;})});try{
 assert.equal(p.$('harbor-app').hidden,true);assert.equal(p.$('entry-loading').hidden,false);p.w.document.querySelector('[data-tab=home]').click();assert.equal(p.$('harbor-app').hidden,true);
 await settle();release({ok:true,json:async()=>({enabled:true,environment:'BETA'})});await settle();assert.equal(p.$('entry-loading').hidden,true);assert.equal(p.$('connect-card').hidden,false);assert.equal(p.$('sign-in').disabled,false);assert.equal(p.$('harbor-app').hidden,true);
 p.$('sign-in').click();await settle();assert.match(p.$('entry-error').textContent,/at least 18/);assert.equal(p.calls.length,1);
 }finally{p.dom.window.close();}
});
test('ticket exchange and server wallet validation finish before the approved Home is revealed',async()=>{
 let release;const p=page({ticket:true,verifier:'test-verifier',fetcher:async(url)=>url.endsWith('/auth/exchange')?{ok:true,json:async()=>({session:'verified-session'})}:new Promise(r=>{release=r;})});try{
 await settle();assert.equal(p.$('harbor-app').hidden,true);assert.ok(release);release({ok:true,json:async()=>({identity:{wallet},passport:null})});await settle();assert.equal(p.$('entry-gate').hidden,true);assert.equal(p.$('harbor-app').hidden,false);assert.equal(p.$('harbor-app').hasAttribute('inert'),false);assert.equal(p.$('home-view').hidden,false);assert.equal(p.$('passport-view').hidden,true);assert.deepEqual(p.calls.map(x=>new URL(x.url).pathname.split('/').slice(-2).join('/')),['auth/exchange','v3/passport']);
 }finally{p.dom.window.close();}
});
test('an expired session returns to working Para sign-in instead of Home',async()=>{
 const p=page({session:'expired',fetcher:async(url)=>url.endsWith('/passport')?{ok:false,status:401,json:async()=>({error:'Sign in again.'})}:{ok:true,json:async()=>({enabled:true})}});try{await settle();assert.equal(p.$('harbor-app').hidden,true);assert.equal(p.$('connect-card').hidden,false);assert.equal(p.$('sign-in').disabled,false);assert.equal(p.w.sessionStorage.getItem('ak.first33.session.v1'),null);}finally{p.dom.window.close();}
});
test('network failure is bounded and retryable, without revealing Home or looping forever',async()=>{
 const p=page({fetcher:async()=>{throw Error('Network unavailable');}});try{await settle();assert.equal(p.calls.length,2);assert.equal(p.$('harbor-app').hidden,true);assert.equal(p.$('entry-retry').hidden,false);assert.match(p.$('entry-error').textContent,/Network unavailable/);}finally{p.dom.window.close();}
});
test('a session without a verified Para wallet cannot reveal Home',async()=>{
 const p=page({session:'unverified',fetcher:async(url)=>({ok:true,json:async()=>url.endsWith('/passport')?({identity:{wallet:{...wallet,provider:'external'}},passport:null}):({enabled:true})})});try{await settle();assert.equal(p.$('harbor-app').hidden,true);assert.equal(p.$('sign-in').disabled,false);}finally{p.dom.window.close();}
});
