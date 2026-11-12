import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ganache from 'ganache';
import {BrowserProvider,Contract,sha256} from 'ethers';
import {compileBundle} from './compile.mjs';
import {newDeployment,deployTestnet,verifyDeployment,runRegistryRehearsal,hashText,REGISTRY_RUNTIME} from './testnet.mjs';
import {indexDeployment,snapshotStore} from './event-index.mjs';
import indexer from '../../shared/chain/confirmed-events.cjs';
import {verifyExplorerSources} from './explorer-verification.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {artifacts,input}=compileBundle();
test('compilation retains the exact published registry and complete explorer verification input',async()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../../shared/fair-play/registry-manifest.json',import.meta.url)));
 assert.equal(artifacts.FairPlayRegistry.runtimeHash,manifest.runtimeHash);assert.equal(artifacts.FairPlayRegistry.runtimeHash,REGISTRY_RUNTIME);
 assert.equal(artifacts.FairPlayRegistry.sourceSha256,manifest.sourceHash);assert.ok(Object.keys(input.sources).length>20);
 const solc=(await import('solc')).default,result=JSON.parse(solc.compile(JSON.stringify(input)));
 assert.equal(result.contracts['FairPlayRegistry.sol'].FairPlayRegistry.evm.bytecode.object,artifacts.FairPlayRegistry.bytecode.slice(2));
});
test('local EVM: deploy, resume without duplicates, verify roles/code, commit a rehearsal and reconcile indexed passport mints',{timeout:60000},async()=>{
 const local=ganache.provider({logging:{quiet:true},chain:{chainId:46630}}),provider=new BrowserProvider(local,undefined,{cacheTimeout:0});provider.pollingInterval=100;
 let mining=false;const timer=setInterval(async()=>{if(mining)return;mining=true;try{await local.request({method:'evm_mine',params:[]});}catch{}finally{mining=false;}},100);
 try{
  const signer=await provider.getSigner(0),owner=await signer.getAddress(),record=newDeployment({owner});let saved;
  const save=async r=>{saved=JSON.parse(JSON.stringify(r));};
  await deployTestnet({provider,signer,artifacts,record,save});
  assert.equal(record.verification.ready,true);assert.equal(Object.keys(record.contracts).length,2);
  const nonce=await provider.getTransactionCount(owner);
  await deployTestnet({provider,signer,artifacts,record,save});assert.equal(await provider.getTransactionCount(owner),nonce);
  assert.equal(saved.backendEnabled,false);
  await assert.rejects(verifyDeployment({provider,record:{...record,metadataBase:'https://other.test/'},artifacts}),/constructor/);
  await assert.rejects(deployTestnet({provider,signer:await provider.getSigner(1),artifacts,record}),/owner wallet/);
  await runRegistryRehearsal({provider,signer,artifacts,record,save});assert.equal(record.smoke.confirmed,true);assert.equal(record.smoke.beaconRequestTimingVerified,true);
  const before=await provider.getTransactionCount(owner);await runRegistryRehearsal({provider,signer,artifacts,record,save});assert.equal(await provider.getTransactionCount(owner),before);
  const passport=new Contract(record.contracts.AntarcticPassport.address,artifacts.AntarcticPassport.abi,signer),player=await(await provider.getSigner(1)).getAddress();
  await(await passport.mintVisa(player,hashText('local-index-test-only'))).wait(2);
  let snapshot;const store=snapshotStore(null,s=>{snapshot=structuredClone(s);});
  const report=await indexDeployment({provider,record,artifacts,store});
  assert.equal(report.ready,true);assert.equal(report.reconciliation.confirmedPassports,'1');assert.equal(report.reconciliation.rehearsalIndexed,true);
  const count=store.events.size;
  const resumed=snapshotStore(snapshot);const second=await indexDeployment({provider,record,artifacts,store:resumed});
  assert.equal(second.reconciliation.confirmedPassports,'1');assert.equal(resumed.events.size,count);
  assert.ok([...resumed.events.values()].every(e=>e.chainId===46630));
  let explorerVerified=false,submissions=0;
  const fetcher=async(url,options={})=>{
   assert.equal(new URL(url).origin,'https://explorer.testnet.chain.robinhood.com');
   const p=options.method==='POST'?new URLSearchParams(options.body):new URL(url).searchParams;
   let value;
   if(p.get('action')==='getsourcecode'){
    const name=Object.keys(record.contracts).find(n=>record.contracts[n].address===p.get('address'));
    value={status:'1',result:[{SourceCode:explorerVerified?'verified source':'',ContractName:name,CompilerVersion:'v0.8.24+commit.e11b9ed9'}]};
   }else if(p.get('action')==='verifysourcecode'){
    assert.equal(p.get('codeformat'),'solidity-standard-json-input');assert.equal(p.get('compilerversion'),'v0.8.24+commit.e11b9ed9');assert.ok(Object.keys(JSON.parse(p.get('sourceCode')).sources).length>20);submissions++;value={status:'1',result:'fixture-guid-'+submissions};
   }else value={status:'1',result:'Pass - Verified'};
   return {ok:true,json:async()=>value};
  };
  assert.equal((await verifyExplorerSources({provider,record,artifacts,input,fetcher,save})).verified,false);assert.equal(submissions,2);
  assert.equal((await verifyExplorerSources({provider,record,artifacts,input,fetcher,save})).verified,false,'a GUID result alone does not establish verification for the configured address');
  explorerVerified=true;assert.equal((await verifyExplorerSources({provider,record,artifacts,input,fetcher,save})).verified,true);
  const {createRobinhoodEventIndexer}=require('../../server/robinhoodEventIndexer.js'),backendStore=indexer.memoryStore();
  backendStore.aggregate=async scope=>({available:!!(await backendStore.load(scope))?.ready});
  const worker=createRobinhoodEventIndexer({env:{AK_RH_EVENT_INDEX_ENABLED:'true'},provider,record,store:backendStore});
  const backendStatus=await worker.runOnce();assert.equal(backendStatus.ready,true);assert.equal(backendStatus.scopes.length,2);assert.equal(backendStore.events.size,count);
  const disabled=createRobinhoodEventIndexer({env:{}});assert.equal((await disabled.start()).enabled,false);
 }finally{clearInterval(timer);provider.destroy();await local.disconnect();}
});
test('wrong network is rejected before any transaction or record mutation',async()=>{
 let sent=0;const record=newDeployment({owner:'0x'+'11'.repeat(20)}),before=JSON.stringify(record);
 await assert.rejects(deployTestnet({provider:{getNetwork:async()=>({chainId:2741n})},signer:{sendTransaction(){sent++;}},artifacts,record}),/46630/);
 assert.equal(sent,0);assert.equal(JSON.stringify(record),before);
 assert.throws(()=>newDeployment({owner:'0x'+'00'.repeat(20)}),/nonzero/);
});
function chainFixture(chainId=46630){
 const contract='0x'+'11'.repeat(20),hash=n=>'0x'+n.toString(16).padStart(64,'0'),blocks=new Map(Array.from({length:12},(_,n)=>[n,{number:n,hash:hash(n+1)}]));
 const state={head:6,logs:[],onLogs:null,chainId};
 const provider={getNetwork:async()=>({chainId:state.chainId}),getBlockNumber:async()=>state.head,getCode:async()=> '0x1234',getBlock:async n=>blocks.get(n)||null,
  getLogs:async({fromBlock,toBlock})=>{const out=state.logs.filter(l=>l.blockNumber>=fromBlock&&l.blockNumber<=toBlock);state.onLogs?.();return out;}};
 const scope={chainId,contract,fromBlock:2,kind:'passport',runtimeHash:'a'.repeat(64)};
 const log=(block,token)=>({address:contract,blockNumber:block,blockHash:blocks.get(block).hash,transactionHash:hash(100+token),index:0,parsed:{name:'Transfer',args:{from:'0x'+'00'.repeat(20),to:contract,tokenId:String(token)}}});
 return {provider,scope,blocks,state,hash,log,options:{provider,scope,decode:l=>l.parsed,hashCode:()=> 'a'.repeat(64),batchSize:2}};
}
test('confirmed indexing resumes idempotently and reorg recovery retains another chain with the same contract address',async()=>{
 const f=chainFixture(),abstract=chainFixture(11124),store=indexer.memoryStore();
 f.state.logs=[f.log(5,1)];abstract.state.logs=[abstract.log(5,9)];
 await indexer.syncConfirmedEvents({...f.options,store});await indexer.syncConfirmedEvents({...abstract.options,store});assert.equal(store.events.size,2);
 assert.equal((await indexer.syncConfirmedEvents({...f.options,store})).indexed,0);
 for(let n=4;n<12;n++)f.blocks.set(n,{number:n,hash:f.hash(n+100)});
 f.state.head=7;f.state.logs=[f.log(4,2)];
 const result=await indexer.syncConfirmedEvents({...f.options,store});assert.equal(result.reorg,true);assert.equal(result.ready,true);
 assert.deepEqual([...store.events.values()].filter(e=>e.chainId===46630).map(e=>e.args.tokenId),['2']);
 assert.deepEqual([...store.events.values()].filter(e=>e.chainId===11124).map(e=>e.args.tokenId),['9']);
});
test('unconfirmed blocks, wrong chain/code, changed in-flight blocks and stale writers cannot create confirmed rows',async()=>{
 const f=chainFixture(),store=indexer.memoryStore();f.state.logs=[f.log(6,1)];
 await indexer.syncConfirmedEvents({...f.options,store});assert.equal(store.events.size,0);
 await assert.rejects(indexer.syncConfirmedEvents({...f.options,store,scope:{...f.scope,chainId:1}}),/chain mismatch/);
 await assert.rejects(indexer.syncConfirmedEvents({...f.options,store,hashCode:()=> 'b'.repeat(64)}),/contract code/);
 const race=chainFixture(),empty=indexer.memoryStore();race.state.onLogs=()=>race.blocks.set(3,{number:3,hash:race.hash(999)});
 await assert.rejects(indexer.syncConfirmedEvents({...race.options,store:empty}),/changed during/);assert.equal(empty.events.size,0);assert.equal(empty.states.size,0);
 const saved=await store.load(f.scope);await assert.rejects(store.apply(f.scope,0,{from:2,to:3,logs:[],state:saved}),/Another indexer/);
});
