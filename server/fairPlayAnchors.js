const {JsonRpcProvider,Wallet,Contract,Interface}=require('ethers');
const ABI=[
 'function matchInfo(bytes32) view returns(bytes32 headerHash,uint64 count,bool closed)',
 'function registerMatch(bytes32,bytes32)',
 'function commitRoll(bytes32,uint64,bytes32,uint64)',
 'function appendCheckpoint(bytes32,bytes32[],bool)',
 'function requestHashes(bytes32,uint64) view returns(bytes32)',
 'function requestBlocks(bytes32,uint64) view returns(uint256)',
 'event RollCommitted(bytes32 indexed matchId,uint64 indexed sequence,bytes32 intentHash,uint64 round,uint64 publishTime)',
 'event Checkpoint(bytes32 indexed matchId,uint64 indexed count,bytes32 root,bool closed)'
];
const NETWORKS={46630:{rpc:'https://rpc.testnet.chain.robinhood.com',explorer:'https://explorer.testnet.chain.robinhood.com'},11124:{rpc:'https://api.testnet.abs.xyz',explorer:'https://sepolia.abscan.org'},4663:{rpc:'https://rpc.mainnet.chain.robinhood.com',explorer:'https://robinhoodchain.blockscout.com'},2741:{rpc:'https://api.mainnet.abs.xyz',explorer:'https://abscan.org'}};
function createFairPlayAnchors({env=process.env}={}) {
 const chainId=Number(env.AK_FAIR_CHAIN_ID||46630),network=NETWORKS[chainId],registry=String(env.AK_FAIR_REGISTRY_ADDRESS||'');
 const configured=!!network&&/^0x[a-f0-9]{40}$/i.test(registry)&&!/^0x0{40}$/.test(registry)&&/^0x[a-f0-9]{64}$/i.test(env.AK_FAIR_RELAYER_KEY||'')&&env.AK_FAIR_ANCHOR_ENABLED==='true'&&([46630,11124].includes(chainId)||env.AK_FAIR_MAINNET_ENABLED==='true');
 const config=()=>({configured,chainId,registry:configured?registry:null,explorer:network?.explorer||null,assurance:'record inclusion; rules and beacon signatures checked independently'});
 let connection,tail=Promise.resolve();
 async function get(){if(!configured)throw Error('Onchain recording is awaiting configuration.');if(!connection){const provider=new JsonRpcProvider(env.AK_FAIR_RPC_URL||network.rpc,chainId),signer=new Wallet(env.AK_FAIR_RELAYER_KEY,provider);const actual=await provider.getNetwork();if(Number(actual.chainId)!==chainId)throw Error('Proof network mismatch.');connection={provider,contract:new Contract(registry,ABI,signer)};}return connection;}
 const exclusive=fn=>{const job=tail.catch(()=>{}).then(fn);tail=job;return job;};
 async function id(room){const {sha256}=await import('../shared/fair-play/core.js');return '0x'+await sha256('AK-MATCH:'+room.matchId);}
 async function register(room,c){const matchId=await id(room),info=await c.contract.matchInfo(matchId);if(/^0x0{64}$/.test(info.headerHash))await (await c.contract.registerMatch(matchId,'0x'+room.fair.bundle.headerHash)).wait(2);else if(info.headerHash.toLowerCase()!=='0x'+room.fair.bundle.headerHash)throw Error('A different match header is already recorded.');return matchId;}
 async function commitRoll(room,pending){return exclusive(async()=>{
  const c=await get(),matchId=await register(room,c),intent=pending.signed.intent,expected='0x'+pending.intentHash;
  let receipt;
  const prior=await c.contract.requestHashes(matchId,intent.seq);
  if(!/^0x0{64}$/.test(prior)){
   if(prior.toLowerCase()!==expected)throw Error('A different roll was committed for this turn.');
   const block=await c.contract.requestBlocks(matchId,intent.seq),logs=await c.contract.queryFilter(c.contract.filters.RollCommitted(matchId,intent.seq),Number(block),Number(block));
   if(!logs.length)throw Error('The original roll receipt is temporarily unavailable.');receipt=await c.provider.getTransactionReceipt(logs[0].transactionHash);
  }else receipt=await (await c.contract.commitRoll(matchId,intent.seq,expected,intent.beaconRound)).wait(2);
  if(!receipt||receipt.status!==1)throw Error('The roll commitment has not confirmed.');
  return {chainId,registry,transactionHash:receipt.hash,blockNumber:receipt.blockNumber};
 });}
 async function checkpoint(room){if(!configured)return null;return exclusive(async()=>{
  const c=await get(),matchId=await register(room,c),bundle=room.fair.bundle;
  let info=await c.contract.matchInfo(matchId),count=Number(info.count),receipt;
  if(info.closed)return bundle.checkpoint||null;
  const target=bundle.events.length;
  while(count<target){const next=Math.min(count+64,target),hashes=bundle.events.slice(count,next).map(e=>'0x'+e.hash),close=!!bundle.closure&&next===target;receipt=await (await c.contract.appendCheckpoint(matchId,hashes,close)).wait(2);if(receipt.status!==1)throw Error('The checkpoint has not confirmed.');count=next;}
  if(bundle.closure&&count===target&&!receipt){receipt=await (await c.contract.appendCheckpoint(matchId,[],true)).wait(2);}
  if(!receipt)return bundle.checkpoint||null;
  const parsed=receipt.logs.map(l=>{try{return new Interface(ABI).parseLog(l);}catch{return null;}}).find(l=>l?.name==='Checkpoint');
  if(!parsed)throw Error('The checkpoint receipt is missing its event.');
  return {chainId,registry,transactionHash:receipt.hash,count:Number(parsed.args.count),root:parsed.args.root.slice(2),closed:parsed.args.closed,blockNumber:receipt.blockNumber};
 });}
 return {config,commitRoll,checkpoint};
}
module.exports={createFairPlayAnchors,ABI,NETWORKS};
