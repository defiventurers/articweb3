// Read-only release gate. Never regenerate or repin a historical rules manifest here.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const defaultRoot = fileURLToPath(new URL('../../', import.meta.url));

export async function inspectRulesIntegrity({root=defaultRoot,manifest,enginePath='server/arcticPlayEngine.cjs',checkSources=true}={}) {
  const published=manifest ?? JSON.parse(await fs.readFile(path.join(root,'shared/fair-play/rules-manifest.json'),'utf8'));
  if(published.protocol!=='ak-fair-play-v1'||!Array.isArray(published.source)) throw Error('Unsupported published rules manifest.');
  const mismatches=[];
  const rulesHash=digest(JSON.stringify(published.source));
  if(rulesHash!==published.rulesHash)mismatches.push({kind:'manifest',expected:published.rulesHash,actual:rulesHash});
  const engineHash=digest(await fs.readFile(path.join(root,enginePath)));
  if(engineHash!==published.engineHash)mismatches.push({kind:'engine',path:enginePath,expected:published.engineHash,actual:engineHash});
  if(checkSources)for(const entry of published.source){
    // A manifest is untrusted input; this inspection cannot read outside the checkout.
    const resolved=path.resolve(root,entry.path),relative=path.relative(path.resolve(root),resolved);
    if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Rules source path leaves the checkout.');
    try{
      const actual=digest(await fs.readFile(resolved));
      if(actual!==entry.sha256)mismatches.push({kind:'source',path:entry.path,expected:entry.sha256,actual});
    }catch(error){if(error.code!=='ENOENT')throw error;mismatches.push({kind:'source-missing',path:entry.path,expected:entry.sha256});}
  }
  return {ok:mismatches.length===0,protocol:published.protocol,rulesHash:published.rulesHash,engineHash,checkedSourceFiles:checkSources?published.source.length:0,mismatches};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const report=await inspectRulesIntegrity();
    console.log(JSON.stringify(report,null,2));
    if(!report.ok)process.exitCode=1;
  }catch(error){console.error(error.message);process.exitCode=1;}
}
