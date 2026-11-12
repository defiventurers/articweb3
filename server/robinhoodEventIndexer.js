const fs=require('node:fs');
const path=require('node:path');
const {JsonRpcProvider,Contract,Interface,sha256}=require('ethers');
const {Pool}=require('pg');
const {syncConfirmedEvents}=require('../shared/chain/confirmed-events.cjs');
const manifest=require('../shared/chain/launch-contracts.json');
const {createChainEventStore}=require('./chainEventStore');

function loadDeployment(env=process.env){
 const file=env.AK_RH_DEPLOYMENT_RECORD||path.join(__dirname,'deployments/robinhood-testnet.json');
 const record=JSON.parse(fs.readFileSync(file,'utf8'));
 if(record.schema!==1||record.chainId!==46630||!/^0x[0-9a-f]{40}$/i.test(record.owner)||!/^0x[0-9a-f]{40}$/i.test(record.operator))throw Error('Verified Robinhood testnet deployment record required.');
 for(const name of ['FairPlayRegistry','AntarcticPassport']){
  const c=record.contracts?.[name];if(!c||!/^0x[0-9a-f]{40}$/i.test(c.address)||!/^0x[0-9a-f]{64}$/i.test(c.transactionHash))throw Error('Both confirmed testnet contract receipts are required.');
 }
 return record;
}
function decode(abi){const iface=new Interface(abi);return log=>{let p;try{p=iface.parseLog(log);}catch{return null;}if(!p)return null;return {name:p.name,args:Object.fromEntries(p.fragment.inputs.map((input,n)=>[input.name||'arg'+n,typeof p.args[n]==='bigint'?String(p.args[n]):p.args[n]]))};};}
function createRobinhoodEventIndexer({env=process.env,provider,pool,record,store}={}){
 let running=false,timer,stopped=false,ownsPool=false,ownsProvider=false;
 let status={enabled:env.AK_RH_EVENT_INDEX_ENABLED==='true',ready:false,lastRun:null,errorCode:null};
 async function initialize(){
  record||=loadDeployment(env);
  const rpc=env.AK_RH_EVENT_RPC_URL||'https://rpc.testnet.chain.robinhood.com',url=new URL(rpc);
  if(url.protocol!=='https:'||url.username||url.password||url.hash)throw Error('HTTPS testnet RPC required.');
  if(!provider){provider=new JsonRpcProvider(rpc,undefined,{cacheTimeout:0});ownsProvider=true;}
  if(!store){if(!pool){if(!env.DATABASE_URL)throw Error('Durable index database required.');pool=new Pool({connectionString:env.DATABASE_URL,ssl:env.DATABASE_SSL==='true'?{rejectUnauthorized:true}:undefined});ownsPool=true;}store=createChainEventStore({pool});await store.init();}
 }
 async function runOnce(){
  if(running||stopped)return status;running=true;
  try{
   await initialize();if(Number((await provider.getNetwork()).chainId)!==46630)throw Error('Testnet chain mismatch.');
   const scopes=[],evidence=[];
   for(const[name,kind]of [['FairPlayRegistry','registry'],['AntarcticPassport','passport']]){
    const saved=record.contracts[name],a=manifest.contracts[name],receipt=await provider.getTransactionReceipt(saved.transactionHash);
    if(!receipt||receipt.status!==1||await receipt.confirmations()<2||receipt.contractAddress?.toLowerCase()!==saved.address.toLowerCase())throw Error('Deployment receipt has not confirmed.');
    const block=await provider.getBlock(receipt.blockNumber);if(block?.hash!==receipt.blockHash)throw Error('Deployment block changed.');
    const c=new Contract(saved.address,a.abi,provider);
    if(name==='FairPlayRegistry'){
     if((await c.owner()).toLowerCase()!==record.owner.toLowerCase()||(await c.registrar()).toLowerCase()!==record.operator.toLowerCase())throw Error('Registry role mismatch.');
    }else if(!await c.hasRole('0x'+'00'.repeat(32),record.owner)||!await c.hasRole(await c.MINTER_ROLE(),record.operator)||!await c.hasRole(await c.METADATA_ROLE(),record.operator))throw Error('Passport role mismatch.');
    const scope={chainId:46630,contract:saved.address.toLowerCase(),fromBlock:receipt.blockNumber,kind,runtimeHash:a.runtimeHash};
    scopes.push(scope);evidence.push(await syncConfirmedEvents({provider,store,scope,decode:decode(a.abi),hashCode:code=>sha256(code).slice(2)}));
   }
   const aggregates=await Promise.all(scopes.map(s=>store.aggregate(s)));
   status={enabled:status.enabled,ready:evidence.every(e=>e.ready),lastRun:new Date().toISOString(),scopes:evidence,aggregates,errorCode:null};
  }catch{status={...status,ready:false,lastRun:new Date().toISOString(),errorCode:'INDEX_CONFIGURATION_OR_CHAIN_CHECK_PENDING'};}
  finally{running=false;}
  return status;
 }
 async function start(){
  if(!status.enabled)return status;await runOnce();
  timer=setInterval(()=>runOnce(),15000);timer.unref?.();return status;
 }
 async function stop(){stopped=true;if(timer)clearInterval(timer);if(ownsProvider)provider.destroy();if(ownsPool)await pool.end();}
 return {start,runOnce,stop,getStatus:()=>status};
}
module.exports={createRobinhoodEventIndexer,loadDeployment};
