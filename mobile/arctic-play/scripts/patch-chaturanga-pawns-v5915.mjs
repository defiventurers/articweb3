// Pawn presentation only: retain all rule functions, geometry and existing assets.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const mobile=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(path.join(mobile,'build-deps/package.json'));
const {parse}=require('acorn');
const hash=value=>createHash('sha256').update(value).digest('hex');
const OLD='(e,t)=>`dominion/${e===`yellow`?`pink`:e}-${{king:`frost-king`,horse:`aurora-unicorn`,elephant:`war-mammoth`,ship:`icebreaker`,pawn:`snow-guard`}[t]}.webp`';
const NEW='(e,t)=>t===`pawn`&&[`red`,`blue`,`green`,`yellow`,`pink`].includes(e)?`chaturanga-final-four/pawns/${e===`yellow`?`pink`:e}.webp`:`dominion/${e===`yellow`?`pink`:e}-${{king:`frost-king`,horse:`aurora-unicorn`,elephant:`war-mammoth`,ship:`icebreaker`,pawn:`snow-guard`}[t]}.webp`';
export const PAWN_PATHS=['red','blue','green','pink'].map(color=>'art/chaturanga-final-four/pawns/'+color+'.webp');
export const BASELINE_LEARN_SHA256='ec4bec020e8c70decbe30ed376697205c5072c7f0f8538848835539d6cadb8f3';
function mappings(source){
 const found=[];
 function walk(node){
  if(!node||typeof node!=='object')return;
  if(node.type==='VariableDeclarator'&&node.init?.type==='ArrowFunctionExpression'&&source.slice(node.init.start,node.init.end)===OLD)found.push(node);
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
 }
 walk(parse(source,{ecmaVersion:'latest'}));return found;
}
function apply(source,names){
 if(source.includes(NEW))throw Error('Pawn presentation patch is already applied.');
 const nodes=mappings(source);
 if(nodes.length!==names.length||nodes.map(n=>n.id.name).sort().join(',')!==[...names].sort().join(','))throw Error('Expected exact verified v5.9.15 pawn-art mapping anchors.');
 let output=source;
 for(const node of nodes.sort((a,b)=>b.init.start-a.init.start))output=output.slice(0,node.init.start)+NEW+output.slice(node.init.end);
 parse(output,{ecmaVersion:'latest'});
 // This identity check is stronger than merely parsing the patched bundle: no
 // code outside the declared pure presentation arrows may differ.
 if(output.split(NEW).join(OLD)!==source)throw Error('Unexpected change outside pawn presentation.');
 return output;
}
export function patchPawnApp(source){return apply(source,['o_','dn']);}
export function patchPawnLearning(source){
 if(hash(source)!==BASELINE_LEARN_SHA256)throw Error('Expected the checksum-verified v5.9.15 learning worker.');
 return apply(source,['Fo']);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
 const inputApp=value('--input-app'),inputLearn=value('--input-learn'),output=value('--output');
 if(!inputApp||!inputLearn||!output)throw Error('Supply --input-app, --input-learn and --output. Apply after heritage/fairness app patches.');
 const app=fs.readFileSync(inputApp,'utf8'),learn=fs.readFileSync(inputLearn,'utf8');
 const files={'app.js':patchPawnApp(app),'learn.js':patchPawnLearning(learn)};
 fs.mkdirSync(output,{recursive:true});
 for(const [name,source]of Object.entries(files))fs.writeFileSync(path.join(output,name),source);
 const report={baselineVersion:'5.9.15',candidateArt:true,pawnPaths:PAWN_PATHS,
  inputs:{appSha256:hash(app),learnSha256:hash(learn)},outputs:Object.fromEntries(Object.entries(files).map(([name,source])=>[name,hash(source)])),
  changedPresentationArrows:{app:2,learn:1},originalArtOverwritten:false,rulesOrGeometryChanged:false,rotationChanged:false,
  scope:'Only recognized Chaturanga Pawn sprite paths change. Existing character sprites stay upright; spear pose is not a movement-direction indicator.'};
 fs.writeFileSync(path.join(output,'chaturanga-pawns-patch.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
