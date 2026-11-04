import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {VERSION,DEFAULT_PROFILE,RULE_PROFILES,createInitialState,legalActions,allLegalActions,applyAction,byId,canCarry,airDefencePoints,threatenedByAirDefence,capturedPoints,startMatch,expireClock,isFinished,canDeploy,applyDeployment,confirmDeployment,chooseBotMove,commanderThreatened} from '../frontend/src/games/co-tu-lenh/rules.js';
const server=createRequire(import.meta.url)('../server/coTuLenhEngine.cjs');
const u=(id,type,x,y,extra={})=>({id,type,x,y,team:'red',alive:true,hero:false,carrier:null,...extra});
const blue=(id,type,x,y,extra={})=>u(id,type,x,y,{team:'blue',...extra});
function position(units=[]){return {...createInitialState(),pieces:[u('rc','commander',3,0),blue('bc','commander',9,11),u('ra1','aircraft',10,0),u('ra2','aircraft',10,1),u('rn1','navy',0,0),u('rn2','navy',0,1),u('rl','infantry',10,2),blue('ba1','aircraft',10,11),blue('ba2','aircraft',10,10),blue('bn1','navy',0,11),blue('bn2','navy',0,10),blue('bl','infantry',10,9),...units]};}
const find=(s,id,kind,x,y)=>{const a=legalActions(s,id).find(a=>a.kind===kind&&a.x===x&&a.y===y);assert.ok(a,`${id} ${kind} ${x},${y}`);return a;};
function play(s,a){const before=structuredClone(s),n=applyAction(s,a);assert.deepEqual(s,before);assert.deepEqual(n,server.applyAction(s,a));return n;}
test('YouTuber Rules is a fifth profile with the corrected final video setup and preserved legacy setup',()=>{
 assert.equal(DEFAULT_PROFILE,'youtuber_rules');assert.equal(Object.keys(RULE_PROFILES).length,5);
 const s=createInitialState();assert.equal(s.pieces.length,38);assert.equal(s.setupVerified,true);
 const expected={commander:[[6,0]],infantry:[[2,4],[10,4]],tank:[[5,3],[7,3]],militia:[[6,4]],engineer:[[3,4],[9,4]],artillery:[[3,2],[9,2]],antiair:[[4,3],[8,3]],missile:[[6,2]],aircraft:[[4,1],[8,1]],navy:[[1,1],[2,3]],headquarters:[[5,1],[7,1]]};
 for(const [type,coords]of Object.entries(expected))for(const [x,y]of coords)for(const team of ['red','blue'])assert.ok(s.pieces.some(p=>p.team===team&&p.type===type&&p.x===x&&p.y===(team==='red'?y:11-y)),`${team} ${type} ${x},${y}`);
 assert.equal(createInitialState('ancientchess_2015_standard').pieces.find(p=>p.id==='red-03').y,1);
 assert.deepEqual(s,server.createInitialState());
});
test('Navy accepts the demonstrated four-piece stack; aircraft cannot carry Tanks or drop-and-return',()=>{
 let s=position([u('n','navy',2,3),u('t','tank',2,3,{carrier:'n'}),u('af','aircraft',2,3,{carrier:'n'}),u('c','militia',3,3)]);
 assert.ok(canCarry('navy','commander',[{type:'tank'},{type:'aircraft'}],s));
 s=play(s,find(s,'c','embark',2,3));assert.equal(byId(s,'c').carrier,'n');
 s.turn='red';s=play(s,find(s,'n','move',2,4));assert.equal(s.turn,'red');assert.equal(byId(s,'t').y,4);assert.equal(byId(s,'af').y,4);
 assert.ok(legalActions(s,'af').length);assert.ok(legalActions(s,'c').length);assert.equal(legalActions(s,'n').length,0);
 const tank=position([u('t','tank',4,3),u('af','aircraft',4,1)]);assert.ok(!legalActions(tank,'t').some(a=>a.kind==='embark'&&a.carrierId==='af'));
 assert.ok(!legalActions(position([u('af','aircraft',4,3),u('i','infantry',4,3,{carrier:'af'})]),'af').some(a=>a.kind==='airdrop'));
});
test('passengers can leave and attack in one bounded compound turn; unrelated pieces cannot join',()=>{
 let s=position([u('n','navy',2,3),u('af','aircraft',2,3,{carrier:'n'}),u('i','infantry',2,3,{carrier:'n'}),blue('victim','engineer',4,3)]);
 s=play(s,find(s,'i','move',3,3));assert.equal(s.turn,'red');
 s=play(s,find(s,'af','capture',4,3));assert.equal(byId(s,'victim'),undefined);assert.equal(s.turn,'red');
 assert.equal(legalActions(s,'rl').length,0);s=play(s,{id:'turn',kind:'end-turn'});assert.equal(s.turn,'blue');
});
test('Navy stops before shallow reef including horizontal river routes and land fire has its own range',()=>{
 const s=position([u('n','navy',3,5),blue('near','infantry',6,5),blue('far','engineer',3,9)]);
 assert.ok(legalActions(s,'n').some(a=>a.kind==='move'&&a.x===4&&a.y===5));
 assert.ok(!legalActions(s,'n').some(a=>a.kind==='move'&&a.x>=5&&a.y===5));
 assert.ok(!legalActions(s,'n').some(a=>a.targetId==='far'));
 assert.ok(legalActions(s,'n').some(a=>a.kind==='fire'&&a.targetId==='near'));
});
test('Navy may use one land weapon and one sea weapon in a turn, not two of either',()=>{
 let s=position([u('n','navy',1,4),blue('land','infantry',4,4),blue('ship','navy',1,7),blue('land2','engineer',3,4)]);
 s=play(s,find(s,'n','fire',4,4));assert.equal(s.turn,'red');assert.ok(legalActions(s,'n').every(a=>a.targetId!=='land2'));
 s=play(s,find(s,'n','capture',1,7));assert.equal(s.turn,'blue');assert.equal(byId(s,'land'),undefined);assert.equal(byId(s,'ship'),undefined);
});
test('Aircraft cannot land on open sea but can board a Navy there and sacrifice against a defended ship',()=>{
 let s=position([u('af','aircraft',3,3),u('n','navy',1,3),blue('enemy','navy',1,5)]);
 assert.ok(!legalActions(s,'af').some(a=>a.kind==='move'&&a.x<=1));assert.ok(legalActions(s,'af').some(a=>a.kind==='embark'&&a.carrierId==='n'));
 const a=find(s,'af','bomb',1,5);assert.equal(a.risk,true);s=play(s,a);assert.equal(byId(s,'af'),undefined);assert.equal(byId(s,'enemy'),undefined);assert.equal(s.scores.red,80);assert.equal(s.scores.blue,40);
});
test('Aircraft boarding through hostile defence is intercepted; Hero aircraft ignores it',()=>{
 let s=position([u('af','aircraft',3,3),u('n','navy',1,3),blue('aa','antiair',2,4)]);
 const a=find(s,'af','embark',1,3);assert.equal(a.risk,true);assert.equal(byId(play(s,a),'af'),undefined);
 byId(s,'af').hero=true;assert.ok(byId(play(s,find(s,'af','embark',1,3)),'af'));
});
test('video HQ bypass list is Artillery, Aircraft and Navy; Tank and Engineer must break HQ first',()=>{
 for(const type of ['tank','engineer','artillery','aircraft','navy']){
  const x=type==='navy'?2:5,y=type==='navy'?5:4;
  const s=position([u('a',type,x,y),blue('h','headquarters',5,5),blue('c','commander',5,5,{carrier:'h'})]);s.pieces=s.pieces.filter(p=>p.id!=='bc');
  const a=legalActions(s,'a').find(a=>a.x===5&&a.y===5);assert.ok(a,type);
  const bypass=['artillery','aircraft','navy'].includes(type);assert.equal(a.targetId,bypass?'c':'h');
  const n=play(s,a);assert.equal(Boolean(byId(n,'c')),!bypass);if(!bypass)assert.equal(byId(n,'c').carrier,null);
 }
});
test('Commander cannot cross an open enemy sightline and own check must be answered',()=>{
 const s=position();byId(s,'rc').x=4;byId(s,'rc').y=2;byId(s,'bc').x=6;byId(s,'bc').y=10;
 assert.ok(!legalActions(s,'rc').some(a=>a.x===8&&a.y===2));
 s.pieces.push(u('block','infantry',6,6));assert.ok(legalActions(s,'rc').some(a=>a.x===8&&a.y===2));
 const check=position([blue('attacker','artillery',3,3)]);assert.equal(commanderThreatened(check,'red'),true);assert.equal(legalActions(check,'rl').length,0);
});
test('Artillery jumps on capture; heavy guns may capture across river away from fords',()=>{
 const s=position([u('a','artillery',4,4),u('block','infantry',4,5),blue('victim','infantry',4,6)]);
 assert.ok(!legalActions(s,'a').some(a=>a.kind==='move'&&a.x===4&&a.y===7));
 const n=play(s,find(s,'a','capture',4,6));assert.equal(byId(n,'a').y,6);assert.equal(byId(n,'victim'),undefined);
});
test('Hero movement bonuses, stealth, and defence cells stay separate',()=>{
 for(const [type,dx,dy]of [['infantry',2,2],['engineer',2,2],['antiair',2,2],['militia',2,2],['tank',3,3],['missile',2,2],['aircraft',5,0],['artillery',4,0]]){
  const s=position([u('hero',type,4,2,{hero:true})]);assert.ok(legalActions(s,'hero').some(a=>a.x===4+dx&&a.y===2+dy),type);
 }
 const aa=u('aa','antiair',5,5),ms=u('ms','missile',5,5);assert.equal(airDefencePoints(aa).length,5);assert.equal(airDefencePoints(ms).length,13);
 assert.deepEqual(airDefencePoints({...aa,hero:true}),airDefencePoints(aa));assert.equal(airDefencePoints(u('e','engineer',5,5)).length,0);
 const zone=position([blue('m','missile',5,5),u('block','infantry',5,4)]);assert.ok(threatenedByAirDefence(zone,5,3,'red'));
});
test('last living mobile defender is promoted even without giving check',()=>{
 let s=position([u('last','militia',4,2)]);s.pieces=s.pieces.filter(p=>p.team==='blue'||['rc','last'].includes(p.id));
 s=play(s,find(s,'last','move',4,3));assert.equal(byId(s,'last').hero,true);assert.equal(byId(s,'last').heroReason,'last-defender');
});
test('video scores omit Commander value and Hero premiums and award 200 only with a strict lead',()=>{
 for(const [redPoints,bluePoints,bonus]of [[30,10,200],[10,10,0],[10,30,0]]){
  let s=position([u('a','artillery',6,8),blue('c','commander',6,10)]);s.pieces=s.pieces.filter(p=>p.id!=='bc');
  s.captures=[{by:'red',type:redPoints===30?'artillery':'infantry'},{by:'blue',type:bluePoints===30?'artillery':'infantry'}];
  s=play(s,find(s,'a','capture',6,10));assert.equal(s.winner,'red');assert.equal(s.scores.red,redPoints);assert.equal(s.scoreBonus.red,bonus);
 }
 const s=position();s.captures=[{by:'red',type:'commander'},{by:'red',type:'tank',hero:true}];assert.equal(capturedPoints(s,'red'),20);
});
test('optional whole-match clocks start once, expire authoritatively and preserve ties as draws',()=>{
 let s=startMatch(createInitialState('youtuber_rules',{timeLimitMinutes:10}),1000);assert.equal(s.clock.deadline,601000);assert.deepEqual(startMatch(s,9999),s);
 assert.equal(expireClock(s,600999),s);const draw=expireClock(s,601000);assert.equal(draw.draw,true);assert.ok(isFinished(draw));assert.equal(allLegalActions(draw).length,0);
 s.captures=[{by:'blue',type:'navy'}];assert.equal(expireClock(s,601001).winner,'blue');assert.deepEqual(expireClock(s,601001),server.expireClock(s,601001));
});
test('secret deployment uses terrain and home rows and waits for both confirmations',()=>{
 let s=createInitialState('youtuber_rules',{deployment:'secret',timeLimitMinutes:15});assert.equal(allLegalActions(s).length,0);
 assert.equal(canDeploy(s,'blue','red-01',4,3),false);assert.equal(canDeploy(s,'red','red-01',0,3),false);assert.equal(canDeploy(s,'red','red-01',4,7),false);
 s=applyDeployment(s,'red','red-01',4,0);assert.deepEqual(s,server.applyDeployment(createInitialState('youtuber_rules',{deployment:'secret',timeLimitMinutes:15}),'red','red-01',4,0));
 s=confirmDeployment(s,'red',100);assert.equal(s.phase,'setup');assert.equal(s.clock.deadline,null);assert.equal(canDeploy(s,'red','red-01',5,0),false);
 s=confirmDeployment(s,'blue',500);assert.equal(s.phase,'playing');assert.equal(s.clock.deadline,900500);assert.equal(s.turn,'red');
});
test('bot selects legal actions and client/server agree through a real new-profile opening',()=>{
 let s=createInitialState();for(let i=0;i<12&&!isFinished(s);i++){const a=chooseBotMove(s,i%2?'easy':'medium');assert.ok(a);s=play(s,a);}assert.ok(s.ply>=12);
});

test('automatic Commander mate is declared only after every legal escape is ruled out',()=>{
 let s=position([blue('attacker','artillery',2,4)]);s.turn='blue';byId(s,'rc').x=2;byId(s,'bc').x=3;byId(s,'bc').y=2;byId(s,'rn1').y=8;byId(s,'rn2').y=9;
 s.captures=[{by:'blue',type:'infantry'}];s=play(s,find(s,'attacker','move',2,3));assert.equal(s.winner,'blue');assert.equal(s.winReason,'commander-mate');assert.equal(s.scoreBonus.blue,200);
});
test('passenger choices cannot bypass Commander safety validation',()=>{
 const s=position([u('t','tank',5,3),blue('attacker','artillery',5,0)]);Object.assign(byId(s,'rc'),{x:5,y:3,carrier:'t'});
 const a=find(s,'t','move',5,4);assert.throws(()=>applyAction(s,{...a,carryIds:[]}),/expose the Commander/);assert.equal(byId(play(s,a),'rc').y,4);
});
