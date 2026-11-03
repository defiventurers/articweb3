import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION,RULE_PROFILES,DEFAULT_PROFILE,createInitialState,profileFor,legalActions,checkDivisionVictory,airDefencePoints,airDefenceZones,threatenedByAirDefence,applyAction,TYPES} from '../frontend/src/games/co-tu-lenh/rules.js';
import fs from 'node:fs';
import path from 'node:path';
const src=new URL('../frontend/src/games/co-tu-lenh/CoTuLenhApp.jsx',import.meta.url);
const ruleJson=JSON.parse(fs.readFileSync(new URL('../frontend/public/assets/co-tu-lenh/rules-profiles-v0.3.json',import.meta.url),'utf8'));
const piece=(id,type,team,x,y,other={})=>({id,type,team,x,y,alive:true,hero:false,carrier:null,...other});
const make=(profile,pieces,turn='red')=>({rulesVersion:VERSION,mode:profile,rulesProfile:profile,turn,pieces,ply:0,captures:[],winner:null,winReason:null});
const force=(state,id,type)=>legalActions(state,id).filter(a=>a.kind===type);
test('profiles match uploaded research catalog and retain 11x12, 38-piece inventory',()=>{
  assert.deepEqual(Object.keys(RULE_PROFILES).sort(),Object.keys(ruleJson.rulesProfiles).sort());
  assert.equal(DEFAULT_PROFILE,'ancientchess_2015_standard');
  for(const id of Object.keys(RULE_PROFILES)){
    const game=createInitialState(id);
    assert.equal(game.rulesProfile,id);
    assert.equal(game.pieces.length,38);
    assert.equal(game.setupVerified,false);
    assert.equal(game.fordsVerified,false);
    assert.equal(ruleJson.board.initialPositions,null);
    assert.equal(ruleJson.board.fordColumns,null);
  }
  assert.throws(()=>createInitialState('unknown'),/Unknown rules profile/);
  assert.equal(TYPES.headquarters.points,10);
});
test('2015 Commander travels 11 intersections while BGA caps at 10',()=>{
  const army=[piece('r','commander','red',4,0),piece('b','commander','blue',6,10)];
  const old=make('ancientchess_2015_standard',army),bga=make('bga_2024',army);
  assert.ok(legalActions(old,'r').some(a=>a.kind==='move'&&a.x===4&&a.y===11));
  assert.ok(!legalActions(bga,'r').some(a=>a.kind==='move'&&a.x===4&&a.y===11));
  assert.ok(legalActions(bga,'r').some(a=>a.kind==='move'&&a.x===4&&a.y===10));
});
test('missile has one-step diagonal in 2015 but not BGA',()=>{
  const army=[piece('m','missile','red',4,2),piece('r','commander','red',6,0),piece('b','commander','blue',7,11)];
  assert.ok(legalActions(make('ancientchess_2015_standard',army),'m').some(a=>a.x===5&&a.y===3));
  assert.ok(!legalActions(make('bga_2024',army),'m').some(a=>a.x===5&&a.y===3));
});
test('land division requires six 2015/BGA or nine 2024; long ignores division',()=>{
  const base=[piece('r','commander','red',6,0),piece('b','commander','blue',7,11),piece('e','engineer','blue',5,8),piece('mi','militia','blue',6,8),piece('na1','navy','blue',1,10),piece('na2','navy','blue',2,10),piece('af1','aircraft','blue',9,9),piece('af2','aircraft','blue',10,9)];
  assert.equal(checkDivisionVictory(make('ancientchess_2015_standard',base),'red'),'land');
  assert.equal(checkDivisionVictory(make('creator_2024_standard',base),'red'),null);
  assert.equal(checkDivisionVictory(make('bga_2024',base),'red'),'land');
  assert.equal(checkDivisionVictory(make('ancientchess_2015_long',base),'red'),null);
  assert.equal(checkDivisionVictory(make('creator_2024_standard',base.slice(0,2)),'red'),'navy'); // both navy lost before land adjudication
});
test('red and blue air-defence zones exactly match points used for interception',()=>{
  const units=[piece('a','antiair','red',4,4),piece('m','missile','blue',7,7),piece('n','navy','red',1,5),piece('e','engineer','red',5,6)];
  const z=airDefenceZones(make(DEFAULT_PROFILE,units));
  assert.equal(z.length,3);assert.ok(z.some(v=>v.id==='a'&&v.team==='red'&&v.radius===1));
  assert.equal(z.find(v=>v.id==='a').points.length,5);
  assert.equal(z.find(v=>v.id==='m').points.length,13);
  assert.ok(z.find(v=>v.id==='m').points.some(p=>p.x===8&&p.y===8));
  assert.ok(!z.find(v=>v.id==='m').points.some(p=>p.x===9&&p.y===8));
  assert.ok(threatenedByAirDefence(make(DEFAULT_PROFILE,units),8,8,'red'));
  assert.ok(!threatenedByAirDefence(make(DEFAULT_PROFILE,units),9,8,'red'));
  assert.ok(!threatenedByAirDefence(make(DEFAULT_PROFILE,units),4,4,'red'));
  assert.equal(airDefencePoints(piece('e','engineer','red',5,6)).length,0);
});
test('coverage excludes dead, embarked pieces; edge zones stay in board',()=>{
  const u=[piece('a','antiair','red',0,0),piece('m','missile','red',10,11,{carrier:'ship'}),piece('n','navy','blue',2,1,{alive:false})];
  const z=airDefenceZones(make(DEFAULT_PROFILE,u));assert.equal(z.length,1);
  assert.ok(z[0].points.every(p=>p.x>=0&&p.x<=10&&p.y>=0&&p.y<=11));
  assert.equal(z[0].points.length,3);
});
test('air-defence overlay can be toggled and maps to authoritative engine coverage',()=>{
  const jsx=fs.readFileSync(src,'utf8');
  assert.match(jsx,/aria-pressed=\{showDefence\}/);
  assert.match(jsx,/airDefenceZones\(state\)/);
  assert.match(jsx,/defenceZones\.map/);
  assert.match(jsx,/zone\.radius\*STEP_X/);
  assert.match(jsx,/zone\.points\.map/);
  assert.match(jsx,/zone\.team==='red'\?'#ef4658':'#2f9fff'/);
});
test('HQ blocks weak capturers while strong eligible attackers can target sheltered Commander',()=>{
  const army=[piece('a','infantry','red',5,4),piece('e','tank','red',7,5),piece('h','headquarters','blue',5,5),piece('c','commander','blue',5,5,{carrier:'h'}),piece('r','commander','red',2,0)];
  const s=make('ancientchess_2015_long',army);
  const infantry=legalActions(s,'a').find(a=>a.x===5&&a.y===5&&a.kind==='fire');
  assert.equal(infantry?.targetId,'h');
  // Tank must be within range and on same line to target HQ+Commander.
  s.pieces[0].x=4;s.pieces[0].y=5; s.pieces[1].x=5;s.pieces[1].y=3;
  const tank=legalActions(s,'e').find(a=>a.x===5&&a.y===5&&a.kind==='capture');
  assert.equal(tank?.targetId,'c');
});