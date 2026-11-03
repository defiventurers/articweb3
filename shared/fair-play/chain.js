import {keccak_256} from '@noble/hashes/sha3';
import {hex,utf8,sha256,unhex,merkleRoot} from './core.js';
import artifact from './registry-manifest.json' with {type:'json'};
export const NETWORKS={46630:{name:'Robinhood Testnet',rpc:'https://rpc.testnet.chain.robinhood.com',explorer:'https://explorer.testnet.chain.robinhood.com'},4663:{name:'Robinhood Chain',rpc:'https://rpc.mainnet.chain.robinhood.com',explorer:'https://robinhoodchain.blockscout.com'},11124:{name:'Abstract Sepolia',rpc:'https://api.testnet.abs.xyz',explorer:'https://sepolia.abscan.org'},2741:{name:'Abstract',rpc:'https://api.mainnet.abs.xyz',explorer:'https://abscan.org'}};
const topic=s=>'0x'+hex(keccak_256(utf8(s)));
export const CHECKPOINT_TOPIC=topic('Checkpoint(bytes32,uint64,bytes32,bool)');
export const ROLL_TOPIC=topic('RollCommitted(bytes32,uint64,bytes32,uint64,uint64)');
const strip=s=>String(s||'').toLowerCase().replace(/^0x/,'');
const word=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
export async function rpcRequest(chainId,method,params,fetcher=fetch) {
 const network=NETWORKS[chainId];if(!network)throw Error('Unsupported proof network.');
 try{const r=await fetcher(network.rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const json=await r.json();if(json.error)throw Error();return json.result;}
 catch{throw Object.assign(Error('The blockchain receipt could not be checked. Try again when the connection returns.'),{code:'RPC_UNAVAILABLE'});}
}
async function receiptFor(anchor,expectedTopic,matchId,rpc) {
 if(!/^0x[a-f0-9]{64}$/i.test(anchor.transactionHash||''))throw Error('Invalid checkpoint transaction.');
 const receipt=await rpc('eth_getTransactionReceipt',[anchor.transactionHash]);
 if(!receipt)return null;
 if(receipt.status!=='0x1'||strip(receipt.to)!==strip(anchor.registry))throw Error('The receipt is not a successful call to the proof contract.');
 const block=await rpc('eth_getBlockByNumber',[receipt.blockNumber,false]);
 if(!block||strip(block.hash)!==strip(receipt.blockHash))throw Error('This receipt belongs to a changed block. Retry after confirmation.');
 const log=receipt.logs?.find(l=>strip(l.address)===strip(anchor.registry)&&l.topics?.[0]===expectedTopic&&strip(l.topics[1])===matchId&&!l.removed);
 if(!log)throw Error('The transaction has no matching gameplay proof event.');
 return {receipt,block,log};
}
export async function verifyCheckpoint(checkpoint,bundle,{rpc:providedRpc}={}) {
 try {
  const id=checkpoint.chainId,network=NETWORKS[id],agreed=bundle.header.anchor;
  if(!network||!agreed?.configured||agreed.chainId!==id||strip(agreed.registry)!==strip(checkpoint.registry)||!/^0x[a-f0-9]{40}$/i.test(checkpoint.registry||''))throw Error('This checkpoint uses a different network or contract from the match agreement.');
  if(!Number.isInteger(checkpoint.count)||checkpoint.count<1||checkpoint.count>bundle.events.length)throw Error('Invalid checkpoint coverage.');
  const rpc=(method,params)=>providedRpc?providedRpc(method,params):rpcRequest(id,method,params);
  if(Number(BigInt(await rpc('eth_chainId',[])))!==id)throw Error('The RPC returned a different network.');
  const code=await rpc('eth_getCode',[checkpoint.registry,'latest']);
  if(!code||code==='0x'||await sha256(unhex(strip(code)))!==artifact.runtimeHash)throw Error('The proof contract does not match the published registry code.');
  const matchId=await sha256('AK-MATCH:'+bundle.header.matchId),result=await receiptFor(checkpoint,CHECKPOINT_TOPIC,matchId,rpc);
  const info=strip(await rpc('eth_call',[{to:checkpoint.registry,data:topic('matchInfo(bytes32)').slice(0,10)+matchId},'latest']));
  if(info.length!==192||info.slice(0,64)!==bundle.headerHash||Number(BigInt('0x'+info.slice(64,128)))<checkpoint.count)throw Error('The recorded match agreement does not match this proof.');
  if(!result)return {status:'pending',covered:0,message:'Waiting for the checkpoint receipt.'};
  const {log,receipt}=result,data=strip(log.data);
  if(log.topics[2]!==word(checkpoint.count)||data.length!==128||data.slice(0,64)!==checkpoint.root||BigInt('0x'+data.slice(64))!==(checkpoint.closed?1n:0n))throw Error('The checkpoint event does not match this proof.');
  const root=await merkleRoot(bundle.events.slice(0,checkpoint.count).map(e=>e.hash));
  if(root!==checkpoint.root)throw Error('The onchain root does not contain these moves.');
  const latest=Number(BigInt(await rpc('eth_blockNumber',[]))),confirmations=Math.max(0,latest-Number(BigInt(receipt.blockNumber))+1);
  let rollTimingVerified=true;
  for(const event of bundle.events.slice(0,checkpoint.count).filter(e=>e.rng)) {
   const anchor=event.rng.anchor;
   if(!anchor){rollTimingVerified=false;continue;}
   if(anchor.chainId!==id||strip(anchor.registry)!==strip(checkpoint.registry))throw Error('A dice commitment uses a different contract.');
   const roll=await receiptFor(anchor,ROLL_TOPIC,matchId,rpc);
   if(!roll){rollTimingVerified=false;continue;}
   const bytes=strip(roll.log.data);
   if(roll.log.topics[2]!==word(event.seq)||bytes.length!==192||bytes.slice(0,64)!==event.rng.intentHash||Number(BigInt('0x'+bytes.slice(64,128)))!==event.rng.round||Number(BigInt(roll.block.timestamp))>=Number(BigInt('0x'+bytes.slice(128))))throw Error('A dice request was not recorded before its beacon publication.');
  }
  return {status:confirmations>=2?'confirmed':'pending',covered:checkpoint.count,root,confirmations,rollTimingVerified,network:network.name,explorerUrl:network.explorer+'/tx/'+checkpoint.transactionHash,finality:'L2 confirmations; Ethereum finality not established'};
 }catch(e){if(e.code==='RPC_UNAVAILABLE')return {status:'pending',covered:0,message:e.message};throw e;}
}
