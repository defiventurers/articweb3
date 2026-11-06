import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarborConnection} from '../src/harborConnection.js';
const ready=()=>({ok:true,json:async()=>({version:2,cloud:true,accountPlay:true})});
test('HTML spin-up page and 503 cannot authorize sign-in; valid account JSON can',async()=>{
 let calls=0,time=0;const c=createHarborConnection({now:()=>time,sleep:async ms=>{time+=ms;},fetchImpl:async(url,opt)=>{assert.equal(opt.method,'GET');assert.equal(opt.credentials,'omit');calls++;if(calls===1)return {ok:true,json:async()=>{throw Error('HTML');}};if(calls===2)return {ok:false,status:503};return ready();}});
 await c.ensureReady();assert.equal(calls,3);assert.equal(c.snapshot().phase,'ready');assert.equal(c.snapshot().elapsedMs,5000);
});
test('concurrent callers share one probe and recent readiness is reused',async()=>{
 let release,calls=0;const c=createHarborConnection({fetchImpl:async()=>{calls++;await new Promise(r=>release=r);return ready();}});
 const a=c.ensureReady(),b=c.ensureReady();assert.equal(a,b);await Promise.resolve();release();await a;await c.ensureReady();assert.equal(calls,1);
});
test('failed JSON schema is not readiness and total retry budget is bounded',async()=>{
 let t=0,calls=0;const c=createHarborConnection({now:()=>t,sleep:async ms=>{t+=ms;},budgetMs:6000,pollMs:2000,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({ok:true})};}});
 await assert.rejects(c.ensureReady(),e=>e.code==='HARBOR_TIMEOUT');assert.equal(t,6000);assert.equal(calls,3);assert.equal(c.snapshot().phase,'error');
});
test('offline has a distinct error and never sends a request',async()=>{
 let calls=0;const c=createHarborConnection({online:()=>false,fetchImpl:async()=>{calls++;return ready();}});
 await assert.rejects(c.ensureReady(),e=>e.code==='OFFLINE');assert.equal(calls,0);assert.equal(c.snapshot().phase,'offline');
});
test('configured server reporting unavailable is not described as a successful wake',async()=>{
 const c=createHarborConnection({fetchImpl:async()=>({ok:true,json:async()=>({version:2,cloud:false,accountPlay:false})})});
 await assert.rejects(c.ensureReady(),e=>e.code==='SERVICE_UNAVAILABLE');assert.equal(c.snapshot().attempts,1);
});
test('cancellation stops queued sign-in and a late response cannot publish ready',async()=>{
 let release;const c=createHarborConnection({fetchImpl:async()=>{await new Promise(r=>release=r);return ready();}});
 const task=c.ensureReady();await Promise.resolve();c.cancel();release();await assert.rejects(task,e=>e.code==='CANCELLED');assert.equal(c.snapshot().phase,'cancelled');
});
test('a new user retry after cancellation is independent of the stale request',async()=>{
 let release,calls=0;const c=createHarborConnection({fetchImpl:async()=>{calls++;if(calls===1)await new Promise(r=>release=r);return ready();}});
 const old=c.ensureReady();await Promise.resolve();c.cancel();await c.ensureReady();release();await assert.rejects(old,e=>e.code==='CANCELLED');assert.equal(c.snapshot().phase,'ready');assert.equal(calls,2);
});
test('a request that hangs is aborted and still reaches a bounded failure',async()=>{
 let aborts=0;const c=createHarborConnection({budgetMs:30,requestTimeoutMs:8,pollMs:1,fetchImpl:async(_,o)=>{o.signal.addEventListener('abort',()=>aborts++);return new Promise(()=>{});}});
 await assert.rejects(c.ensureReady(),e=>e.code==='HARBOR_TIMEOUT');assert.ok(aborts>=1);assert.equal(c.snapshot().phase,'error');
});
