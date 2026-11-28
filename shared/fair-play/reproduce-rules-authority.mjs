// Read-only reconstruction of an existing authority. No output or trusted input is rewritten.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {defaultRoot,digest,inspectRulesIntegrity,loadRulesAuthority,readCheckoutFile,RULES_AUTHORITY_PATH} from './check-rules-integrity.mjs';

export async function reproduceRulesAuthority({root=defaultRoot,transformSource}={}) {
  const integrity=await inspectRulesIntegrity({root});
  if(!integrity.ok)return {ok:false,stage:'integrity',integrity};
  const authority=await loadRulesAuthority(root),settings=authority.build;
  if(settings?.compiler!=='rolldown'||settings.version!=='1.2.15'||settings.platform!=='node'||settings.format!=='cjs'||settings.minify!==false||!Array.isArray(settings.locks)||settings.locks.length!==2)throw Error('Unsupported rules reconstruction settings.');
  const locks=[];
  for(const entry of settings.locks) {
    const actual=digest(await readCheckoutFile(root,entry.path));
    locks.push({path:entry.path,sha256:actual});
    if(actual!==entry.sha256)return {ok:false,stage:'build-lock',path:entry.path,expected:entry.sha256,actual};
  }
  // Resolve only the locked compiler installed in this checkout.
  await readCheckoutFile(root,settings.packagePath);
  const require=createRequire(path.resolve(root,settings.packagePath));
  const version=require('rolldown/package.json').version;
  if(version!==settings.version)return {ok:false,stage:'compiler-version',expected:settings.version,actual:version};
  const {rolldown}=await import(require.resolve('rolldown'));
  const snapshots=new Map(authority.archivedSources.map(entry=>[entry.path,entry]));
  const inputs=[];
  await readCheckoutFile(root,settings.entryPoint);
  const bundle=await rolldown({
    cwd:root,input:path.resolve(root,settings.entryPoint),platform:settings.platform,
    onwarn(warning){throw Error('Rules reconstruction warning: '+warning.message);},
    plugins:[{name:'exact-published-rules-source',async load(id) {
      if(id.startsWith('\0'))return null;
      const relative=path.relative(root,id).split(path.sep).join('/');
      const snapshot=snapshots.get(relative),selectedPath=snapshot?.archivePath||relative;
      let source=(await readCheckoutFile(root,selectedPath)).toString('utf8');
      if(snapshot&&digest(source)!==snapshot.sha256)throw Error('Archived rules source changed during reconstruction.');
      // Negative tests may substitute an in-memory input; exact output equality remains mandatory.
      if(transformSource)source=await transformSource({path:relative,source});
      if(typeof source!=='string')throw Error('Rules source transform must return source text.');
      inputs.push({path:relative,sourcePath:selectedPath,sha256:digest(source)});
      return source;
    }}]
  });
  let generated;
  try{generated=await bundle.generate({file:path.resolve(root,authority.enginePath),format:settings.format,minify:settings.minify,banner:settings.banner});}
  finally{await bundle.close();}
  if(generated.output.length!==1||generated.output[0].type!=='chunk'||generated.output[0].imports.length)throw Error('The rules authority must be one self-contained engine.');
  const bytes=Buffer.from(generated.output[0].code),actual=digest(bytes);
  const tracked=await readCheckoutFile(root,authority.enginePath);
  const ok=actual===authority.engineHash&&bytes.equals(tracked)&&bytes.length===authority.engineBytes;
  return {ok,stage:'reconstruction',protocol:authority.protocol,rulesHash:authority.rulesHash,expectedEngineHash:authority.engineHash,engineHash:actual,engineBytes:bytes.length,compiler:{name:settings.compiler,version},authorityPath:RULES_AUTHORITY_PATH,locks,archivedSourcesUsed:integrity.archivedSourcesUsed,inputs:inputs.sort((a,b)=>a.path.localeCompare(b.path)),...(ok?{}:{code:'REPRODUCED_ENGINE_MISMATCH'})};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{const report=await reproduceRulesAuthority();console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;}
  catch(error){console.error(error.message);process.exitCode=1;}
}
