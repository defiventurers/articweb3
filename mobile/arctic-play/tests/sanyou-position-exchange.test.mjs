import test from 'node:test';
import assert from 'node:assert/strict';
import previousImage from '../src/sanyouPreviousPositions.json' with {type:'json'};
import legacy from '../src/sanyouLegacyPositions.json' with {type:'json'};
import {defaultCalibration,SANYOU_POINT_IDS} from '../src/sanyouCalibration.js';
import {alignLegacyPositions,importSanyouPositions,exportSanyouCSS,exportSanyouNormalized} from '../src/sanyouPositionExchange.js';

const websiteText=value=>'// Previous website coordinate export\nconst SANYOU_POSITIONS = '+JSON.stringify(value.positions)+';\nconst SANYOU_CUSTOM_POINTS = '+JSON.stringify(value.customPoints)+';\n/* CSS percentages */\n{"blue":[{"left":';
test('The complete old website coordinates import even with a truncated CSS tail and fit all 156 current markers',()=>{
 assert.deepEqual(importSanyouPositions(websiteText(legacy)),defaultCalibration());
 assert.deepEqual(alignLegacyPositions(legacy),defaultCalibration());
});
test('Old website edits retain point identity and are carried onto the new board',()=>{
 const edited=structuredClone(legacy);edited.positions.red[0][0]+=.001;
 const result=alignLegacyPositions(edited),base=defaultCalibration();
 assert.ok(result.points['red:L1-1'][0]>base.points['red:L1-1'][0]);
 for(const id of SANYOU_POINT_IDS.filter(id=>id!=='red:L1-1'))assert.deepEqual(result.points[id],base.points[id]);
});
test('Incomplete, duplicate, malformed or executable old exports cannot be imported',()=>{
 for(const change of [v=>v.customPoints.pop(),v=>v.customPoints[0].name='C2',v=>v.customPoints[0].x=2,v=>v.positions.blue.pop(),v=>v.positions.green[0]=[null,.4]]){const value=structuredClone(legacy);change(value);assert.throws(()=>alignLegacyPositions(value));}
 globalThis.sanyouImportExecuted=false;
 assert.throws(()=>importSanyouPositions('const SANYOU_POSITIONS = {"red": (()=>{globalThis.sanyouImportExecuted=true;return [];})()}; const SANYOU_CUSTOM_POINTS = [];'));
 assert.equal(globalThis.sanyouImportExecuted,false);delete globalThis.sanyouImportExecuted;
 assert.throws(()=>importSanyouPositions('const SANYOU_POSITIONS = {"red": ['));
});
test('Current normalized exports round-trip pixel edits without a second legacy transform',()=>{
 const value=defaultCalibration();value.pieceSize=64;value.points.C20=[768.25,830.75];value.points['red:L1-1']=[442.5,1376.75];
 assert.deepEqual(importSanyouPositions(exportSanyouNormalized(value)),value);
});
test('CSS exports cover every playable point with image-relative percentage positions',()=>{
 const value=defaultCalibration(),css=exportSanyouCSS(value);
 assert.equal((css.match(/data-point=/g)||[]).length,156);
 assert.ok(css.includes('.sanyou-point[data-point="C20"] { left: '+(value.points.C20[0]/15.36).toFixed(3)+'%; top: '+(value.points.C20[1]/15.36).toFixed(3)+'%; }'));
 assert.ok(!css.includes('data-point="C19"'));
});
test('The previous pixel export can be deliberately imported while another image remains rejected',()=>{
 const value=structuredClone(previousImage);value.board='sanyou-142247-v1';value.points.C20=[780,831];
 const result=importSanyouPositions(value);assert.deepEqual(result.points.C20,defaultCalibration().points.C20.map((n,i)=>Math.round((n+value.points.C20[i]-legacy.previousCentralPositions.C20[i])*100)/100));assert.equal(result.board,defaultCalibration().board);
 assert.throws(()=>importSanyouPositions({...value,board:'sanyou-142225-v1'}));
});
test('Earlier pixel exports receive the central correction without losing a deliberate relative edit',()=>{
 const previous=structuredClone(previousImage);previous.board='sanyou-142247-v2';
 for(const [id,p] of Object.entries(legacy.previousCentralPositions))previous.points[id]=[...p];
 previous.points.C12[0]+=2.5;
 const imported=importSanyouPositions(previous),expected=defaultCalibration();expected.points.C12[0]+=2.5;expected.pieceSize=previous.pieceSize;
 assert.deepEqual(imported,expected);
});
test('The corrected central chain matches the marked reference instead of zigzagging around decorative gold dots',()=>{
 const points=defaultCalibration().points;
 const ids=Object.keys(points).filter(id=>id.startsWith('C'));
 assert.deepEqual(ids,[...Array.from({length:18},(_,i)=>'C'+(i+1)),'C20','C22','C24']);
 for(const chain of [['C13','C14','C15','C16','C17','C18','C1'],['C13','C12','C11','C10','C9','C8','C7']])for(let i=1;i<chain.length;i++){
  const a=points[chain[i-1]],b=points[chain[i]];
  assert.ok(b[1]>a[1],chain[i]+' must continue toward the bottom forts');
  assert.ok(Math.abs(b[1]-a[1])<95,chain[i]+' must not skip a mountain-side reference point');
 }
 assert.ok(points.C24[0]>points.C16[0]&&points.C24[0]<points.C20[0]);
 assert.ok(points.C22[0]>points.C20[0]&&points.C22[0]<points.C10[0]);
 assert.ok(points.C22[1]>points.C10[1]&&points.C22[1]<points.C9[1]);
 assert.ok(points.C24[1]>points.C16[1]&&points.C24[1]<points.C17[1]);
});
