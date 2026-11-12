import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {verifyCheckpoint,CHECKPOINT_TOPIC,ROLL_TOPIC} from './chain.js';
import {sha256,merkleRoot} from './core.js';
import {roundTime} from './beacon.js';
import {signedFixture} from './proof-fixtures.mjs';
const code=JSON.parse(await fs.readFile(new URL('./fixtures/registry-runtime.json',import.meta.url))).runtime;
const word=n=>BigInt(n).toString(16).padStart(64,'0'),registry='0x'+'11'.repeat(20),tx='0x'+'aa'.repeat(32),rollTx='0x'+'bb'.repeat(32),blockHash='0x'+'cc'.repeat(32);
async function fixture(){
 const {bundle}=await signedFixture({id:'dominion',options:{rulesProfile:'chaturanga-long-dice-v1'}});
 bundle.header.anchor={configured:true,chainId:46630,registry};
 const e=bundle.events[0],publication=roundTime(e.rng.round)/1000;
 e.rng.anchor={chainId:46630,registry,transactionHash:rollTx};
 const checkpoint={chainId:46630,registry,transactionHash:tx,count:1,root:await merkleRoot([e.hash]),closed:false};
 const matchId=await sha256('AK-MATCH:'+bundle.header.matchId);
 const receipt={status:'0x1',to:registry,blockNumber:'0x64',blockHash,logs:[{address:registry,topics:[CHECKPOINT_TOPIC,'0x'+matchId,'0x'+word(1)],data:'0x'+checkpoint.root+word(0)}]};
 const roll={status:'0x1',to:registry,blockNumber:'0x63',blockHash,logs:[{address:registry,topics:[ROLL_TOPIC,'0x'+matchId,'0x'+word(1)],data:'0x'+e.rng.intentHash+word(e.rng.round)+word(publication)}]};
 const state={chain:'0xb626',code,receipt,roll,publication,rollTime:publication-1,blockHash}; // 46630
 const rpc=async(method,params)=>{
  if(method==='eth_chainId')return state.chain;
  if(method==='eth_getCode')return state.code;
  if(method==='eth_getTransactionReceipt')return params[0]===tx?state.receipt:state.roll;
  if(method==='eth_getBlockByNumber')return {hash:state.blockHash,timestamp:'0x'+(params[0]==='0x63'?state.rollTime:publication+1).toString(16)};
  if(method==='eth_call')return '0x'+bundle.headerHash+word(1)+word(0);
  if(method==='eth_blockNumber')return '0x65';
  throw Error('Unexpected RPC '+method);
 };
 return {bundle,checkpoint,state,rpc};
}
test('matching contract, receipt, root and independently derived beacon time confirm coverage',async()=>{
 const f=await fixture(),r=await verifyCheckpoint(f.checkpoint,f.bundle,{rpc:f.rpc});
 assert.equal(r.status,'confirmed');assert.equal(r.covered,1);assert.equal(r.rollTimingVerified,true);
 assert.match(r.finality,/Ethereum finality not established/);
});
test('a fabricated later publication time cannot turn an after-result roll into a timing proof',async()=>{
 const f=await fixture();f.state.rollTime=f.state.publication+10;
 f.state.roll.logs[0].data=f.state.roll.logs[0].data.slice(0,-64)+word(f.state.publication+1000);
 await assert.rejects(verifyCheckpoint(f.checkpoint,f.bundle,{rpc:f.rpc}),/before its beacon/);
});
test('late rolls, wrong networks/contracts, changed roots and reorganized receipts are rejected',async()=>{
 for(const change of [f=>f.state.rollTime=f.state.publication,f=>f.state.chain='0x1',f=>f.state.code='0x00',f=>f.state.receipt.logs[0].data='0x'+'ff'.repeat(32)+word(0),f=>f.state.blockHash='0x'+'dd'.repeat(32)]){
  const f=await fixture();change(f);await assert.rejects(verifyCheckpoint(f.checkpoint,f.bundle,{rpc:f.rpc}));
 }
});
test('missing receipts and RPC outages remain pending, without confirmed coverage',async()=>{
 const f=await fixture();f.state.receipt=null;
 assert.equal((await verifyCheckpoint(f.checkpoint,f.bundle,{rpc:f.rpc})).status,'pending');
 const r=await verifyCheckpoint(f.checkpoint,f.bundle,{rpc:async()=>{throw Object.assign(Error('RPC unavailable'),{code:'RPC_UNAVAILABLE'});}});
 assert.equal(r.status,'pending');assert.equal(r.covered,0);
});
