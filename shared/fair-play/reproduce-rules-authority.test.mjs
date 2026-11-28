import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {defaultRoot,digest,loadRulesAuthority,readCheckoutFile,RULES_AUTHORITY_PATH} from './check-rules-integrity.mjs';
import {reproduceRulesAuthority} from './reproduce-rules-authority.mjs';
import {buildFairRules} from '../../mobile/arctic-play/scripts/build-fair-rules.mjs';

const protectedPaths=['shared/fair-play/rules-manifest.json','shared/fair-play/release-readiness.json','server/fairPlayEngine.cjs','server/arcticPlayEngine.cjs','mobile/arctic-play/src/dominion.js'];
const identities=()=>Promise.all(protectedPaths.map(async p=>[p,digest(await readCheckoutFile(defaultRoot,p))]));

test('the pinned compiler and archived source reproduce the published engine byte for byte',async()=>{
  const before=await identities(),authority=await loadRulesAuthority();
  const report=await reproduceRulesAuthority();
  assert.equal(report.ok,true);
  assert.equal(report.engineHash,authority.engineHash);
  assert.equal(report.engineBytes,299733);
  assert.deepEqual(report.compiler,{name:'rolldown',version:'1.2.15'});
  assert.equal(report.archivedSourcesUsed.length,1);
  assert.equal(report.archivedSourcesUsed[0].checkoutMatchesPublished,false);
  assert.equal(report.inputs.find(x=>x.path==='mobile/arctic-play/src/dominion.js').sourcePath,authority.archivedSources[0].archivePath);
  assert.deepEqual(await identities(),before,'reconstruction must not rewrite any artifact or live presentation source');
});

test('the legacy build entry verifies rather than regenerates the published engines and manifest',async()=>{
  const before=await identities();
  const manifest=await buildFairRules({root:defaultRoot,mobile:path.join(defaultRoot,'mobile/arctic-play'),build:()=>{throw Error('Mutating builder must never run.');}});
  assert.equal(manifest.rulesHash,(await loadRulesAuthority()).rulesHash);
  assert.deepEqual(await identities(),before);
});

test('a changed transitive input omitted by the old source list fails exact reconstruction',async()=>{
  const target='mobile/arctic-play/src/sanyouPositions.json';
  const manifest=JSON.parse(await readCheckoutFile(defaultRoot,'shared/fair-play/rules-manifest.json'));
  assert.equal(manifest.source.some(x=>x.path===target),false);
  let changed=0;
  const report=await reproduceRulesAuthority({transformSource:({path:sourcePath,source})=>{
    if(sourcePath!==target)return source;
    changed++;const coordinates=JSON.parse(source);coordinates.width+=1;return JSON.stringify(coordinates);
  }});
  assert.equal(changed,1);
  assert.equal(report.ok,false);
  assert.equal(report.code,'REPRODUCED_ENGINE_MISMATCH');
  assert.notEqual(report.engineHash,report.expectedEngineHash);
});

test('unused verifier edits do not create a new game authority when exact compiled bytes are unchanged',async()=>{
  let changed=0;
  const report=await reproduceRulesAuthority({transformSource:({path:sourcePath,source})=>{
    if(sourcePath!=='shared/fair-play/core.js')return source;
    changed++;return source+'\nexport const unusedReconstructionRegression=true;\n';
  }});
  assert.equal(changed,1);
  assert.equal(report.ok,true);
});

test('changed lock files fail before any compiler is loaded, without requiring copied dependencies',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ak-rules-build-lock-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const authority=await loadRulesAuthority(),manifest=JSON.parse(await readCheckoutFile(defaultRoot,authority.manifestPath));
  const files=new Set([authority.manifestPath,authority.enginePath,RULES_AUTHORITY_PATH,...manifest.source.map(x=>x.path),...authority.archivedSources.map(x=>x.archivePath),...authority.build.locks.map(x=>x.path)]);
  for(const file of files){const target=path.join(root,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,await readCheckoutFile(defaultRoot,file));}
  const lock=authority.build.locks[0];
  await fs.appendFile(path.join(root,lock.path),'\n');
  const report=await reproduceRulesAuthority({root});
  assert.equal(report.ok,false);
  assert.equal(report.stage,'build-lock');
  assert.equal(report.path,lock.path);
  assert.notEqual(report.actual,report.expected);
  await fs.unlink(path.join(root,lock.path));
  await assert.rejects(reproduceRulesAuthority({root}),error=>error.code==='ENOENT');
});
