const {randomUUID,randomBytes}=require('node:crypto');
const {Pool}=require('pg');

// Passport registration and its two optional delivery jobs commit together.
// No plaintext Google identity or player name is ever used in a mint argument.
function createPassportStore({databaseUrl=process.env.DATABASE_URL,pool}={}){
 const db=pool|| (databaseUrl?new Pool({connectionString:databaseUrl,ssl:process.env.DATABASE_SSL==='true'||/sslmode=require/.test(databaseUrl)?{rejectUnauthorized:false}:undefined}):null);
 let ready,workerLock;
 function init(){if(!db)throw Object.assign(Error('Passport registration is awaiting database setup.'),{status:503});return ready||(ready=db.query(`
 CREATE TABLE IF NOT EXISTS ak_passports (
  account_id UUID PRIMARY KEY, id UUID NOT NULL UNIQUE, claim_id TEXT NOT NULL UNIQUE,
  player_name TEXT NOT NULL, wallet TEXT NOT NULL UNIQUE, chain_id INTEGER NOT NULL,
  created_at BIGINT NOT NULL, consent_version TEXT NOT NULL, souvenir BOOLEAN NOT NULL DEFAULT FALSE
 );
 CREATE TABLE IF NOT EXISTS ak_passport_deliveries (
  id TEXT PRIMARY KEY, account_id UUID NOT NULL REFERENCES ak_passports(account_id),
  kind TEXT NOT NULL CHECK(kind IN ('visa','arrival','achievement')), claim_id TEXT NOT NULL UNIQUE,
  wallet TEXT NOT NULL, chain_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', tx_hash TEXT, token_id TEXT, attempts INTEGER NOT NULL DEFAULT 0,
  run_after BIGINT NOT NULL DEFAULT 0, lease_until BIGINT NOT NULL DEFAULT 0, error_code TEXT,
  UNIQUE(account_id,kind)
 );
 ALTER TABLE ak_passports ADD COLUMN IF NOT EXISTS wallet_provider TEXT NOT NULL DEFAULT 'external';
 ALTER TABLE ak_passports ADD COLUMN IF NOT EXISTS achievement_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
 ALTER TABLE ak_passport_deliveries ADD COLUMN IF NOT EXISTS achievement_code TEXT NOT NULL DEFAULT '';
 ALTER TABLE ak_passport_deliveries ADD COLUMN IF NOT EXISTS achievement_token_id INTEGER;
 ALTER TABLE ak_passport_deliveries DROP CONSTRAINT IF EXISTS ak_passport_deliveries_account_id_kind_key;
 ALTER TABLE ak_passport_deliveries DROP CONSTRAINT IF EXISTS ak_passport_deliveries_kind_check;
 ALTER TABLE ak_passport_deliveries ADD CONSTRAINT ak_passport_deliveries_kind_check CHECK (kind IN ('visa','arrival','achievement'));
 CREATE UNIQUE INDEX IF NOT EXISTS ak_passport_delivery_identity ON ak_passport_deliveries(account_id,kind,achievement_code);
 CREATE INDEX IF NOT EXISTS ak_passport_delivery_due ON ak_passport_deliveries(status,run_after);
 `).catch(e=>{ready=null;throw e;}));}
 const serialize=r=>r&&({id:r.id,number:'AK-'+r.id.replaceAll('-','').slice(0,16).toUpperCase(),playerName:r.player_name,wallet:r.wallet,chainId:r.chain_id,createdAt:Number(r.created_at),souvenir:r.souvenir,walletProvider:r.wallet_provider,achievementOptIn:r.achievement_opt_in});
 async function get(accountId){await init();const p=(await db.query('SELECT * FROM ak_passports WHERE account_id=$1',[accountId])).rows[0];if(!p)return null;const jobs=(await db.query('SELECT kind,status,tx_hash,token_id,chain_id,achievement_code,achievement_token_id FROM ak_passport_deliveries WHERE account_id=$1 ORDER BY kind DESC',[accountId])).rows;return {...serialize(p),deliveries:jobs.map(r=>({kind:r.kind,status:r.status,transactionHash:r.tx_hash,tokenId:r.token_id,chainId:r.chain_id,achievement:r.achievement_code,...(r.achievement_code?{title:require('./antarcticAchievements').ACHIEVEMENTS.find(a=>a.code===r.achievement_code)?.title||'Achievement NFT'}:{})}))};}
 async function register(accountId,{playerName,wallet,chainId,souvenir,consentVersion,walletProvider='external',achievementOptIn=false},at){await init();const c=await db.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['passport:'+accountId]);const old=(await c.query('SELECT * FROM ak_passports WHERE account_id=$1',[accountId])).rows[0];if(old){if(old.wallet.toLowerCase()!==wallet.toLowerCase())throw Object.assign(Error('Your passport is already issued to another wallet. Contact support before changing it.'),{status:409});await c.query('COMMIT');return get(accountId);}
  const id=randomUUID(),claimId='0x'+randomBytes(32).toString('hex');
  await c.query('INSERT INTO ak_passports(account_id,id,claim_id,player_name,wallet,chain_id,created_at,consent_version,souvenir,wallet_provider,achievement_opt_in) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[accountId,id,claimId,playerName,wallet.toLowerCase(),chainId,at,consentVersion,souvenir,walletProvider,achievementOptIn]);
  for(const kind of ['visa',...(souvenir?['arrival']:[])])await c.query('INSERT INTO ak_passport_deliveries(id,account_id,kind,claim_id,wallet,chain_id) VALUES($1,$2,$3,$4,$5,$6)',[id+':'+kind,accountId,kind,kind==='visa'?claimId:'0x'+randomBytes(32).toString('hex'),wallet.toLowerCase(),chainId]);
  await c.query('COMMIT');return get(accountId);
 }catch(e){await c.query('ROLLBACK');if(e.code==='23505')throw Object.assign(Error('This wallet already has an Antarctic passport. Use its existing account or another wallet.'),{status:409});throw e;}finally{c.release();}}
 async function enqueueAchievement(accountId,a){await init();const p=(await db.query('SELECT * FROM ak_passports WHERE account_id=$1',[accountId])).rows[0];if(!p||!p.achievement_opt_in)return false;await db.query("INSERT INTO ak_passport_deliveries(id,account_id,kind,claim_id,wallet,chain_id,achievement_code,achievement_token_id) VALUES($1,$2,'achievement',$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",[p.id+':'+a.code,accountId,'0x'+randomBytes(32).toString('hex'),p.wallet,p.chain_id,a.code,a.tokenId]);return true;}
 async function claimJob(now=Date.now()){
  await init();const c=await db.connect();try{await c.query('BEGIN');const r=await c.query("SELECT * FROM ak_passport_deliveries WHERE status IN ('queued','retry','sending','submitted') AND run_after<=$1 AND lease_until<=$1 ORDER BY run_after,id FOR UPDATE SKIP LOCKED LIMIT 1",[now]);const job=r.rows[0];if(job)await c.query("UPDATE ak_passport_deliveries SET lease_until=$2,status=CASE WHEN tx_hash IS NULL THEN 'sending' ELSE 'submitted' END,attempts=attempts+1 WHERE id=$1",[job.id,now+180000]);await c.query('COMMIT');return job||null;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async function updateJob(id,patch){await init();const allowed={status:'status',txHash:'tx_hash',tokenId:'token_id',runAfter:'run_after',leaseUntil:'lease_until',errorCode:'error_code'};const entries=Object.entries(patch).filter(([k])=>allowed[k]);if(!entries.length)return;await db.query('UPDATE ak_passport_deliveries SET '+entries.map(([k],i)=>allowed[k]+'=$'+(i+2)).join(',')+' WHERE id=$1',[id,...entries.map(([,v])=>v)]);}
 async function acquireWorkerLock(key){await init();workerLock=await db.connect();const r=await workerLock.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',['visa-worker:'+key]);if(!r.rows[0].locked){workerLock.release();workerLock=null;throw Error('Another passport worker is already using this signer.');}}
 return {init,get,register,enqueueAchievement,claimJob,updateJob,acquireWorkerLock,configured:!!db,close:async()=>{if(workerLock){await workerLock.query('SELECT pg_advisory_unlock_all()');workerLock.release();workerLock=null;}await db?.end();}};
}
module.exports={createPassportStore};
