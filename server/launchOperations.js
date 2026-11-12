const {createPassportReader}=require('./antarcticPassportWorker');
const CHAINS=require('./gameWalletChains.json');
const VERIFIED="body#>>'{identity,provider}' IN ('google','email','google-wallet','para-wallet','privy')";
const CREATED="CASE WHEN body->>'createdAt' ~ '^[0-9]{1,16}$' THEN (body->>'createdAt')::bigint ELSE NULL END";
const WALLET="body#>>'{gameWallet,provider}' IN ('para','metamask-embedded') AND body#>>'{gameWallet,address}' ~ '^0x[0-9a-fA-F]{40}$' AND body#>>'{gameWallet,chainId}'=$3::text";
const DAY=ms=>"(to_timestamp(("+ms+")/1000.0) AT TIME ZONE 'Asia/Kolkata')::date::text";
const zero='0x'+'0'.repeat(40);
function createLaunchOperations({pool:db,env=process.env,now=Date.now,readerFactory=createPassportReader,batchSize=8,launchAt=Date.parse(env.AK_LAUNCH_AT||'2026-11-14T00:00:00+05:30')}={}){
 const chainId=Number(env.AK_VISA_CHAIN_ID||46630),chain=CHAINS[chainId];
 if(!chain)throw Error('Unsupported dashboard chain.');
 const contract=env['AK_VISA_CONTRACT_'+chainId]||env.AK_VISA_CONTRACT;
 let initialized,reader,refreshing,lastRefresh=0,collection=null,chainError=null;
 const validContract=()=>/^0x[0-9a-f]{40}$/i.test(contract||'')&&contract.toLowerCase()!==zero;
 async function init(){
  if(!db)throw Error('Durable launch storage is unavailable.');
  return initialized||(initialized=(async()=>{const c=await db.connect();try{
   await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(hashtextextended('ak-launch-operations-v1',0))");
   await c.query(`CREATE TABLE IF NOT EXISTS ak_launch_passport_checks (
    chain_id INTEGER NOT NULL, contract TEXT NOT NULL, delivery_id TEXT NOT NULL,
    transaction_hash TEXT, token_id TEXT, verified BOOLEAN NOT NULL,
    checked_at BIGINT NOT NULL, minted_at BIGINT, block_number BIGINT, block_hash TEXT, error_code TEXT,
    PRIMARY KEY(chain_id,contract,delivery_id)
   ); CREATE INDEX IF NOT EXISTS ak_launch_passport_check_due ON ak_launch_passport_checks(chain_id,contract,checked_at);`);
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}})().catch(e=>{initialized=null;throw e;}));
 }
 async function tables(c=db){const r=await c.query("SELECT to_regclass('ak_documents') IS NOT NULL AS accounts,to_regclass('ak_passports') IS NOT NULL AS passports,to_regclass('ak_passport_deliveries') IS NOT NULL AS deliveries,to_regclass('ak_launch_visits') IS NOT NULL AS visits");return r.rows[0];}
 function range(period='current'){
  const until=now(),prelaunch=Date.parse('2026-11-01T00:00:00+05:30');
  const periods={current:until<launchAt?prelaunch:launchAt,prelaunch,launch:launchAt,'24h':until-86400000,'7d':until-7*86400000,all:0};
  if(!(period in periods))throw Object.assign(Error('Choose a supported dashboard period.'),{status:400});
  return {period,since:periods[period],until:period==='prelaunch'?Math.min(until,launchAt):until,timezone:'Asia/Kolkata',launchAt,phase:until<launchAt?'prelaunch':'launch',notStarted:period==='launch'&&until<launchAt};
 }
 async function getReader(){
  if(!validContract())throw Error('Passport contract is awaiting setup.');
  reader||=await readerFactory({chainId,visa:contract,rpc:env['AK_VISA_RPC_URL_'+chainId]||env.AK_VISA_RPC_URL||chain.rpcUrls.default.http[0]});return reader;
 }
 async function saveCheck(job,evidence,errorCode){
  const verified=evidence?.confirmed===true&&String(evidence.tokenId)===String(job.token_id);
  if(evidence?.confirmed&&!verified)errorCode='TOKEN_RECORD_MISMATCH';
  await db.query(`INSERT INTO ak_launch_passport_checks(chain_id,contract,delivery_id,transaction_hash,token_id,verified,checked_at,minted_at,block_number,block_hash,error_code)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
   ON CONFLICT(chain_id,contract,delivery_id) DO UPDATE SET transaction_hash=EXCLUDED.transaction_hash,token_id=EXCLUDED.token_id,verified=EXCLUDED.verified,checked_at=EXCLUDED.checked_at,minted_at=EXCLUDED.minted_at,block_number=EXCLUDED.block_number,block_hash=EXCLUDED.block_hash,error_code=EXCLUDED.error_code WHERE ak_launch_passport_checks.checked_at<=EXCLUDED.checked_at`,
   [chainId,contract.toLowerCase(),job.id,job.tx_hash,job.token_id,verified,now(),evidence?.mintedAt||null,evidence?.blockNumber??null,evidence?.blockHash||null,errorCode||null]);
 }
 async function refresh(){
  if(refreshing)return refreshing;if(lastRefresh&&now()-lastRefresh<60000)return;
  refreshing=(async()=>{await init();const available=await tables();if(!available.passports||!available.deliveries){chainError='PASSPORT_STORAGE_UNAVAILABLE';return;}
   try{
    const r=await getReader();
    const jobs=(await db.query(`SELECT d.* FROM ak_passport_deliveries d JOIN ak_passports p ON p.account_id=d.account_id AND p.chain_id=d.chain_id
     LEFT JOIN ak_launch_passport_checks c ON c.delivery_id=d.id AND c.chain_id=d.chain_id AND c.contract=$2
     WHERE d.chain_id=$1 AND d.kind='visa' AND d.status='confirmed'
     ORDER BY c.checked_at ASC NULLS FIRST,d.id LIMIT $3`,[chainId,contract.toLowerCase(),batchSize])).rows;
    for(const job of jobs){const evidence=await r.verifyPassport(job);await saveCheck(job,evidence,evidence.confirmed?null:'RECEIPT_OR_OWNERSHIP_MISMATCH');}
    collection=await r.collectionSnapshot();chainError=null;
   }catch{chainError='CHAIN_RECHECK_UNAVAILABLE';reader?.close();reader=null;}
   finally{lastRefresh=now();}
  })().finally(()=>{refreshing=null;});return refreshing;
 }
 async function verifyImported(input){
  await init();
  if(input.chainId!==chainId||input.contract?.toLowerCase()!==contract?.toLowerCase())return {confirmed:false,errorCode:'CHAIN_OR_CONTRACT_MISMATCH'};
  if(!/^[1-9][0-9]{0,30}$/.test(String(input.tokenId||''))||!/^0x[0-9a-f]{64}$/i.test(input.transactionHash||'')||!/^0x[0-9a-f]{40}$/i.test(input.wallet||''))throw Object.assign(Error('Choose a passport acceptance record with a token, receipt and wallet.'),{status:400});
  const available=await tables();if(!available.accounts||!available.deliveries||!available.passports)return {confirmed:false,errorCode:'PASSPORT_STORAGE_UNAVAILABLE'};
  const job=(await db.query(`SELECT d.*,a.body#>>'{gameWallet,provider}' AS provider,a.body#>>'{gameWallet,address}' AS bound_wallet,a.body#>>'{gameWallet,chainId}' AS bound_chain
   FROM ak_passport_deliveries d JOIN ak_passports p ON p.account_id=d.account_id AND p.chain_id=d.chain_id
   JOIN ak_documents a ON a.kind='account' AND a.id=d.account_id::text
   WHERE d.chain_id=$1 AND d.kind='visa' AND d.status='confirmed' AND d.token_id=$2 AND lower(d.tx_hash)=lower($3) AND lower(d.wallet)=lower($4) LIMIT 1`,[chainId,String(input.tokenId),input.transactionHash,input.wallet])).rows[0];
  if(!job)return {confirmed:false,errorCode:'CONFIRMED_DELIVERY_NOT_FOUND'};
  const paraBound=job.provider==='para'&&job.bound_chain===String(chainId)&&job.bound_wallet?.toLowerCase()===job.wallet.toLowerCase();
  try{
   const evidence=await(await getReader()).verifyPassport(job);
   const matches=evidence.confirmed&&String(evidence.tokenId)===String(input.tokenId)&&(!input.blockHash||input.blockHash.toLowerCase()===evidence.blockHash?.toLowerCase())&&(input.blockNumber===undefined||Number(input.blockNumber)===evidence.blockNumber);
   await saveCheck(job,evidence,evidence.confirmed?null:'RECEIPT_OR_OWNERSHIP_MISMATCH');
   return {...evidence,confirmed:matches&&paraBound,paraWalletVerified:paraBound,exportMatches:!!matches,checkedAt:new Date(now()).toISOString(),...(matches&&paraBound?{}:{errorCode:!matches?'EXPORT_OR_CHAIN_MISMATCH':'PARA_WALLET_MISMATCH'})};
  }catch{return {confirmed:false,errorCode:'CHAIN_RECHECK_UNAVAILABLE'};}
 }
 async function snapshot(period){
  await init();await refresh();const window=range(period),c=await db.connect();
  try{
   await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const available=await tables(c),args=[window.since,window.until,chainId];
   let account=null,visits=null,registrations=null,health=null,checks=null,series={signups:[],passports:[],visits:[]},recent=[];
   const chartSince=Math.max(window.since,now()-13*86400000);
   if(available.accounts){
    account=(await c.query(`WITH a AS (SELECT body,${CREATED} AS created FROM ak_documents WHERE kind='account' AND NOT body ? 'temporaryExpiresAt') SELECT
     count(*)::int AS accounts,count(*) FILTER(WHERE ${VERIFIED})::int AS signups,
     count(DISTINCT lower(body#>>'{gameWallet,address}')) FILTER(WHERE ${VERIFIED} AND ${WALLET})::int AS wallets,
     count(*) FILTER(WHERE ${VERIFIED} AND ${WALLET} AND NOT body ? 'firstGameWalletVerifiedAt')::int AS historical_wallet_times
     FROM a WHERE created >= $1 AND created <= $2`,args)).rows[0];
    series.signups=(await c.query(`SELECT ${DAY(CREATED)} AS day,count(*)::int AS n FROM ak_documents WHERE kind='account' AND NOT body ? 'temporaryExpiresAt' AND ${VERIFIED} AND ${CREATED}>=$1 AND ${CREATED}<=$2 GROUP BY 1 ORDER BY 1`,[chartSince,window.until])).rows;
   }
   if(available.visits){visits=Number((await c.query('SELECT count(*)::int AS n FROM ak_launch_visits WHERE first_at >= $1 AND first_at <= $2',[window.since,window.until])).rows[0].n);series.visits=(await c.query(`SELECT ${DAY('first_at')} AS day,count(*)::int AS n FROM ak_launch_visits WHERE first_at >= $1 AND first_at <= $2 GROUP BY 1 ORDER BY 1`,[chartSince,window.until])).rows;}
   if(available.passports)registrations=Number((await c.query('SELECT count(*)::int AS n FROM ak_passports WHERE chain_id=$3 AND created_at >= $1 AND created_at <= $2',args)).rows[0].n);
   if(available.passports&&available.deliveries){
    const scope=[chainId,validContract()?contract.toLowerCase():'unconfigured'];
    const states=(await c.query(`SELECT d.status,count(*)::int AS n FROM ak_passport_deliveries d JOIN ak_passports p ON p.account_id=d.account_id AND p.chain_id=d.chain_id WHERE d.kind='visa' AND d.chain_id=$1 GROUP BY d.status`,[chainId])).rows;
    const errors=(await c.query(`SELECT d.error_code,count(*)::int AS n FROM ak_passport_deliveries d JOIN ak_passports p ON p.account_id=d.account_id AND p.chain_id=d.chain_id WHERE d.kind='visa' AND d.chain_id=$1 AND d.status IN ('retry','blocked') GROUP BY d.error_code`,[chainId])).rows;
    const oldest=(await c.query(`SELECT min(p.created_at)::text AS at FROM ak_passport_deliveries d JOIN ak_passports p ON p.account_id=d.account_id AND p.chain_id=d.chain_id WHERE d.kind='visa' AND d.chain_id=$1 AND d.status<>'confirmed'`,[chainId])).rows[0].at;
    const counts=Object.fromEntries(states.map(s=>[s.status,s.n]));
    health={states:counts,confirmedByWorker:counts.confirmed||0,backlog:states.filter(s=>s.status!=='confirmed').reduce((n,s)=>n+s.n,0),retrying:counts.retry||0,blocked:counts.blocked||0,oldestPendingRegistrationAt:oldest?Number(oldest):null,errors:errors.map(e=>({code:/^[A-Z0-9_]{1,80}$/.test(e.error_code||'')?e.error_code:'DELIVERY_ERROR',count:e.n}))};
    checks=(await c.query(`SELECT count(*) FILTER(WHERE c.verified)::int AS verified,count(*) FILTER(WHERE NOT c.verified)::int AS mismatches,min(c.checked_at)::text AS checked_at,max(c.checked_at)::text AS latest_checked_at,
     count(*) FILTER(WHERE c.verified AND c.minted_at >= $3 AND c.minted_at <= $4)::int AS period_confirmed
     FROM ak_launch_passport_checks c JOIN ak_passport_deliveries d ON d.id=c.delivery_id AND d.chain_id=c.chain_id JOIN ak_passports p ON p.account_id=d.account_id AND p.chain_id=d.chain_id
     WHERE c.chain_id=$1 AND c.contract=$2 AND d.kind='visa' AND d.status='confirmed' AND c.transaction_hash=d.tx_hash AND c.token_id=d.token_id`,[...scope,window.since,window.until])).rows[0];
    series.passports=(await c.query(`SELECT ${DAY('c.minted_at')} AS day,count(*)::int AS n FROM ak_launch_passport_checks c JOIN ak_passport_deliveries d ON d.id=c.delivery_id AND d.chain_id=c.chain_id WHERE c.chain_id=$1 AND c.contract=$2 AND c.verified AND d.status='confirmed' AND c.transaction_hash=d.tx_hash AND c.token_id=d.token_id AND c.minted_at >= $3 AND c.minted_at <= $4 GROUP BY 1 ORDER BY 1`,[...scope,chartSince,window.until])).rows;
    recent=(await c.query(`SELECT c.token_id,c.transaction_hash,c.verified,c.minted_at,c.checked_at,c.block_number,c.error_code FROM ak_launch_passport_checks c JOIN ak_passport_deliveries d ON d.id=c.delivery_id AND d.chain_id=c.chain_id WHERE c.chain_id=$1 AND c.contract=$2 AND d.kind='visa' ORDER BY c.minted_at DESC NULLS LAST,c.checked_at DESC LIMIT 12`,scope)).rows.map(r=>({tokenId:r.token_id,transactionHash:r.transaction_hash,verified:r.verified,mintedAt:r.minted_at?Number(r.minted_at):null,checkedAt:Number(r.checked_at),blockNumber:r.block_number?Number(r.block_number):null,errorCode:r.error_code}));
   }
   await c.query('COMMIT');
   const chainTotal=collection&&/^\d+$/.test(collection.totalIssued)?Number(collection.totalIssued):null;
   const checked=checks?.checked_at?Number(checks.checked_at):collection?.checkedAt?Date.parse(collection.checkedAt):null;
   return {version:2,generatedAt:now(),range:window,chartSince,totals:{signups:account?.signups??null,accountsCreated:account?.accounts??null,walletsReady:account?.wallets??null,visits,registrations,confirmedPassports:checks&&checked?checks.period_confirmed:health?.confirmedByWorker===0?0:null},deliveryHealth:health,
    reconciliation:{verified:checks?.verified??null,mismatches:checks?.mismatches??null,unchecked:health&&checks?Math.max(0,health.confirmedByWorker-checks.verified-checks.mismatches):null,collectionTotal:chainTotal,unmatchedOnchain:chainTotal!==null&&checks?Math.max(0,chainTotal-checks.verified):null,complete:!chainError&&!!checks&&checks.mismatches===0&&checks.verified===health?.confirmedByWorker&&chainTotal===checks.verified,checkedAt:checked,latestCheckedAt:checks?.latest_checked_at?Number(checks.latest_checked_at):null,difference:chainTotal!==null&&checks?chainTotal-checks.verified:null,stale:!checked||now()-checked>900000,errorCode:chainError,collection},
    recentReceipts:recent,series,storage:available,walletCoverage:{historicalVerificationTimeUnknown:account?.historical_wallet_times??null},
    runtime:require('./passportDeliveryRuntime').runtime.status(),chain:{id:chainId,name:chain.name,testnet:chain.testnet,contract:validContract()?contract:null,explorer:chain.blockExplorers.default.url},
    visibility:{dashboard:'owner-private',legacyAggregateEndpoint:'unchanged',sourceVisibility:'unchanged'},
    definitions:{signups:'Verified sign-in accounts created in the selected window; temporary and legacy unverified accounts excluded.',walletsReady:'Distinct verified game-wallet addresses on this chain attached to those signup accounts. This proves readiness, not the provider wallet creation date.',confirmedPassports:'Successful canonical mint receipts and matching claims/ownership rechecked on this collection; counted by onchain mint time.',visits:'Anonymous browser sessions counted once per UTC day, grouped here by first observation in IST. Not unique people; APK opens and blocked tracking are outside coverage.',journey:'Stages use their own event dates and are not an identity-linked visitor conversion funnel.',reconciliation:'Bounded read-only rechecks; counts show the last checked blocks/timestamps. Two canonical L2 confirmations do not establish Ethereum finality.'}};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 return {init,snapshot,refresh,verifyImported,close:()=>{reader?.close();}};
}
module.exports={createLaunchOperations};
