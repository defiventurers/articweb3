#!/usr/bin/env node
// Read-only inventory only. This file has no deletion/execution mode.
const {Pool}=require('pg');
const KNOWN_TABLES=Object.freeze(['ak_documents','ak_passports','ak_passport_deliveries','ak_launch_visits']);
async function previewReset({pool,now=Date.now()}){
 const db=await pool.connect();
 try{
  await db.query('BEGIN READ ONLY');
  const tables={};for(const table of KNOWN_TABLES){const exists=(await db.query('SELECT to_regclass($1) AS name',[table])).rows[0]?.name;if(!exists){tables[table]={available:false};continue;}tables[table]={available:true,rows:Number((await db.query('SELECT count(*) AS n FROM '+table)).rows[0].n)};}
  let documentKinds=null,passportNetworks=null,deliveryStates=null;
  if(tables.ak_documents.available)documentKinds=(await db.query('SELECT kind,count(*)::int AS rows FROM ak_documents GROUP BY kind ORDER BY kind')).rows;
  if(tables.ak_passports.available)passportNetworks=(await db.query('SELECT chain_id,count(*)::int AS rows FROM ak_passports GROUP BY chain_id ORDER BY chain_id')).rows;
  if(tables.ak_passport_deliveries.available)deliveryStates=(await db.query('SELECT chain_id,kind,status,count(*)::int AS rows FROM ak_passport_deliveries GROUP BY chain_id,kind,status ORDER BY chain_id,kind,status')).rows;
  await db.query('ROLLBACK');
  return {mode:'read-only-preview',generatedAt:now,targetLaunch:'2026-11-14T00:00:00+05:30',tables,documentKinds,passportNetworks,deliveryStates,deletedRows:0,executionSupported:false,scopeApproved:false,limitations:['Only the explicitly connected database is inspected. Confirm it belongs to the relevant Render service before use.','This preview does not inspect external identity providers, wallet providers, other schemas, room storage or onchain state.','Rows are not exported; no account identifiers, credentials, wallet addresses or identity data are returned.','A fresh launch cohort is preferable to deleting financial, identity and proof records.']} ;
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{db.release();}
}
async function main(){if(process.argv.includes('--execute'))throw Error('This script supports read-only inventory only.');if(!process.env.DATABASE_URL)throw Error('Connect the identified account database privately before requesting a preview.');const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'||/sslmode=require/.test(process.env.DATABASE_URL)?{rejectUnauthorized:false}:undefined});try{console.log(JSON.stringify(await previewReset({pool}),null,2));}finally{await pool.end();}}
if(require.main===module)main().catch(()=>{console.error('Reset preview could not complete. Verify the database identity and read-only access. No deletion is supported.');process.exitCode=1;});
module.exports={previewReset,KNOWN_TABLES};
