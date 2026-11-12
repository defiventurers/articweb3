// Derived chain evidence only. No account/passport-registration tables are reset
// or overwritten by reorg recovery. Every batch and cursor update commit together.
function createChainEventStore({pool}){
 if(!pool)throw Error('A durable chain event database is required.');
 let initialized;
 function init(){return initialized||(initialized=pool.query(`
 CREATE TABLE IF NOT EXISTS ak_chain_index_cursors (
  chain_id INTEGER NOT NULL, contract TEXT NOT NULL, state JSONB NOT NULL,
  PRIMARY KEY(chain_id,contract)
 );
 CREATE TABLE IF NOT EXISTS ak_chain_index_events (
  chain_id INTEGER NOT NULL, contract TEXT NOT NULL, transaction_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL, block_number BIGINT NOT NULL, block_hash TEXT NOT NULL,
  event_name TEXT NOT NULL, data JSONB NOT NULL,
  PRIMARY KEY(chain_id,contract,transaction_hash,log_index)
 );
 CREATE INDEX IF NOT EXISTS ak_chain_event_scan ON ak_chain_index_events(chain_id,contract,block_number);
 `).catch(e=>{initialized=null;throw e;}));}
 async function load(s){await init();return(await pool.query('SELECT state FROM ak_chain_index_cursors WHERE chain_id=$1 AND contract=$2',[s.chainId,s.contract])).rows[0]?.state||null;}
 async function transaction(s,revision,fn){
  await init();const c=await pool.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['chain-index:'+s.chainId+':'+s.contract]);
   const old=(await c.query('SELECT state FROM ak_chain_index_cursors WHERE chain_id=$1 AND contract=$2 FOR UPDATE',[s.chainId,s.contract])).rows[0]?.state;
   if((old?.revision||0)!==revision)throw Error('Another indexer updated this scope. Retry from its saved cursor.');
   const next=await fn(c,old);
   await c.query('INSERT INTO ak_chain_index_cursors(chain_id,contract,state) VALUES($1,$2,$3::jsonb) ON CONFLICT(chain_id,contract) DO UPDATE SET state=EXCLUDED.state',[s.chainId,s.contract,JSON.stringify(next)]);
   await c.query('COMMIT');return next;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 return {init,load,
  apply:(s,revision,b)=>transaction(s,revision,async c=>{
   await c.query('DELETE FROM ak_chain_index_events WHERE chain_id=$1 AND contract=$2 AND block_number BETWEEN $3 AND $4',[s.chainId,s.contract,b.from,b.to]);
   for(const e of b.logs)await c.query('INSERT INTO ak_chain_index_events(chain_id,contract,transaction_hash,log_index,block_number,block_hash,event_name,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) ON CONFLICT(chain_id,contract,transaction_hash,log_index) DO UPDATE SET block_number=EXCLUDED.block_number,block_hash=EXCLUDED.block_hash,event_name=EXCLUDED.event_name,data=EXCLUDED.data',[s.chainId,s.contract,e.transactionHash,e.logIndex,e.blockNumber,e.blockHash,e.name,JSON.stringify(e.args)]);
   return b.state;
  }),
  rewind:(s,revision,cursor,blockHash)=>transaction(s,revision,async(c,old)=>{
   await c.query('DELETE FROM ak_chain_index_events WHERE chain_id=$1 AND contract=$2 AND block_number>$3',[s.chainId,s.contract,cursor]);
   return {...old,cursor,blockHash,ready:false,revision:revision+1,checkpoints:old.checkpoints.filter(p=>p.number<=cursor)};
  }),
  async aggregate(s){
   const state=await load(s);if(!state?.ready)return {available:false,reason:'Confirmed indexing has not caught up.',cursor:state?.cursor??null};
   const row=(await pool.query(`SELECT
    count(DISTINCT data->>'tokenId') FILTER(WHERE event_name='Transfer' AND lower(data->>'from')=$4)::text AS passports,
    count(*) FILTER(WHERE event_name='MatchRegistered')::text AS matches,
    count(*) FILTER(WHERE event_name='RollCommitted')::text AS rolls,
    count(*) FILTER(WHERE event_name='Checkpoint')::text AS checkpoints
    FROM ak_chain_index_events WHERE chain_id=$1 AND contract=$2 AND block_number<=$3`,[s.chainId,s.contract,state.cursor,'0x'+'0'.repeat(40)])).rows[0];
   if(!row||Object.values(row).some(v=>!/^\d+$/.test(v)))throw Error('Chain aggregate unavailable.');
   const count=v=>BigInt(v)<=BigInt(Number.MAX_SAFE_INTEGER)?Number(v):v;
   return {available:true,chainId:s.chainId,contract:s.contract,cursor:state.cursor,safeHead:state.safeHead,observedHead:state.observedHead,checkedAt:state.checkedAt,confirmedPassports:count(row.passports),registeredMatches:count(row.matches),rollCommitments:count(row.rolls),checkpoints:count(row.checkpoints)};
  }
 };
}
module.exports={createChainEventStore};
