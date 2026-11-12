import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from './core.js';
import {verifyRandomness} from './beacon.js';
import {RULESETS,selectRuleset} from './rulesets.js';
import {signedFixture} from './proof-fixtures.mjs';
import {inspectProofAuthorities} from '../../mobile/arctic-play/scripts/build-proof-verifier.mjs';
const opts=f=>({engine:f.engine,rulesHash:f.authority.manifest.rulesHash,trustedKeys:[f.server.publicKey],verifyRandomness});
test('both immutable authorities match their separately published engine and source-list digests',inspectProofAuthorities);
test('every launch table, including long dice and both Shanshui tables, survives signed export and replay',async()=>{
 for(const {id}of RULESETS[1].engine.GAME_LIST){
  const options=id==='dominion'?{rulesProfile:'chaturanga-long-dice-v1',teamMode:'2v2'}:{};
  const f=await signedFixture({id,options,steps:id==='sannin'?3:1});
  assert.equal(selectRuleset(f.bundle.header).id,'launch-2026-11');
  const r=await core.verifyBundle(core.copy(f.bundle),opts(f));
  assert.equal(r.status,'checked',id);assert.equal(await core.stateHash(r.state),await core.stateHash(f.state),id);
  assert.equal(r.chain.status,'unanchored');
 }
});
test('unknown hashes, games, versions and silently ignored rules profiles fail closed',async()=>{
 const f=await signedFixture();
 for(const change of [{rulesHash:'0'.repeat(64)},{gameId:'future-game'},{rulesVersion:'future'},{options:{rulesProfile:'future'}}])assert.throws(()=>selectRuleset({...f.bundle.header,...change}));
 assert.throws(()=>selectRuleset({...f.bundle.header,rulesHash:RULESETS[0].manifest.rulesHash,gameId:'dominion',options:{rulesProfile:'chaturanga-long-dice-v1'}}),/profile/);
});
test('checked long-dice replay consumes public values without sampling local randomness',async()=>{
 const f=await signedFixture({id:'dominion',options:{rulesProfile:'chaturanga-long-dice-v1'}}),original=globalThis.crypto;
 try{
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:original.subtle,getRandomValues(){throw Error('Replay sampled local randomness');}}});
  const r=await core.verifyBundle(core.copy(f.bundle),opts(f));assert.equal(r.rolls,1);
  assert.ok(f.bundle.events[0].rng.values.every(v=>v>=2&&v<=5));
 }finally{Object.defineProperty(globalThis,'crypto',{configurable:true,value:original});}
});
test('a completed Commander victory checks and a re-signed false winner is rejected by the rules',async()=>{
 const f=await signedFixture({id:'co-tu-lenh'}),actor=f.actors.findIndex(a=>a.seat===f.engine.turn(f.state));
 const action=f.engine.actions('co-tu-lenh',f.state).find(a=>a.kind==='concede');
 const signed=await core.makeIntent({bundle:f.bundle,actor:f.actors[actor].id,actionId:action.id,before:f.state},f.keys[actor].privateKey);
 f.state=f.engine.apply('co-tu-lenh',f.state,action.id);await core.appendEvent(f.bundle,{signed,after:f.state},f.server.privateKey);
 await core.closeBundle(f.bundle,f.state,f.engine.result(f.state),f.server.privateKey);
 const r=await core.verifyBundle(f.bundle,opts(f));assert.equal(r.closed,true);assert.ok(r.result.winner);
 const forged=core.copy(f.bundle);forged.closure.result.winner='forged';
 const {signature,...body}=forged.closure;forged.closure.signature=await core.sign(f.server.privateKey,body);
 await assert.rejects(core.verifyBundle(forged,opts(f)),/final result/);
});
test('even service-receipted wrong-player actions and altered public dice fail',async()=>{
 const f=await signedFixture({id:'dominion',options:{rulesProfile:'chaturanga-long-dice-v1'},steps:0});
 const wrong=f.actors.findIndex(a=>a.seat!==f.engine.turn(f.state));
 const signed=await core.makeIntent({bundle:f.bundle,actor:f.actors[wrong].id,actionId:'roll-long|control:roll-long',before:f.state,beaconRound:42},f.keys[wrong].privateKey);
 await core.appendEvent(f.bundle,{signed,after:f.state},f.server.privateKey);
 await assert.rejects(core.verifyBundle(f.bundle,opts(f)),/wrong player/);
 const good=await signedFixture({id:'dominion',options:{rulesProfile:'chaturanga-long-dice-v1'}});
 good.bundle.events[0].rng.values[0]=99;
 const {hash,receipt,...body}=good.bundle.events[0];body.rng=good.bundle.events[0].rng;
 good.bundle.events[0].hash=await core.hashObject(body);good.bundle.events[0].receipt=await core.sign(good.server.privateKey,core.receiptMessage(good.bundle.header.matchId,good.bundle.events[0].hash));
 await assert.rejects(core.verifyBundle(good.bundle,opts(good)),/dice do not match/);
});
