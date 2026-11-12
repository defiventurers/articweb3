import {Contract,ContractFactory,getAddress,getCreateAddress,sha256,toUtf8Bytes,concat} from 'ethers';

export const TESTNET=Object.freeze({chainId:46630,name:'Robinhood Chain Testnet',rpc:'https://rpc.testnet.chain.robinhood.com',explorer:'https://explorer.testnet.chain.robinhood.com',confirmations:2});
export const REGISTRY_RUNTIME='dac8ec3e3451e234121c7bfd67f470348dae33f1b8d0d2b84bf8ef76bcfd0e17';
export const hashText=s=>sha256(toUtf8Bytes(s));
export async function assertTestnet(provider){if(Number((await provider.getNetwork()).chainId)!==TESTNET.chainId)throw Error('Select Robinhood testnet 46630. This tool cannot deploy on mainnet or Abstract.');}
const address=value=>{const a=getAddress(value);if(/^0x0{40}$/i.test(a))throw Error('Use a nonzero wallet address.');return a;};
export function newDeployment({owner,operator=owner,metadataBase='https://articweb3.onrender.com/arctic-play/v3/passport/metadata/46630/'}={}){
 const url=new URL(metadataBase);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!metadataBase.endsWith('/'))throw Error('Use a public HTTPS metadata base ending in /.');
 return {schema:1,chainId:46630,network:'Robinhood testnet',owner:address(owner),operator:address(operator),metadataBase,createdAt:new Date().toISOString(),contracts:{},smoke:null,backendEnabled:false};
}
export function checkRecord(record){
 if(record?.schema!==1||record.chainId!==46630||!record.contracts)throw Error('Use a Robinhood testnet deployment record.');
 newDeployment(record);
 for(const [name,c]of Object.entries(record.contracts)){
  if(!['FairPlayRegistry','AntarcticPassport'].includes(name)||!Number.isSafeInteger(c.nonce)||c.nonce<0)throw Error('Invalid contract deployment record.');
  address(c.address);
  if(c.transactionHash&&!/^0x[0-9a-f]{64}$/i.test(c.transactionHash))throw Error('Invalid deployment transaction hash.');
 }
 return record;
}
const argsFor=(name,r)=>name==='FairPlayRegistry'?[r.operator]:[r.owner,r.operator,r.metadataBase];
async function confirmedReceipt(provider,hash){
 const receipt=await provider.waitForTransaction(hash,2,120000);
 if(!receipt)throw Error('Transaction is still pending. Keep the deployment record and resume later.');
 if(receipt.status!==1)throw Error('Transaction reverted. Inspect the receipt before retrying.');
 const block=await provider.getBlock(receipt.blockNumber);
 if(!block||block.hash!==receipt.blockHash)throw Error('Receipt block changed. Recheck before continuing.');
 return receipt;
}
export async function verifyDeployment({provider,record,artifacts}){
 checkRecord(record);await assertTestnet(provider);
 if(artifacts.FairPlayRegistry.runtimeHash!==REGISTRY_RUNTIME)throw Error('Registry differs from the published verifier authority.');
 const evidence={chainId:46630,contracts:{},ready:false,finality:'Two L2 confirmations; Ethereum finality is not established.'};
 for(const name of ['FairPlayRegistry','AntarcticPassport']){
  const saved=record.contracts[name];if(!saved?.transactionHash)continue;
  const a=artifacts[name],receipt=await confirmedReceipt(provider,saved.transactionHash),tx=await provider.getTransaction(saved.transactionHash);
  const expected=(await new ContractFactory(a.abi,a.bytecode).getDeployTransaction(...argsFor(name,record))).data;
  if(!tx||tx.to!==null||tx.from.toLowerCase()!==record.owner.toLowerCase()||Number(tx.chainId)!==46630||tx.data.toLowerCase()!==expected.toLowerCase()||receipt.contractAddress?.toLowerCase()!==saved.address.toLowerCase())throw Error(name+' constructor, owner or creation receipt differs from this deployment plan.');
  const code=await provider.getCode(saved.address,receipt.blockNumber);
  if(code==='0x'||sha256(code).slice(2)!==a.runtimeHash)throw Error(name+' deployed code differs from the compiled artifact.');
  const c=new Contract(saved.address,a.abi,provider);
  if(name==='FairPlayRegistry'){
   if((await c.owner()).toLowerCase()!==record.owner.toLowerCase()||(await c.registrar()).toLowerCase()!==record.operator.toLowerCase())throw Error('Proof owner/registrar role mismatch.');
  }else{
   if(!await c.hasRole('0x'+'00'.repeat(32),record.owner)||!await c.hasRole(await c.MINTER_ROLE(),record.operator)||!await c.hasRole(await c.METADATA_ROLE(),record.operator)||!await c.supportsInterface('0x80ac58cd'))throw Error('Passport ERC-721/admin/minter role mismatch.');
  }
  evidence.contracts[name]={address:saved.address,transactionHash:saved.transactionHash,blockNumber:receipt.blockNumber,blockHash:receipt.blockHash,runtimeHash:a.runtimeHash,codeAndRolesVerified:true};
 }
 evidence.ready=Object.keys(evidence.contracts).length===2;
 return evidence;
}
export async function deployTestnet({provider,signer,artifacts,record,save=()=>{},progress=()=>{}}){
 checkRecord(record);await assertTestnet(provider);
 const owner=address(await signer.getAddress());
 if(owner!==getAddress(record.owner))throw Error('Reconnect the deployment owner wallet to resume.');
 if(artifacts.FairPlayRegistry.runtimeHash!==REGISTRY_RUNTIME)throw Error('Published registry runtime mismatch.');
 for(const name of ['FairPlayRegistry','AntarcticPassport']){
  await assertTestnet(provider);
  let prior=record.contracts[name];
  if(prior?.transactionHash){progress('Checking '+name+' receipt');await confirmedReceipt(provider,prior.transactionHash);continue;}
  if(prior&&prior.status!=='rejected'){
   const code=await provider.getCode(prior.address);
   if(code!=='0x'||await provider.getTransactionCount(owner,'pending')!==prior.nonce)throw Error('An earlier wallet request may have been sent. Recover its transaction hash before retrying '+name+'.');
  }
  if(await provider.getBalance(owner)===0n)throw Error('Request test ETH from the Robinhood testnet faucet for '+owner+'.');
  const a=artifacts[name],nonce=await provider.getTransactionCount(owner,'pending');
  const request=await new ContractFactory(a.abi,a.bytecode).getDeployTransaction(...argsFor(name,record));
  const estimate=await provider.estimateGas({...request,from:owner}),gasLimit=estimate*125n/100n;
  prior=record.contracts[name]={address:getCreateAddress({from:owner,nonce}),nonce,status:'awaiting-wallet',gasEstimate:String(estimate),compiler:a.compiler,sourceSha256:a.sourceSha256,runtimeHash:a.runtimeHash};
  await save(record);progress('Approve '+name+' deployment in your testnet wallet');
  try{
   const tx=await signer.sendTransaction({...request,nonce,gasLimit,chainId:46630,value:0n});
   prior.transactionHash=tx.hash;prior.status='submitted';await save(record);progress('Waiting for '+name+' confirmations');
   const receipt=await confirmedReceipt(provider,tx.hash);
   prior.blockNumber=receipt.blockNumber;prior.blockHash=receipt.blockHash;prior.status='confirmed';await save(record);
  }catch(e){if(e.code==='ACTION_REJECTED'||e.code===4001){prior.status='rejected';await save(record);}throw e;}
 }
 record.verification=await verifyDeployment({provider,record,artifacts});record.completedAt=new Date().toISOString();await save(record);
 return record;
}
export async function runRegistryRehearsal({provider,signer,artifacts,record,save=()=>{},progress=()=>{}}){
 const verification=await verifyDeployment({provider,record,artifacts});if(!verification.ready)throw Error('Verify both contract deployments first.');
 if((await signer.getAddress()).toLowerCase()!==record.operator.toLowerCase())throw Error('Connect the configured operator wallet for the registry rehearsal.');
 const c=new Contract(record.contracts.FairPlayRegistry.address,artifacts.FairPlayRegistry.abi,signer);
 if(!record.smoke){
  const nonce=globalThis.crypto.randomUUID();record.smoke={purpose:'Operator testnet rehearsal; not a player match or victory',matchId:hashText('AK-OPERATOR-TEST:'+nonce),headerHash:hashText('AK-OPERATOR-HEADER:'+nonce),eventHash:hashText('AK-OPERATOR-EVENT:'+nonce),transactions:{}};await save(record);
 }
 const s=record.smoke;
 async function send(name,fn){
  await assertTestnet(provider);
  if(!s.transactions[name]){progress('Approve '+name+' rehearsal transaction');const tx=await fn();s.transactions[name]=tx.hash;await save(record);}
  const receipt=await confirmedReceipt(provider,s.transactions[name]);return receipt;
 }
 await send('registerMatch',()=>c.registerMatch(s.matchId,s.headerHash));
 if(!s.transactions.commitRoll){
  const latest=await provider.getBlock('latest');s.round=Math.floor((Number(latest.timestamp)+180-1692803367)/3)+1;
  s.intentHash=hashText(JSON.stringify({purpose:s.purpose,matchId:s.matchId,sequence:1,round:s.round}));await save(record);
 }
 const roll=await send('commitRoll',()=>c.commitRoll(s.matchId,1,s.intentHash,s.round));
 const publication=1692803367+(s.round-1)*3;
 const rollBlock=await provider.getBlock(roll.blockNumber);
 const rollEvent=roll.logs.map(l=>{try{return c.interface.parseLog(l);}catch{return null;}}).find(l=>l?.name==='RollCommitted');
 if(!rollEvent||rollEvent.args.intentHash!==s.intentHash||Number(rollEvent.args.round)!==s.round||Number(rollEvent.args.publishTime)!==publication||Number(rollBlock.timestamp)>=publication)throw Error('Rehearsal roll receipt or pre-beacon timing mismatch.');
 await send('appendCheckpoint',()=>c.appendCheckpoint(s.matchId,[s.eventHash],true));
 const info=await c.matchInfo(s.matchId),root=sha256(concat(['0x00',s.eventHash]));
 if(info.headerHash!==s.headerHash||Number(info.count)!==1||!info.closed||await c.checkpointRoots(s.matchId,1)!==root)throw Error('Rehearsal checkpoint differs from its expected history root.');
 s.root=root;s.confirmed=true;s.beaconRequestTimingVerified=true;s.checkedAt=new Date().toISOString();await save(record);return s;
}
