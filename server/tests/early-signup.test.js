const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {generateKeyPairSync,createHash,randomBytes,sign}=require('node:crypto'),{Wallet}=require('ethers');
const {createCompanyService}=require('../companyService'),{createCompanyStore}=require('../companyStore'),{CONSENT,SOURCE,recordEnrollment}=require('../earlySignup');
const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'early-qa',alg:'RS256'},wallet=Wallet.createRandom();
const digest=v=>createHash('sha256').update(v).digest('hex');
async function setup(t,{failOnce=false,enabled=true,pause=false}={}){
 const prior=process.env.AK_LAUNCH_RESET_PAUSED;if(pause)process.env.AK_LAUNCH_RESET_PAUSED='true';
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ak-auto-signup-')),store=createCompanyStore({file:path.join(dir,'accounts.json'),development:true}),passports=new Map();let writes=0,failed=false;
 const passportStore={configured:true,get:async id=>passports.get(id)||null,close:async()=>{},async register(id,params,at){writes++;if(failOnce&&!failed){failed=true;throw Error('Temporary database failure');}if(!passports.has(id))passports.set(id,{id:'passport-1',wallet:params.wallet,chainId:46630,playerName:params.playerName,eggSerial:1,createdAt:at,deliveries:['visa','egg'].map(kind=>({kind,status:'queued',chainId:46630}))});return passports.get(id);}};
 const service=createCompanyService({store,earlyOptions:{enabled},passportOptions:{store:passportStore},authOptions:{paraOptions:{enabled:true,apiKey:'beta_qa',audience:'early-qa-app',environment:'BETA',chainId:46630,fetcher:async()=>({ok:true,json:async()=>({keys:[jwk]})})}}});
 const server=http.createServer(service.handleHttp);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/arctic-play/v3';
 async function call(p,data,token,origin='https://antarcticgaming.co'){const r=await fetch(base+p,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',Origin:origin,...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,...await r.json()};}
 async function login(withConsent=true){const verifier=randomBytes(32).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');const started=await call('/auth/para/start',{challenge,platform:'web',returnPath:'/early/',...(withConsent?{earlySignup:{consentVersion:CONSENT,adultConfirmed:true}}:{})});if(started.status!==200)return started;
  const attempt=new URL(started.url).searchParams.get('attempt'),config=await call('/auth/para/attempt',{attempt});const head=Buffer.from(JSON.stringify({alg:'RS256',kid:'early-qa'})).toString('base64url'),body=Buffer.from(JSON.stringify({aud:'early-qa-app',sub:'early-person',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600,data:{userId:'early-person',authType:'email',wallets:[{id:'early-wallet',type:'EVM',address:wallet.address}]}})).toString('base64url'),idToken=head+'.'+body+'.'+sign('RSA-SHA256',Buffer.from(head+'.'+body),pair.privateKey).toString('base64url');
  const signature=await wallet.signMessage(config.message),complete=await call('/auth/para/complete',{attempt,idToken,address:wallet.address,signature});assert.equal(complete.status,200);return call('/auth/exchange',{ticket:new URL(complete.returnTo,'https://articweb3.onrender.com').searchParams.get('auth_ticket'),verifier});
 }
 t.after(async()=>{await new Promise(r=>server.close(r));await service.close();await fs.rm(dir,{recursive:true,force:true});if(prior===undefined)delete process.env.AK_LAUNCH_RESET_PAUSED;else process.env.AK_LAUNCH_RESET_PAUSED=prior;});return{call,login,store,passports,writes:()=>writes};
}
test('Para signup carries consent through PKCE and automatically registers both collectibles; repeated sign-in is idempotent',async t=>{
 const f=await setup(t),a=await f.login();assert.equal(a.status,200);assert.equal(a.earlySignup.status,'registered');assert.equal(f.passports.size,1);assert.equal(f.passports.get(a.accountId).deliveries.length,2);const saved=await f.store.get('account',a.accountId);assert.equal(saved.earlySignup.source,SOURCE);assert.equal(saved.earlySignup.adultConfirmed,true);const b=await f.login();assert.equal(b.accountId,a.accountId);assert.equal(f.passports.size,1);assert.equal((await f.store.get('account',a.accountId)).earlySignup.firstAt,saved.earlySignup.firstAt);
});
test('failed NFT queueing preserves successful sign-in and retries automatically on Passport read',async t=>{
 const f=await setup(t,{failOnce:true}),a=await f.login();assert.equal(a.status,200);assert.equal(a.earlySignup.status,'retrying');assert.ok(a.session);assert.equal(f.passports.size,0);const state=await f.call('/passport',null,a.session);assert.equal(state.status,200);assert.equal(state.passport.eggSerial,1);assert.equal(state.setup.status,'registered');
});
test('existing Para sessions complete consent on the signup page; submitted wallet addresses are never trusted',async t=>{
 const f=await setup(t),a=await f.login(false);assert.equal(f.passports.size,0);assert.equal((await f.call('/passport',null,a.session)).identity.needsEarlySignup,true);const r=await f.call('/early/signup',{consentVersion:CONSENT,adultConfirmed:true,wallet:Wallet.createRandom().address},a.session);assert.equal(r.status,200);assert.equal(f.passports.get(a.accountId).wallet.toLowerCase(),wallet.address.toLowerCase());assert.equal((await f.call('/passport',null,a.session)).identity.needsEarlySignup,false);
});
test('consent, age, origin and authentication are required before automatic allocation',async t=>{
 const f=await setup(t),challenge='a'.repeat(43);for(const earlySignup of [{consentVersion:CONSENT,adultConfirmed:false},{consentVersion:'other',adultConfirmed:true}])assert.equal((await f.call('/auth/para/start',{challenge,platform:'web',returnPath:'/early/',earlySignup})).status,400);
 assert.equal((await f.call('/early/signup',{consentVersion:CONSENT,adultConfirmed:true})).status,401);assert.equal((await f.call('/auth/para/start',{challenge,platform:'web',returnPath:'/early/',earlySignup:{consentVersion:CONSENT,adultConfirmed:true}},null,'https://arcticdominion.xyz')).status,403);assert.equal(f.passports.size,0);
});
test('early signup works through its explicit flag during the shared launch hold, without unpausing unrelated writes',async t=>{
 const f=await setup(t,{pause:true}),a=await f.login();assert.equal(a.status,200);assert.equal(a.earlySignup.status,'registered');assert.equal((await f.call('/progress',{progress:{}},a.session)).status,503);const egg=await f.call('/passport/egg/acceptance',null,a.session);assert.notEqual(egg.status,503);
});
test('disabled feature cannot enqueue an early signup and non-Para or other-chain wallets cannot opt in',async t=>{
 const f=await setup(t,{enabled:false});assert.equal((await f.login()).status,503);for(const gameWallet of [{provider:'external',chainId:46630},{provider:'para',chainId:2741}])assert.throws(()=>recordEnrollment({gameWallet},{source:SOURCE,consentVersion:CONSENT,adultConfirmed:true},Date.now()),/verified Para/);
});
