import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import * as core from './core.js';
import {verifyBeacon,verifySignedBeacon,verifyRandomness,diceValues,QUICKNET,roundTime} from './beacon.js';
const require=createRequire(import.meta.url),engine=require('../../server/arcticPlayEngine.cjs');
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
  const signed=await core.makeIntent({bundle:f.bundle,actor:f.actors[n].id,actionId:'roll|control:roll',before:f.state,beaconRound:1000},f.keys[n].privateKey);
  const values=await diceValues(beacon,signed.intent,2);
  const rng={provider:'drand-quicknet-v1',chainHash:QUICKNET.hash,...beacon,count:2,values,intentHash:await core.hashObject(signed.intent),committedAt:roundTime(1000)-4000};
  const state=engine.apply('dominion',f.state,signed.intent.actionId,{roll:{values}});
  await core.appendEvent(f.bundle,{signed,after:state,rng},server.privateKey);return f;
}
