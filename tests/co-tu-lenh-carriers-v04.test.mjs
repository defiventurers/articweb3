import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION,RULE_PROFILES,legalActions,allLegalActions,applyAction,airDefencePoints,byId} from '../frontend/src/games/co-tu-lenh/rules.js';
import {createRequire} from 'node:module';
const server=createRequire(import.meta.url)('../server/coTuLenhEngine.cjs');
const unit=(id,type,x,y,extra={})=>({id,type,team:'red',x,y,alive:true,hero:false,carrier:null,...extra});
const scenario=(pieces,profile='ancientchess_2015_long')=>({rulesVersion:VERSION,rulesProfile:profile,turn:'red',pieces:[unit('rc','commander',3,0),unit('bc','commander',9,11,{team:'blue'}),...pieces],ply:0,captures:[],winner:null,winReason:null});
const find=(s,id,kind,x,y)=>{const a=legalActions(s,id).find(a=>a.kind===kind&&a.x===x&&a.y===y);assert.ok(a,`${id} ${kind} ${x},${y}`);return a;};
function apply(s,a){const before=structuredClone(s),next=applyAction(s,a);assert.deepEqual(s,before,'immutable input');assert.deepEqual(next,server.applyAction(s,a),'client/server adjudication');return next;}

test('stack travel leaves passenger movement in the same turn, with a bounded participant roster',()=>{
 let s=scenario([unit('t','tank',5,3),unit('i','infantry',5,3,{carrier:'t'}),unit('other','tank',8,1)]);
 s=apply(s,find(s,'t','move',5,4));assert.equal(s.turn,'red');assert.deepEqual([byId(s,'i').x,byId(s,'i').y],[5,4]);
 assert.equal(legalActions(s,'other').length,0);assert.equal(legalActions(s,'t').length,0);
 s=apply(s,find(s,'i','move',6,4));assert.equal(s.turn,'blue');assert.equal(byId(s,'i').carrier,null);
});
test('passenger may disembark first, then carrier moves once; unrelated pieces and reboarding are refused',()=>{
 let s=scenario([unit('t','tank',5,3),unit('i','infantry',5,3,{carrier:'t'}),unit('other','tank',8,1)]);
 s=apply(s,find(s,'i','move',6,3));assert.equal(s.turn,'red');assert.equal(legalActions(s,'i').length,0);
 assert.throws(()=>applyAction(s,{id:'other',kind:'move',x:8,y:2}),/Illegal/);
 assert.ok(legalActions(s,'t').every(a=>!['embark','load'].includes(a.kind)));
 s=apply(s,find(s,'t','move',5,4));assert.equal(s.turn,'blue');assert.deepEqual([byId(s,'i').x,byId(s,'i').y],[6,3]);
});
test('carrier can leave a passenger behind and player can finish a partial compound turn',()=>{
 let s=scenario([unit('t','tank',5,3),unit('i','infantry',5,3,{carrier:'t'})]);
 s=apply(s,{...find(s,'t','move',5,4),carryIds:[]});assert.deepEqual([byId(s,'i').x,byId(s,'i').y],[5,3]);assert.equal(byId(s,'i').carrier,null);
 assert.ok(allLegalActions(s).some(a=>a.kind==='end-turn'));
 s=apply(s,{id:'turn',kind:'end-turn'});assert.equal(s.turn,'blue');assert.equal(s.turnContext,null);
});
test('invalid passenger lists and dropping ground cargo at sea are rejected',()=>{
 const s=scenario([unit('n','navy',0,3),unit('i','infantry',0,3,{carrier:'n'})]),a=find(s,'n','move',0,4);
 assert.throws(()=>applyAction(s,{...a,carryIds:['invented']}),/Invalid passenger/);
 assert.throws(()=>applyAction(s,{...a,carryIds:[]}),/cannot be left/);
});
test('boarding uses normal movement range; carrier may instead travel onto its passenger',()=>{
 let s=scenario([unit('t','tank',4,3),unit('n','navy',2,3)]);
 s=apply(s,find(s,'t','embark',2,3));assert.equal(byId(s,'t').carrier,'n');assert.equal(s.turn,'blue');
 s=scenario([unit('n','navy',2,3),unit('i','infantry',2,5)]);
 s=apply(s,find(s,'n','load',2,5));assert.equal(byId(s,'i').carrier,'n');assert.deepEqual([byId(s,'n').x,byId(s,'n').y],[2,5]);
});
test('aircraft drops a passenger and returns, then the dropped passenger can act',()=>{
 let s=scenario([unit('af','aircraft',5,2),unit('i','infantry',5,2,{carrier:'af'})]);
 s=apply(s,find(s,'af','airdrop',5,6));assert.deepEqual([byId(s,'af').x,byId(s,'af').y],[5,2]);assert.deepEqual([byId(s,'i').x,byId(s,'i').y],[5,6]);assert.equal(byId(s,'i').carrier,null);assert.equal(s.turn,'red');
 s=apply(s,find(s,'i','move',5,7));assert.equal(s.turn,'blue');
});
test('engineer ferries a heavy unit across a non-reef river column; no unrestricted cargo travel',()=>{
 let s=scenario([unit('e','engineer',4,5),unit('a','artillery',4,4)]);
 s=apply(s,find(s,'a','embark',4,5));s=apply(s,find(s,'bc','move',8,11));
 assert.ok(legalActions(s,'e').every(a=>a.x===4&&a.y===6));
 s=apply(s,find(s,'e','move',4,6));assert.equal(s.turn,'red');assert.equal(byId(s,'a').y,6);
 s=apply(s,find(s,'a','move',4,7));assert.equal(s.turn,'blue');
});
test('navy can use torpedo and land gun once each in either order',()=>{
 for(const gunFirst of [false,true]){
  let s=scenario([unit('n','navy',0,3),unit('ship','navy',0,5,{team:'blue'}),unit('land','infantry',3,gunFirst?3:2,{team:'blue'})]);
  if(gunFirst){s=apply(s,find(s,'n','fire',3,3));assert.equal(s.turn,'red');s=apply(s,find(s,'n','capture',0,5));}
  else{s=apply(s,find(s,'n','capture',0,5));assert.equal(s.turn,'red');assert.ok(legalActions(s,'n').every(a=>a.kind==='fire'));s=apply(s,find(s,'n','fire',3,2));}
  assert.equal(byId(s,'ship'),undefined);assert.equal(byId(s,'land'),undefined);assert.equal(s.turn,'blue');
 }
});
test('navy jumps piece blockers but cannot cut land or cross a reef',()=>{
 const s=scenario([unit('n','navy',0,3),unit('block','navy',0,4),unit('target','navy',0,5,{team:'blue'})]);assert.ok(find(s,'n','capture',0,5));
 const reef=scenario([unit('n','navy',5,5)]);assert.ok(!legalActions(reef,'n').some(a=>a.kind==='move'&&a.x===5&&a.y===6));
});
test('weak HQ destruction leaves sheltered Commander alive and attacker in place',()=>{
 const s=scenario([unit('i','infantry',5,4),unit('h','headquarters',5,5,{team:'blue'}),unit('c','commander',5,5,{team:'blue',carrier:'h'})]);
 const n=apply(s,find(s,'i','fire',5,5));assert.equal(byId(n,'h'),undefined);assert.equal(byId(n,'c').carrier,null);assert.deepEqual([byId(n,'i').x,byId(n,'i').y],[5,4]);
});
test('heavy gun may capture across the river away from the provisional reefs',()=>{
 const s=scenario([unit('a','artillery',4,5),unit('victim','infantry',4,6,{team:'blue'})]);
 const n=apply(s,find(s,'a','capture',4,6));assert.equal(byId(n,'a').y,6);assert.equal(byId(n,'victim'),undefined);
});
test('hero missile diagonal gains exactly one point and defence range is not silently enlarged',()=>{
 const s=scenario([unit('m','missile',5,4,{hero:true})]);assert.ok(find(s,'m','move',7,6));assert.ok(!legalActions(s,'m').some(a=>a.x===8&&a.y===7));
 assert.ok(!airDefencePoints(byId(s,'m')).some(p=>p.x===8&&p.y===4));
});
test('continuous defended kamikaze captures its target, but a gap shoots the plane down before impact',()=>{
 for(const gap of [false,true]){
  const s=scenario([unit('af','aircraft',4,0),unit('aa','missile',4,gap?1:2,{team:'blue'}),unit('victim','infantry',4,4,{team:'blue'})]);
  const n=apply(s,find(s,'af','bomb',4,4));assert.equal(byId(n,'af'),undefined);assert.equal(!!byId(n,'victim'),gap);
 }
});
test('all four profiles share bounded compound stack turns',()=>{
 for(const profile of Object.keys(RULE_PROFILES)){
  // Keep complete opposing divisions alive so Standard does not end a miniature fixture early.
  let s=scenario([unit('t','tank',5,3),unit('i','infantry',5,3,{carrier:'t'}),unit('bn','navy',0,10,{team:'blue'}),unit('baf','aircraft',8,10,{team:'blue'}),unit('bi','infantry',8,9,{team:'blue'}),unit('rn','navy',0,1),unit('raf','aircraft',8,1)],profile);
  s=apply(s,find(s,'t','move',5,4));assert.equal(s.turn,'red');s=apply(s,{kind:'end-turn',id:'turn'});assert.equal(s.turn,'blue');
 }
});

test('a coastal land capture spends the naval land gun, leaving the torpedo available',()=>{
 let s=scenario([unit('n','navy',0,3),unit('land','infantry',2,3,{team:'blue'}),unit('ship','navy',0,5,{team:'blue'})]);
 s=apply(s,find(s,'n','capture',2,3));assert.equal(s.turn,'red');assert.deepEqual(s.turnContext.weapons.n,['land']);
 s=apply(s,find(s,'n','capture',0,5));assert.equal(s.turn,'blue');
});
test('losing the last aircraft to interception loses Standard, except a simultaneous enemy-division win',()=>{
 const core=[unit('rn','navy',0,1),unit('ri','infantry',8,1),unit('af','aircraft',4,0),unit('bn','navy',0,10,{team:'blue'}),unit('baf','aircraft',10,10,{team:'blue'}),unit('bi','infantry',8,8,{team:'blue'}),unit('aa','antiair',4,1,{team:'blue'})];
 const s=scenario(core,'ancientchess_2015_standard');const n=apply(s,find(s,'af','move',4,2));assert.equal(n.winner,'blue');assert.equal(n.winReason,'air');
});

test('a loaded Tank boards an Aircraft, its descendants travel and drop with it, and capacity remains three',()=>{
 let s=scenario([unit('af','aircraft',5,3),unit('t','tank',5,1),unit('i','infantry',5,1,{carrier:'t'})]);
 s=apply(s,find(s,'t','embark',5,3));assert.equal(byId(s,'t').carrier,'af');assert.equal(byId(s,'i').carrier,'t');assert.equal(byId(s,'i').y,3);
 s=apply(s,find(s,'bc','move',8,11));s=apply(s,find(s,'af','airdrop',5,6));
 assert.deepEqual([byId(s,'t').x,byId(s,'t').y],[5,6]);assert.deepEqual([byId(s,'i').x,byId(s,'i').y],[5,6]);assert.equal(byId(s,'t').carrier,null);assert.equal(byId(s,'i').carrier,'t');
 s=apply(s,find(s,'t','move',6,6));assert.equal(byId(s,'i').x,6);s=apply(s,find(s,'i','move',6,7));assert.equal(s.turn,'blue');
});
test('Navy carries Aircraft plus passenger as a nested three-piece stack without extra boarding capacity',()=>{
 let s=scenario([unit('n','navy',2,3),unit('af','aircraft',3,3),unit('i','infantry',3,3,{carrier:'af'}),unit('extra','infantry',2,2)]);
 s=apply(s,find(s,'af','embark',2,3));s=apply(s,find(s,'bc','move',8,11));
 assert.ok(!legalActions(s,'extra').some(a=>a.kind==='embark'&&a.x===2&&a.y===3));
 s=apply(s,find(s,'n','move',2,4));assert.equal(byId(s,'af').y,4);assert.equal(byId(s,'i').y,4);
 s=apply(s,find(s,'af','move',4,4));assert.equal(byId(s,'af').carrier,null);assert.deepEqual([byId(s,'i').x,byId(s,'i').y],[4,4]);
 s=apply(s,find(s,'i','move',5,4));assert.equal(s.turn,'blue');
});

test('aircraft may drop both flat passengers when they form a legal Tank-and-Infantry landing stack',()=>{
 let s=scenario([unit('af','aircraft',5,2),unit('t','tank',5,2,{carrier:'af'}),unit('i','infantry',5,2,{carrier:'af'})]);
 const a=legalActions(s,'af').find(a=>a.kind==='airdrop'&&a.x===5&&a.y===6&&a.dropIds.length===2);assert.ok(a);
 s=apply(s,a);assert.equal(byId(s,'t').carrier,null);assert.equal(byId(s,'i').carrier,'t');assert.equal(byId(s,'i').y,6);assert.equal(byId(s,'af').y,2);
});
