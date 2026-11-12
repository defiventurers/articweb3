import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {buildProofVerifier,updateProofCopy} from '../scripts/build-proof-verifier.mjs';
import {RULESETS} from '../../../shared/fair-play/rulesets.js';
import {signedFixture} from '../../../shared/fair-play/proof-fixtures.mjs';
import * as core from '../../../shared/fair-play/core.js';
import trust from '../../../shared/fair-play/trust.json' with {type:'json'};
const baseline=process.env.AK_BASELINE_RUNTIME;
function boot(source,crypto=webcrypto){
 const replies=[],self={postMessage:x=>replies.push(x)};
 const sandbox={self,crypto,structuredClone,TextEncoder,TextDecoder,URL,URLSearchParams,AbortController,AbortSignal,setTimeout,clearTimeout,atob,btoa,console,fetch(){throw Error('No network request is allowed for unanchored offline fixtures.');}};
 new vm.Script(source).runInContext(vm.createContext(sandbox));
 return {self,replies,async send(data){await self.onmessage({data});return replies.at(-1);}};
}
test('compiled verifier checks all launch tables, original proofs and replay; untrusted or unknown proofs fail closed',{skip:!baseline&&'Set AK_BASELINE_RUNTIME to approved assets.'},async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ak-proof-worker-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await buildProofVerifier({inputDir:baseline,outputDir:dir});
 const source=await fs.readFile(path.join(dir,'fair-worker.js'),'utf8'),server=await core.generateKey();
 const fixture=await signedFixture({server});
 const deployed=boot(source);
 assert.match((await deployed.send({id:1,type:'verify',bundle:fixture.bundle})).error,/Unknown match-service/);
 // Test-only in-memory substitution of the public trust pin. The saved release
 // worker keeps the production key; no signing secret is accessed or included.
 let testSource=source;
 for(const part of ['x','y']){
  assert.equal(testSource.split(trust.keys[0][part]).length,2);
  testSource=testSource.replace(trust.keys[0][part],server.publicKey[part]);
 }
 const worker=boot(testSource);
 const cases=[...RULESETS[1].engine.GAME_LIST.map(g=>({id:g.id,options:g.id==='dominion'?{rulesProfile:'chaturanga-long-dice-v1',teamMode:'2v2'}:{}})),{id:'sannin',authority:RULESETS[0],steps:3},{id:'dominion',authority:RULESETS[0]}];
 for(const [n,config]of cases.entries()){
  const f=await signedFixture({...config,server});
  const reply=await worker.send({id:n,type:'verify',bundle:core.copy(f.bundle)});
  assert.equal(reply.type,'verified',config.id+': '+reply.error);assert.equal(reply.report.status,'checked');
  assert.equal(await core.stateHash(reply.report.state),await core.stateHash(f.state));assert.equal(reply.report.chain.status,'unanchored');
  const replay=await worker.send({id:n,type:'replay',step:0});
  assert.equal(replay.type,'replay');assert.ok(replay.board.cells.length);assert.ok(replay.pieces.length);
 }
 const bad=core.copy(fixture.bundle);bad.header.rulesHash='0'.repeat(64);
 assert.match((await worker.send({id:99,type:'verify',bundle:bad})).error,/original published/);
 assert.match((await worker.send({id:100,type:'replay',step:0})).error,/Verify this match before/);
 const changed=core.copy(fixture.bundle);changed.events[0].afterHash='f'.repeat(64);
 assert.ok((await worker.send({id:101,type:'verify',bundle:changed})).error);
 const long=await signedFixture({id:'dominion',options:{rulesProfile:'chaturanga-long-dice-v1'},server});
 const fallback=boot(testSource,{getRandomValues(){throw Error('Verification must not draw fresh dice');}});
 assert.equal((await fallback.send({id:102,type:'verify',bundle:long.bundle})).report.rolls,1);
});
test('Fair Play copy patch is limited to exact text anchors and rejects unexpected inputs',()=>{
 const old=['Verification is on hold. Your saved records remain available.','Why verification is on hold','Independent verification is paused until matching published rules are restored. Saved records do not establish verified moves or onchain recording.','Awaiting recording','Onchain recording awaits setup'].join('\n');
 const result=updateProofCopy(old);assert.match(result,/Check signed moves and dice/);assert.match(result,/Not recorded onchain/);assert.doesNotMatch(result,/on hold/);
 assert.throws(()=>updateProofCopy(old+'\nAwaiting recording'),/anchor/);
});
