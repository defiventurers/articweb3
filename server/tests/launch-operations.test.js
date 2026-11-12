const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createLaunchMetrics}=require('../launchMetrics'),{createLaunchOperations}=require('../launchOperations');
const error=(message,status=400)=>Object.assign(Error(message),{status});
test('new operations and receipt routes require a server-side owner credential',async()=>{
 const metrics=createLaunchMetrics({serviceKey:'s'.repeat(43),pool:{query:async()=>({rows:[]}),end:async()=>{}}});
 for(const [path,method]of [['/launch/owner/v2','GET'],['/launch/owner/verify-passport','POST']])for(const authorization of [undefined,'Bearer wrong'])await assert.rejects(metrics.route({path,method,req:{headers:{authorization}},error,body:async()=>({})}),e=>e.status===401);
 await metrics.close();
});
test('first-party visits respect privacy controls, exclude Android, deduplicate and roll UTC days',async()=>{
 const {recordLaunchVisit}=await import('../../shared/launch/visit.mjs');let sends=0;const values=new Map(),scope={navigator:{},crypto:{randomUUID},sessionStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}};
 const request=async()=>{sends++;};const at=Date.parse('2026-11-12T15:00:00Z');
 for(const block of [{Android:{}},{navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}},{navigator:{webdriver:true}},{navigator:{userAgent:'HeadlessChrome/142'}},{location:{hostname:'localhost'}},{location:{hostname:'127.0.0.1'}},{location:{hostname:'[::1]'}},{location:{hostname:'game.localhost'}},{location:{protocol:'file:'}}])assert.equal(await recordLaunchVisit({scope:{...scope,...block},at,request}),false);
 assert.equal(sends,0);assert.equal(values.size,0);
 assert.equal(await recordLaunchVisit({scope,at,request}),true);assert.equal(await recordLaunchVisit({scope,at,request}),false);assert.equal(sends,1);
 assert.equal(await recordLaunchVisit({scope,at:at+86400000,request}),true);assert.equal(sends,2);
 assert.equal(await recordLaunchVisit({scope:{...scope,sessionStorage:{getItem(){throw Error('Blocked');}}},at,request}),false);
});
test('real PostgreSQL/EVM: precise cohorts, receipt reconciliation, private export check and reorg detection',{skip:!process.env.AK_PASSPORT_TEST_DATABASE_URL,timeout:90000},async t=>{
 const {Pool}=require('pg'),{Wallet,BrowserProvider,ContractFactory}=require('ethers');
 const url=process.env.AK_PASSPORT_TEST_DATABASE_URL;if(!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Use a disposable local database.');
 const schema='launch_test_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:url});await admin.query('CREATE SCHEMA '+schema);const db=new Pool({connectionString:url,options:'-c search_path='+schema});
 const {createPassportStore}=require('../antarcticPassportStore'),{createPassportReader}=require('../antarcticPassportWorker');const passports=createPassportStore({pool:db});
 const ganache=(await import('../../contracts/launch/node_modules/ganache/dist/node/core.js')).default;let time=Date.parse('2026-11-12T18:00:00+05:30');
 const local=ganache.provider({logging:{quiet:true},chain:{chainId:46630,time:new Date(time-3600000)}}),provider=new BrowserProvider(local,undefined,{cacheTimeout:0});
 let ops,metrics;t.after(async()=>{ops?.close();if(metrics)await metrics.close();else await db.end();provider.destroy();await local.disconnect();await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();});
 await passports.init();await db.query('CREATE TABLE ak_documents(kind TEXT,id TEXT,body JSONB,PRIMARY KEY(kind,id)); CREATE TABLE ak_launch_visits(day DATE,session_hash TEXT,first_at BIGINT,PRIMARY KEY(day,session_hash));');
 const {compileBundle}=await import('../../contracts/launch/compile.mjs'),artifact=compileBundle().artifacts.AntarcticPassport,owner=await provider.getSigner();
 const contract=await new ContractFactory(artifact.abi,artifact.bytecode,owner).deploy(await owner.getAddress(),await owner.getAddress(),'https://example.test/passport/46630/');await contract.waitForDeployment();
 const beforeMints=await local.request({method:'evm_snapshot',params:[]});
 const accounts=[];
 for(const [kind,created,chainId] of [['para',Date.parse('2026-11-03T12:00:00Z'),46630],['email',Date.parse('2026-11-11T12:00:00Z'),46630],['temporary',Date.parse('2026-11-11T12:00:00Z'),11124],['legacy',Date.parse('2026-11-11T12:00:00Z'),46630],['para',Date.parse('2026-10-30T12:00:00Z'),46630]]){
  const id=randomUUID(),wallet=Wallet.createRandom().address,body={id,createdAt:created,email:'private@example.test',sessions:[],...(kind==='para'?{identity:{provider:'para-wallet'},gameWallet:{provider:'para',address:wallet,chainId}}:kind==='email'?{identity:{provider:'email'}}:kind==='temporary'?{identity:{provider:'para-wallet'},temporaryExpiresAt:time+86400000}:{})};
  await db.query("INSERT INTO ak_documents VALUES('account',$1,$2)",[id,JSON.stringify(body)]);
  await passports.register(id,{playerName:'Private Name',wallet,chainId,souvenir:false,consentVersion:'antarctic-visa-v2',walletProvider:kind==='para'?'para':'external'},created);
  accounts.push({id,wallet,job:await passports.deliveryEvidence(id)});
 }
 for(const i of [0,4]){const a=accounts[i],tx=await contract.mintVisa(a.wallet,a.job.claim_id),r=await tx.wait();const token=await contract.tokenForClaim(a.job.claim_id);await passports.updateJob(a.job.id,{status:'confirmed',txHash:r.hash,tokenId:String(token)});a.job=await passports.deliveryEvidence(a.id);}
 await local.request({method:'evm_mine',params:[]});
 await passports.updateJob(accounts[1].job.id,{status:'retry',errorCode:'DELIVERY_RETRY'});await passports.updateJob(accounts[3].job.id,{status:'blocked',errorCode:'TRANSACTION_REVERTED'});
 // An inconsistent passport/delivery chain must never contaminate this scope.
 await db.query("UPDATE ak_passport_deliveries SET chain_id=46630,status='confirmed',token_id='999' WHERE account_id=$1",[accounts[2].id]);
 await db.query('INSERT INTO ak_launch_visits VALUES($1,$2,$3)',['2026-11-12','anonymous-hash',time-1000]);
 const env={AK_VISA_CHAIN_ID:'46630',AK_VISA_CONTRACT_46630:await contract.getAddress(),AK_VISA_RPC_URL_46630:'https://local.invalid'};let down=false;
 const readerFactory=async config=>{const r=await createPassportReader(config,{provider});return {...r,verifyPassport:async job=>{if(down)throw Error('Offline');return r.verifyPassport(job);}};};
 ops=createLaunchOperations({pool:db,env,now:()=>time,readerFactory});
 let d=await ops.snapshot('current');assert.equal(d.totals.signups,2);assert.equal(d.totals.accountsCreated,3);assert.equal(d.totals.walletsReady,1);assert.equal(d.totals.registrations,3);assert.equal(d.totals.confirmedPassports,2);assert.equal(d.totals.visits,1);assert.equal(d.deliveryHealth.backlog,2);assert.equal(d.deliveryHealth.retrying,1);assert.equal(d.deliveryHealth.blocked,1);assert.equal(d.reconciliation.complete,true);assert.equal(d.reconciliation.collectionTotal,2);assert.equal(d.series.passports.reduce((n,r)=>n+r.n,0),2);
 const text=JSON.stringify(d);for(const secret of ['private@example.test','Private Name',accounts[0].id,accounts[0].wallet.toLowerCase()])assert.equal(text.toLowerCase().includes(secret.toLowerCase()),false);
 assert.equal((await ops.snapshot('launch')).totals.confirmedPassports,0);assert.equal((await ops.snapshot('launch')).range.notStarted,true);await assert.rejects(ops.snapshot('injected'),e=>e.status===400);
 const reader=await createPassportReader({chainId:46630,visa:env.AK_VISA_CONTRACT_46630,rpc:env.AK_VISA_RPC_URL_46630},{provider});await assert.rejects(reader.send(accounts[0].job),/Read-only/);
 const canonical=await reader.verifyPassport(accounts[0].job);const input={...canonical,paraWalletVerified:false,passportId:'untrusted-export-id'};
 const check=await ops.verifyImported(input);assert.equal(check.confirmed,true);assert.equal(check.paraWalletVerified,true);assert.equal(check.exportMatches,true);
 assert.equal((await ops.verifyImported({...input,blockHash:'0x'+'11'.repeat(32)})).confirmed,false);assert.equal((await ops.verifyImported({...input,chainId:11124})).confirmed,false);
 assert.equal((await contract.totalIssued()).toString(),'2');
 metrics=createLaunchMetrics({pool:db,serviceKey:'s'.repeat(43),now:()=>time,operationsOptions:{env,readerFactory}});const authenticated=await metrics.route({path:'/launch/owner/v2',method:'GET',req:{headers:{authorization:'Bearer '+'s'.repeat(43)}},url:new URL('https://example.test/?period=all'),error});assert.equal(authenticated.totals.confirmedPassports,2);
 down=true;time+=20*60000;d=await ops.snapshot('current');assert.equal(d.reconciliation.errorCode,'CHAIN_RECHECK_UNAVAILABLE');assert.equal(d.reconciliation.stale,true);assert.equal(d.totals.confirmedPassports,2);
 down=false;await local.request({method:'evm_revert',params:[beforeMints]});await local.request({method:'evm_mine',params:[]});await local.request({method:'evm_mine',params:[]});time+=61000;d=await ops.snapshot('current');assert.equal(d.reconciliation.collectionTotal,0);assert.equal(d.reconciliation.mismatches,2);assert.equal(d.totals.confirmedPassports,0);assert.equal(d.reconciliation.complete,false);
 assert.equal(Number((await db.query("SELECT count(*) AS n FROM ak_documents WHERE kind='account'")).rows[0].n),5);
 console.log('Live-like dashboard checks use real PostgreSQL and a local EVM; no live user activity is fabricated.');
});
