#!/usr/bin/env node
// Offline operator command. Preview is the default. Never drops databases or
// touches another Render service, funds, vault events, contracts or wallet keys.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{Pool}=require('pg');
const CUTOFF=Date.parse('2026-11-14T00:00:00+05:30');
const KINDS=['account','auth-identity','auth-ticket','email-attempt','email-rate','oauth-attempt','google-wallet-attempt','para-wallet-attempt','access-device','challenge','fair-match','fair-owner','fair-share'];
const args=process.argv.slice(2),option=n=>args.includes(n)?args[args.indexOf(n)+1]:null;
if(args.includes('--help')){console.log('Preview: node scripts/reset-launch-users.cjs\nApply after launch cutoff, with services stopped: node scripts/reset-launch-users.cjs --apply --expect-plan SHA256 --backup /private/path/launch-reset.json\nRequires DATABASE_URL and AK_RESET_OFFLINE=true for apply. Never run inside a serving web process.');process.exit(0);}
async function main(){if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required; no data was changed.');const u=new URL(process.env.DATABASE_URL),dbFingerprint=createHash('sha256').update(u.hostname+u.pathname).digest('hex'),pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'||/sslmode=require/.test(process.env.DATABASE_URL)?{rejectUnauthorized:false}:undefined}),db=await pool.connect();try{await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');await db.query("SELECT pg_advisory_xact_lock(hashtextextended('ak-nov14-reset',0))");const existing=new Set((await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).rows.map(r=>r.table_name));const count=async(sql,values=[])=>Number((await db.query(sql,values)).rows[0].n);const counts={},blocks=[];
 const targets=[];function target(table,where,values=[]){if(existing.has(table))targets.push({table,where,values});}
 if(existing.has('ak_documents')){
  const paid=await count("SELECT count(*) AS n FROM ak_documents WHERE kind IN ('payment','access-payment') AND body->>'status' IN ('paid','confirmed','completed','refunded','pending')");if(paid)blocks.push('Payment records exist; resolve entitlements and retention before deleting linked accounts.');
  const post=await count("SELECT count(*) AS n FROM ak_documents WHERE kind='account' AND COALESCE((body->>'createdAt')::bigint,0)>=$1",[CUTOFF]);if(post)blocks.push('Post-launch accounts exist; use a separately reviewed cohort reset.');
  const unknown=(await db.query('SELECT DISTINCT kind FROM ak_documents WHERE NOT (kind=ANY($1::text[]))',[KINDS.concat(['payment','access-payment'])])).rows;if(unknown.length)blocks.push('Unclassified document kinds exist: '+unknown.map(r=>r.kind).join(', '));
 }
 if(existing.has('ak_passport_deliveries')){const minted=await count("SELECT count(*) AS n FROM ak_passport_deliveries WHERE status IN ('confirmed','submitted','sending') OR tx_hash IS NOT NULL");if(minted)blocks.push('Delivered/submitted NFT claims exist. Reconcile immutable chain records before clearing wallet bindings.');}
 if(existing.has('rooms')){const live=await count("SELECT count(*) AS n FROM rooms WHERE status IN ('playing','setup')");if(live)blocks.push('Active games exist; finish/cancel and drain them before reset.');const paid=await count("SELECT count(*) AS n FROM rooms WHERE room_mode='high_stakes' OR contract_match_id IS NOT NULL");if(paid)blocks.push('Vault-linked rooms exist; financial records are outside this reset.');}
 target('ak_passport_deliveries','account_id IN (SELECT account_id FROM ak_passports WHERE created_at<$1)',[CUTOFF]);
 target('ak_passports','created_at<$1',[CUTOFF]);
 target('room_players',"room_code IN (SELECT room_code FROM rooms WHERE created_at<$1 AND room_mode<>'high_stakes' AND contract_match_id IS NULL)",[new Date(CUTOFF)]);
 target('rooms',"created_at<$1 AND room_mode<>'high_stakes' AND contract_match_id IS NULL",[new Date(CUTOFF)]);
 target('match_history',"finished_at<$1 AND room_mode<>'high_stakes' AND entry_wei='0' AND payout_wei='0'",[new Date(CUTOFF)]);
 target('player_profiles','created_at<$1',[new Date(CUTOFF)]);
 target('ak_launch_visits','first_at<$1',[CUTOFF]);
 target('ak_documents','kind=ANY($1::text[])',[KINDS]);
 for(const t of targets)counts[t.table]=await count(`SELECT count(*) AS n FROM "${t.table}" WHERE ${t.where}`,t.values);
 const plan={version:1,workspace:'My Workspace',service:'articweb3',cutoff:new Date(CUTOFF).toISOString(),dbFingerprint,counts,blocks,excluded:['other services','payment documents','vault_activity','vault_indexed_events','vault_indexer_state','on-chain records','Para wallets','private signing material','device-local saved games']},sha=createHash('sha256').update(JSON.stringify(plan)).digest('hex');
 if(!args.includes('--apply')){await db.query('ROLLBACK');console.log(JSON.stringify({...plan,planSha256:sha,applied:false},null,2));return;}
 if(Date.now()<CUTOFF)throw Error('The November 14 IST cutoff has not arrived.');
 if(process.env.AK_RESET_OFFLINE!=='true')throw Error('Stop application/worker writes first; AK_RESET_OFFLINE=true is required.');
 if(blocks.length)throw Error('Reset blocked: '+blocks.join(' '));if(option('--expect-plan')!==sha)throw Error('Plan changed. Review a fresh preview before applying.');const backup=option('--backup');if(!backup||!path.isAbsolute(backup))throw Error('An absolute private backup path is required.');
 const rows={};for(const t of targets)rows[t.table]=(await db.query(`SELECT * FROM "${t.table}" WHERE ${t.where}`,t.values)).rows;
 fs.writeFileSync(backup,JSON.stringify({plan,planSha256:sha,rows}),{mode:0o600,flag:'wx'});const fd=fs.openSync(backup,'r');fs.fsyncSync(fd);fs.closeSync(fd);
 for(const t of targets){const r=await db.query(`DELETE FROM "${t.table}" WHERE ${t.where}`,t.values);if(r.rowCount!==counts[t.table])throw Error('Deletion count changed; rolling back.');}
 await db.query('COMMIT');console.log(JSON.stringify({applied:true,planSha256:sha,deleted:counts,backupSha256:createHash('sha256').update(fs.readFileSync(backup)).digest('hex'),restartRequired:true},null,2));
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{db.release();await pool.end();}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
