const {Wallet}=require('ethers');
const {workerConfig,createAdapter,deliverOne}=require('./antarcticPassportWorker');
const {createPassportStore}=require('./antarcticPassportStore');

// Optional cohosted sender for the existing web service. No paid worker required.
// One sequential sender, protected by a dedicated PostgreSQL advisory lock.
function createPassportRuntime({env=process.env,storeFactory=createPassportStore,adapterFactory=createAdapter,now=Date.now}={}){
 let stopped=false,timer,inFlight,store,adapter,config,locked=false,lastCheck=0;
 let state={enabled:false,ready:false,status:'disabled',chainId:Number(env.AK_VISA_CHAIN_ID||46630),confirmationPolicy:'2 canonical L2 blocks; Ethereum finality not established'};
 function status(){return {...state};}
 async function tick(){
  if(stopped)return;
  try{
   if(!config){config=workerConfig(env);state={...state,enabled:true,status:'checking',contract:config.visa,signer:new Wallet(config.key).address,kinds:['visa',...(config.arrival?['arrival']:[]),...(config.achievements?['achievement']:[])]};}
   adapter||=await adapterFactory(config);
   if(!store){store=storeFactory();await store.init();}
   if(!locked){await store.acquireWorkerLock(config.chainId+':'+adapter.address.toLowerCase());locked=true;}
   store.assertWorkerLock();
   if(!state.ready||now()-lastCheck>=30000){const check=await adapter.preflight();lastCheck=now();state={...state,...check,checkedAt:new Date(now()).toISOString()};}
   if(state.ready)await deliverOne({store,adapter,now});
  }catch{
   state={...state,ready:false,status:'setup_check_pending',checkedAt:new Date(now()).toISOString()};
   // Recover failed initialization, but never start a second sender after lock loss.
   if(!locked){await store?.close().catch(()=>{});store=null;adapter?.close();adapter=null;}
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
 async function stop(){if(stopped)return;stopped=true;clearTimeout(timer);await inFlight;adapter?.close();await store?.close();state={...state,ready:false,status:'stopped'};}
 return {start,status,verify,stop,tick};
}
const runtime=createPassportRuntime();
module.exports={createPassportRuntime,runtime};
