const {JsonRpcProvider,Wallet,Contract}=require('ethers');
const {createPassportStore}=require('./antarcticPassportStore');
const VISA_ABI=['function mintVisa(address recipient,bytes32 claimId) returns (uint256)','function tokenForClaim(bytes32) view returns (uint256)','function ownerOf(uint256) view returns (address)'];
const ACHIEVEMENT_ABI=['function mintAchievement(address recipient,uint256 tokenId,bytes32 claimId)','function recipientForClaim(bytes32) view returns (address)','function tokenForClaim(bytes32) view returns (uint256)'];
const ARRIVAL_ABI=['function mintArrival(address recipient,bytes32 claimId)','function recipientForClaim(bytes32) view returns (address)'];
function workerConfig(env=process.env){
 const chainId=Number(env.AK_VISA_CHAIN_ID||11124);if(![11124,2741].includes(chainId))throw Error('Unsupported visa chain.');
 if(env.AK_VISA_DELIVERY_ENABLED!=='true')throw Error('NFT delivery is disabled.');
 if(chainId===2741&&env.AK_VISA_MAINNET_APPROVED!=='true')throw Error('Mainnet NFT delivery has not been approved.');
 for(const k of ['AK_VISA_RPC_URL','AK_VISA_MINTER_KEY','AK_VISA_CONTRACT','AK_ARRIVAL_CONTRACT'])if(!env[k])throw Error(k+' is required.');
 const u=new URL(env.AK_VISA_RPC_URL);if(u.protocol!=='https:')throw Error('Use an HTTPS RPC endpoint.');
 for(const k of ['AK_VISA_CONTRACT','AK_ARRIVAL_CONTRACT',...(env.AK_ACHIEVEMENT_CONTRACT?['AK_ACHIEVEMENT_CONTRACT']:[])])if(!/^0x[0-9a-f]{40}$/i.test(env[k])||/^0x0{40}$/i.test(env[k]))throw Error('Invalid '+k);
 return {chainId,rpc:env.AK_VISA_RPC_URL,key:env.AK_VISA_MINTER_KEY,visa:env.AK_VISA_CONTRACT,arrival:env.AK_ARRIVAL_CONTRACT,achievements:env.AK_ACHIEVEMENT_CONTRACT};
}

// One sequential sender per signer. Check the on-chain claim before every send,
// including recovery after a process died between broadcast and persistence.
async function deliverOne({store,adapter,now=Date.now}){
 const job=await store.claimJob(now());if(!job)return false;
 try{
  if(job.chain_id!==adapter.chainId)throw Object.assign(Error('Wrong network.'),{permanent:true,code:'NETWORK_MISMATCH'});
  const existing=await adapter.lookup(job);if(existing){if(existing.recipient.toLowerCase()!==job.wallet.toLowerCase()||(job.kind==='achievement'&&String(existing.tokenId)!==String(job.achievement_token_id)))throw Object.assign(Error('Claim recipient mismatch.'),{permanent:true,code:'RECIPIENT_MISMATCH'});await store.updateJob(job.id,{status:existing.confirmed===false?'submitted':'confirmed',tokenId:existing.tokenId||null,leaseUntil:0,runAfter:now()+30000,errorCode:null});return true;}
  let tx=job.tx_hash;
  if(!tx){tx=await adapter.send(job);await store.updateJob(job.id,{status:'submitted',txHash:tx,errorCode:null});}
  const receipt=await adapter.receipt(tx);
  if(!receipt){await store.updateJob(job.id,{status:'submitted',leaseUntil:0,runAfter:now()+30000});return true;}
  if(receipt.status!==1)throw Object.assign(Error('Mint reverted.'),{permanent:true,code:'TRANSACTION_REVERTED'});
  const minted=await adapter.lookup(job);if(!minted||minted.recipient.toLowerCase()!==job.wallet.toLowerCase()||(job.kind==='achievement'&&String(minted.tokenId)!==String(job.achievement_token_id)))throw Object.assign(Error('Receipt did not deliver this claim.'),{permanent:true,code:'CLAIM_NOT_DELIVERED'});
  await store.updateJob(job.id,{status:'confirmed',tokenId:minted.tokenId||null,leaseUntil:0,errorCode:null});
 }catch(e){await store.updateJob(job.id,{status:e.permanent?'blocked':'retry',leaseUntil:0,runAfter:now()+Math.min(3600000,30000*2**Math.min(job.attempts||0,6)),errorCode:e.permanent?e.code:'DELIVERY_RETRY'});}
 return true;
}
async function createAdapter(config){const provider=new JsonRpcProvider(config.rpc),network=await provider.getNetwork();if(Number(network.chainId)!==config.chainId)throw Error('RPC chain does not match configuration.');for(const address of [config.visa,config.arrival])if(await provider.getCode(address)==='0x')throw Error('Passport contract is not deployed.');if(config.achievements&&await provider.getCode(config.achievements)==='0x')throw Error('Achievement contract is not deployed.');const signer=new Wallet(config.key,provider),visa=new Contract(config.visa,VISA_ABI,signer),arrival=new Contract(config.arrival,ARRIVAL_ABI,signer),achievements=config.achievements?new Contract(config.achievements,ACHIEVEMENT_ABI,signer):null;return {
 chainId:config.chainId,address:signer.address,
 lookup:async j=>{const safeBlock=Math.max(0,(await provider.getBlockNumber())-1);if(j.kind==='visa'){const id=await visa.tokenForClaim(j.claim_id);return id>0n?{tokenId:String(id),recipient:await visa.ownerOf(id),confirmed:(await visa.tokenForClaim(j.claim_id,{blockTag:safeBlock}))>0n}:null;}if(j.kind==='achievement'&&!achievements)throw Object.assign(Error('Achievement setup pending.'),{permanent:true,code:'ACHIEVEMENT_SETUP_PENDING'});const collection=j.kind==='achievement'?achievements:arrival;const r=await collection.recipientForClaim(j.claim_id);return /^0x0{40}$/i.test(r)?null:{tokenId:j.kind==='achievement'?String(await collection.tokenForClaim(j.claim_id)):'1',recipient:r,confirmed:!/^0x0{40}$/i.test(await collection.recipientForClaim(j.claim_id,{blockTag:safeBlock}))};},
 send:async j=>(await (j.kind==='visa'?visa.mintVisa(j.wallet,j.claim_id):j.kind==='achievement'?achievements.mintAchievement(j.wallet,j.achievement_token_id,j.claim_id):arrival.mintArrival(j.wallet,j.claim_id))).hash,
 receipt:async hash=>{const r=await provider.getTransactionReceipt(hash);return r&&await r.confirmations()>=2?{status:r.status}:null;},close:()=>provider.destroy()
};}
async function main(){const config=workerConfig(),store=createPassportStore();let adapter;try{adapter=await createAdapter(config);await store.init();await store.acquireWorkerLock(config.chainId+':'+adapter.address.toLowerCase());let stopping=false;process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});while(!stopping){await deliverOne({store,adapter});await new Promise(r=>setTimeout(r,3000));}}finally{await store.close();adapter?.close();}}
if(require.main===module)main().catch(()=>{console.error('Passport worker stopped. Check configuration, database and signer access.');process.exitCode=1;});
module.exports={deliverOne,workerConfig,createAdapter};
