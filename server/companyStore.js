// Separate durable storage for the optional Android companion service.
const fs = require('node:fs/promises');
const path = require('node:path');
const {Pool} = require('pg');
function createCompanyStore({databaseUrl=process.env.DATABASE_URL,file,development=false}={}) {
  if(file&&!development) throw Error('File storage is restricted to tests and local development.');
  const pool=databaseUrl?new Pool({connectionString:databaseUrl,ssl:process.env.DATABASE_SSL==='true'||/sslmode=require/.test(databaseUrl)?{rejectUnauthorized:false}:undefined}):null;
  let ready,chain=Promise.resolve();
  const init=()=>ready||(ready=(async()=>{if(pool)await pool.query('CREATE TABLE IF NOT EXISTS ak_documents (kind TEXT NOT NULL, id TEXT NOT NULL, body JSONB NOT NULL, PRIMARY KEY(kind,id))');else if(file)await fs.mkdir(path.dirname(file),{recursive:true});else throw Object.assign(Error('Cloud features are not configured yet. Your offline games remain available.'),{status:503});})().catch(e=>{ready=null;throw e;}));
  async function transact(kind,id,fn){
    await init();
    if(pool){const db=await pool.connect();try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[kind+':'+id]);const r=await db.query('SELECT body FROM ak_documents WHERE kind=$1 AND id=$2',[kind,id]);const next=await fn(r.rows[0]?.body||null);if(next===null)await db.query('DELETE FROM ak_documents WHERE kind=$1 AND id=$2',[kind,id]);else await db.query('INSERT INTO ak_documents(kind,id,body) VALUES($1,$2,$3) ON CONFLICT(kind,id) DO UPDATE SET body=EXCLUDED.body',[kind,id,JSON.stringify(next)]);await db.query('COMMIT');return next;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
    const task=chain.then(async()=>{let all={};try{all=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}const key=kind+':'+id,next=await fn(all[key]||null);if(next===null)delete all[key];else all[key]=next;const tmp=file+'.tmp';await fs.writeFile(tmp,JSON.stringify(all),{mode:0o600});await fs.rename(tmp,file);return next;});chain=task.catch(()=>{});return task;
  }
  async function get(kind,id){await init();if(pool){const r=await pool.query('SELECT body FROM ak_documents WHERE kind=$1 AND id=$2',[kind,id]);return r.rows[0]?.body||null;}await chain;try{return JSON.parse(await fs.readFile(file,'utf8'))[kind+':'+id]||null;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  return {init,get,transact,configured:!!(pool||file),close:async()=>{await chain;await pool?.end();}};
}
module.exports={createCompanyStore};
