const {Pool}=require('pg');
const {createHash,timingSafeEqual}=require('node:crypto');
const chains=require('./gameWalletChains.json');
const LIVE_HALLS={subcontinent:['dominion'],china:['xiangqi','sanguo','sanyou','yanyi','shanshui'],japan:['shogi','sannin'],vietnam:['co-tu-lenh']};
function createLaunchMetrics({databaseUrl=process.env.DATABASE_URL,pool,now=Date.now,launchAt=Date.parse(process.env.AK_LAUNCH_AT||'2026-11-14T00:00:00+05:30'),ownerKey=process.env.AK_LAUNCH_OWNER_KEY,serviceKey=process.env.AK_LAUNCH_DASHBOARD_SERVICE_KEY,operationsOptions,chainId=Number(process.env.AK_VISA_CHAIN_ID||46630),rooms=new Map()}={}){
 const db=pool||(databaseUrl?new Pool({connectionString:databaseUrl,ssl:process.env.DATABASE_SSL==='true'||/sslmode=require/.test(databaseUrl)?{rejectUnauthorized:false}:undefined}):null);let ready;
 const operations=require('./launchOperations').createLaunchOperations({pool:db,now,launchAt,...operationsOptions});
 function ownerAllowed(req){const supplied=(req.headers.authorization||'').replace(/^Bearer /,'');return [ownerKey,serviceKey].some(k=>typeof k==='string'&&k.length>=32&&Buffer.byteLength(supplied)===Buffer.byteLength(k)&&timingSafeEqual(Buffer.from(supplied),Buffer.from(k)));}
 if(!Number.isFinite(launchAt)||!chains[chainId])throw Error('Invalid launch configuration.');
 const init=()=>{if(!db)throw Object.assign(Error('Launch statistics are awaiting durable storage.'),{status:503});return ready||(ready=db.query('CREATE TABLE IF NOT EXISTS ak_launch_visits (day DATE NOT NULL, session_hash TEXT NOT NULL, first_at BIGINT NOT NULL, PRIMARY KEY(day,session_hash))').catch(e=>{ready=null;throw e;}));};
 const cohort=()=>now()<launchAt?{since:Date.parse('2026-11-01T00:00:00Z'),phase:'prelaunch'}:{since:launchAt,phase:'launch'};
 async function query(sql,params=[]){try{return(await db.query(sql,params)).rows;}catch(e){if(e.code==='42P01')return null;throw e;}}
 async function snapshot(owner=false){await init();const {since,phase}=cohort();const [visits,accounts,passports,deliveries]=await Promise.all([
  query('SELECT count(*)::int AS n FROM ak_launch_visits WHERE first_at >= $1',[since]),
  query("SELECT count(*)::int AS n FROM ak_documents WHERE kind='account' AND COALESCE((body->>'createdAt')::bigint,0)>=$1 AND NOT body ? 'temporaryExpiresAt'",[since]),
  query('SELECT count(*)::int AS n FROM ak_passports WHERE created_at >= $1 AND chain_id=$2',[since,chainId]),
  query("SELECT d.status,count(*)::int AS n FROM ak_passport_deliveries d JOIN ak_passports p ON p.account_id=d.account_id WHERE d.kind='visa' AND p.created_at >= $1 AND d.chain_id=$2 GROUP BY d.status",[since,chainId])
 ]);const confirmed=deliveries?.find(r=>r.status==='confirmed')?.n||0;const key='AK_VISA_CONTRACT_'+chainId,contract=process.env[key]||process.env.AK_VISA_CONTRACT;return {generatedAt:now(),since:since||Date.parse('2026-11-01T00:00:00Z'),phase,visits:visits?.[0]?.n??null,signups:accounts?.[0]?.n??null,registrations:passports?.[0]?.n??null,confirmedPassports:deliveries?confirmed:null,pendingPassports:deliveries?deliveries.filter(d=>d.status!=='confirmed').reduce((n,d)=>n+d.n,0):null,deliveryEnabled:process.env.AK_VISA_DELIVERY_ENABLED==='true',chain:{id:chainId,name:chains[chainId].name,explorer:chains[chainId].blockExplorers.default.url,contract:/^0x[0-9a-f]{40}$/i.test(contract||'')&&!/^0x0{40}$/i.test(contract)?contract:null},...(owner?{deliveryStates:deliveries,storage:{visits:!!visits,accounts:!!accounts,passports:!!passports,deliveries:!!deliveries},launchAt}:{}),definitions:{visits:'Anonymous browser sessions per UTC day; no visitor identity or IP persisted.',signups:'Accounts created since cohort start; temporary accounts excluded.',confirmedPassports:'Delivery worker checked successful mint and owner; not an independent chain indexer.'}};}
 function activity(){const halls={};for(const [id,ids]of Object.entries(LIVE_HALLS)){const live=[...rooms.values()].filter(r=>r.gameId==='arctic-play'&&['waiting','playing'].includes(r.status)&&ids.includes(r.tableId));halls[id]={tables:live.length,players:live.reduce((n,r)=>n+Object.values(r.players||{}).filter(p=>!p.bot&&!p.left).length,0)};}return {generatedAt:now(),halls,definition:'Seats occupied by humans in active private tables; not concurrent online presence.'};}
 async function route(ctx){const{path,method,req,body,error}=ctx;
  if(path==='/launch/owner/v2'&&method==='GET'){if(!ownerAllowed(req))throw error('Owner access required.',401);await init();return operations.snapshot(ctx.url?.searchParams.get('period')||'current');}
  if(path==='/launch/owner/verify-passport'&&method==='POST'){if(!ownerAllowed(req))throw error('Owner access required.',401);return operations.verifyImported(await body(req));}
  if(path==='/launch/activity'&&method==='GET')return activity();
  if(path==='/launch/public'&&method==='GET')return snapshot();
  if(path==='/launch/visit'&&method==='POST'){const b=await body(req);if(!/^[0-9a-f-]{36}$/i.test(b.sessionId||''))throw error('Invalid anonymous visit.');await init();const at=now(),day=new Date(at).toISOString().slice(0,10),h=createHash('sha256').update('AK-VISIT:'+day+':'+b.sessionId).digest('hex');await db.query('INSERT INTO ak_launch_visits(day,session_hash,first_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[day,h,at]);return {ok:true};}
  if(path==='/launch/owner'&&method==='GET'){if(!ownerAllowed(req))throw error('Owner access required.',401);return snapshot(true);}
 }
 return {route,activity,snapshot,close:async()=>{operations.close();await db?.end();}};
}
module.exports={createLaunchMetrics,LIVE_HALLS};
