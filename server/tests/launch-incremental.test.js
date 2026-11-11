const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createLaunchMetrics}=require('../launchMetrics');
const {createPassportRoutes}=require('../antarcticPassport');
const {createPassportStore}=require('../antarcticPassportStore');
const {deliverOne,workerConfig}=require('../antarcticPassportWorker');
const {createGoogleGameWallet}=require('../googleGameWallet');
const error=(message,status=400)=>Object.assign(Error(message),{status});
const wallet='0x1234567890123456789012345678901234567890';
function metricPool(){const calls=[];return {calls,async query(sql,args){calls.push({sql,args});if(sql.includes('CREATE TABLE'))return {rows:[]};if(sql.includes('FROM ak_launch_visits'))return {rows:[{n:12}]};if(sql.includes('count(DISTINCT lower'))return {rows:[{n:3}]};if(sql.includes("kind='account'"))return {rows:[{n:5}]};if(sql.includes('FROM ak_passports WHERE'))return {rows:[{n:4}]};if(sql.includes('GROUP BY d.status'))return {rows:[{status:'confirmed',n:2,attempts:4},{status:'queued',n:1,attempts:0},{status:'blocked',n:1,attempts:3}]};return {rows:[]};},async end(){}};}
test('cohort metrics separate signup, wallet, registration, pending, blocked and worker-confirmed mint counts',async()=>{
 const pool=metricPool(),metrics=createLaunchMetrics({pool,chainId:46630,now:()=>Date.parse('2026-11-14T12:00:00+05:30')});
 const publicData=await metrics.snapshot();assert.equal(publicData.phase,'launch');assert.equal(publicData.since,Date.parse('2026-11-14T00:00:00+05:30'));
 assert.equal(publicData.signups,5);assert.equal(publicData.wallets,3);assert.equal(publicData.registrations,4);assert.equal(publicData.confirmedPassports,2);assert.equal(publicData.pendingPassports,1);assert.equal(publicData.blockedPassports,1);
 assert.equal(publicData.deliveryStates,undefined);assert.equal(publicData.storage,undefined);assert.match(publicData.definitions.confirmedPassports,/Not an independent chain indexer/);
 const owner=await metrics.snapshot(true);assert.equal(owner.mintAttempts,7);assert.ok(owner.storage.passports);assert.ok(pool.calls.some(c=>c.args?.[1]===46630));
 await metrics.close();
});
test('visit hashes distinguish prelaunch and launch even within the same UTC day; no raw session persisted',async()=>{
 const pool=metricPool();let at=Date.parse('2026-11-13T18:29:00Z');const metrics=createLaunchMetrics({pool,now:()=>at});
 const id='12345678-1234-1234-1234-123456789012',ctx={path:'/launch/visit',method:'POST',req:{headers:{}},body:async()=>({sessionId:id}),error};
 await metrics.route(ctx);at=Date.parse('2026-11-13T18:31:00Z');await metrics.route(ctx);
 const writes=pool.calls.filter(c=>c.sql.includes('INSERT INTO'));assert.equal(writes[0].args[0],writes[1].args[0]);assert.notEqual(writes[0].args[1],writes[1].args[1]);assert.equal(writes[0].args[1].length,64);assert.equal(JSON.stringify(writes).includes(id),false);
 await assert.rejects(()=>metrics.route({...ctx,body:async()=>({sessionId:'------------------------------------'})}),/Invalid anonymous/);await metrics.close();
});
test('owner diagnostics require a separate strong key and missing tables remain unavailable rather than zero',async()=>{
 const pool={async query(sql){if(sql.includes('CREATE TABLE'))return{rows:[]};throw Object.assign(Error('missing'),{code:'42P01'});},async end(){}};
 const metrics=createLaunchMetrics({pool,ownerKey:'k'.repeat(40)}),ctx={path:'/launch/owner',method:'GET',req:{headers:{authorization:'Bearer wrong'}},error};
 await assert.rejects(()=>metrics.route(ctx),e=>e.status===401);
 const r=await metrics.route({...ctx,req:{headers:{authorization:'Bearer '+'k'.repeat(40)}}});assert.equal(r.signups,null);assert.equal(r.confirmedPassports,null);assert.equal(r.storage.passports,false);await metrics.close();
});
test('activity does not manufacture presence when room data is absent and counts human seats honestly when present',()=>{
 assert.equal(createLaunchMetrics().activity().available,false);
 const rooms=new Map([['one',{gameId:'arctic-play',tableId:'dominion',status:'playing',players:{a:{},b:{bot:true},c:{left:true}}}],['two',{gameId:'arctic-play',tableId:'shogi',status:'finished',players:{a:{}}}]]);
 const activity=createLaunchMetrics({rooms}).activity();assert.equal(activity.halls.subcontinent.players,1);assert.equal(activity.halls.japan.tables,0);assert.match(activity.definition,/not concurrent/);
});
test('a successful receipt does not override an insufficiently confirmed chain lookup',async()=>{
 const patches=[];let lookups=0;const store={claimJob:async()=>({id:'visa',kind:'visa',chain_id:46630,claim_id:'0x'+'a'.repeat(64),wallet}),updateJob:async(id,p)=>patches.push(p)};
 await deliverOne({store,adapter:{chainId:46630,lookup:async()=>lookups++?{recipient:wallet,tokenId:'7',confirmed:false}:null,send:async()=>'0x'+'b'.repeat(64),receipt:async()=>({status:1})}});
 assert.equal(patches.at(-1).status,'submitted');assert.equal(patches.at(-1).tokenId,'7');
});
test('passport-only worker accepts an absent arrival collection and disabled Google provider permits explicit Robinhood configuration',()=>{
 const config=workerConfig({AK_VISA_CHAIN_ID:'46630',AK_VISA_DELIVERY_ENABLED:'true',AK_VISA_RPC_URL:'https://rpc.testnet.chain.robinhood.com',AK_VISA_MINTER_KEY:'test-only-not-a-real-key',AK_VISA_CONTRACT:wallet});
 assert.equal(config.chainId,46630);assert.equal(config.arrival,undefined);
 assert.equal(createGoogleGameWallet({enabled:false,chainId:46630}).config().enabled,false);
 assert.throws(()=>createGoogleGameWallet({enabled:true,chainId:46630}),/Unsupported/);
});
test('passport store retries reject cross-chain reuse before writing any new job',async()=>{
 const commands=[],old={wallet,chain_id:11124};const client={async query(sql){commands.push(sql);return{rows:sql.startsWith('SELECT * FROM ak_passports')?[old]:[]};},release(){}};
 const store=createPassportStore({pool:{query:async()=>({rows:[]}),connect:async()=>client,end:async()=>{}}});
 await assert.rejects(()=>store.register('account',{wallet,chainId:46630},Date.now()),e=>e.status===409&&/migration/.test(e.message));assert.equal(commands.some(c=>c.startsWith('INSERT')),false);assert.ok(commands.includes('ROLLBACK'));await store.close();
});
test('public passport metadata is chain-scoped and excludes identity, names and wallets',async()=>{
 const routes=createPassportRoutes({chainId:46630,store:{configured:true,confirmedToken:async(chain,token)=>chain===46630&&token==='7'?{account_id:'private-account',created_at:Date.now()}:null,close:async()=>{}},accountStore:{get:async()=>({identity:{email:'private@example.test'},playerName:'Secret',gameWallet:{address:wallet}})}});
 const ctx={method:'GET',error};await assert.rejects(()=>routes.route({...ctx,path:'/passport/metadata/11124/7.json'}),e=>e.status===404);
 const data=await routes.route({...ctx,path:'/passport/metadata/46630/7.json'});assert.equal(data.properties.chainId,46630);const json=JSON.stringify(data);for(const privateValue of ['private-account','private@example.test','Secret',wallet])assert.equal(json.includes(privateValue),false);await routes.close();
});
test('dashboard and owner endpoint stay outside ordinary player screens with restrictive resource policy',async t=>{
 const {serveLaunchDashboard}=require('../launchDashboard');const server=http.createServer((req,res)=>{if(!serveLaunchDashboard(req,res)){res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const root='http://127.0.0.1:'+server.address().port;
 const page=await fetch(root+'/arctic-play/dashboard');assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(await page.text(),/Operator details/);
 const script=await(await fetch(root+'/arctic-play/dashboard/app.js')).text();assert.equal(script.includes('localStorage'),false);assert.match(script,/credentials:'omit'/);assert.equal((await fetch(root+'/arctic-play/dashboard',{method:'POST'})).status,405);
});
