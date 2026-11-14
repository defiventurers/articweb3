const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
const {Wallet}=require('ethers');
const {createPassportRoutes}=require('../antarcticPassport');
const {createPassportStore}=require('../antarcticPassportStore');
const now=Date.parse('2026-11-14T12:00:00.000Z');
const base={playerName:'Explorer',walletMode:'embedded',souvenir:false,achievementOptIn:false,consentVersion:'antarctic-visa-v2',campaign:'first33-20261114',adultConfirmed:true};
const makeError=(message,status)=>Object.assign(new Error(message),{status});

test('only an attested Para wallet can claim the founding campaign through the signup route',async()=>{
 const wallet=Wallet.createRandom().address,actor={id:randomUUID(),gameWallet:{provider:'para',address:wallet,chainId:46630}};
 let registered;
 const store={configured:true,get:async()=>null,register:async(_id,params)=>{registered=params;return {id:randomUUID(),playerName:'Explorer',wallet,chainId:46630,eggSerial:1,deliveries:[{kind:'visa',status:'queued',chainId:46630},{kind:'egg',status:'queued',chainId:46630}]};},close:async()=>{}};
 const routes=createPassportRoutes({store,accountStore:null,deliveryRuntime:{status:()=>({ready:false,kinds:[]})}});
 const req={};const ctx=()=>({path:'/passport',method:'POST',req,body:async()=>base,authenticated:async(_,fn)=>fn(actor),error:makeError,now:()=>now});
 const v=await routes.route(ctx());assert.equal(registered.campaign,'first33-20261114');assert.equal(registered.walletProvider,'para');assert.equal(v.passport.eggSerial,1);assert.equal(v.passport.deliveries.find(d=>d.kind==='egg').status,'awaiting_setup');
 actor.gameWallet={provider:'legacy',address:wallet,chainId:46630};await routes.route(ctx());assert.equal(registered.campaign,null);
 await assert.rejects(routes.route({...ctx(),body:async()=>({...base,adultConfirmed:false})}),/at least 18/);
});

test('sealed egg metadata declares one of 33 and excludes personally identifying data',async()=>{
 const routes=createPassportRoutes({store:{configured:true,close:async()=>{}},accountStore:null});
 const info=await routes.route({path:'/passport/egg-metadata/46630/33.json',method:'GET',error:makeError});
 assert.match(info.name,/33 \/ 33/);assert.equal(info.attributes.find(a=>a.trait_type==='Founding Edition').value,33);assert.equal(info.properties.noRealWorldValue,true);assert.equal(JSON.stringify(info).includes('email'),false);
 await assert.rejects(routes.route({path:'/passport/egg-metadata/46630/34.json',method:'GET',error:makeError}),/Unknown Mystery Golden Egg/);
});

test('egg confirmation requires the same authenticated Para wallet and exact reserved edition',async()=>{
 const wallet=Wallet.createRandom().address,actor={id:randomUUID(),gameWallet:{provider:'para',address:wallet,chainId:46630}},registered={id:randomUUID(),wallet,chainId:46630,eggSerial:11,deliveries:[]};
 let proof={confirmed:true,wallet,chainId:46630,tokenId:'11',transactionHash:'0x'+'1'.repeat(64)};
 const routes=createPassportRoutes({store:{get:async()=>registered,configured:true,close:async()=>{}},accountStore:null,deliveryRuntime:{status:()=>({ready:true,kinds:['visa','egg']}),verifyEgg:async()=>proof}});
 const ctx={path:'/passport/egg/acceptance',method:'GET',req:{},authenticated:async(_,fn)=>fn(actor),error:makeError};
 assert.equal((await routes.route(ctx)).confirmed,true);
 proof={...proof,tokenId:'12'};assert.equal((await routes.route(ctx)).confirmed,false);
 actor.gameWallet={...actor.gameWallet,address:Wallet.createRandom().address};assert.equal((await routes.route(ctx)).paraWalletVerified,false);
});

test('PostgreSQL: 40 simultaneous signup requests allocate exactly 33 distinct egg reservations, once per account',{skip:!process.env.AK_PASSPORT_TEST_DATABASE_URL,timeout:90000},async t=>{
 const {Pool}=require('pg'),url=process.env.AK_PASSPORT_TEST_DATABASE_URL;
 if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Use an empty disposable local test database.');
 const schema='ak_eggs_'+randomBytes(8).toString('hex'),admin=new Pool({connectionString:url});
 await admin.query('CREATE SCHEMA '+schema);
 const pool=new Pool({connectionString:url,options:'-c search_path='+schema,max:12}),store=createPassportStore({pool,eggsEnabled:true});
 t.after(async()=>{await store.close();await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();});
 const ids=Array.from({length:40},()=>randomUUID());
 const all=await Promise.all(ids.map((id,i)=>store.register(id,{playerName:'Explorer',wallet:'0x'+String(i+1).padStart(40,'0'),chainId:46630,souvenir:false,consentVersion:'antarctic-visa-v2',walletProvider:'para',achievementOptIn:false,campaign:'first33-20261114'},now)));
 const winners=all.filter(p=>p.eggSerial!==null);assert.equal(winners.length,33);
 assert.deepEqual(winners.map(p=>p.eggSerial).sort((a,b)=>a-b),Array.from({length:33},(_,i)=>i+1));
 assert.ok(winners.every(p=>p.deliveries.filter(d=>d.kind==='egg').length===1));
 assert.ok(all.filter(p=>p.eggSerial===null).every(p=>p.deliveries.every(d=>d.kind!=='egg')));
 const repeated=await store.register(ids[0],{playerName:'Explorer',wallet:'0x'+String(1).padStart(40,'0'),chainId:46630,souvenir:false,consentVersion:'antarctic-visa-v2',walletProvider:'para',campaign:'first33-20261114'},now);
 assert.equal(repeated.eggSerial,all[0].eggSerial);assert.equal((await store.get(ids[0])).deliveries.filter(d=>d.kind==='egg').length,all[0].eggSerial?1:0);
});
