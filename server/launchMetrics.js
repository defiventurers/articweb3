const {Pool}=require('pg');
const {createHash,timingSafeEqual}=require('node:crypto');
const chains=require('./gameWalletChains.json');
const LIVE_HALLS={subcontinent:['dominion'],china:['xiangqi','sanguo','sanyou','yanyi','shanshui','shanshui-2v2'],japan:['shogi','sannin'],vietnam:['co-tu-lenh']};
const PENDING=new Set(['queued','sending','submitted','retry']);
function createLaunchMetrics({databaseUrl=process.env.DATABASE_URL,pool,now=Date.now,launchAt=Date.parse(process.env.AK_LAUNCH_AT||'2026-11-14T00:00:00+05:30'),ownerKey=process.env.AK_LAUNCH_OWNER_KEY,serviceKey=process.env.AK_LAUNCH_SERVICE_KEY,operationsOptions={},chainId=Number(process.env.AK_VISA_CHAIN_ID||46630),rooms,deliveryEnabled=process.env.AK_VISA_DELIVERY_ENABLED==='true'}={}){
 const ownerCredential=ownerKey||serviceKey;let launchOperations;
 const db=pool||(databaseUrl?new Pool(require('./databaseSecurity').databaseOptions(databaseUrl)):null);let ready;
 db?.on?.('error',()=>{ready=null;});
 if(!Number.isFinite(launchAt)||!chains[chainId])throw Error('Invalid launch configuration.');
 const init=()=>{if(!db)throw Object.assign(Error('Launch statistics are awaiting durable storage.'),{status:503});return ready||(ready=db.query('CREATE TABLE IF NOT EXISTS ak_launch_visits (day DATE NOT NULL, session_hash TEXT NOT NULL, first_at BIGINT NOT NULL, PRIMARY KEY(day,session_hash))').catch(e=>{ready=null;throw e;}));};
 const cohort=()=>now()<launchAt?{since:Date.parse('2026-11-01T00:00:00+05:30'),phase:'prelaunch'}:{since:launchAt,phase:'launch'};
 async function query(sql,params=[]){try{return(await db.query(sql,params)).rows;}catch(e){if(e.code==='42P01')return null;throw e;}}
 async function snapshot(owner=false){
  await init();const {since,phase}=cohort();
  const [visits,accounts,wallets,passports,deliveries]=await Promise.all([
   query('SELECT count(*)::int AS n FROM ak_launch_visits WHERE first_at >= $1',[since]),
   query("SELECT count(*)::int AS n FROM ak_documents WHERE kind='account' AND COALESCE((body->>'createdAt')::bigint,0)>=$1 AND NOT body ? 'temporaryExpiresAt'",[since]),
   query("SELECT count(DISTINCT lower(body->'gameWallet'->>'address'))::int AS n FROM ak_documents WHERE kind='account' AND COALESCE((body->>'createdAt')::bigint,0)>=$1 AND NOT body ? 'temporaryExpiresAt' AND body->'gameWallet'->>'address' ~ '^0x[0-9a-fA-F]{40}$' AND body->'gameWallet'->>'chainId'=$2",[since,String(chainId)]),
   query('SELECT count(*)::int AS n FROM ak_passports WHERE created_at >= $1 AND chain_id=$2',[since,chainId]),
   query("SELECT d.status,count(DISTINCT d.account_id)::int AS n,COALESCE(sum(d.attempts),0)::int AS attempts FROM ak_passport_deliveries d JOIN ak_passports p ON p.account_id=d.account_id AND p.chain_id=d.chain_id WHERE d.kind='visa' AND p.created_at >= $1 AND d.chain_id=$2 GROUP BY d.status",[since,chainId])
  ]);
  const count=status=>deliveries?deliveries.filter(d=>status.has(d.status)).reduce((n,d)=>n+Number(d.n),0):null;
  // Unscoped legacy config belongs only to the selected backend chain.
  const contract=process.env['AK_VISA_CONTRACT_'+chainId]||process.env.AK_VISA_CONTRACT;
  return {generatedAt:now(),since,phase,timezone:'Asia/Kolkata',visits:visits?.[0]?.n??null,signups:accounts?.[0]?.n??null,wallets:wallets?.[0]?.n??null,registrations:passports?.[0]?.n??null,confirmedPassports:count(new Set(['confirmed'])),pendingPassports:count(PENDING),blockedPassports:count(new Set(['blocked'])),deliveryEnabled,chain:{id:chainId,name:chains[chainId].name,explorer:chains[chainId].blockExplorers.default.url,contract:/^0x[0-9a-f]{40}$/i.test(contract||'')&&!/^0x0{40}$/i.test(contract)?contract:null},...(owner?{deliveryStates:deliveries,mintAttempts:deliveries?deliveries.reduce((n,d)=>n+Number(d.attempts||0),0):null,storage:{visits:!!visits,accounts:!!accounts,wallets:!!wallets,passports:!!passports,deliveries:!!deliveries},launchAt}:{}),definitions:{visits:'Best-effort anonymous browser sessions per UTC day and launch cohort, not unique people. Bots are not independently filtered; no IP or visitor identity is persisted.',signups:'Accounts created since cohort start; temporary accounts excluded.',wallets:'Distinct server-bound game-wallet addresses on the selected chain for accounts in this cohort; not all wallets ever created.',registrations:'Passport registrations on the selected chain; not NFT issuance.',confirmedPassports:'Unique accounts with a passport mint checked by the delivery worker for claim, owner and confirmations. Not an independent chain indexer.',pendingPassports:'Queued, sending, submitted or retrying passport jobs; blocked jobs reported separately.',mintAttempts:'Worker lease attempts, including receipt polling and crash recovery; not necessarily distinct transactions.'}};
 }
 let earlyCache,earlyPending;
 async function earlySnapshot(){
  if(earlyCache&&now()-earlyCache.generatedAt<5000)return earlyCache;
  if(earlyPending)return earlyPending;
  earlyPending=(async()=>{await init();const source=require('./earlySignup').SOURCE;
   const rows=await query(`WITH early AS (
    SELECT id,body,CASE WHEN body#>>'{earlySignup,firstAt}' ~ '^[0-9]{1,16}$' THEN (body#>>'{earlySignup,firstAt}')::bigint ELSE 0 END AS at
    FROM ak_documents WHERE kind='account' AND body#>>'{earlySignup,source}'=$1 AND body#>>'{gameWallet,provider}'='para' AND NOT body ? 'temporaryExpiresAt'
   ) SELECT count(DISTINCT e.id)::int AS signups,
    count(DISTINCT e.id) FILTER(WHERE (to_timestamp(e.at/1000.0) AT TIME ZONE 'Asia/Kolkata')::date=(to_timestamp($3/1000.0) AT TIME ZONE 'Asia/Kolkata')::date)::int AS today,
    count(DISTINCT lower(e.body#>>'{gameWallet,address}'))::int AS wallets,
    count(DISTINCT p.account_id)::int AS registered,
    count(DISTINCT d.id) FILTER(WHERE d.kind='visa' AND d.status='confirmed')::int AS passports,
    count(DISTINCT d.id) FILTER(WHERE d.kind='visa' AND d.status<>'confirmed')::int AS pending,
    count(DISTINCT d.id) FILTER(WHERE d.kind='egg')::int AS eggs_reserved,
    count(DISTINCT d.id) FILTER(WHERE d.kind='egg' AND d.status='confirmed')::int AS eggs_received,
    (SELECT COALESCE(max(egg_serial),0)::int FROM ak_passports WHERE chain_id=$2) AS allocated_global,
    (SELECT count(*)::int FROM ak_documents WHERE kind='account' AND body#>>'{gameWallet,provider}'='para' AND body#>>'{earlySignup,source}' IS NULL AND NOT body ? 'temporaryExpiresAt') AS older_unattributed
    FROM early e LEFT JOIN ak_passports p ON p.account_id::text=e.id AND p.chain_id=$2
    LEFT JOIN ak_passport_deliveries d ON d.account_id=p.account_id AND d.chain_id=p.chain_id`,[source,chainId,now()]);
   const v=rows?.[0];earlyCache={source,generatedAt:now(),timezone:'Asia/Kolkata',signups:v?.signups??null,today:v?.today??null,wallets:v?.wallets??null,passportsRegistered:v?.registered??null,passportsReceived:v?.passports??null,passportsPending:v?.pending??null,eggsReserved:v?.eggs_reserved??null,eggsReceived:v?.eggs_received??null,eggsRemaining:v?Math.max(0,33-v.allocated_global):null,olderUnattributedAccounts:v?.older_unattributed??null,definitions:{signups:'Unique verified Para accounts that completed signup on antarcticgaming.co/early. Repeat sign-ins count once; returning existing accounts count when they first complete this signup.',olderUnattributedAccounts:'Older or other-platform Para accounts without page attribution. Excluded from early signups until they complete this signup.',received:'Confirmed by the delivery worker, separate from registration and reservation.',eggsRemaining:'Remaining slots in the shared first-33 launch allocation.'}};return earlyCache;
  })().finally(()=>{earlyPending=null;});return earlyPending;
 }
 function activity(){
  if(!rooms)return {generatedAt:now(),available:false,halls:null,definition:'Live room occupancy is not connected.'};
  const halls={};for(const [id,ids]of Object.entries(LIVE_HALLS)){const live=[...rooms.values()].filter(r=>r.gameId==='arctic-play'&&['waiting','playing'].includes(r.status)&&ids.includes(r.tableId));halls[id]={tables:live.length,players:live.reduce((n,r)=>n+Object.values(r.players||{}).filter(p=>!p.bot&&!p.left).length,0)};}
  return {generatedAt:now(),available:true,halls,definition:'Human seats in active private tables; not concurrent connected-player presence.'};
 }
 async function route({path,method,req,body,error,url}){
  if(path==='/launch/early'&&method==='GET')return earlySnapshot();
  if(path==='/launch/activity'&&method==='GET')return activity();
  if(path==='/launch/public'&&method==='GET')return snapshot();
  if(path==='/launch/visit'&&method==='POST'){
   const b=await body(req);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.sessionId||''))throw error('Invalid anonymous visit.');
   await init();const at=now(),day=new Date(at).toISOString().slice(0,10),{since}=cohort();
   const h=createHash('sha256').update('AK-VISIT:'+since+':'+day+':'+b.sessionId).digest('hex');
   await db.query('INSERT INTO ak_launch_visits(day,session_hash,first_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[day,h,at]);return {ok:true};
  }
  if((path==='/launch/owner'&&method==='GET')||(path==='/launch/owner/v2'&&method==='GET')||(path==='/launch/owner/verify-passport'&&method==='POST')){
   const supplied=(req.headers.authorization||'').replace(/^Bearer /,'');
   if(!ownerCredential||ownerCredential.length<32||Buffer.byteLength(supplied)!==Buffer.byteLength(ownerCredential)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(ownerCredential)))throw error('Owner access required.',401);
   if(path==='/launch/owner')return snapshot(true);
   if(!launchOperations)launchOperations=require('./launchOperations').createLaunchOperations({pool:db,...operationsOptions});
   if(path==='/launch/owner/v2')return launchOperations.snapshot(url?.searchParams.get('period')||'current');
   return launchOperations.verifyImported(await body(req));
  }
 }
 return {route,activity,snapshot,close:async()=>{launchOperations?.close();await db?.end();}};
}
module.exports={createLaunchMetrics,LIVE_HALLS};
