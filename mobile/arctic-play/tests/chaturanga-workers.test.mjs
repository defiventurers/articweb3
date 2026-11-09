import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),engine=require('../build/games.cjs');
const [oldBot,newBot,newLearn]=process.argv.slice(2);if(!oldBot||!newBot||!newLearn)throw Error('Supply baseline bot, patched bot and patched learn');
function worker(file){let result;const context=vm.createContext({crypto:{getRandomValues(bytes){bytes.fill(0);return bytes}},TextEncoder,TextDecoder,URL,AbortController,atob,btoa,setTimeout,clearTimeout,postMessage:data=>result=JSON.parse(JSON.stringify(data))});context.self=context;vm.runInContext(fs.readFileSync(file,'utf8'),context);return async data=>{result=null;await context.onmessage({data:JSON.parse(JSON.stringify(data))});return result};}
const before=worker(oldBot),after=worker(newBot),learn=worker(newLearn),checks=[];
for(const {id}of engine.GAME_LIST){const state=engine.create(id),data={task:'legal',requestId:'legal-'+id,id,state};const a=await before(data),b=await after(data);assert.deepEqual(b,a,id+' legacy legality');const action=a.legal.find(a=>a.kind==='move');if(action){const apply={task:'apply',requestId:'apply-'+id,id,state,actionId:action.id};assert.deepEqual(await after(apply),await before(apply),id+' legacy move');}checks.push(id+': legacy worker legal actions and move results unchanged');}
for(const role of ['king','pawn','horse','elephant','ship']){
 const solo=await learn({task:'solo',id:'dominion',role,requestId:'solo-'+role});assert.equal(solo.error,undefined,role);assert.ok(solo.legal.length,role+' solo movement remains available');
 const piece=await learn({task:'piece',id:'dominion',role,requestId:'piece-'+role});assert.equal(piece.error,undefined,role);assert.ok(piece.legal.length,role+' guided movement remains available');assert.ok(piece.state.dice.values.filter(v=>v!=null).every(v=>v>=2&&v<=5));
}
checks.push('All five Chaturanga single-piece and guided-piece studies remain legal; current guided dice use 2–5');
const adventure=await learn({task:'adventure',id:'dominion',mission:'two-dice',variant:'default',requestId:'adventure'});assert.equal(adventure.error,undefined);assert.deepEqual(adventure.practiceDice.values,[5,3]);checks.push('Two-dice teaching scene uses the new Pawn/King and Knight faces');
console.log(JSON.stringify({passed:checks.length,checks},null,2));
