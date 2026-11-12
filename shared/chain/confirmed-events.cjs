// Transport and persistence are injected. This engine never signs transactions,
// touches player records, or shares cursor/event identities between networks.
function validateScope(s){
 if(!Number.isSafeInteger(s.chainId)||s.chainId<1||!/^0x[0-9a-f]{40}$/i.test(s.contract)||/^0x0{40}$/i.test(s.contract)||!Number.isSafeInteger(s.fromBlock)||s.fromBlock<0||!['passport','registry'].includes(s.kind)||!/^[0-9a-f]{64}$/.test(s.runtimeHash))throw Error('Invalid chain index scope.');
 return {...s,contract:s.contract.toLowerCase()};
}
const key=s=>s.chainId+':'+s.contract.toLowerCase();
async function syncConfirmedEvents({provider,store,scope,decode,hashCode,confirmations=2,batchSize=500,maxBatches=20}){
 scope=validateScope(scope);
 if(!Number.isSafeInteger(confirmations)||confirmations<2||!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>2000||!Number.isSafeInteger(maxBatches)||maxBatches<1||maxBatches>100)throw Error('Invalid confirmed index limits.');
 if(Number((await provider.getNetwork()).chainId)!==scope.chainId)throw Error('Indexer RPC chain mismatch.');
 const latest=await provider.getBlockNumber(),safeHead=latest-confirmations+1;
 if(safeHead<scope.fromBlock)return {ready:false,waitingForConfirmations:true,chainId:scope.chainId,contract:scope.contract,safeHead};
 const code=await provider.getCode(scope.contract,safeHead);
 if(code==='0x'||hashCode(code)!==scope.runtimeHash)throw Error('Indexer contract code differs from the verified deployment.');
 let state=await store.load(scope),reorg=false;
 if(state&&(state.scope.fromBlock!==scope.fromBlock||state.scope.runtimeHash!==scope.runtimeHash||state.scope.kind!==scope.kind))throw Error('Indexer scope changed. Review a separate rebuild before changing its deployment boundary.');
 if(state){
  const canonical=state.cursor<=safeHead?await provider.getBlock(state.cursor):null;
  if(!canonical||canonical.hash!==state.blockHash){
   reorg=true;let common=scope.fromBlock-1,hash=null;
   for(const checkpoint of [...state.checkpoints].reverse()){
    if(checkpoint.number>safeHead)continue;
    const block=await provider.getBlock(checkpoint.number);
    if(block?.hash===checkpoint.hash){common=checkpoint.number;hash=checkpoint.hash;break;}
   }
   state=await store.rewind(scope,state.revision,common,hash);
  }
 }
 let cursor=state?.cursor??scope.fromBlock-1,indexed=0,batches=0;
 while(cursor<safeHead&&batches<maxBatches){
  const from=cursor+1,to=Math.min(safeHead,from+batchSize-1),before=await provider.getBlock(to);
  if(!before)throw Error('Indexer checkpoint block unavailable.');
  const raw=await provider.getLogs({address:scope.contract,fromBlock:from,toBlock:to}),logs=[],blocks=new Map();
  for(const log of raw){
   const index=Number(log.index??log.logIndex);
   if(log.removed||String(log.address).toLowerCase()!==scope.contract||!Number.isSafeInteger(log.blockNumber)||log.blockNumber<from||log.blockNumber>to||!Number.isSafeInteger(index)||index<0||!/^0x[0-9a-f]{64}$/i.test(log.transactionHash))throw Error('Indexer received an inconsistent log.');
   if(!blocks.has(log.blockNumber))blocks.set(log.blockNumber,await provider.getBlock(log.blockNumber));
   if(blocks.get(log.blockNumber)?.hash!==log.blockHash)throw Error('Indexer log belongs to a changed block.');
   const parsed=decode(log);if(!parsed)continue;
   logs.push({chainId:scope.chainId,contract:scope.contract,transactionHash:log.transactionHash,logIndex:index,blockNumber:log.blockNumber,blockHash:log.blockHash,name:parsed.name,args:parsed.args});
  }
  const after=await provider.getBlock(to);
  if(!after||after.hash!==before.hash)throw Error('Chain changed during indexing. No partial batch was committed.');
  const checkpoints=[...(state?.checkpoints||[]),{number:to,hash:after.hash}].slice(-32);
  const next={scope,cursor:to,blockHash:after.hash,checkpoints,revision:(state?.revision||0)+1,observedHead:latest,safeHead,ready:to===safeHead,checkedAt:new Date().toISOString()};
  state=await store.apply(scope,state?.revision||0,{from,to,logs,state:next});
  cursor=to;indexed+=logs.length;batches++;
 }
 return {chainId:scope.chainId,contract:scope.contract,kind:scope.kind,ready:cursor===safeHead,cursor,safeHead,observedHead:latest,indexed,batches,reorg,finality:confirmations+' L2 confirmations; Ethereum finality not established.'};
}
function memoryStore(){
 const states=new Map(),events=new Map();
 const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
 function cas(scope,revision){const old=states.get(key(scope));if((old?.revision||0)!==revision)throw Error('Another indexer updated this scope. Retry from its saved cursor.');return old;}
 return {states,events,load:async s=>copy(states.get(key(s))||null),
  async apply(s,revision,batch){cas(s,revision);for(const[k,e]of events)if(e.chainId===s.chainId&&e.contract===s.contract&&e.blockNumber>=batch.from&&e.blockNumber<=batch.to)events.delete(k);for(const e of batch.logs)events.set(key(s)+':'+e.transactionHash+':'+e.logIndex,copy(e));states.set(key(s),copy(batch.state));return copy(batch.state);},
  async rewind(s,revision,cursor,blockHash){const old=cas(s,revision);for(const[k,e]of events)if(e.chainId===s.chainId&&e.contract===s.contract&&e.blockNumber>cursor)events.delete(k);const next={...old,cursor,blockHash,ready:false,revision:revision+1,checkpoints:old.checkpoints.filter(c=>c.number<=cursor)};states.set(key(s),copy(next));return copy(next);}
 };
}
module.exports={syncConfirmedEvents,validateScope,scopeKey:key,memoryStore};
