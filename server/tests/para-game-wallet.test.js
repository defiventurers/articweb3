const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {generateKeyPairSync,sign,randomBytes,createHash}=require('node:crypto'),{Wallet}=require('ethers');
const {createCompanyStore}=require('../companyStore'),{createCompanyService}=require('../companyService');
const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'para-qa',alg:'RS256'},wallet=Wallet.createRandom(),other=Wallet.createRandom();
const digest=x=>createHash('sha256').update(x).digest('hex');
test('Para portal accepts the passport check, Android and existing web login destinations',async()=>{
 const {isAllowedWalletReturn:allowed}=await import('../wallet-build/auth-return.mjs'),origin='https://articweb3.onrender.com';
 for(const url of ['https://antarcticgaming.co/early/?auth_ticket=qa','https://www.antarcticgaming.co/early/?auth_ticket=qa','/arctic-play/passport-check/?auth_ticket=qa','https://articweb3.onrender.com/arctic-play/passport-check/?auth_ticket=qa','/arctic-play/app/?auth_ticket=qa','arcticplay://auth?ticket=qa','https://arcticdominion.xyz/?auth_ticket=qa','https://arcticdominion.xyz/play/?auth_ticket=qa','https://arcticdominion.xyz/early/?auth_ticket=qa','https://www.arcticdominion.xyz/play/?auth_ticket=qa'])assert.equal(allowed(url,origin),true,url);
});
test('Para portal rejects external, credential-bearing and unexpected login return destinations',async()=>{
 const {isAllowedWalletReturn:allowed}=await import('../wallet-build/auth-return.mjs'),origin='https://articweb3.onrender.com';
 for(const url of ['https://evil.example/arctic-play/passport-check/','//evil.example/arctic-play/app/','https://articweb3.onrender.com.evil.example/arctic-play/app/','https://evil.example@articweb3.onrender.com/arctic-play/app/','https://articweb3.onrender.com/arctic-play/passport-check/#leak','/unexpected/','javascript:alert(1)','arcticplay://other?ticket=qa','arcticplay://auth/unexpected?ticket=qa'])assert.equal(allowed(url,origin),false,url);
});
function token(extra={},data={},header={}){const h=Buffer.from(JSON.stringify({alg:'RS256',kid:'para-qa',...header})).toString('base64url'),b=Buffer.from(JSON.stringify({aud:'qa-app-key',sub:'para-user-1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600,data:{userId:'para-user-1',authType:'email',email:'player@example.test',wallets:[{id:'wallet-1',type:'EVM',address:wallet.address}],...data},...extra})).toString('base64url');return h+'.'+b+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+b),pair.privateKey).toString('base64url');}
async function setup(t,options={}){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'para-wallet-')),store=createCompanyStore({file:path.join(dir,'state.json'),development:true}),service=createCompanyService({store,now:options.serviceNow||Date.now,passportOptions:{store:{configured:true,get:async()=>null,close:async()=>{}}},authOptions:{walletOptions:{enabled:false},paraOptions:{enabled:true,apiKey:'beta_qa-key',audience:'qa-app-key',fetcher:async url=>{assert.equal(url,'https://api.beta.getpara.com/.well-known/jwks.json');return {ok:true,json:async()=>({keys:[jwk]})};},...options}}}),server=http.createServer(service.handleHttp);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const call=async(p,data,bearer,origin)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/arctic-play/v3'+p,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{}),...(origin?{Origin:origin}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,...await r.json()};};
t.after(async()=>{await new Promise(r=>server.close(r));await service.close();await fs.rm(dir,{recursive:true,force:true});});
const begin=async(purpose='login',bearer)=>{const verifier=randomBytes(32).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url'),s=await call('/auth/para/start',{purpose,challenge,platform:'android'},bearer);assert.equal(s.status,200);const attempt=new URL(s.url).searchParams.get('attempt'),c=await call('/auth/para/attempt',{attempt});assert.equal(c.loginMethods,'dashboard');assert.equal(c.chain.id,46630);return {attempt,verifier,message:c.message,signature:await wallet.signMessage(c.message)};};
const complete=(b,idToken=token(),address=wallet.address,signature=b.signature)=>call('/auth/para/complete',{attempt:b.attempt,idToken,address,signature});
const exchange=(r,b)=>call('/auth/exchange',{ticket:new URL(r.returnTo).searchParams.get('ticket'),verifier:b.verifier});
const login=async(idToken)=>{const b=await begin(),r=await complete(b,idToken);assert.equal(r.status,200);return exchange(r,b);};return {call,store,begin,complete,exchange,login};}
test('Para login has PKCE, request-bound signatures, one-use tickets and stable accounts',async t=>{const f=await setup(t),b=await f.begin(),r=await f.complete(b);assert.equal(r.status,200);const ticket=new URL(r.returnTo).searchParams.get('ticket');assert.equal((await f.call('/auth/exchange',{ticket,verifier:'x'.repeat(43)})).status,401);const a=await f.exchange(r,b);assert.equal(a.wallet.provider,'para');assert.equal(a.wallet.address,wallet.address);await f.store.transact('account',a.accountId,v=>({...v,progress:{keep:true}}));const next=await f.login();assert.equal(next.accountId,a.accountId);assert.deepEqual((await f.store.get('account',a.accountId)).progress,{keep:true});assert.equal((await f.exchange(r,b)).status,401);assert.equal((await f.complete(b)).status,401);});
test('invalid audience, expiry, future issue time, algorithm, subject or guest auth are rejected',async t=>{const f=await setup(t);for(const [c,d,h]of [[{aud:'other'}, {},{}],[{exp:1},{},{}],[{iat:Date.now()/1000+3600},{},{}],[{}, {userId:'wrong'},{}],[{}, {authType:'guest'},{}],[{}, {isGuestMode:true},{}],[{}, {},{alg:'none'}]]){const b=await f.begin();assert.equal((await f.complete(b,token(c,d,h))).status,401);}});
test('social, email, phone and Telegram identities work without requiring an email',async t=>{const f=await setup(t);for(const authType of ['email','phone','telegram','farcaster','externalWallet']){const r=await f.login(token({}, {authType,email:undefined,oAuthMethod:authType==='email'?'discord':undefined}));assert.equal(r.status,200);assert.equal(r.wallet.provider,'para');assert.equal(r.email,null);}});
test('wallet substitution, connected-only claims and signatures for other requests fail',async t=>{const f=await setup(t),b=await f.begin(),c=await f.begin();assert.equal((await f.complete(b,token(),other.address)).status,401);assert.equal((await f.complete(b,token({}, {wallets:[],connectedWallets:[{type:'EVM',id:'x',address:wallet.address}]}))).status,401);assert.equal((await f.complete(c,token(),wallet.address,b.signature)).status,401);});
test('matching emails do not silently merge old accounts',async t=>{const f=await setup(t),id='11111111-1111-4111-8111-111111111111';await f.store.transact('auth-identity',digest('email:player@example.test'),()=>({accountId:id}));assert.notEqual((await f.login()).accountId,id);});
test('explicit linking preserves progress and refuses cross-account identity linking',async t=>{const f=await setup(t),id='11111111-1111-4111-8111-111111111111',key='q'.repeat(43),session=id+'.'+key;await f.store.transact('account',id,()=>({id,email:'old@example.test',sessions:[{hash:digest(key),expires:Date.now()+600000}],progress:{old:1},entitlements:{},marketingChoiceSet:true}));const b=await f.begin('link',session),r=await f.complete(b),a=await f.exchange(r,b);assert.equal(a.accountId,id);assert.deepEqual((await f.store.get('account',id)).progress,{old:1});const id2='22222222-2222-4222-8222-222222222222';await f.store.transact('account',id2,()=>({id:id2,email:null,sessions:[{hash:digest(key),expires:Date.now()+600000}],progress:{},entitlements:{}}));const c=await f.begin('link',id2+'.'+key),s=await f.complete(c);assert.equal((await f.exchange(s,c)).status,409);});
test('revoked linking sessions and replacement of pinned wallets fail',async t=>{const f=await setup(t),a=await f.login(),b=await f.begin('link',a.session);await f.store.transact('account',a.accountId,v=>({...v,sessions:[]}));assert.equal((await f.complete(b)).status,401);const next=await f.login();await f.store.transact('account',a.accountId,v=>({...v,gameWallet:{...v.gameWallet,provider:'metamask-embedded'}}));const c=await f.begin('link',next.session);assert.equal((await f.complete(c)).status,409);});
test('revocation or deletion racing identity linking cannot create an authenticated mapping',async t=>{
 for(const [action,stage] of [['revoke','mapping'],['delete','mapping'],['revoke','binding'],['delete','binding']]){
  const f=await setup(t),id='33333333-3333-4333-8333-333333333333',key='r'.repeat(43);
  await f.store.transact('account',id,()=>({id,email:null,sessions:[{hash:digest(key),expires:Date.now()+600000}],progress:{preserve:true},entitlements:{}}));
  const b=await f.begin('link',id+'.'+key),result=await f.complete(b);assert.equal(result.status,200);
  const transact=f.store.transact;let armed=true,mapped=false,accountWrites=0;
  f.store.transact=async(kind,record,fn)=>{
   if(armed&&(stage==='mapping'&&kind==='auth-identity'||stage==='binding'&&mapped&&kind==='account'&&++accountWrites===2)){
    armed=false;await transact('account',id,a=>action==='delete'?null:{...a,sessions:[]});
   }
   const result=await transact(kind,record,fn);if(kind==='auth-identity')mapped=true;return result;
  };
  const exchange=await f.exchange(result,b);
  assert.equal(exchange.status,401,action+' must be checked at the account binding transaction.');
  const retry=await f.login();
  assert.ok(retry.status!==200||retry.accountId!==id,'A failed link must not leave an identity mapping that grants ordinary login to the target account.');
  const account=await f.store.get('account',id);
  if(action==='delete')assert.equal(account,null);else{assert.equal(account.gameWallet,undefined);assert.deepEqual(account.progress,{preserve:true});}
 }
});
test('expired unbound link reservation recovers to a fresh account without exposing the target saved game',async t=>{
 const f=await setup(t),id='44444444-4444-4444-8444-444444444444',mapping=digest('para-wallet:BETA:qa-app-key:para-user-1');
 await f.store.transact('account',id,()=>({id,sessions:[],progress:{privateSave:true},entitlements:{}}));
 await f.store.transact('auth-identity',mapping,()=>({accountId:id,provider:'para-wallet',pendingLink:true,linkReservation:'isolated-reservation',linkExpiresAt:Date.now()+120000}));
 assert.equal((await f.login()).status,409,'Pending mappings cannot grant normal login.');
 await f.store.transact('auth-identity',mapping,v=>({...v,linkExpiresAt:Date.now()-1}));
 const resumed=await f.login();assert.equal(resumed.status,200);assert.notEqual(resumed.accountId,id);
 assert.equal((await f.login()).accountId,resumed.accountId);
 assert.deepEqual((await f.store.get('account',id)).progress,{privateSave:true});
 assert.equal((await f.store.get('account',id)).gameWallet,undefined);
 assert.deepEqual((await f.store.get('account',resumed.accountId)).progress,{});
});
test('expired reservation after a committed wallet bind safely recovers the same saved account',async t=>{
 const f=await setup(t),id='55555555-5555-4555-8555-555555555555',key='s'.repeat(43),mapping=digest('para-wallet:BETA:qa-app-key:para-user-1');
 await f.store.transact('account',id,()=>({id,email:null,sessions:[{hash:digest(key),expires:Date.now()+600000}],progress:{preserved:7},entitlements:{}}));
 const b=await f.begin('link',id+'.'+key),completed=await f.complete(b),transact=f.store.transact;let writes=0;
 f.store.transact=async(kind,record,fn)=>{if(kind==='auth-identity'&&++writes===2)throw Error('Isolated finalization outage');return transact(kind,record,fn);};
 assert.equal((await f.exchange(completed,b)).status,503);
 assert.equal((await f.store.get('auth-identity',mapping)).pendingLink,true);
 await transact('auth-identity',mapping,v=>({...v,linkExpiresAt:Date.now()-1}));
 const recovered=await f.login();assert.equal(recovered.status,200);assert.equal(recovered.accountId,id);
 assert.deepEqual((await f.store.get('account',id)).progress,{preserved:7});
 assert.equal((await f.store.get('auth-identity',mapping)).pendingLink,undefined);
});
test('an old binding request cannot resume after its expired reservation has been safely recovered',async t=>{
 let clock=Date.now();const f=await setup(t,{serviceNow:()=>clock}),id='66666666-6666-4666-8666-666666666666',key='t'.repeat(43);
 await f.store.transact('account',id,()=>({id,email:null,sessions:[{hash:digest(key),expires:clock+600000}],progress:{oldSave:true},entitlements:{}}));
 const b=await f.begin('link',id+'.'+key),completed=await f.complete(b),transact=f.store.transact;
 let mapped=false,accountWrites=0,release,entered;
 const barrier=new Promise(resolve=>{release=resolve;}),waiting=new Promise(resolve=>{entered=resolve;});
 f.store.transact=async(kind,record,fn)=>{
  if(mapped&&kind==='account'&&record===id&&++accountWrites===2){entered();await barrier;}
  const result=await transact(kind,record,fn);if(kind==='auth-identity')mapped=true;return result;
 };
 const oldExchange=f.exchange(completed,b);await waiting;clock+=120001;
 const current=await f.login();assert.equal(current.status,200);assert.notEqual(current.accountId,id);
 release();assert.equal((await oldExchange).status,401);
 assert.equal((await f.store.get('account',id)).gameWallet,undefined);assert.deepEqual((await f.store.get('account',id)).progress,{oldSave:true});
});
test('management requires the linked account and issues no login ticket',async t=>{const f=await setup(t);assert.equal((await f.call('/auth/para/start',{challenge:'a'.repeat(43),purpose:'manage'})).status,401);const a=await f.login(),b=await f.begin('manage',a.session),r=await f.complete(b);assert.equal(r.managed,true);assert.equal(r.returnTo,undefined);});
test('disabled, mixed environments and unapproved mainnet fail closed',async t=>{for(const opts of [{enabled:false},{apiKey:'prod_qa'},{environment:'PRODUCTION',chainId:4663,apiKey:'prod_qa',productionApproved:false}]){const f=await setup(t,opts);assert.equal((await f.call('/auth/para/config')).enabled,false);assert.equal((await f.call('/auth/para/start',{challenge:'a'.repeat(43)})).status,503);}});

test('Robinhood and Arbitrum adapters preserve chain IDs and gate production',()=>{const {createParaGameWallet}=require('../paraGameWallet');for(const [chainId,environment,apiKey]of [[46630,'BETA','beta_qa'],[421614,'BETA','beta_qa'],[4663,'PRODUCTION','prod_qa'],[42161,'PRODUCTION','prod_qa']]){const a=createParaGameWallet({apiKey,audience:'qa',environment,chainId,enabled:true,productionApproved:true}).config();assert.equal(a.enabled,true);assert.equal(a.chain.id,chainId);assert.match(a.chain.name,/Robinhood|Arbitrum/);}});

test('Para sign-in completes on the new domain during the registration hold, without registering NFTs',async t=>{
 const prior=process.env.AK_LAUNCH_RESET_PAUSED;process.env.AK_LAUNCH_RESET_PAUSED='true';t.after(()=>{if(prior===undefined)delete process.env.AK_LAUNCH_RESET_PAUSED;else process.env.AK_LAUNCH_RESET_PAUSED=prior;});
 const f=await setup(t);
 for(const origin of ['https://antarcticgaming.co','https://www.antarcticgaming.co']){
  const verifier=randomBytes(32).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
  const start=await f.call('/auth/para/start',{challenge,platform:'web',returnPath:'/early/'},undefined,origin);assert.equal(start.status,200);
  const attempt=new URL(start.url).searchParams.get('attempt'),proof=await f.call('/auth/para/attempt',{attempt});assert.equal(proof.status,200);
  const result=await f.call('/auth/para/complete',{attempt,idToken:token(),address:wallet.address,signature:await wallet.signMessage(proof.message)});assert.equal(result.status,200);assert.equal(new URL(result.returnTo).origin,origin);assert.equal(new URL(result.returnTo).pathname,'/early/');
  const session=await f.call('/auth/exchange',{ticket:new URL(result.returnTo).searchParams.get('auth_ticket'),verifier},undefined,origin);assert.equal(session.status,200);assert.equal(session.wallet.provider,'para');
  const profile=await f.call('/passport',undefined,session.session,origin);assert.equal(profile.status,200);assert.equal(profile.identity.wallet.provider,'para');assert.equal(profile.passport,null);
  assert.equal((await f.call('/passport',{playerName:'Explorer'},session.session,origin)).status,503);
 }
});

test('v5.10.2 Android readiness, sign-in, access and progress work during the registration hold',async t=>{
 const prior=process.env.AK_LAUNCH_RESET_PAUSED;process.env.AK_LAUNCH_RESET_PAUSED='true';t.after(()=>{if(prior===undefined)delete process.env.AK_LAUNCH_RESET_PAUSED;else process.env.AK_LAUNCH_RESET_PAUSED=prior;});
 const f=await setup(t);
 const ready=await f.call('/capabilities');assert.equal(ready.status,200);assert.equal(ready.cloud,true);assert.equal(ready.accountPlay,true);
 assert.equal((await f.call('/auth/providers')).paraWallet,true);
 const b=await f.begin(),result=await f.complete(b);assert.match(result.returnTo,/^arcticplay:\/\/auth\?ticket=/);
 const a=await f.exchange(result,b);assert.equal(a.status,200);
 const installation='11111111-1111-4111-8111-111111111111';
 assert.equal((await f.call('/play-access',{installation})).status,401);
 const access=await f.call('/play-access',{installation},a.session);assert.equal(access.status,200);assert.equal(access.accountId,a.accountId);assert.equal(access.online,true);assert.ok(access.leaseSeconds>0&&access.leaseSeconds<=60);
 assert.equal((await f.call('/account',undefined,a.session)).accountId,a.accountId);
 assert.equal((await f.call('/communication-preferences',{enabled:false},a.session)).status,200);
 assert.equal((await f.call('/communication-preferences',undefined,a.session)).choiceSet,true);
 assert.equal((await f.call('/progress',{progress:{}},a.session)).status,200);
 assert.equal((await f.call('/progress',undefined,a.session)).status,200);
 for(const [path,data]of [['/passport',{playerName:'Explorer'}],['/accounts',{}],['/rotate',{}],['/metrics',{}],['/recover',{code:'invalid'}],['/checkout',{}]]){
  const r=await f.call(path,data,a.session);assert.equal(r.status,503,path);assert.equal(r.code,'LAUNCH_RESET_PAUSED',path);
 }
 assert.equal((await f.call('/logout',{},a.session)).status,200);
 assert.equal((await f.call('/play-access',{installation},a.session)).status,401);
});
