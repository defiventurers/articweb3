// Reconstruct public verification inputs. No files are written, source is never
// fetched remotely, and no deployment/verification request is sent here.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import solc from 'solc';

const here=path.dirname(fileURLToPath(import.meta.url));
const sourceNames=['FairPlayRegistry','AntarcticPassport','AntarcticKeepsakes','AntarcticMysteryEgg'];
export const COMPILER_VERSION='0.8.24+commit.e11b9ed9.Emscripten.clang';
export const OPENZEPPELIN_VERSION='5.1.0';
const digest=value=>createHash('sha256').update(value).digest('hex');
const outputs=['abi','metadata','evm.bytecode.object','evm.bytecode.linkReferences','evm.deployedBytecode.object','evm.deployedBytecode.linkReferences','evm.deployedBytecode.immutableReferences'];

function assertCompiler(){
 if(solc.version()!==COMPILER_VERSION)throw Error('Use the exact pinned Solidity compiler for the existing deployments.');
 const dependency=JSON.parse(fs.readFileSync(path.join(here,'node_modules/@openzeppelin/contracts/package.json'),'utf8'));
 if(dependency.version!==OPENZEPPELIN_VERSION)throw Error('Use the exact pinned OpenZeppelin contracts package.');
}

function resultOf(input,callback){
 assertCompiler();
 const result=JSON.parse(solc.compile(JSON.stringify(input),callback));
 const errors=(result.errors||[]).filter(error=>error.severity==='error');
 if(errors.length)throw Error('Solidity verification compilation failed: '+errors.map(error=>error.formattedMessage).join('\n'));
 return result;
}

export function compileVerificationInput(input){
 // A standard-JSON package must be self-contained, including every imported
 // source. There is intentionally no import callback on this compilation.
 return resultOf(input);
}

function artifact(result,name,input){
 const sourceName=name+'.sol',compiled=result.contracts?.[sourceName]?.[name];
 if(!compiled)throw Error('Expected compilation target missing: '+sourceName+':'+name);
 return {
  contractName:name,sourceName,compiler:solc.version(),sourceSha256:digest(input.sources[sourceName].content),
  abi:compiled.abi,bytecode:'0x'+compiled.evm.bytecode.object,runtimeBytecode:'0x'+compiled.evm.deployedBytecode.object,
  runtimeHash:digest(Buffer.from(compiled.evm.deployedBytecode.object,'hex')),
  immutableReferences:compiled.evm.deployedBytecode.immutableReferences,
  linkReferences:compiled.evm.bytecode.linkReferences,runtimeLinkReferences:compiled.evm.deployedBytecode.linkReferences,
  metadata:JSON.parse(compiled.metadata)
 };
}

export function compileBundle(){
 assertCompiler();
 const input={language:'Solidity',sources:Object.fromEntries(sourceNames.map(name=>[name+'.sol',{content:fs.readFileSync(path.join(here,'contracts',name+'.sol'),'utf8')}])),
  settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris',outputSelection:{'*':{'*':outputs}}}};
 const dependencyRoot=fs.realpathSync(path.join(here,'node_modules/@openzeppelin/contracts'));
 const first=resultOf(input,{import:name=>{
  try{
   if(!name.startsWith('@openzeppelin/contracts/')||name.includes('\\')||name.split('/').includes('..'))throw Error();
   const file=fs.realpathSync(path.join(here,'node_modules',name));
   if(!file.startsWith(dependencyRoot+path.sep)||!file.endsWith('.sol'))throw Error();
   const content=fs.readFileSync(file,'utf8');input.sources[name]={content};return{contents:content};
  }catch{return{error:'Missing or unsupported pinned dependency: '+name};}
 }});
 const closed=compileVerificationInput(input),artifacts={};
 for(const name of sourceNames){
  artifacts[name]=artifact(closed,name,input);
  const original=artifact(first,name,input);
  if(original.bytecode!==artifacts[name].bytecode||original.runtimeBytecode!==artifacts[name].runtimeBytecode)throw Error('Closing the source graph changed '+name+' bytecode.');
 }
 return {input,artifacts,provenance:{
  compiler:COMPILER_VERSION,soljsonSha256:digest(fs.readFileSync(path.join(here,'node_modules/solc/soljson.js'))),
  openzeppelinVersion:OPENZEPPELIN_VERSION,packageLockSha256:digest(fs.readFileSync(path.join(here,'package-lock.json'))),
  sources:Object.fromEntries(Object.entries(input.sources).map(([name,source])=>[name,digest(source.content)]))
 }};
}

export function verificationInputFor(bundle,name){
 const expected=bundle.artifacts[name];
 if(!expected)throw Error('Unknown compiled contract.');
 // Only the exact sources named in this target's compiler metadata are needed
 // for publication; omit unrelated project contracts from each payload.
 const input={language:'Solidity',sources:Object.fromEntries(Object.keys(expected.metadata.sources).map(sourceName=>{
  const source=bundle.input.sources[sourceName];if(!source)throw Error('A required verification source is missing.');return[sourceName,source];
 })),settings:structuredClone(bundle.input.settings)};
 const reconstructed=artifact(compileVerificationInput(input),name,input);
 if(reconstructed.bytecode!==expected.bytecode||reconstructed.runtimeBytecode!==expected.runtimeBytecode)throw Error('Target-only verification input changes deployed bytecode.');
 return input;
}
