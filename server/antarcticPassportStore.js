const {randomUUID,randomBytes}=require('node:crypto');
const {Pool}=require('pg');

// Passport registration and its two optional delivery jobs commit together.
// No plaintext Google identity or player name is ever used in a mint argument.
function createPassportStore({databaseUrl=process.env.DATABASE_URL,pool,eggsEnabled=process.env.AK_GOLDEN_EGG_PROMOTION_ENABLED==='true'}={}){
 const db=pool|| (databaseUrl?new Pool({connectionString:databaseUrl,ssl:process.env.DATABASE_SSL==='true'||/sslmode=require/.test(databaseUrl)?{rejectUnauthorized:false}:undefined}):null);
 let ready;
 db?.on?.('error',()=>{});
 function init(){if(!db)throw Object.assign(Error('Passport registration is awaiting database setup.'),{status:503});return ready||(ready=(async()=>{const c=await db.connect();try{await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(hashtextextended('ak-passport-schema-v1',0))");await c.query(`
 CREATE TABLE IF NOT EXISTS ak_passports (
  account_id UUID PRIMARY KEY, id UUID NOT NULL UNIQUE, claim_id TEXT NOT NULL UNIQUE,
  player_name TEXT NOT NULL, wallet TEXT NOT NULL UNIQUE, chain_id INTEGER NOT NULL,
  created_at BIGINT NOT NULL, consent_version TEXT NOT NULL, souvenir BOOLEAN NOT NULL DEFAULT FALSE
 );
 CREATE TABLE IF NOT EXISTS ak_passport_deliveries (
  id TEXT PRIMARY KEY, account_id UUID NOT NULL REFERENCES ak_passports(account_id),
  kind TEXT NOT NULL CHECK(kind IN ('visa','arrival','achievement','egg')), claim_id TEXT NOT NULL UNIQUE,
  wallet TEXT NOT NULL, chain_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', tx_hash TEXT, token_id TEXT, attempts INTEGER NOT NULL DEFAULT 0,
  run_after BIGINT NOT NULL DEFAULT 0, lease_until BIGINT NOT NULL DEFAULT 0, error_code TEXT,
  UNIQUE(account_id,kind)
 );
 ALTER TABLE ak_passports ADD COLUMN IF NOT EXISTS wallet_provider TEXT NOT NULL DEFAULT 'external';
 ALTER TABLE ak_passports ADD COLUMN IF NOT EXISTS achievement_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
 ALTER TABLE ak_passports ADD COLUMN IF NOT EXISTS egg_serial INTEGER CHECK (egg_serial BETWEEN 1 AND 33);
 CREATE UNIQUE INDEX IF NOT EXISTS ak_egg_serial_chain_unique ON ak_passports(chain_id,egg_serial) WHERE egg_serial IS NOT NULL;
 ALTER TABLE ak_passport_deliveries ADD COLUMN IF NOT EXISTS achievement_code TEXT NOT NULL DEFAULT '';
 ALTER TABLE ak_passport_deliveries ADD COLUMN IF NOT EXISTS achievement_token_id INTEGER;
 ALTER TABLE ak_passport_deliveries DROP CONSTRAINT IF EXISTS ak_passport_deliveries_account_id_kind_key;
 ALTER TABLE ak_passport_deliveries DROP CONSTRAINT IF EXISTS ak_passport_deliveries_kind_check;
 ALTER TABLE ak_passport_deliveries ADD CONSTRAINT ak_passport_deliveries_kind_check CHECK (kind IN ('visa','arrival','achievement','egg'));
 CREATE UNIQUE INDEX IF NOT EXISTS ak_passport_delivery_identity ON ak_passport_deliveries(account_id,kind,achievement_code);
 CREATE INDEX IF NOT EXISTS ak_passport_delivery_due ON ak_passport_deliveries(status,run_after);
 `);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}})().catch(e=>{ready=null;throw e;}));}
 const serialize=r=>r&&({id:r.id,number:'AK-'+r.id.replaceAll('-','').slice(0,16).toUpperCase(),playerName:r.player_name,wallet:r.wallet,chainId:r.chain_id,createdAt:Number(r.created_at),souvenir:r.souvenir,walletProvider:r.wallet_provider,achievementOptIn:r.achievement_opt_in,eggSerial:r.egg_serial||null});
 async function get(accountId){await init();const p=(await db.query('SELECT * FROM ak_passports WHERE account_id=$1',[accountId])).rows[0];if(!p)return null;const jobs=(await db.query('SELECT kind,status,tx_hash,token_id,chain_id,achievement_code,achievement_token_id FROM ak_passport_deliveries WHERE account_id=$1 ORDER BY kind DESC',[accountId])).rows;return {...serialize(p),deliveries:jobs.map(r=>({kind:r.kind,status:r.status,transactionHash:r.tx_hash,tokenId:r.token_id,chainId:r.chain_id,achievement:r.achievement_code,...(r.kind==='egg'?{title:'Mystery Golden Egg'}:r.achievement_code?{title:require('./antarcticAchievements').ACHIEVEMENTS.find(a=>a.code===r.achievement_code)?.title||'Achievement NFT'}:{})}))};}
 async function register(accountId,{playerName,wallet,chainId,souvenir,consentVersion,walletProvider='external',achievementOptIn=false,campaign=null},at){await init();const c=await db.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['passport:'+accountId]);const old=(await c.query('SELECT * FROM ak_passports WHERE account_id=$1',[accountId])).rows[0];if(old){if(Number(old.chain_id)!==Number(chainId))throw Object.assign(Error('This account already has a passport on another network. A reviewed migration is required.'),{status:409});if(old.wallet.toLowerCase()!==wallet.toLowerCase())throw Object.assign(Error('Your passport is already issued to another wallet. Contact support before changing it.'),{status:409});await c.query('COMMIT');return get(accountId);}
  // One database-wide transaction lock decides the first 33 committed, verified
  // campaign registrations; retries and parallel requests cannot over-issue.
  const eligible=eggsEnabled&&campaign==='first33-20261114'&&Number(chainId)===46630&&at>=Date.parse('2026-11-13T18:30:00Z')&&walletProvider==='para';
  let eggSerial=null;
  if(eligible){await c.query("SELECT pg_advisory_xact_lock(hashtextextended('ak-golden-eggs-20261114-46630',0))");const count=(await c.query('SELECT COALESCE(MAX(egg_serial),0)::integer AS last FROM ak_passports WHERE chain_id=$1',[46630])).rows[0].last;if(count<33)eggSerial=count+1;}
  const id=randomUUID(),claimId='0x'+randomBytes(32).toString('hex');
  await c.query('INSERT INTO ak_passports(account_id,id,claim_id,player_name,wallet,chain_id,created_at,consent_version,souvenir,wallet_provider,achievement_opt_in,egg_serial) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[accountId,id,claimId,playerName,wallet.toLowerCase(),chainId,at,consentVersion,souvenir,walletProvider,achievementOptIn,eggSerial]);
  for(const kind of ['visa',...(eggSerial?['egg']:[]),...(souvenir?['arrival']:[])])await c.query('INSERT INTO ak_passport_deliveries(id,account_id,kind,claim_id,wallet,chain_id) VALUES($1,$2,$3,$4,$5,$6)',[id+':'+kind,accountId,kind,kind==='visa'?claimId:'0x'+randomBytes(32).toString('hex'),wallet.toLowerCase(),chainId]);
  await c.query('COMMIT');return get(accountId);
 }catch(e){await c.query('ROLLBACK');if(e.code==='23505')throw Object.assign(Error('This wallet already has an Antarctic passport. Use its existing account or another wallet.'),{status:409});throw e;}finally{c.release();}}
 async function enqueueAchievement(accountId,a){await init();const p=(await db.query('SELECT * FROM ak_passports WHERE account_id=$1',[accountId])).rows[0];if(!p||!p.achievement_opt_in)return false;await db.query("INSERT INTO ak_passport_deliveries(id,account_id,kind,claim_id,wallet,chain_id,achievement_code,achievement_token_id) VALUES($1,$2,'achievement',$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",[p.id+':'+a.code,accountId,'0x'+randomBytes(32).toString('hex'),p.wallet,p.chain_id,a.code,a.tokenId]);return true;}
 async function claimJob(now=Date.now(),chainId,kinds){
  await init();const c=await db.connect();try{await c.query('BEGIN');const r=await c.query("SELECT d.*,p.egg_serial FROM ak_passport_deliveries d JOIN ak_passports p ON p.account_id=d.account_id AND p.chain_id=d.chain_id WHERE d.status IN ('queued','retry','sending','submitted') AND d.run_after<=$1 AND d.lease_until<=$1 AND ($2::integer IS NULL OR d.chain_id=$2) AND ($3::text[] IS NULL OR d.kind=ANY($3)) AND (d.kind='visa' OR EXISTS(SELECT 1 FROM ak_passport_deliveries first WHERE first.account_id=d.account_id AND first.chain_id=d.chain_id AND first.kind='visa' AND first.status='confirmed')) ORDER BY CASE WHEN d.kind='visa' THEN 0 ELSE 1 END,d.run_after,d.id FOR UPDATE OF d SKIP LOCKED LIMIT 1",[now,chainId??null,kinds??null]);const job=r.rows[0];if(job)await c.query("UPDATE ak_passport_deliveries SET lease_until=$2,status=CASE WHEN tx_hash IS NULL THEN 'sending' ELSE 'submitted' END,attempts=attempts+1 WHERE id=$1",[job.id,now+180000]);await c.query('COMMIT');return job||null;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async function updateJob(id,patch){await init();const allowed={status:'status',txHash:'tx_hash',tokenId:'token_id',runAfter:'run_after',leaseUntil:'lease_until',errorCode:'error_code'};const entries=Object.entries(patch).filter(([k])=>allowed[k]);if(!entries.length)return;await db.query('UPDATE ak_passport_deliveries SET '+entries.map(([k],i)=>allowed[k]+'=$'+(i+2)).join(',')+' WHERE id=$1',[id,...entries.map(([,v])=>v)]);}
 // Transaction affinity also works through transaction-mode poolers. Never
 // leave a session-level advisory lock on a pooled PostgreSQL backend.
 async function withWorkerLock(key,fn){
  await init();const c=await db.connect();let failed=false;
  const onError=()=>{failed=true;};c.on('error',onError);
  const assertLock=async()=>{if(failed)throw Error('Sender lock connection lost.');await c.query('SELECT 1');};
  try{
   await c.query('BEGIN');const r=await c.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS locked',['visa-worker-tick-v2:'+key]);
   if(!r.rows[0].locked){await c.query('ROLLBACK');return false;}
   await fn(assertLock);await assertLock();await c.query('COMMIT');return true;
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.removeListener('error',onError);c.release();}
 }
 async function confirmedToken(chainId,tokenId){await init();const r=await db.query("SELECT p.account_id,p.chain_id,p.created_at FROM ak_passports p JOIN ak_passport_deliveries d ON d.account_id=p.account_id AND d.chain_id=p.chain_id WHERE d.kind='visa' AND d.status='confirmed' AND d.chain_id=$1 AND d.token_id=$2 LIMIT 1",[chainId,String(tokenId)]);return r.rows[0]||null;}
 async function deliveryEvidence(accountId,kind='visa'){await init();if(!['visa','egg'].includes(kind))throw Error('Unsupported delivery evidence kind.');return (await db.query("SELECT d.*,p.egg_serial FROM ak_passport_deliveries d JOIN ak_passports p ON p.account_id=d.account_id AND p.chain_id=d.chain_id WHERE d.account_id=$1 AND d.kind=$2",[accountId,kind])).rows[0]||null;}

 return {init,get,register,deliveryEvidence,withWorkerLock,enqueueAchievement,claimJob,updateJob,confirmedToken,configured:!!db,close:async()=>{await db?.end();}};
}
module.exports={createPassportStore};
