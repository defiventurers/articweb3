import test from 'node:test';import assert from 'node:assert/strict';import {diceValues} from './beacon.js';
test('public randomness maps the signed long-dice action to 2–5, with legacy draws unchanged',async()=>{
 const beacon={randomness:'01'.repeat(32)},intent={actionId:'roll-long|control:roll-long',matchId:'long-dice-fixture',seq:1};
 const values=await diceValues(beacon,intent,2);assert.equal(values.length,2);assert.ok(values.every(v=>v>=2&&v<=5));assert.deepEqual(await diceValues(beacon,intent,2),values);
 await assert.rejects(diceValues(beacon,intent,1),/always rolled as a pair/);
 const legacy={...intent,actionId:'roll|control:roll'};const old=await diceValues(beacon,legacy,2);assert.ok(old.every(v=>v>=1&&v<=6));
 const faces=new Set();for(let seq=1;seq<50;seq++)for(const value of await diceValues(beacon,{...intent,seq},2))faces.add(value);assert.deepEqual([...faces].sort(),[2,3,4,5]);
});
