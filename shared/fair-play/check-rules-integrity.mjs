// Read-only release gate. Never regenerate or repin a published rules manifest.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const RULES_AUTHORITY_PATH='shared/fair-play/authorities/9fa0be4a/provenance.json';
export const RECOVERED_RULES_HASH='9fa0be4a43f049957ef407ee73361a0b6a3bb24ed59f487a36190165be82c8cb';
export const defaultRoot=fileURLToPath(new URL('../../',import.meta.url));
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const validHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const outside=relative=>relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative);

// Check both lexical traversal and symlinks before reading an untrusted path.
export async function readCheckoutFile(root,relativePath) {
  if(typeof relativePath!=='string'||!relativePath||relativePath.includes('\\')||relativePath.includes('\0')||path.isAbsolute(relativePath))throw Error('Rules source path leaves the checkout.');
  const base=await fs.realpath(root),resolved=path.resolve(base,relativePath);
  if(outside(path.relative(base,resolved)))throw Error('Rules source path leaves the checkout.');
  const real=await fs.realpath(resolved);
  if(outside(path.relative(base,real)))throw Error('Rules source path leaves the checkout.');
  return fs.readFile(real);
}

export async function loadRulesAuthority(root=defaultRoot,authorityPath=RULES_AUTHORITY_PATH) {
  return JSON.parse(await readCheckoutFile(root,authorityPath));
}

export async function inspectRulesIntegrity({root=defaultRoot,manifest,enginePath='server/fairPlayEngine.cjs',checkSources=true,authorityPath}={}) {
  const manifestBytes=manifest?null:await readCheckoutFile(root,'shared/fair-play/rules-manifest.json');
  const published=manifest??JSON.parse(manifestBytes);
  if(published.protocol!=='ak-fair-play-v1'||!Array.isArray(published.source)||!validHash(published.rulesHash)||!validHash(published.engineHash))throw Error('Unsupported published rules manifest.');
  const mismatches=[],archivedSourcesUsed=[];
  const rulesHash=digest(JSON.stringify(published.source));
  if(rulesHash!==published.rulesHash)mismatches.push({kind:'manifest',expected:published.rulesHash,actual:rulesHash});
  const selectedAuthorityPath=authorityPath??(published.rulesHash===RECOVERED_RULES_HASH?RULES_AUTHORITY_PATH:null);
  const authority=selectedAuthorityPath?await loadRulesAuthority(root,selectedAuthorityPath):null;
  const archived=new Map();
  if(authority) {
    if(authority.schemaVersion!==1||authority.protocol!==published.protocol||authority.rulesHash!==published.rulesHash||authority.engineHash!==published.engineHash||authority.enginePath!==enginePath||!Array.isArray(authority.archivedSources))throw Error('Rules authority does not match the published manifest and engine.');
    if(manifestBytes&&digest(manifestBytes)!==authority.manifestSha256)mismatches.push({kind:'manifest-artifact',expected:authority.manifestSha256,actual:digest(manifestBytes)});
    for(const entry of authority.archivedSources) {
      if(!entry||archived.has(entry.path)||!validHash(entry.sha256)||!validHash(entry.reviewedCheckoutSha256))throw Error('Invalid archived rules source.');
      const declared=published.source.find(source=>source.path===entry.path);
      if(!declared||declared.sha256!==entry.sha256)throw Error('Archived rules source is not pinned by the published manifest.');
      archived.set(entry.path,entry);
    }
  }
  let engineHash=null;
  try {
    engineHash=digest(await readCheckoutFile(root,enginePath));
    if(engineHash!==published.engineHash)mismatches.push({kind:'engine',path:enginePath,expected:published.engineHash,actual:engineHash});
  }catch(error){if(error.code!=='ENOENT')throw error;mismatches.push({kind:'engine-missing',path:enginePath,expected:published.engineHash});}
  const seen=new Set();
  if(checkSources)for(const entry of published.source) {
    if(!entry||typeof entry.path!=='string'||seen.has(entry.path))throw Error('Invalid or duplicate published source.');
    seen.add(entry.path);
    // Validate the path before the hash so malformed paths always fail closed.
    let actual=null;
    try{actual=digest(await readCheckoutFile(root,entry.path));}
    catch(error){if(error.code!=='ENOENT')throw error;mismatches.push({kind:'source-missing',path:entry.path,expected:entry.sha256});continue;}
    if(!validHash(entry.sha256))throw Error('Invalid published source digest.');
    const snapshot=archived.get(entry.path);
    if(snapshot) {
      let archiveHash=null;
      try{archiveHash=digest(await readCheckoutFile(root,snapshot.archivePath));}
      catch(error){if(error.code!=='ENOENT')throw error;mismatches.push({kind:'archived-source-missing',path:snapshot.archivePath,expected:entry.sha256});continue;}
      if(archiveHash!==entry.sha256)mismatches.push({kind:'archived-source',path:snapshot.archivePath,expected:entry.sha256,actual:archiveHash});
      if(actual!==entry.sha256&&actual!==snapshot.reviewedCheckoutSha256)mismatches.push({kind:'unreviewed-source-drift',path:entry.path,expected:snapshot.reviewedCheckoutSha256,actual});
      archivedSourcesUsed.push({path:entry.path,archivePath:snapshot.archivePath,publishedSha256:entry.sha256,archiveSha256:archiveHash,checkoutSha256:actual,checkoutMatchesPublished:actual===entry.sha256,reason:snapshot.reason});
    }else if(actual!==entry.sha256)mismatches.push({kind:'source',path:entry.path,expected:entry.sha256,actual});
  }
  return {ok:mismatches.length===0,protocol:published.protocol,rulesHash:published.rulesHash,engineHash,checkedSourceFiles:checkSources?published.source.length:0,authorityPath:selectedAuthorityPath,archivedSourcesUsed,mismatches};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const report=await inspectRulesIntegrity();
    console.log(JSON.stringify(report,null,2));
    if(!report.ok)process.exitCode=1;
  }catch(error){console.error(error.message);process.exitCode=1;}
}
