const {Wallet}=require('ethers');
const {workerConfig,createAdapter,deliverOne}=require('./antarcticPassportWorker');
const {createPassportStore}=require('./antarcticPassportStore');

// Optional cohosted sender for the existing web service. No paid worker required.
// One sequential sender, protected by a transaction-scoped PostgreSQL lock.
function createPassportRuntime({env=process.env,storeFactory=createPassportStore,adapterFactory=createAdapter,now=Date.now}={}){
 let stopped=false,timer,inFlight,store,adapter,config,lastCheck=0;
 let state={enabled:false,ready:false,status:'disabled',chainId:Number(env.AK_VISA_CHAIN_ID||46630),confirmationPolicy:'2 canonical L2 blocks; Ethereum finality not established'};
 function status(){return {...state};}
 async function tick(){
  if(stopped)return;
  let stage='configuration';try{
   if(!config){config=workerConfig(env);state={...state,enabled:true,status:'checking',contract:config.visa,signer:new Wallet(config.key).address,kinds:['visa',...(config.arrival?['arrival']:[]),...(config.achievements?['achievement']:[])],eggReady:false};}
   stage='network_and_code';adapter||=await adapterFactory(config);
   stage='database';if(!store){store=storeFactory();await store.init();}
   stage='sender_lock';
   const acquired=await store.withWorkerLock(config.chainId+':'+adapter.address.toLowerCase(),async assertLock=>{
    stage='permissions_and_gas';
    if(!state.ready||now()-lastCheck>=30000){const check=await adapter.preflight();lastCheck=now();state={...state,...check,checkedAt:new Date(now()).toISOString(),checkStage:null};}
    if(state.ready){stage='delivery';await deliverOne({store,adapter:{...adapter,send:async job=>{await assertLock();return adapter.send(job);}},now});}
   });
   if(!acquired)state={...state,ready:false,status:'awaiting_sender_lock',checkStage:'sender_lock'};
  }catch{
   state={...state,ready:false,status:'setup_check_pending',checkStage:stage,checkedAt:new Date(now()).toISOString()};
   await store?.close().catch(()=>{});store=null;adapter?.close();adapter=null;
  }
 }
 function schedule(){if(stopped)return;inFlight=tick().finally(()=>{if(!stopped){timer=setTimeout(schedule,state.ready?3000:15000);timer.unref?.();}});}
 function start(){if(env.AK_PASSPORT_RUNTIME_ENABLED!=='true'||inFlight)return;state.status='checking';schedule();}
 async function verify(accountId){
  if(!adapter||!store)return {confirmed:false,status:state.status};
  const job=await store.deliveryEvidence(accountId);
  if(!job||job.status!=='confirmed'||job.chain_id!==config.chainId)return {confirmed:false,status:job?.status||'not_registered'};
  return {...await adapter.verifyPassport(job),checkedAt:new Date(now()).toISOString()};
 }
 async function verifyEgg(accountId){
  if(!adapter||!store||!adapter.verifyEgg)return {confirmed:false,status:state.status};
  const job=await store.deliveryEvidence(accountId,'egg');
  if(!job||job.status!=='confirmed'||job.chain_id!==config.chainId)return {confirmed:false,status:job?.status||'not_eligible'};
  return {...await adapter.verifyEgg(job),checkedAt:new Date(now()).toISOString()};
 }
 async function stop(){if(stopped)return;stopped=true;clearTimeout(timer);await inFlight;adapter?.close();await store?.close();state={...state,ready:false,status:'stopped'};}
 return {start,status,verify,verifyEgg,stop,tick};
}
const runtime=createPassportRuntime();
module.exports={createPassportRuntime,runtime};
