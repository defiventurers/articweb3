import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {patchFairnessRuntime} from '../scripts/patch-fairness-v5915.mjs';

const inputDir=process.env.AK_BASELINE_RUNTIME;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('actual shipped worker fails closed and never reports an untrusted proof as verified',{skip:!inputDir&&'Set AK_BASELINE_RUNTIME to the verified v5.9.15 assets directory.'},async t=>{
  const outputDir=await fs.mkdtemp(path.join(os.tmpdir(),'ak-fair-worker-'));
  t.after(()=>fs.rm(outputDir,{recursive:true,force:true}));
  const names=['fair-worker.js','verifier.js','app.js'];
  const original=Object.fromEntries(await Promise.all(names.map(async name=>[name,await fs.readFile(path.join(inputDir,name),'utf8')])));
  const report=await patchFairnessRuntime({inputDir,outputDir,appFile:path.join(inputDir,'app.js')});
  assert.equal(report.verificationStatus,'hold');
  assert.equal(report.enginesRebuilt,false);
  const worker=await fs.readFile(path.join(outputDir,'fair-worker.js'),'utf8');
  const replies=[];let requests=0;
  const self={postMessage:message=>replies.push(message)};
  const context=vm.createContext({self,crypto:webcrypto,TextEncoder,TextDecoder,URL,URLSearchParams,AbortController,AbortSignal,setTimeout,clearTimeout,atob,btoa,console,
    fetch(){requests++;throw Error('No chain or beacon fetch is permitted while verification is on hold.');}});
  new vm.Script(worker).runInContext(context);
  for(const [id,bundle]of [['missing',null],['forged',{header:{protocol:'ak-fair-play-v1',initialState:{turn:'forged'},initialStateHash:'0'.repeat(64)},events:[{afterHash:'0'.repeat(64)}]}]]){
    await self.onmessage({data:{id,type:'verify',bundle}});
    const reply=replies.at(-1);
    assert.equal(reply.id,id);assert.equal(reply.verificationStatus,'hold');
    assert.match(reply.error,/Independent verification is paused/);
  }
  await self.onmessage({data:{id:'stale-replay',type:'replay',step:0}});
  assert.match(replies.at(-1).error,/Verify this match before replaying/);
  assert.equal(requests,0);
  assert.ok(replies.every(reply=>reply.type!=='verified'&&reply.type!=='replay'));
  for(const name of ['verifier.js','app.js']){
    const after=await fs.readFile(path.join(outputDir,name),'utf8');
    new vm.Script(after);
    assert.equal(after,original[name]
      .replace('Signed moves can be checked now. They must stay labelled unanchored until a funded proof recorder publishes their checkpoint.','Independent verification is paused until matching published rules are restored. Saved records do not establish verified moves or onchain recording.')
      .replace('Check the game for yourself.','Verification is on hold. Your saved records remain available.')
      .replace('Verify match','Why verification is on hold'));
  }
  for(const name of names)assert.equal(hash(await fs.readFile(path.join(inputDir,name))),hash(original[name]),'baseline must be unchanged');
});

test('runtime patch rejects changed historical worker bytes',{skip:!inputDir&&'Set AK_BASELINE_RUNTIME to the verified v5.9.15 assets directory.'},async t=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'ak-fair-bad-input-'));
  t.after(()=>fs.rm(folder,{recursive:true,force:true}));
  await fs.writeFile(path.join(folder,'fair-worker.js'),'unreviewed worker');
  await assert.rejects(patchFairnessRuntime({inputDir:folder,outputDir:path.join(folder,'out')}),/Expected verified v5.9.15 fair-worker/);
  await assert.rejects(fs.stat(path.join(folder,'out')),error=>error.code==='ENOENT');
});
