import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectRulesIntegrity} from './check-rules-integrity.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('historical engine and source drift fail the read-only integrity gate',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ak-proof-integrity-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'server'));
  await fs.writeFile(path.join(root,'server/engine.cjs'),'original engine');
  await fs.writeFile(path.join(root,'rules.js'),'original source');
  const source=[{path:'rules.js',sha256:hash('original source')}];
  const manifest={protocol:'ak-fair-play-v1',rulesHash:hash(JSON.stringify(source)),engineHash:hash('original engine'),source};
  const options={root,manifest,enginePath:'server/engine.cjs'};
  assert.equal((await inspectRulesIntegrity(options)).ok,true);
  await fs.writeFile(path.join(root,'server/engine.cjs'),'unreviewed engine');
  let result=await inspectRulesIntegrity(options);
  assert.equal(result.ok,false);assert.deepEqual(result.mismatches.map(x=>x.kind),['engine']);
  await fs.writeFile(path.join(root,'rules.js'),'changed source');
  result=await inspectRulesIntegrity(options);
  assert.deepEqual(result.mismatches.map(x=>x.kind),['engine','source']);
  assert.equal(await fs.readFile(path.join(root,'server/engine.cjs'),'utf8'),'unreviewed engine');
  assert.equal(manifest.engineHash,hash('original engine'),'inspection must not repin trusted inputs');
  const modified={...manifest,rulesHash:'0'.repeat(64)};
  assert.equal((await inspectRulesIntegrity({...options,manifest:modified})).mismatches[0].kind,'manifest');
  await fs.unlink(path.join(root,'rules.js'));
  assert.equal((await inspectRulesIntegrity(options)).mismatches[1].kind,'source-missing');
  await assert.rejects(inspectRulesIntegrity({...options,manifest:{...manifest,source:[{path:'../outside'}]}}),/leaves the checkout/);
});

async function archiveFixture(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ak-rules-archive-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'server'));
  await fs.mkdir(path.join(root,'archive'));
  await fs.writeFile(path.join(root,'server/fairPlayEngine.cjs'),'published engine');
  await fs.writeFile(path.join(root,'rules.js'),'reviewed presentation');
  await fs.writeFile(path.join(root,'archive/rules.js'),'published source');
  const source=[{path:'rules.js',sha256:hash('published source')}];
  const manifest={protocol:'ak-fair-play-v1',rulesHash:hash(JSON.stringify(source)),engineHash:hash('published engine'),source};
  const authority={schemaVersion:1,protocol:manifest.protocol,rulesHash:manifest.rulesHash,engineHash:manifest.engineHash,enginePath:'server/fairPlayEngine.cjs',archivedSources:[{path:'rules.js',archivePath:'archive/rules.js',sha256:source[0].sha256,reviewedCheckoutSha256:hash('reviewed presentation'),reason:'Reviewed presentation-only difference.'}]};
  await fs.writeFile(path.join(root,'authority.json'),JSON.stringify(authority));
  return {root,manifest,authority,options:{root,manifest,authorityPath:'authority.json'}};
}

test('the default checks the published Fair Play engine, never the separate gameplay engine',async t=>{
  const f=await archiveFixture(t);
  await fs.writeFile(path.join(f.root,'server/arcticPlayEngine.cjs'),'different gameplay engine');
  assert.equal((await inspectRulesIntegrity(f.options)).ok,true);
  await fs.writeFile(path.join(f.root,'server/fairPlayEngine.cjs'),'altered proof engine');
  assert.equal((await inspectRulesIntegrity(f.options)).mismatches[0].kind,'engine');
  await fs.unlink(path.join(f.root,'server/fairPlayEngine.cjs'));
  assert.equal((await inspectRulesIntegrity(f.options)).mismatches[0].kind,'engine-missing');
});

test('archived source use is explicit and only the reviewed checkout difference is accepted',async t=>{
  const f=await archiveFixture(t);
  const initial=await inspectRulesIntegrity(f.options);
  assert.equal(initial.ok,true);
  assert.deepEqual(initial.archivedSourcesUsed,[{path:'rules.js',archivePath:'archive/rules.js',publishedSha256:hash('published source'),archiveSha256:hash('published source'),checkoutSha256:hash('reviewed presentation'),checkoutMatchesPublished:false,reason:'Reviewed presentation-only difference.'}]);
  await fs.writeFile(path.join(f.root,'archive/rules.js'),'altered authority');
  assert.equal((await inspectRulesIntegrity(f.options)).mismatches[0].kind,'archived-source');
  await fs.writeFile(path.join(f.root,'archive/rules.js'),'published source');
  await fs.writeFile(path.join(f.root,'rules.js'),'unreviewed rule change');
  assert.equal((await inspectRulesIntegrity(f.options)).mismatches[0].kind,'unreviewed-source-drift');
  await fs.writeFile(path.join(f.root,'rules.js'),'reviewed presentation');
  await fs.unlink(path.join(f.root,'archive/rules.js'));
  assert.equal((await inspectRulesIntegrity(f.options)).mismatches[0].kind,'archived-source-missing');
  await fs.writeFile(path.join(f.root,'archive/rules.js'),'published source');
  await fs.unlink(path.join(f.root,'rules.js'));
  assert.equal((await inspectRulesIntegrity(f.options)).mismatches[0].kind,'source-missing');
  assert.equal(f.manifest.engineHash,hash('published engine'));
});

test('archive metadata cannot substitute an unrelated authority or unpinned source',async t=>{
  const f=await archiveFixture(t);
  await fs.writeFile(path.join(f.root,'authority.json'),JSON.stringify({...f.authority,engineHash:'0'.repeat(64)}));
  await assert.rejects(inspectRulesIntegrity(f.options),/does not match/);
  await fs.writeFile(path.join(f.root,'authority.json'),JSON.stringify({...f.authority,archivedSources:[{...f.authority.archivedSources[0],path:'other.js'}]}));
  await assert.rejects(inspectRulesIntegrity(f.options),/not pinned/);
});

test('ordinary, engine and archived source paths cannot escape through traversal or symlinks',async t=>{
  const f=await archiveFixture(t),outside=await fs.mkdtemp(path.join(os.tmpdir(),'ak-rules-outside-'));
  t.after(()=>fs.rm(outside,{recursive:true,force:true}));
  await fs.writeFile(path.join(outside,'rules.js'),'published source');
  await fs.unlink(path.join(f.root,'rules.js'));
  await fs.symlink(path.join(outside,'rules.js'),path.join(f.root,'rules.js'));
  await assert.rejects(inspectRulesIntegrity(f.options),/leaves the checkout/);
  await fs.unlink(path.join(f.root,'rules.js'));
  await fs.writeFile(path.join(f.root,'rules.js'),'reviewed presentation');
  for(const archivePath of ['../outside.js',path.join(outside,'rules.js')]) {
    await fs.writeFile(path.join(f.root,'authority.json'),JSON.stringify({...f.authority,archivedSources:[{...f.authority.archivedSources[0],archivePath}]}));
    await assert.rejects(inspectRulesIntegrity(f.options),/leaves the checkout/);
  }
  await fs.writeFile(path.join(f.root,'authority.json'),JSON.stringify(f.authority));
  await fs.unlink(path.join(f.root,'archive/rules.js'));
  await fs.symlink(path.join(outside,'rules.js'),path.join(f.root,'archive/rules.js'));
  await assert.rejects(inspectRulesIntegrity(f.options),/leaves the checkout/);
  await assert.rejects(inspectRulesIntegrity({...f.options,authorityPath:null,manifest:{...f.manifest,rulesHash:'1'.repeat(64)},enginePath:'../outside.cjs'}),/leaves the checkout/);
});
