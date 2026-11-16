const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto}=require('node:crypto'),{JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../public/early'),html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),code=fs.readFileSync(path.join(dir,'passport-launch.js'),'utf8');
const wallet={provider:'para',address:'0x'+'1'.repeat(40),chainId:46630};
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
test('ticket exchange and server wallet validation finish before Passport and wallet are revealed',async()=>{
 let release;const p=page({ticket:true,verifier:'test-verifier',fetcher:async(url)=>url.endsWith('/auth/exchange')?{ok:true,json:async()=>({session:'verified-session'})}:new Promise(r=>{release=r;})});try{
 await settle();assert.equal(p.$('harbor-app').hidden,true);assert.ok(release);release({ok:true,json:async()=>({identity:{wallet},passport:null})});await settle();assert.equal(p.$('entry-gate').hidden,true);assert.equal(p.$('harbor-app').hidden,false);assert.equal(p.$('harbor-app').hasAttribute('inert'),false);assert.equal(p.$('home-view').hidden,true);assert.equal(p.$('passport-view').hidden,false);assert.equal(p.$('wallet-card').hidden,false);assert.deepEqual(p.calls.map(x=>new URL(x.url).pathname.split('/').slice(-2).join('/')),['auth/exchange','v3/passport']);
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

const hash='0x'+'a'.repeat(64),otherHash='0x'+'b'.repeat(64);
const registered=()=>({id:'passport-test',playerName:'Explorer',wallet:wallet.address,chainId:46630,eggSerial:7,deliveries:[{kind:'visa',status:'confirmed',chainId:46630,tokenId:'104',transactionHash:hash},{kind:'egg',status:'confirmed',chainId:46630,tokenId:'7',transactionHash:otherHash}]});
const receipt=(kind,overrides={})=>({confirmed:true,paraWalletVerified:true,wallet:wallet.address,chainId:46630,tokenId:kind==='egg'?'7':'104',transactionHash:kind==='egg'?otherHash:hash,...overrides});
function accountPage({record=registered(),verify=(kind)=>receipt(kind)}={}){return page({session:'verified-session',fetcher:async(url)=>({ok:true,json:async()=>url.endsWith('/passport')?{identity:{wallet},passport:record}:verify(url.includes('/egg/')?'egg':'visa')})});}
test('Passport navigation stays visible after clicks bubble through the app container',async()=>{
 const p=accountPage();try{await settle();for(let i=0;i<3;i++){
 p.w.document.querySelector('nav [data-tab=home]').click();assert.equal(p.$('home-view').hidden,false);
 p.w.document.querySelector('nav [data-tab=passport]').click();assert.equal(p.$('passport-view').hidden,false);assert.equal(p.$('home-view').hidden,true);assert.equal(p.$('harbor-app').dataset.tab,'profile');assert.equal(p.w.document.querySelector('nav [data-tab=passport]').getAttribute('aria-current'),'page');
 }p.w.document.querySelector('nav [data-tab=home]').click();p.w.document.querySelector('.home-v2-journey').click();assert.equal(p.$('passport-view').hidden,false);await settle();
 }finally{p.dom.window.close();}
});
test('verified wallet and both received NFTs show chain-scoped wallet and transaction links',async()=>{
 const p=accountPage();try{await settle();assert.equal(p.$('wallet-card').hidden,false);assert.equal(p.$('created-wallet').textContent,wallet.address);assert.match(p.$('wallet-network').textContent,/Robinhood Chain Testnet/);
 assert.equal(p.$('wallet-explorer').href,'https://explorer.testnet.chain.robinhood.com/address/'+wallet.address);
 for(const kind of ['visa','egg']){assert.match(p.$(kind+'-state').textContent,/Received/);assert.equal(p.$(kind+'-tx').hidden,false);assert.equal(p.$(kind+'-tx').href,'https://explorer.testnet.chain.robinhood.com/tx/'+(kind==='visa'?hash:otherHash));}
 assert.match(p.$('egg-title').textContent,/#7 \/ 33/);
 }finally{p.dom.window.close();}
});
test('pending delivery shows a transaction without claiming receipt; no hash means no link',async()=>{
 const record=registered();record.deliveries[0].status='queued';delete record.deliveries[0].transactionHash;record.deliveries[1].status='submitted';const p=accountPage({record});try{await settle();assert.match(p.$('visa-state').textContent,/Waiting to mint/);assert.equal(p.$('visa-tx').hidden,true);assert.match(p.$('egg-state').textContent,/Confirming/);assert.equal(p.$('egg-tx').hidden,false);assert.equal(p.calls.filter(c=>c.url.includes('/acceptance')).length,0);}finally{p.dom.window.close();}
});
test('failed, wrong-chain, wrong-owner and mismatched receipts never show Received',async()=>{
 for(const overrides of [{confirmed:false},{chainId:2741},{wallet:'0x'+'2'.repeat(40)},{transactionHash:otherHash},{tokenId:'999'},{paraWalletVerified:false}]){
 const p=accountPage({verify:kind=>receipt(kind,overrides)});try{await settle();assert.doesNotMatch(p.$('visa-state').textContent,/Received/);assert.match(p.$('visa-state').textContent,/verification pending/);}finally{p.dom.window.close();}}
});
test('wallet mismatch and unavailable verification cannot claim successful delivery',async()=>{
 const record=registered();record.wallet='0x'+'2'.repeat(40);const p=accountPage({record});try{await settle();assert.equal(p.$('wallet-match').hidden,false);assert.equal(p.$('visa-tx').hidden,true);assert.doesNotMatch(p.$('visa-state').textContent,/Received/);}finally{p.dom.window.close();}
 const q=accountPage({verify:()=>{throw Error('RPC unavailable');}});try{await settle();assert.match(q.$('egg-state').textContent,/verification pending/);assert.doesNotMatch(q.$('egg-state').textContent,/Received/);}finally{q.dom.window.close();}
});
test('no Egg allocation and registration remain clear after sign-in',async()=>{
 const record=registered();record.eggSerial=null;record.deliveries=record.deliveries.filter(d=>d.kind!=='egg');const p=accountPage({record});try{await settle();assert.match(p.$('egg-state').textContent,/No Egg/);assert.equal(p.$('egg-tx').hidden,true);}finally{p.dom.window.close();}
 const q=accountPage({record:null});try{await settle();assert.equal(q.$('wallet-card').hidden,false);assert.equal(q.$('registration-card'),null);assert.equal(q.$('collection-card').hidden,false);assert.match(q.$('visa-state').textContent,/Preparing/);}finally{q.dom.window.close();}
});

test('existing signed-in explorers consent once on the signup page and receive automatic setup without a Passport form',async()=>{
 let enrolled=false;const p=page({session:'existing',fetcher:async(url,opts)=>({ok:true,json:async()=>url.endsWith('/auth/para/config')?{enabled:true,earlySignup:{enabled:true}}:url.endsWith('/early/signup')?(enrolled=true,{status:'registered'}):{identity:{wallet,needsEarlySignup:!enrolled},passport:enrolled?registered():null}})});try{await settle();assert.equal(p.$('entry-gate').hidden,false);assert.equal(p.$('harbor-app').hidden,true);p.$('adult-confirm').checked=true;p.$('sign-in').click();await settle();assert.equal(p.$('harbor-app').hidden,false);assert.equal(p.$('passport-view').hidden,false);assert.equal(p.$('register'),null);const call=p.calls.find(c=>c.url.endsWith('/early/signup'));assert.deepEqual(JSON.parse(call.opts.body),{consentVersion:'early-signup-v1',adultConfirmed:true});assert.equal(p.calls.some(c=>c.url.endsWith('/auth/para/start')),false);}finally{p.dom.window.close();}
});
