const {JsonRpcProvider,Wallet,Contract,FetchRequest,id,formatEther,ZeroAddress}=require('ethers');
const {createHash}=require('node:crypto');
const {createPassportStore}=require('./antarcticPassportStore');
const VISA_ABI=['function mintVisa(address recipient,bytes32 claimId) returns (uint256)','function tokenForClaim(bytes32) view returns (uint256)','function ownerOf(uint256) view returns (address)','function tokenURI(uint256) view returns (string)','function hasRole(bytes32,address) view returns (bool)','event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'];
const ACHIEVEMENT_ABI=['function mintAchievement(address recipient,uint256 tokenId,bytes32 claimId)','function recipientForClaim(bytes32) view returns (address)','function tokenForClaim(bytes32) view returns (uint256)'];
const EGG_ABI=['function mintEgg(address recipient,bytes32 claimId,uint8 edition) returns (uint256)','function tokenForClaim(bytes32) view returns (uint256)','function ownerOf(uint256) view returns (address)','function hasRole(bytes32,address) view returns (bool)','function tokenURI(uint256) view returns (string)','event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'];
const ARRIVAL_ABI=['function mintArrival(address recipient,bytes32 claimId)','function recipientForClaim(bytes32) view returns (address)'];
function workerConfig(env=process.env){
 const chainId=Number(env.AK_VISA_CHAIN_ID||46630);if(!require('./gameWalletChains.json')[chainId])throw Error('Unsupported visa chain.');
 if(env.AK_VISA_DELIVERY_ENABLED!=='true')throw Error('NFT delivery is disabled.');
 if(!require('./gameWalletChains.json')[chainId].testnet&&env.AK_VISA_MAINNET_APPROVED!=='true')throw Error('Mainnet NFT delivery has not been approved.');
 // Never borrow a signer or collection from a different chain.
 const scoped=k=>(k==='AK_VISA_MINTER_KEY'?env['AK_PASSPORT_SIGNER_KEY_'+chainId]:null)||env[k+'_'+chainId]||env[k];
 for(const k of ['AK_VISA_RPC_URL','AK_VISA_MINTER_KEY','AK_VISA_CONTRACT'])if(!scoped(k))throw Error(k+' is required.');
 const u=new URL(scoped('AK_VISA_RPC_URL'));if(u.protocol!=='https:')throw Error('Use an HTTPS RPC endpoint.');
 for(const k of ['AK_VISA_CONTRACT','AK_ARRIVAL_CONTRACT','AK_ACHIEVEMENT_CONTRACT','AK_EGG_CONTRACT'].filter(k=>scoped(k)))if(!/^0x[0-9a-f]{40}$/i.test(scoped(k))||/^0x0{40}$/i.test(scoped(k)))throw Error('Invalid '+k);
 return {chainId,rpc:scoped('AK_VISA_RPC_URL'),key:scoped('AK_VISA_MINTER_KEY'),visa:scoped('AK_VISA_CONTRACT'),arrival:scoped('AK_ARRIVAL_CONTRACT'),achievements:scoped('AK_ACHIEVEMENT_CONTRACT'),egg:scoped('AK_EGG_CONTRACT')};
}

// One sequential sender per signer. Check the on-chain claim before every send,
// including recovery after a process died between broadcast and persistence.
async function deliverOne({store,adapter,now=Date.now}){
 const job=await store.claimJob(now(),adapter.chainId,adapter.supportedKinds);if(!job)return false;
 try{
  if(job.chain_id!==adapter.chainId)throw Object.assign(Error('Wrong network.'),{permanent:true,code:'NETWORK_MISMATCH'});
  const existing=await adapter.lookup(job);if(existing){if(existing.recipient.toLowerCase()!==job.wallet.toLowerCase()||(job.kind==='achievement'&&String(existing.tokenId)!==String(job.achievement_token_id)))throw Object.assign(Error('Claim recipient mismatch.'),{permanent:true,code:'RECIPIENT_MISMATCH'});await store.updateJob(job.id,{status:existing.confirmed===true?'confirmed':'submitted',tokenId:existing.tokenId||null,leaseUntil:0,runAfter:now()+30000,errorCode:null});return true;}
  let tx=job.tx_hash;
  if(!tx){tx=await adapter.send(job);await store.updateJob(job.id,{status:'submitted',txHash:tx,errorCode:null});}
  const receipt=await adapter.receipt(tx);
  if(!receipt){await store.updateJob(job.id,{status:'submitted',leaseUntil:0,runAfter:now()+30000});return true;}
  if(receipt.status!==1)throw Object.assign(Error('Mint reverted.'),{permanent:true,code:'TRANSACTION_REVERTED'});
  const minted=await adapter.lookup(job);if(!minted||minted.recipient.toLowerCase()!==job.wallet.toLowerCase()||(job.kind==='achievement'&&String(minted.tokenId)!==String(job.achievement_token_id)))throw Object.assign(Error('Receipt did not deliver this claim.'),{permanent:true,code:'CLAIM_NOT_DELIVERED'});
  await store.updateJob(job.id,{status:minted.confirmed===true?'confirmed':'submitted',tokenId:minted.tokenId||null,leaseUntil:0,runAfter:now()+30000,errorCode:null});
 }catch(e){await store.updateJob(job.id,{status:e.permanent?'blocked':'retry',leaseUntil:0,runAfter:now()+Math.min(3600000,30000*2**Math.min(job.attempts||0,6)),errorCode:e.permanent?e.code:'DELIVERY_RETRY'});}
 return true;
}
async function createAdapter(config,{provider:provided}={}){
 const request=new FetchRequest(config.rpc);request.timeout=12000;
 const provider=provided||new JsonRpcProvider(request,undefined,{cacheTimeout:0});
 try{
  const network=await provider.getNetwork();if(Number(network.chainId)!==config.chainId)throw Error('RPC chain does not match configuration.');
  for(const address of [config.visa,config.arrival,config.achievements,config.egg].filter(Boolean))if(await provider.getCode(address)==='0x')throw Error('Passport collection is not deployed.');
  if(config.chainId===46630){const code=await provider.getCode(config.visa),expected=require('../shared/chain/launch-contracts.json').contracts.AntarcticPassport.runtimeHash;if(createHash('sha256').update(Buffer.from(code.slice(2),'hex')).digest('hex')!==expected)throw Error('Passport runtime code does not match the reviewed contract.');}
  const signer=new Wallet(config.key,provider),visa=new Contract(config.visa,VISA_ABI,signer),arrival=config.arrival?new Contract(config.arrival,ARRIVAL_ABI,signer):null,achievements=config.achievements?new Contract(config.achievements,ACHIEVEMENT_ABI,signer):null,egg=config.egg?new Contract(config.egg,EGG_ABI,signer):null;
  const adapter={chainId:config.chainId,address:signer.address,contract:config.visa,supportedKinds:['visa',...(arrival?['arrival']:[]),...(achievements?['achievement']:[])],eggReady:false,
   async preflight(){
    if(Number((await provider.getNetwork()).chainId)!==config.chainId)throw Error('RPC network changed.');
    const [minter,balance,fee]=await Promise.all([visa.hasRole(id('MINTER_ROLE'),signer.address),provider.getBalance(signer.address),provider.getFeeData()]);
    const gasPrice=fee.maxFeePerGas||fee.gasPrice;if(!gasPrice)throw Error('Gas pricing is unavailable.');
    const minimum=gasPrice*350000n,funded=balance>=minimum;
    adapter.eggReady=!!(egg&&await egg.hasRole(id('MINTER_ROLE'),signer.address));
    adapter.supportedKinds=['visa',...(adapter.eggReady?['egg']:[]),...(arrival?['arrival']:[]),...(achievements?['achievement']:[])];
    return {ready:minter&&funded,status:!minter?'awaiting_minter_role':!funded?'awaiting_test_gas':'ready',minter,funded,balance:formatEther(balance),minimumBalance:formatEther(minimum),eggReady:adapter.eggReady,kinds:adapter.supportedKinds};
   },
   async lookup(j){
    const safeBlock=Math.max(0,(await provider.getBlockNumber())-1);
    if(j.kind==='visa'){
     const token=await visa.tokenForClaim(j.claim_id);if(token===0n)return null;
     const safeId=await visa.tokenForClaim(j.claim_id,{blockTag:safeBlock});
     const recipient=await visa.ownerOf(token),safeOwner=safeId===token?await visa.ownerOf(token,{blockTag:safeBlock}):null;
     return {tokenId:String(token),recipient,confirmed:safeId===token&&safeOwner?.toLowerCase()===recipient.toLowerCase()};
    }
    if(j.kind==='egg'){
     if(!egg)throw Object.assign(Error('Egg collection setup pending.'),{permanent:true,code:'EGG_SETUP_PENDING'});
     const edition=Number(j.egg_serial),token=await egg.tokenForClaim(j.claim_id);
     if(!Number.isInteger(edition)||edition<1||edition>33)throw Object.assign(Error('Invalid egg reservation.'),{permanent:true,code:'INVALID_EGG_EDITION'});
     if(token===0n)return null;
     if(Number(token)!==edition)throw Object.assign(Error('Egg edition differs from reservation.'),{permanent:true,code:'EGG_EDITION_MISMATCH'});
     const safe=await egg.tokenForClaim(j.claim_id,{blockTag:safeBlock}),recipient=await egg.ownerOf(token);
     return {tokenId:String(token),recipient,confirmed:safe===token&&(await egg.ownerOf(token,{blockTag:safeBlock})).toLowerCase()===recipient.toLowerCase()};
    }
    const collection=j.kind==='achievement'?achievements:arrival;
    if(!collection)throw Object.assign(Error('Optional collection setup pending.'),{permanent:true,code:'COLLECTION_SETUP_PENDING'});
    const r=await collection.recipientForClaim(j.claim_id),safe=await collection.recipientForClaim(j.claim_id,{blockTag:safeBlock});
    return r===ZeroAddress?null:{tokenId:j.kind==='achievement'?String(await collection.tokenForClaim(j.claim_id)):'1',recipient:r,confirmed:safe.toLowerCase()===r.toLowerCase()};
   },
   send:async j=>(await (j.kind==='visa'?visa.mintVisa(j.wallet,j.claim_id):j.kind==='egg'?egg.mintEgg(j.wallet,j.claim_id,Number(j.egg_serial)):j.kind==='achievement'?achievements.mintAchievement(j.wallet,j.achievement_token_id,j.claim_id):arrival.mintArrival(j.wallet,j.claim_id))).hash,
   async receipt(hash){const r=await provider.getTransactionReceipt(hash);if(!r||await r.confirmations()<2)return null;const block=await provider.getBlock(r.blockNumber);return block?.hash===r.blockHash?{status:r.status,blockNumber:r.blockNumber,blockHash:r.blockHash,receipt:r}:null;},
   async verifyEgg(j){
    if(!egg)return {confirmed:false,status:'egg_contract_unavailable'};
    const claim=await adapter.lookup(j),r=j.tx_hash?await adapter.receipt(j.tx_hash):null;
    const mint=r?.receipt?.logs.some(log=>{if(log.address.toLowerCase()!==config.egg.toLowerCase())return false;try{const e=egg.interface.parseLog(log);return e?.name==='Transfer'&&e.args.from===ZeroAddress&&e.args.to.toLowerCase()===j.wallet.toLowerCase()&&String(e.args.tokenId)===String(j.egg_serial);}catch{return false;}});
    const confirmed=claim?.confirmed===true&&claim.recipient.toLowerCase()===j.wallet.toLowerCase()&&String(claim.tokenId)===String(j.egg_serial)&&r?.status===1&&r.receipt.to?.toLowerCase()===config.egg.toLowerCase()&&mint===true;
    return {confirmed,chainId:config.chainId,contract:config.egg,wallet:j.wallet,tokenId:claim?.tokenId||null,transactionHash:j.tx_hash||null,...(confirmed?{blockNumber:r.blockNumber,blockHash:r.blockHash,tokenURI:await egg.tokenURI(claim.tokenId)}:{}),confirmationPolicy:'2 canonical L2 blocks; Ethereum finality not established'};
   },
   async verifyPassport(j){
    const claim=await adapter.lookup(j),r=j.tx_hash?await adapter.receipt(j.tx_hash):null;
    const mint=r?.receipt?.logs.some(log=>{if(log.address.toLowerCase()!==config.visa.toLowerCase())return false;try{const e=visa.interface.parseLog(log);return e?.name==='Transfer'&&e.args.from===ZeroAddress&&e.args.to.toLowerCase()===j.wallet.toLowerCase()&&String(e.args.tokenId)===String(claim?.tokenId);}catch{return false;}});
    const confirmed=claim?.confirmed===true&&claim.recipient.toLowerCase()===j.wallet.toLowerCase()&&r?.status===1&&r.receipt.to?.toLowerCase()===config.visa.toLowerCase()&&mint===true;
    return {confirmed,chainId:config.chainId,contract:config.visa,wallet:j.wallet,tokenId:claim?.tokenId||null,transactionHash:j.tx_hash||null,...(confirmed?{blockNumber:r.blockNumber,blockHash:r.blockHash,tokenURI:await visa.tokenURI(claim.tokenId)}:{}),confirmationPolicy:'2 canonical L2 blocks; Ethereum finality not established'};
   },close:()=>{if(!provided)provider.destroy();}
  };return adapter;
 }catch(e){if(!provided)provider.destroy();throw e;}
}
async function main(){
 const config=workerConfig(),store=createPassportStore();let adapter;
 try{
  adapter=await createAdapter(config);await store.init();let stopping=false;
  process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
  while(!stopping){
   await store.withWorkerLock(config.chainId+':'+adapter.address.toLowerCase(),async assertLock=>{
    if((await adapter.preflight()).ready)await deliverOne({store,adapter:{...adapter,send:async job=>{await assertLock();return adapter.send(job);}}});
   });
   await new Promise(r=>setTimeout(r,3000));
  }
 }finally{await store.close();adapter?.close();}
}
if(require.main===module)main().catch(()=>{console.error('Passport worker stopped. Check configuration, database and signer access.');process.exitCode=1;});
module.exports={deliverOne,workerConfig,createAdapter};
