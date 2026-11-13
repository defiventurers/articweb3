import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {pieceArt} from '../src/dominion.js';
import {patchPawnApp,patchPawnLearning} from '../scripts/patch-chaturanga-pawns-v5915.mjs';
const mobile=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(path.join(mobile,'build-deps/package.json'));
const {parse}=require('acorn'),sharp=require('sharp');
const baseline=process.env.AK_BASELINE_RUNTIME;
const old=(team,type)=>`dominion/${team==='yellow'?'pink':team}-${({king:'frost-king',horse:'aurora-unicorn',elephant:'war-mammoth',ship:'icebreaker',pawn:'snow-guard'})[type]}.webp`;
const expected=(team,type)=>type==='pawn'&&['red','blue','green','pink','yellow'].includes(team)?`chaturanga-final-four/pawns/${team==='yellow'?'pink':team}.webp`:old(team,type);
function arrows(source){const found=[];function walk(node){if(!node||typeof node!=='object')return;if(node.type==='VariableDeclarator'&&node.init?.type==='ArrowFunctionExpression'&&['o_','dn'].includes(node.id?.name)&&source.slice(node.init.start,node.init.end).includes('frost-king'))found.push(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}walk(parse(source,{ecmaVersion:'latest'}));return found;}
test('source presentation changes only four recognized Pawn images; other roles and invalid inputs keep legacy paths',()=>{
 for(const team of ['red','blue','green','yellow','pink','unknown'])for(const role of ['pawn','king','horse','elephant','ship','unknown'])assert.equal(pieceArt(team,role),expected(team,role));
});
test('all four recovered images have unclipped significant alpha inside the existing 320-pixel footprint',async()=>{
 for(const color of ['red','blue','green','pink']){
  const file=path.resolve(mobile,'../../frontend/public/assets/chaturanga-final-four/pawns',color+'.webp');
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,320);assert.equal(info.height,320);assert.equal(info.channels,4);
  let visible=0;
  for(let y=0;y<320;y++)for(let x=0;x<320;x++){const a=data[(y*320+x)*4+3];if(a>=16){visible++;assert.ok(x>0&&y>0&&x<319&&y<319,color+' meaningful pixels clipped');}}
  assert.ok(visible>1000,color+' is not an empty sprite');
 }
});
test('shipped app changes exactly two pure art arrows and rejects modified or double-applied mapping',{skip:!baseline},()=>{
 const source=fs.readFileSync(path.join(baseline,'app.js'),'utf8'),patched=patchPawnApp(source),before=arrows(source),after=arrows(patched);
 assert.equal(before.length,2);assert.equal(after.length,2);
 let restored=patched;
 for(const node of [...after].sort((a,b)=>b.init.start-a.init.start)){const initial=before.find(n=>n.id.name===node.id.name);restored=restored.slice(0,node.init.start)+source.slice(initial.init.start,initial.init.end)+restored.slice(node.init.end);}
 assert.equal(restored,source,'all code outside the two presentation arrows is byte-identical');
 for(const node of after){const map=vm.runInNewContext('('+patched.slice(node.init.start,node.init.end)+')');for(const team of ['red','blue','green','yellow','pink','unknown'])for(const role of ['pawn','king','horse','elephant','ship','unknown'])assert.equal(map(team,role),expected(team,role));}
 assert.throws(()=>patchPawnApp(patched),/already applied/);
 assert.throws(()=>patchPawnApp(source.replace('o_=(e,t)=>`dominion/','o_=(e,t)=>`changed/')),/exact verified/);
});
function worker(source){let result;const context=vm.createContext({crypto:{getRandomValues(bytes){bytes.fill(0);return bytes}},TextEncoder,TextDecoder,URL,AbortController,atob,btoa,setTimeout,clearTimeout,postMessage:data=>{result=JSON.parse(JSON.stringify(data));}});context.self=context;vm.runInContext(source,context);return async data=>{result=null;await context.onmessage({data:JSON.parse(JSON.stringify(data))});return result;};}
function legacySprites(value){if(typeof value==='string')return value.replace(/^art\/chaturanga-final-four\/pawns\/(red|blue|green|pink)\.webp$/,'art/dominion/$1-snow-guard.webp');if(Array.isArray(value))return value.map(legacySprites);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,legacySprites(item)]));return value;}
test('actual learning worker preserves all seven games, practice actions and guided studies except Chaturanga Pawn sprite paths',{skip:!baseline},async()=>{
 const source=fs.readFileSync(path.join(baseline,'learn.js'),'utf8'),patched=patchPawnLearning(source),before=worker(source),after=worker(patched);
 assert.throws(()=>patchPawnLearning(source+'\n'),/checksum-verified/);
 for(const id of ['shogi','sannin','sanguo','sanyou','yanyi','xiangqi','dominion']){
  const request={task:'practice',op:'empty',id,requestId:id},a=await before(request),b=await after(request);assert.equal(a.error,undefined,id);assert.deepEqual(legacySprites(b),a,id+' practice stock/state');
  if(id==='dominion'){
   const changed=b.stock.filter((unit,i)=>unit.sprite!==a.stock[i].sprite);assert.equal(changed.length,16);assert.equal(new Set(changed.map(unit=>unit.sprite)).size,4);assert.ok(changed.every(unit=>unit.role==='pawn'));
  }else assert.deepEqual(b,a,id+' identical images and positions');
  for(const role of new Set(a.stock.map(unit=>unit.role))){const r={task:'piece',id,role,requestId:id+role},pa=await before(r),pb=await after(r);assert.equal(pa.error,undefined,id+' '+role);assert.deepEqual(legacySprites(pb),pa,id+' '+role+' guided actions');}
  const piece=a.stock.find(unit=>unit.role===(id==='dominion'?'pawn':a.stock[0].role)),place={task:'practice',op:'place',id,state:a.state,prototypeId:piece.id,cell:piece.cell,requestId:id+'-place'};
  const placed=await before(place),changed=await after(place);assert.equal(placed.error,undefined,id+' placement');assert.deepEqual(legacySprites(changed),placed,id+' placement/actions');
  const move=placed.legal[0];if(move){const r={task:'practice',op:'move',id,state:placed.state,source:move.source,actionId:move.id,requestId:id+'-move'};const ma=await before(r),mb=await after(r);assert.equal(ma.error,undefined,id+' move');assert.deepEqual(legacySprites(mb),ma,id+' move/state');}
 }
});
