// Replace only the proof worker and six Fair Play strings in the incremental app.
// Exact engine snapshots are checked before the browser-only Node bootstrap is
// removed. No gameplay, tutorial, bot, native or art bundle is rebuilt here.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const mobile=fileURLToPath(new URL('../',import.meta.url)),root=path.resolve(mobile,'../..');
const require=createRequire(path.join(mobile,'build-deps/package.json'));
const digest=b=>createHash('sha256').update(b).digest('hex');
export const AUTHORITIES=[
 {engine:'shared/fair-play/legacy/arcticPlayEngine.cjs',manifest:'shared/fair-play/legacy/rules-manifest.json',engineHash:'dab5b2df6d25e3c9572e93a0216b7d6d355493688983a959397bc40e2dad239b',rulesHash:'63845f4daef97f9721ccecd9cb3c7ef363842835a2566f8f48c7e515863cd952'},
 {engine:'shared/fair-play/rulesets/launch-2026-11/engine.cjs',manifest:'shared/fair-play/rulesets/launch-2026-11/manifest.json',engineHash:'16d08120db2442814631143e6dafbeb88af40bda561f3b00a61c5c0f0cfa4c18',rulesHash:'9fa0be4a43f049957ef407ee73361a0b6a3bb24ed59f487a36190165be82c8cb'}
];
export async function inspectProofAuthorities(){
 for(const a of AUTHORITIES){
  if(digest(await fs.readFile(path.join(root,a.engine)))!==a.engineHash)throw Error('Published proof engine changed: '+a.engine);
  const m=JSON.parse(await fs.readFile(path.join(root,a.manifest),'utf8'));
  if(m.protocol!=='ak-fair-play-v1'||m.engineHash!==a.engineHash||m.rulesHash!==a.rulesHash||digest(JSON.stringify(m.source))!==a.rulesHash)throw Error('Published proof manifest changed: '+a.manifest);
 }
 return AUTHORITIES;
}
const groups=[
 [['Verification is on hold. Your saved records remain available.','Check the game for yourself.'],'Check signed moves and dice. Blockchain recording is checked separately.'],
 [['Why verification is on hold','Verify match'],'Verify match'],
 [['Independent verification is paused until matching published rules are restored. Saved records do not establish verified moves or onchain recording.','Signed moves can be checked now. They must stay labelled unanchored until a funded proof recorder publishes their checkpoint.'],'No confirmed blockchain checkpoint is attached to this record. Signed moves and dice can be checked separately.'],
 [['Awaiting recording'],'Not recorded'],
 [['Onchain recording awaits setup'],'Not recorded onchain']
];
export function updateProofCopy(source){
 for(const [alternatives,next]of groups){
  const matches=alternatives.filter(s=>source.includes(s));
  if(matches.length!==1||source.split(matches[0]).length!==2)throw Error('Fair Play text anchor changed: '+alternatives[0]);
  source=source.replace(matches[0],next);
 }
 return source;
}
export async function buildProofVerifier({inputDir,outputDir,appFile}={}){
 if(!inputDir||!outputDir)throw Error('Supply separate verified baseline and output directories.');
 inputDir=path.resolve(inputDir);outputDir=path.resolve(outputDir);
 if(inputDir===outputDir)throw Error('Do not overwrite the baseline.');
 await inspectProofAuthorities();
 const original=await fs.readFile(path.join(inputDir,'verifier.js'),'utf8');
 if(digest(original)!=='f0635df8cf4f12a7b7ef856b4258b19cc38caf66f029b4c84dba63690352f1de')throw Error('Expected the approved v5.9.15 standalone verifier.');
 const {build}=await import(require.resolve('rolldown'));
 const bootstrap='if (!globalThis.crypto) globalThis.crypto = require("node:crypto").webcrypto;';
 const plugin={name:'immutable-proof-engines',async load(id){
  const a=AUTHORITIES.find(a=>path.join(root,a.engine)===id);
  if(!a)return;
  const source=await fs.readFile(id,'utf8');
  if(digest(source)!==a.engineHash||source.split(bootstrap).length!==2)throw Error('Proof engine bootstrap or digest changed.');
  return {code:source.replace(bootstrap,''),moduleType:'js'};
 }};
 await fs.mkdir(outputDir,{recursive:true});
 await build({input:path.join(mobile,'src/fair.worker.js'),platform:'browser',plugins:[plugin],
  onwarn(w,normal){if(['UNRESOLVED_IMPORT','MISSING_GLOBAL_NAME'].includes(w.code))throw Error(w.message);normal(w);},
  transform:{target:'es2020'},output:{file:path.join(outputDir,'fair-worker.js'),format:'iife',minify:true}});
 await fs.writeFile(path.join(outputDir,'verifier.js'),updateProofCopy(original));
 if(appFile){
  if(path.resolve(appFile)===path.join(outputDir,'app.js'))throw Error('Keep the input app unchanged.');
  await fs.writeFile(path.join(outputDir,'app.js'),updateProofCopy(await fs.readFile(appFile,'utf8')));
 }
 const names=['fair-worker.js','verifier.js',...(appFile?['app.js']:[])];
 const report={authorities:AUTHORITIES,verification:'supported published editions only',onchainActivation:false,
  gameplayEnginesChanged:false,manifestRepinned:false,trustedKeysChanged:false,
  outputs:Object.fromEntries(await Promise.all(names.map(async n=>[n,digest(await fs.readFile(path.join(outputDir,n)))])))};
 await fs.writeFile(path.join(outputDir,'proof-verifier-build.json'),JSON.stringify(report,null,2)+'\n');
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),arg=f=>{const i=args.indexOf(f);return i<0?undefined:args[i+1];};
 console.log(JSON.stringify(await buildProofVerifier({inputDir:arg('--input'),outputDir:arg('--output'),appFile:arg('--app')}),null,2));
}
