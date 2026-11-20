import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const m=require('../src/unlockModel.cjs');
const regional=require('../src/regionalChallenges.cjs');

test('regional puzzles have distinct stable IDs, source labels, and unambiguous correct choices',()=>{
  const seen=new Set();
  for(const c of regional.CHALLENGES){
    assert.ok(!seen.has(c.id));
    seen.add(c.id);
    assert.equal(c.kind,'modern-rule-puzzle');
    assert.ok(regional.ORIGINS[c.region]);
    assert.equal(regional.solved(c.id,c.answer),true);
    assert.equal(regional.solved(c.id,(c.answer+1)%c.choices.length),false);
    assert.ok(c.explanation.length>10);
  }
  assert.ok(regional.challengesFor('china').length>=3);
  assert.ok(regional.challengesFor('japan').length>=3);
});

test('China puzzles earn a China key but do not unlock Japan',()=>{
  let p=m.empty();
  for(const c of regional.challengesFor('china').slice(0,3))p=m.complete(p,c.id,c.answer);
  assert.equal(m.regionBalance(p,'china'),1);
  assert.equal(m.regionBalance(p,'japan'),0);
  assert.equal(m.balance(p),0);
  assert.throws(()=>m.spend(p,'sannin'));
  p=m.spend(p,'sanyou',123);
  assert.equal(p.keyMethods.sanyou,'china');
  assert.equal(m.access('sanyou',{progress:p}).open,true);
  assert.equal(m.regionBalance(p,'china'),0);
  assert.throws(()=>m.spend(p,'sanguo'));
});

test('Japan puzzles earn a Japanese Lantern Key for Sannin only',()=>{
  let p=m.empty();
  for(const c of regional.challengesFor('japan').slice(0,3))p=m.complete(p,c.id,c.answer);
  p=m.spend(p,'sannin',456);
  assert.equal(p.keyMethods.sannin,'japan');
  assert.equal(m.access('sannin',{progress:p}).open,true);
  assert.throws(()=>m.spend(p,'sanguo'));
});

test('existing universal formations still work and invalid regional submissions are rejected',()=>{
  let p=m.empty();
  const first=regional.challengesFor('china')[0];
  assert.throws(()=>m.complete(p,first.id,(first.answer+1)%3));
  assert.throws(()=>m.complete(p,'made-up-quiz',0));
  p=m.complete(p,first.id,first.answer);
  p=m.complete(p,first.id,first.answer);
  assert.equal(Object.keys(p.solutions).length,1);
  for(const c of m.CHALLENGES.slice(0,3))p=m.complete(p,c.id,m.POINTS.find(v=>m.solved(c.id,v.id)).id);
  assert.equal(m.balance(p),1);
  p=m.spend(p,'sannin',3);
  assert.equal(p.keyMethods.sannin,undefined);
});

test('regional grants survive cleaning and cannot be forged by directly mutating keyMethods',()=>{
  let p=m.empty();
  for(const c of regional.challengesFor('china').slice(0,3))p=m.complete(p,c.id,c.answer);
  p=m.spend(p,'sanguo',1);
  assert.equal(m.clean(p).keyMethods.sanguo,'china');
  assert.equal(m.clean(p).keyHalls.sanguo,1);
  const forged=m.clean({solutions:{},keyHalls:{sanguo:1},keyMethods:{sanguo:'china'}});
  assert.equal(m.earned('sanguo',forged),false);
  const wrong=m.clean({solutions:p.solutions,keyHalls:{sannin:1},keyMethods:{sannin:'china'}});
  assert.equal(m.earned('sannin',wrong),false);
  assert.equal(m.regionBalance(p,'china'),0);
});

test('merging local snapshots preserves a regional unlock',()=>{
  let p=m.empty();
  for(const c of regional.challengesFor('japan').slice(0,3))p=m.complete(p,c.id,c.answer);
  const spent=m.spend(p,'sannin',8);
  assert.equal(m.earned('sannin',m.merge(spent,p)),true);
  assert.equal(m.regionBalance(m.merge(spent,p),'japan'),0);
});
