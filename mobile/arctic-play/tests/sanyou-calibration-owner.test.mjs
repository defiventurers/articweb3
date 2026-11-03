import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {defaultCalibration,validateCalibration,SANYOU_POINT_IDS,sanyouBoardGeometry} from '../src/sanyouCalibration.js';
import {verifyOwnerCode} from '../src/ownerAccess.js';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),engine=require('../build/games.cjs'),model=require('../src/unlockModel.cjs');

test('New artwork has all existing game point IDs and every opening piece has a unique valid position',()=>{
 const expected=engine.board('sanyou').cells.map(c=>c.id);
 assert.equal(expected.length,156);assert.equal(new Set(expected).size,156);assert.deepEqual(expected,SANYOU_POINT_IDS);
 assert.deepEqual(new Set(expected),new Set([...['red','green','blue'].flatMap(f=>Array.from({length:9},(_,l)=>Array.from({length:5},(_,r)=>`${f}:L${l+1}-${r+1}`)).flat()),...Array.from({length:18},(_,i)=>'C'+(i+1)),'C20','C22','C24']));
 const board=sanyouBoardGeometry();assert.equal(board.viewBox,'0 0 1536 1536');
 const units=engine.pieces('sanyou',engine.create('sanyou'));assert.equal(units.length,54);assert.equal(new Set(units.map(u=>u.cell)).size,54);
 for(const unit of units)assert.ok(expected.includes(unit.cell));
 for(const c of board.cells){assert.ok(c.x>=35&&c.x<=1501);assert.ok(c.y>=35&&c.y<=1501);}
});
test('Calibration imports reject a different image, dropped IDs, wrong dimensions, duplicate and invalid coordinates',()=>{
 for(const mutate of [c=>c.board='old-board',c=>delete c.points.C20,c=>c.width=1000,c=>c.points.C1=[NaN,45],c=>c.points.C1=[1537,45],c=>c.points.C1=c.points.C2,c=>c.pieceSize=1000,c=>c.points.unrecognised=[50,50]]){const c=defaultCalibration();mutate(c);assert.throws(()=>validateCalibration(c));}
 const next=defaultCalibration();next.points.C20=[770.25,830.5];const result=validateCalibration(JSON.stringify(next));assert.deepEqual(result.points.C20,[770.25,830.5]);assert.notDeepEqual(defaultCalibration().points.C20,result.points.C20);
});
test('Public source contains a verifier; wrong or malformed owner codes never unlock access',async()=>{
 assert.equal(await verifyOwnerCode(''),false);assert.equal(await verifyOwnerCode('AK-OWNER-'+Array(8).fill('000000').join('-')),false);
 assert.equal(model.access('sanyou',{progress:model.empty()}).open,false);
 assert.equal(model.access('sanyou',{entitlements:{'owner-access-v1':{active:true,mode:'test'}}}).open,false);
 for(const id of model.GAME_IDS)assert.equal(model.access(id,{entitlements:{'owner-access-v1':{active:true,mode:'owner'}}}).reason,'owner');
});
test('Private owner code verifies without a network request and a one-character edit fails',{skip:!process.env.AK_TEST_OWNER_CODE_FILE},async()=>{
 const code=fs.readFileSync(process.env.AK_TEST_OWNER_CODE_FILE,'utf8').trim();
 assert.equal(await verifyOwnerCode(code),true);assert.equal(await verifyOwnerCode(code.toLowerCase()),true);
 assert.equal(await verifyOwnerCode(code.slice(0,-1)+(code.endsWith('A')?'B':'A')),false);
 assert.ok(!fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8').includes(code));
});
test('Shipped replacement image preserves every byte of the user-approved PNG',()=>{
 const a=fs.readFileSync(new URL('../art/boards/sanyou-ice-white-v2.png',import.meta.url)),b=fs.readFileSync(new URL('../android/app/src/main/assets/art/boards/sanyou-ice-white-v2.png',import.meta.url));assert.equal(createHash('sha256').update(a).digest('hex'),'0b399af7862664d61e43d54156db848d3ba5d20795a745354e6b093ac2639b2c');assert.deepEqual(a,b);
 assert.deepEqual(fs.readdirSync(new URL('../android/app/src/main/assets/art/boards/',import.meta.url)).filter(n=>n.startsWith('sanyou')),['sanyou-ice-white-v2-grid.svg','sanyou-ice-white-v2.png']);
});
