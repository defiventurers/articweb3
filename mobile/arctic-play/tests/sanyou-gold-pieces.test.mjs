import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {sanyouBoardGeometry,currentCalibration,defaultCalibration,SANYOU_CALIBRATION_KEY} from '../src/sanyouCalibration.js';
import {fitSanyouPieceSizes} from '../../../frontend/src/games/san-you-qi/sanyouPieceSizing.js';
import {sanyouPieceAsset,SANYOU_PIECE_SIZES} from '../../../frontend/src/games/san-you-qi/sanyouArtwork.js';
import opening from '../src/sanyouOpeningPieces.json' with {type:'json'};
const require=createRequire(import.meta.url),engine=require('../build/games.cjs');
const root=new URL('../',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');

test('All 27 extracted atlas sprites match their manifest in both APK and website',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('art/sanyou-gold-v2/provenance.json',root),'utf8'));
 assert.equal(manifest.pieces.length,27);
 assert.equal(fs.existsSync(new URL('android/app/src/main/assets/art/sanyou',root)),false);
 for(const p of manifest.pieces){
  for(const file of ['art/sanyou-gold-v2/'+p.file,'android/app/src/main/assets/art/sanyou-gold-v2/'+p.file,'../../frontend/public/assets/heritage-arcade/tokens/sanyou-gold-v2/'+p.file])assert.equal(hash(fs.readFileSync(new URL(file,root))),p.sha256,file);
 }
});
test('Every role and faction maps to the approved piece even after promotion, movement or inheritance',()=>{
 const roles=['general','advisor','elephant','horse','chariot','cannon','soldier','fire','flag'];
 for(const faction of ['red','green','blue'])for(const role of roles){
  const p={id:'fixture',faction,owner:faction==='red'?'green':'red',role,node:'C22',status:'board',promoted:true};
  const unit=engine.pieces('sanyou',{pieces:[p]})[0],file=faction+'_'+(role==='advisor'?'guard':role)+'.webp';
  assert.equal(unit.sprite,'art/sanyou-gold-v2/'+file);assert.equal(unit.origin,faction);assert.equal(unit.owner,p.owner);
  assert.equal(sanyouPieceAsset(p),'/assets/heritage-arcade/tokens/sanyou-gold-v2/'+file);
 }
 assert.deepEqual(opening,engine.create('sanyou').pieces.filter(p=>p.status==='board').map(({id,node,faction,role})=>({id,node,faction,role})));
});
test('Every possible pair of legal points leaves at least 4px between circular token rims at default and maximum size',()=>{
 const board=sanyouBoardGeometry();assert.equal(board.cells.length,156);
 for(const maximum of [82,100]){
  const sizes=fitSanyouPieceSizes(board.cells,maximum);
  for(let i=0;i<board.cells.length;i++){
   const a=board.cells[i];assert.ok(sizes[a.id]>0);assert.ok(sizes[a.id]<=maximum);
   if(maximum===100){assert.equal(a.size,sizes[a.id]);assert.equal(a.size,SANYOU_PIECE_SIZES[a.id]);}
   for(let j=i+1;j<board.cells.length;j++){
    const b=board.cells[j],gap=Math.hypot(a.x-b.x,a.y-b.y)-(sizes[a.id]+sizes[b.id])/2;
    assert.ok(gap>=4-1e-8,a.id+' / '+b.id+' gap '+gap);
   }
  }
 }
 assert.ok(board.cells.filter(c=>c.size>70).length>120);
 assert.ok(Math.max(...board.cells.map(c=>c.size))>80);
});
test('A previous board draft retains its point edits while receiving the larger default; new size preferences persist',t=>{
 const old=defaultCalibration();old.pieceSize=70;old.points['red:L1-1'][0]+=.25;
 const key='arctic-play.v1.sanyou-calibration.'+old.board;
 const values=new Map([[key,JSON.stringify(old)]]),previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null}});t.after(()=>{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;});
 assert.equal(currentCalibration().points['red:L1-1'][0],old.points['red:L1-1'][0]);assert.equal(currentCalibration().pieceSize,100);
 values.set('arctic-play.v1.'+SANYOU_CALIBRATION_KEY,JSON.stringify({...old,pieceSize:64}));assert.equal(currentCalibration().pieceSize,64);
});
