// Additive fixes over the checksum-pinned v5.9.15 verifier. No engine is rebuilt.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

const mobile=fileURLToPath(new URL('../',import.meta.url));
const root=path.resolve(mobile,'../..');
const require=createRequire(path.join(mobile,'build-deps/package.json'));
const {parse}=require('acorn');
const digest=source=>createHash('sha256').update(source).digest('hex');
const pins={
  'fair-worker.js':'84381778cfc4a9e0f23bbfb83eb607fa68b5e68cb988f32fe27d0fb7560bc383',
  'verifier.js':'f0635df8cf4f12a7b7ef856b4258b19cc38caf66f029b4c84dba63690352f1de'
};
const oldCopy='Signed moves can be checked now. They must stay labelled unanchored until a funded proof recorder publishes their checkpoint.';
const holdCopy='Independent verification is paused until matching published rules are restored. Saved records do not establish verified moves or onchain recording.';
const copyChanges=[
  [oldCopy,holdCopy],
  ['Check the game for yourself.','Verification is on hold. Your saved records remain available.'],
  ['Verify match','Why verification is on hold']
];
const property=(node,key)=>node?.properties?.find(p=>(p.key?.name??p.key?.value)===key)?.value;
const literal=node=>node?.type==='Literal'?node.value:node?.type==='TemplateLiteral'&&!node.expressions.length?node.quasis[0].value.cooked:null;
const one=(values,label)=>{if(values.length!==1)throw Error(label+' matches: '+values.length);return values[0];};
function collect(ast){const nodes=[];function walk(n){if(!n||typeof n!=='object')return;if(n.type)nodes.push(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}walk(ast);return nodes;}
function replaceCopy(source,label){for(const [before,after]of copyChanges){if(source.split(before).length!==2)throw Error(label+' readiness copy anchor must occur once: '+before);source=source.replace(before,after);}return source;}

export async function patchFairnessRuntime({inputDir,outputDir,appFile}={}){
  if(!inputDir||!outputDir)throw Error('Supply inputDir and outputDir.');
  inputDir=path.resolve(inputDir);outputDir=path.resolve(outputDir);
  if(inputDir===outputDir)throw Error('Keep the verified baseline directory unchanged.');
  const readiness=JSON.parse(await fs.readFile(path.join(root,'shared/fair-play/release-readiness.json'),'utf8'));
  // This adapter is deliberately incapable of enabling an unreviewed rules build.
  if(readiness.status!=='hold'||readiness.code!=='RULES_ARTIFACT_MISMATCH')throw Error('This historical patch requires an explicit verification HOLD.');
  const original={};
  for(const [name,pin]of Object.entries(pins)){
    original[name]=await fs.readFile(path.join(inputDir,name),'utf8');
    if(digest(original[name])!==pin)throw Error('Expected verified v5.9.15 '+name+'.');
  }
  let source=original['fair-worker.js'];
  const ast=parse(source,{ecmaVersion:'latest'}),nodes=collect(ast),raw=n=>source.slice(n.start,n.end);
  const verifier=one(nodes.filter(n=>n.type==='FunctionDeclaration'&&raw(n).includes('The starting board does not match the published rules.')&&raw(n).includes('The board after a move does not match the rules.')),'bundled verifier');
  const engine=property(verifier.params[1]?.left,'engine');
  if(engine?.type!=='Identifier')throw Error('Missing verifier engine parameter.');
  const initializers=nodes.filter(n=>n.type==='VariableDeclarator'&&n.init?.type==='CallExpression'&&n.init.arguments.length===1&&n.init.arguments[0]?.type==='MemberExpression'&&n.init.arguments[0].property?.name==='initialState');
  const verifyState=one(initializers.filter(n=>n.start>verifier.start&&n.end<verifier.end),'verified initial state');
  const replayState=one(initializers.filter(n=>n.start<verifier.start||n.end>verifier.end),'replay initial state');
  const verifyCall=one(nodes.filter(n=>n.type==='CallExpression'&&n.callee?.name===verifier.id.name),'worker verification call');
  const runtimeEngine=property(verifyCall.arguments[1],'engine');
  if(runtimeEngine?.type!=='Identifier')throw Error('Missing worker replay engine.');
  const branch=one(nodes.filter(n=>n.type==='IfStatement'&&literal(n.test?.right)==='verify'&&n.consequent.start<verifyCall.start&&n.consequent.end>verifyCall.end),'verification message branch');
  const clear=branch.consequent.body?.[0];
  if(clear?.type!=='ExpressionStatement'||clear.expression?.type!=='AssignmentExpression'||literal(clear.expression.right)!==null)throw Error('Verification must clear the previous proof first.');
  const errorReply=one(nodes.filter(n=>n.type==='CallExpression'&&n.callee?.object?.name==='self'&&n.callee?.property?.name==='postMessage'&&property(n.arguments[0],'error')),'worker error reply');
  const edits=[
    ...[[verifyState,engine],[replayState,runtimeEngine]].map(([node,authority])=>{
      const header=raw(node.init.arguments[0].object);
      return {start:node.init.start,end:node.init.end,text:`${authority.name}.create(${header}.gameId,${header}.options)`};
    }),
    {start:clear.end,end:clear.end,text:`throw Error(${JSON.stringify(readiness.message)});`},
    {start:errorReply.arguments[0].end-1,end:errorReply.arguments[0].end-1,text:',verificationStatus:"hold"'}
  ];
  for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
  parse(source,{ecmaVersion:'latest'});
  const files={'fair-worker.js':source,'verifier.js':replaceCopy(original['verifier.js'],'Verifier')};
  if(appFile){
    appFile=path.resolve(appFile);
    if(appFile===path.join(outputDir,'app.js'))throw Error('Use a separate app output path.');
    files['app.js']=replaceCopy(await fs.readFile(appFile,'utf8'),'App');
    parse(files['app.js'],{ecmaVersion:'latest'});
  }
  await fs.mkdir(outputDir,{recursive:true});
  for(const [name,bytes]of Object.entries(files))await fs.writeFile(path.join(outputDir,name),bytes);
  const report={baselineVersion:'5.9.15',verificationStatus:'hold',reason:readiness.code,readiness,
    pinnedInputs:pins,outputs:Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,digest(bytes)])),
    edits:['Recreate validated initial state for verification and replay','Block untrusted verification with a visible HOLD error','Replace premature verification-ready copy'],
    enginesRebuilt:false,rulesManifestChanged:false,trustedKeysChanged:false};
  await fs.writeFile(path.join(outputDir,'fairness-runtime-patch.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
  console.log(JSON.stringify(await patchFairnessRuntime({inputDir:value('--input'),outputDir:value('--output'),appFile:value('--app')}),null,2));
}
