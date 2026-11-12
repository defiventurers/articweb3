const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID,randomBytes,createHash,generateKeyPairSync,sign}=require('node:crypto');
const {workerConfig,deliverOne,createAdapter}=require('../antarcticPassportWorker');
const {createPassportRuntime}=require('../passportDeliveryRuntime');
const {createPassportStore}=require('../antarcticPassportStore');
const {createCompanyService}=require('../companyService');
const {createCompanyStore}=require('../companyStore');
const {Wallet,BrowserProvider,ContractFactory,id,parseEther}=require('ethers');

test('passport-only delivery accepts chain-scoped credentials without an arrival contract',()=>{
 const c=workerConfig({AK_VISA_DELIVERY_ENABLED:'true',AK_VISA_CHAIN_ID:'46630',AK_VISA_RPC_URL_46630:'https://rpc.testnet.chain.robinhood.com',AK_VISA_MINTER_KEY_46630:'test-only',AK_PASSPORT_SIGNER_KEY_46630:'new-signer-only',AK_VISA_CONTRACT_46630:'0x'+'1'.repeat(40),AK_VISA_CONTRACT:'0x'+'2'.repeat(40)});
 assert.equal(c.visa,'0x'+'1'.repeat(40));assert.equal(c.arrival,undefined);assert.equal(c.key,'new-signer-only');
});
test('a successful receipt cannot promote a claim with insufficient confirmations',async()=>{
 let lookup=0;const patches=[],wallet='0x'+'1'.repeat(40);
 await deliverOne({store:{claimJob:async()=>({id:'x',wallet,chain_id:46630,kind:'visa'}),updateJob:async(_,p)=>patches.push(p)},adapter:{chainId:46630,lookup:async()=>lookup++?{recipient:wallet,tokenId:'1',confirmed:false}:null,send:async()=>'0x'+'b'.repeat(64),receipt:async()=>({status:1})}});
 assert.equal(patches.at(-1).status,'submitted');
});
test('the shipped external-address form still binds a matching attested Para wallet; inventory rejects another chain',async()=>{
 const wallet=Wallet.createRandom().address;let registration;
 const routes=require('../antarcticPassport').createPassportRoutes({store:{configured:true,register:async(_,p)=>{registration=p;return {wallet:p.wallet,chainId:p.chainId,deliveries:[]};},get:async()=>null,close:async()=>{}}});
 await routes.route({path:'/passport',method:'POST',req:{},body:async()=>({playerName:'Explorer',wallet,walletMode:'external',souvenir:false,consentVersion:'antarctic-visa-v2'}),authenticated:async(_,f)=>f({id:randomUUID(),gameWallet:{provider:'para',address:wallet,chainId:46630}}),error:message=>Error(message),now:Date.now});
 assert.equal(registration.walletProvider,'para');assert.equal(registration.chainId,46630);
 const old=process.env.AK_VISA_CONTRACT_46630;process.env.AK_VISA_CONTRACT_46630='0x'+'1'.repeat(40);
 try{const inv=require('../antarcticPassport').createPassportRoutes({store:{configured:true,get:async()=>({chainId:46630,wallet,deliveries:[{kind:'visa',status:'confirmed',tokenId:'1',chainId:11124}]}),close:async()=>{}}});assert.deepEqual(await inv.walletInventory('x'),[]);}finally{if(old===undefined)delete process.env.AK_VISA_CONTRACT_46630;else process.env.AK_VISA_CONTRACT_46630=old;}
});
test('runtime does not claim jobs before permission/gas checks or after signer lock loss',async()=>{
 let ready=false,lost=false,sends=0;
 const config={AK_PASSPORT_RUNTIME_ENABLED:'true',AK_VISA_DELIVERY_ENABLED:'true',AK_VISA_RPC_URL:'https://rpc.testnet.chain.robinhood.com',AK_VISA_MINTER_KEY:Wallet.createRandom().privateKey,AK_VISA_CONTRACT:'0x'+'1'.repeat(40)};
 const runtime=createPassportRuntime({env:config,storeFactory:()=>({init:async()=>{},acquireWorkerLock:async()=>{},assertWorkerLock(){if(lost)throw Error();},claimJob:async()=>{sends++;return null;},close:async()=>{}}),adapterFactory:async()=>({address:'0x'+'2'.repeat(40),chainId:46630,preflight:async()=>({ready,status:ready?'ready':'awaiting_minter_role'}),close:()=>{}})});
 await runtime.tick();assert.equal(sends,0);assert.equal(runtime.status().status,'awaiting_minter_role');
 ready=true;await runtime.tick();assert.equal(sends,1);lost=true;await runtime.tick();assert.equal(sends,1);assert.equal(runtime.status().ready,false);await runtime.stop();
});

test('real PostgreSQL + local EVM: attested Para login, consent, passport-first queue, canonical receipt and private metadata',{skip:!process.env.AK_PASSPORT_TEST_DATABASE_URL,timeout:60000},async t=>{
 const {Pool}=require('pg'),http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const dbUrl=process.env.AK_PASSPORT_TEST_DATABASE_URL;
 if(!['127.0.0.1','localhost'].includes(new URL(dbUrl).hostname))throw Error('Use a disposable local test database.');
 const schema='passport_test_'+randomBytes(8).toString('hex'),admin=new Pool({connectionString:dbUrl});
 await admin.query('CREATE SCHEMA '+schema);
 const pools=[];const makeStore=()=>{const pool=new Pool({connectionString:dbUrl,options:'-c search_path='+schema});pools.push(pool);return createPassportStore({pool});};
 const store=makeStore(),second=makeStore();
 const ganache=(await import('../../contracts/launch/node_modules/ganache/dist/node/core.js')).default;
 const local=ganache.provider({logging:{quiet:true},chain:{chainId:46630}}),provider=new BrowserProvider(local,undefined,{cacheTimeout:0});
 const {compileBundle}=await import('../../contracts/launch/compile.mjs'),{artifacts}=compileBundle();
 const owner=await provider.getSigner(0),minter=Wallet.createRandom(),player=Wallet.createRandom(),other=Wallet.createRandom();
 const contract=await new ContractFactory(artifacts.AntarcticPassport.abi,artifacts.AntarcticPassport.bytecode,owner).deploy(await owner.getAddress(),await owner.getAddress(),'https://articweb3.onrender.com/arctic-play/v3/passport/metadata/46630/');await contract.waitForDeployment();
 const cfg={chainId:46630,rpc:'https://local.invalid',key:minter.privateKey,visa:await contract.getAddress()};
 const adapter=await createAdapter(cfg,{provider});
 let runtime,server,accountStore,dir;
 t.after(async()=>{if(server)await new Promise(r=>server.close(r));await runtime?.stop();await accountStore?.close();await store.close();provider.destroy();await local.disconnect();await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();if(dir)await fs.rm(dir,{recursive:true,force:true});});
 // Multiple route/worker instances can initialize the schema concurrently.
 await Promise.all([store.init(),second.init()]);
 assert.equal((await adapter.preflight()).status,'awaiting_minter_role');
 await(await contract.grantRole(id('MINTER_ROLE'),minter.address)).wait();assert.equal((await adapter.preflight()).status,'awaiting_test_gas');
 await(await contract.revokeRole(id('MINTER_ROLE'),minter.address)).wait();
 const {authorizePassportDelivery}=await import('../../contracts/launch/passport-delivery.mjs');
 const publicConfig={enabled:true,chainId:46630,contract:cfg.visa,signer:minter.address,minimumBalance:'0'};
 const record={contracts:{AntarcticPassport:{address:cfg.visa}}};
 let mining=false;const miner=setInterval(async()=>{if(mining)return;mining=true;try{await local.request({method:'evm_mine',params:[]});}finally{mining=false;}},50);
 try{await authorizePassportDelivery({provider,signer:owner,record,config:publicConfig,artifacts});const nonce=await provider.getTransactionCount(await owner.getAddress());await authorizePassportDelivery({provider,signer:owner,record,config:publicConfig,artifacts});assert.equal(await provider.getTransactionCount(await owner.getAddress()),nonce);}finally{clearInterval(miner);}
 assert.equal((await adapter.preflight()).ready,true);assert.equal(await contract.hasRole(id('METADATA_ROLE'),minter.address),false);assert.equal(await contract.hasRole('0x'+'00'.repeat(32),minter.address),false);
 await assert.rejects(authorizePassportDelivery({provider:{getNetwork:async()=>({chainId:4663n})},signer:owner,record,config:publicConfig,artifacts}),/testnet/);
 runtime=createPassportRuntime({env:{AK_VISA_DELIVERY_ENABLED:'true',AK_VISA_RPC_URL_46630:cfg.rpc,AK_VISA_MINTER_KEY_46630:minter.privateKey,AK_VISA_CONTRACT_46630:cfg.visa},storeFactory:()=>second,adapterFactory:async()=>adapter});
 await runtime.tick();
 const third=makeStore();await assert.rejects(third.acquireWorkerLock('46630:'+minter.address.toLowerCase()),/Another passport worker/);await third.close();
 dir=await fs.mkdtemp(path.join(os.tmpdir(),'passport-delivery-'));accountStore=createCompanyStore({file:path.join(dir,'state.json'),development:true});
 const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'qa-phase4',alg:'RS256'};
 const service=createCompanyService({store:accountStore,passportOptions:{store,deliveryRuntime:runtime,deliveryEnabled:true},authOptions:{walletOptions:{enabled:false},paraOptions:{enabled:true,apiKey:'beta_qa',audience:'phase4-qa',fetcher:async()=>({ok:true,json:async()=>({keys:[jwk]})})}}});
 server=http.createServer(service.handleHttp);await new Promise(r=>server.listen(0,'127.0.0.1',r));const root='http://127.0.0.1:'+server.address().port+'/arctic-play/v3';
 const call=async(p,data,session,origin)=>{const r=await fetch(root+p,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session}:{}),...(origin?{Origin:origin}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,allow:r.headers.get('access-control-allow-origin'),...await r.json()};};
 assert.equal((await call('/passport/acceptance')).status,401);
 assert.equal((await call('/passport/delivery/config',undefined,undefined,'https://operator.example')).allow,'*');
 assert.equal((await call('/passport/acceptance',undefined,undefined,'https://operator.example')).status,403);
 const verifier=randomBytes(32).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
 const begin=await call('/auth/para/start',{challenge,platform:'web',returnPath:'/arctic-play/passport-check/'},undefined,'https://articweb3.onrender.com'),attempt=new URL(begin.url).searchParams.get('attempt');
 const proof=await call('/auth/para/attempt',{attempt});const header=Buffer.from(JSON.stringify({alg:'RS256',kid:'qa-phase4'})).toString('base64url'),claims=Buffer.from(JSON.stringify({aud:'phase4-qa',sub:'phase4-user',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600,data:{userId:'phase4-user',authType:'email',email:'private@example.test',wallets:[{id:'phase4-wallet',type:'EVM',address:player.address}]}})).toString('base64url');
 const idToken=header+'.'+claims+'.'+sign('RSA-SHA256',Buffer.from(header+'.'+claims),pair.privateKey).toString('base64url');
 const complete=await call('/auth/para/complete',{attempt,idToken,address:player.address,signature:await player.signMessage(proof.message)});assert.equal(complete.status,200);assert.equal(new URL(complete.returnTo).pathname,'/arctic-play/passport-check/');
 const login=await call('/auth/exchange',{ticket:new URL(complete.returnTo).searchParams.get('auth_ticket'),verifier});assert.equal(login.status,200);assert.equal(login.wallet.provider,'para');
 const details={playerName:'Private Explorer',wallet:other.address,walletMode:'embedded',souvenir:true,achievementOptIn:true,consentVersion:'antarctic-visa-v2'};
 assert.equal((await call('/passport',{...details,consentVersion:null},login.session)).status,400);
 const issued=await call('/passport',details,login.session);assert.equal(issued.status,200);assert.equal(issued.passport.wallet,player.address.toLowerCase());assert.equal(issued.passport.walletProvider,'para');
 const duplicate=await call('/passport',details,login.session);assert.equal(duplicate.passport.id,issued.passport.id);
 await assert.rejects(store.register(login.accountId,{...details,wallet:player.address,chainId:11124},Date.now()),e=>e.status===409);
 await store.enqueueAchievement(login.accountId,{code:'shogi-first-win',tokenId:2});
 assert.equal((await call('/passport/acceptance',undefined,login.session)).confirmed,false);
 await runtime.tick();let p=await store.get(login.accountId);assert.equal(p.deliveries.find(d=>d.kind==='visa').status,'submitted');assert.equal(p.deliveries.find(d=>d.kind==='arrival').status,'queued');assert.equal((await contract.totalIssued()).toString(),'1');
 // Mine the second canonical L2 block; recheck the existing claim, no second mint.
 await local.request({method:'evm_mine',params:[]});
 await pools[0].query('UPDATE ak_passport_deliveries SET run_after=0,lease_until=0');await runtime.tick();
 p=await store.get(login.accountId);assert.equal(p.deliveries.find(d=>d.kind==='visa').status,'confirmed');assert.equal((await contract.totalIssued()).toString(),'1');
 const evidence=await call('/passport/acceptance',undefined,login.session);assert.equal(evidence.confirmed,true);assert.equal(evidence.paraWalletVerified,true);assert.equal(evidence.wallet,player.address.toLowerCase());assert.equal(evidence.tokenId,'1');assert.ok(evidence.blockHash);assert.ok(evidence.transactionHash);
 const metadata=await call('/passport/metadata/46630/1.json');assert.equal(metadata.status,200);const publicText=JSON.stringify(metadata);for(const secret of ['Private Explorer','private@example.test',player.address.toLowerCase()])assert.equal(publicText.toLowerCase().includes(secret.toLowerCase()),false);
 await local.request({method:'evm_mine',params:[]});await runtime.tick();assert.equal((await contract.totalIssued()).toString(),'1');
 assert.equal((await store.get(login.accountId)).deliveries.find(d=>d.kind==='arrival').status,'queued');
 // A missing canonical receipt cannot pass on the database status alone.
 const saved=await store.deliveryEvidence(login.accountId);const wrongReceipt={...saved,tx_hash:'0x'+'a'.repeat(64)};assert.equal((await adapter.verifyPassport(wrongReceipt)).confirmed,false);
 console.log('Local evidence: actual PostgreSQL queue + real EVM mint; Para JWT/JWKS are controlled fixtures, not live Para acceptance.');
});
