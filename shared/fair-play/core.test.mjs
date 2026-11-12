import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import * as core from './core.js';
import {verifyBeacon,verifySignedBeacon,verifyRandomness,diceValues,QUICKNET,roundTime} from './beacon.js';
// Historical protocol tests use the exact published authority, never a mutable
// gameplay engine. The separate integrity test still detects gameplay drift.
const require=createRequire(import.meta.url),engine=require('./legacy/arcticPlayEngine.cjs');
const rules=JSON.parse(await fs.readFile(new URL('./rules-manifest.json',import.meta.url)));
const server=await core.generateKey();
async function fixture(id='xiangqi') {
  const state=engine.create(id),definition=engine.game(id),keys=await Promise.all(definition.seats.map(()=>core.generateKey()));
  const actors=definition.seats.map((seat,n)=>({id:'player-'+n,seat,kind:'human',publicKey:keys[n].publicKey}));
  const bundle=await core.makeHeader({protocol:core.PROTOCOL,matchId:'test-'+id,gameId:id,rulesHash:rules.rulesHash,rulesVersion:engine.VERSION,initialState:state,initialStateHash:await core.stateHash(state),actors,serverPublicKey:server.publicKey,options:{randomness:'drand-quicknet-v1'}},server.privateKey);
  const opts={engine,rulesHash:rules.rulesHash,trustedKeys:[server.publicKey],verifyRandomness};
  return {state,bundle,actors,keys,opts};
}
test('Every board engine produces a signed, independently replayable first move',async()=>{
  for(const {id} of engine.GAME_LIST.filter(g=>g.id!=='dominion')) {
    const f=await fixture(id),n=f.actors.findIndex(a=>a.seat===engine.turn(f.state));
    const action=engine.actions(id,f.state)[0];
    const signed=await core.makeIntent({bundle:f.bundle,actor:f.actors[n].id,actionId:action.id,before:f.state},f.keys[n].privateKey);
    const state=engine.apply(id,f.state,action.id);
    await core.appendEvent(f.bundle,{signed,after:state},server.privateKey);
    const report=await core.verifyBundle(f.bundle,f.opts);
    assert.equal(report.status,'checked',id);assert.equal(report.moves,1,id);
  }
});
test('Altered, missing, duplicated and cross-match records cannot verify',async()=>{
  const f=await fixture(),n=f.actors.findIndex(a=>a.seat===engine.turn(f.state));
  const action=engine.actions('xiangqi',f.state)[0];
  const signed=await core.makeIntent({bundle:f.bundle,actor:f.actors[n].id,actionId:action.id,before:f.state},f.keys[n].privateKey);
  const state=engine.apply('xiangqi',f.state,action.id);
  await core.appendEvent(f.bundle,{signed,after:state},server.privateKey);
  await core.closeBundle(f.bundle,state,engine.result(state),server.privateKey);
  for(const change of [b=>b.events.push(b.events[0]),b=>b.events.pop(),b=>b.events[0].signed.intent.actionId='move|forged',b=>b.header.matchId='another-match',b=>b.events[0].afterHash='0'.repeat(64),b=>b.closure.result={winner:'red'}]) {
    const b=core.copy(f.bundle);change(b);await assert.rejects(core.verifyBundle(b,f.opts));
  }
  await assert.rejects(core.verifyBundle(f.bundle,{...f.opts,trustedKeys:[]}));
  assert.equal((await core.verifyBundle(f.bundle,f.opts)).moves,1);
});
test('Sannin replay recreates the rules state after canonical proof transport',async()=>{
  const f=await fixture('sannin');let state=f.state;
  for(let i=0;i<3;i++){
    const n=f.actors.findIndex(a=>a.seat===engine.turn(state));
    const action=engine.actions('sannin',state)[0];
    const signed=await core.makeIntent({bundle:f.bundle,actor:f.actors[n].id,actionId:action.id,before:state},f.keys[n].privateKey);
    state=engine.apply('sannin',state,action.id);
    await core.appendEvent(f.bundle,{signed,after:state},server.privateKey);
  }
  const transported=JSON.parse(core.canonical(f.bundle));
  const report=await core.verifyBundle(transported,f.opts);
  assert.equal(report.moves,3);
  assert.equal(await core.stateHash(report.state),await core.stateHash(state));
  assert.equal(report.chain.status,'unanchored');
});
test('a service-signed substituted initial position still fails the published initial-state check',async()=>{
  const f=await fixture('sannin');
  f.bundle.header.initialState.turn='not-a-seat';
  f.bundle.header.initialStateHash=await core.stateHash(f.bundle.header.initialState);
  f.bundle.headerHash=await core.hashObject(f.bundle.header);
  f.bundle.headerSignature=await core.sign(server.privateKey,core.headerMessage(f.bundle.headerHash));
  await assert.rejects(core.verifyBundle(f.bundle,f.opts),/starting board does not match the published rules/);
});
test('An empty ongoing match is labelled empty, not verified',async()=>{
  const f=await fixture();assert.equal((await core.verifyBundle(f.bundle,f.opts)).status,'empty');
});
test('Merkle proofs cover odd and even batches and reject changed positions',async()=>{
  for(let count=1;count<=19;count++) {
    const hashes=await Promise.all(Array.from({length:count},(_,n)=>core.sha256('move:'+n)));
    const root=await core.merkleRoot(hashes);
    for(let n=0;n<count;n++) {
      const p=await core.inclusionProof(hashes,n);assert.equal(p.root,root);assert.equal(await core.verifyInclusion(hashes[n],p),true);
      assert.equal(await core.verifyInclusion('0'.repeat(64),p),false);
    }
  }
});
test('Published drand BLS signature verifies; altered output, round and wrong network fail',async()=>{
  const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/drand-walkthrough.json',import.meta.url)));
  const b=await verifySignedBeacon(fixture.beacon,38,fixture.info);assert.match(b.randomness,/^[a-f0-9]{64}$/);
  await assert.rejects(verifySignedBeacon({...b,randomness:'0'.repeat(64)},38,fixture.info));
  await assert.rejects(verifySignedBeacon(b,39,fixture.info));
  await assert.rejects(verifySignedBeacon({...b,signature:'0'.repeat(96)},38,fixture.info));
  await assert.rejects(verifyBeacon(b,38));
});
async function fixtureForDice(beacon) {
  const f=await fixture('dominion'),n=f.actors.findIndex(a=>a.seat===engine.turn(f.state));
  const signed=await core.makeIntent({bundle:f.bundle,actor:f.actors[n].id,actionId:'roll|control:roll',before:f.state,beaconRound:42},f.keys[n].privateKey);
  const values=await diceValues(beacon,signed.intent,2);
  const rng={provider:'drand-quicknet-v1',chainHash:QUICKNET.hash,...beacon,count:2,values,intentHash:await core.hashObject(signed.intent),committedAt:roundTime(42)-4000};
  const state=engine.apply('dominion',f.state,signed.intent.actionId,{roll:{values}});
  await core.appendEvent(f.bundle,{signed,after:state,rng},server.privateKey);return f;
}

test('Production Quicknet signature and dice replay verify; changing dice, count or round fails',async()=>{
 const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/drand-quicknet.json',import.meta.url)));
 const beacon=await verifyBeacon(fixture.beacon,42),f=await fixtureForDice(beacon);
 assert.equal((await core.verifyBundle(f.bundle,f.opts)).rolls,1);
 for(const mutate of [b=>b.events[0].rng.values[0]=b.events[0].rng.values[0]%6+1,b=>b.events[0].rng.count=1,b=>b.events[0].rng.round=43]){
  const b=core.copy(f.bundle);mutate(b);await assert.rejects(core.verifyBundle(b,f.opts));
 }
 const e=f.bundle.events[0];
 await assert.rejects(verifyRandomness({...e.rng,values:[0,7]},{intent:e.signed.intent,header:f.bundle.header}));
 await assert.rejects(verifyRandomness({...e.rng,count:1},{intent:e.signed.intent,header:f.bundle.header}));
});
test('Public verification also works without WebCrypto, using pinned pure-JS signature verification',async()=>{
 const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/drand-quicknet.json',import.meta.url))),beacon=await verifyBeacon(fixture.beacon,42),f=await fixtureForDice(beacon),original=globalThis.crypto;
 try{Object.defineProperty(globalThis,'crypto',{value:{getRandomValues:original.getRandomValues.bind(original)},configurable:true});assert.equal((await core.verifyBundle(f.bundle,f.opts)).rolls,1);const b=core.copy(f.bundle);b.events[0].signed.signature='A'.repeat(86);await assert.rejects(core.verifyBundle(b,f.opts));}
 finally{Object.defineProperty(globalThis,'crypto',{value:original,configurable:true});}
});
