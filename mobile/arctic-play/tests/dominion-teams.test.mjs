import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DOMINION_TEAMS,teamFor} from '../src/dominionTeams.js';
import {finishCompanionEvent} from '../src/companions.js';
const e=createRequire(import.meta.url)('../build/games.cjs');
const seats=e.game('dominion').seats;
const put=(s,team,type,row,col,royal=false)=>s.board[row][col]={id:`${team}-${type}-${row}-${col}`,team,type,isRoyal:royal};
function position(seat='green',mode='2v2'){
 const s=e.create('dominion',{teamMode:mode});s.board=Array.from({length:8},()=>Array(8).fill(null));
 seats.forEach((c,i)=>put(s,c,'king',i<2?0:7,i%2?7:0,true));
 s.currentPlayerIndex=seats.indexOf(seat);s.turn=seat;s.dice={rolled:true,values:[1,1],used:[false,false]};return s;
}
test('Every kingdom can capture opponents but cannot capture its partner with any piece type',()=>{
 for(const seat of seats){
  const ally=teamFor(seat).seats.find(c=>c!==seat),enemy=seats.find(c=>!teamFor(seat).seats.includes(c));
  for(const [type,die,target] of [['king',1,[4,5]],['elephant',2,[4,6]],['horse',3,[2,3]],['ship',4,[2,2]],['pawn',1,seat==='green'?[3,3]:seat==='red'?[3,5]:seat==='blue'?[3,3]:[5,3]]]){
   const s=position(seat);put(s,seat,type,4,4);put(s,ally,'pawn',...target);s.dice.values=[die,die];
   const victim=target.join(',');assert.ok(!e.actions('dominion',s).some(a=>a.source===`piece:${s.board[4][4].id}`&&a.target===victim),`${seat} ${type} avoids ally`);
   const ffa={...s,teamMode:'free-for-all'};const oldCapture=e.actions('dominion',ffa).find(a=>a.source===`piece:${s.board[4][4].id}`&&a.target===victim);assert.ok(oldCapture,'original four-way capture remains legal');
   assert.throws(()=>e.apply('dominion',s,oldCapture.id),/no longer legal/,'forged allied capture is rejected');
   s.board[target[0]][target[1]].team=enemy;
   const capture=e.actions('dominion',s).find(a=>a.source===`piece:${s.board[4][4].id}`&&a.target===victim);assert.ok(capture,`${seat} ${type} can still capture rivals`);
   const before=JSON.stringify(s);const next=e.apply('dominion',s,capture.id);assert.equal(JSON.stringify(s),before);assert.equal(next.board[target[0]][target[1]].team,seat);
  }
 }
});
test('An allied blocker stops a Mammoth ray, and only the active kingdom moves',()=>{
 const s=position();put(s,'green','elephant',4,4);put(s,'yellow','pawn',4,5);put(s,'red','pawn',4,6);s.dice.values=[2,2];
 const moves=e.actions('dominion',s).filter(a=>a.kind==='move');assert.ok(moves.length);assert.ok(moves.every(a=>a.source.includes('green')));assert.ok(!moves.some(a=>['4,5','4,6','4,7'].includes(a.target)));
});
test('The team wins only after both opposing royal kingdoms fall; an eliminated partner shares victory',()=>{
 let s=position();s.board=Array.from({length:8},()=>Array(8).fill(null));
 put(s,'green','king',7,7,true);put(s,'green','elephant',4,4);put(s,'red','king',4,6,true);put(s,'blue','king',1,6,true);put(s,'red','pawn',5,6);s.eliminatedTeams=['yellow'];s.dice.values=[2,2];
 s=e.apply('dominion',s,e.actions('dominion',s).find(a=>a.target==='4,6').id);
 assert.equal(s.gameOver,false);assert.ok(s.eliminatedTeams.includes('red'));assert.ok(!s.board.flat().some(p=>p?.team==='red'));
 s=e.apply('dominion',s,e.actions('dominion',s).find(a=>a.target==='1,6').id);
 assert.equal(s.gameOver,true);assert.equal(s.winningTeam,'green-pink');assert.deepEqual(e.result(s).winners,['green','yellow']);assert.deepEqual(e.actions('dominion',s),[]);
 assert.equal(finishCompanionEvent({outcome:e.result(s),online:true,seat:'yellow'}),'win');assert.equal(finishCompanionEvent({outcome:e.result(s),online:true,seat:'red'}),'loss');
});
test('Capturing a promoted fighter King does not eliminate its royal kingdom',()=>{
 const s=position();put(s,'green','elephant',4,4);put(s,'red','king',4,6,false);s.dice.values=[2,2];
 const next=e.apply('dominion',s,e.actions('dominion',s).find(a=>a.target==='4,6').id);assert.ok(!next.eliminatedTeams.includes('red'));assert.equal(e.result(next),null);
});
test('A roll with only allied captures available passes automatically; early ending still works',t=>{
 const s=position();s.board=Array.from({length:8},()=>Array(8).fill(null));put(s,'green','king',4,4,true);
 for(let r=3;r<=5;r++)for(let c=3;c<=5;c++)if(r!==4||c!==4)put(s,'yellow','pawn',r,c);
 put(s,'yellow','king',0,0,true);put(s,'red','king',0,7,true);put(s,'blue','king',7,0,true);s.dice={rolled:false,values:[null,null],used:[false,false]};
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');Object.defineProperty(globalThis,'crypto',{value:{getRandomValues:array=>{array[0]=0;return array;}},configurable:true});t.after(()=>Object.defineProperty(globalThis,'crypto',descriptor));
 const next=e.apply('dominion',s,'roll|control:roll');assert.equal(next.mobileLastRoll.skipped,true);assert.equal(next.turn,'red');assert.equal(next.dice.rolled,false);
 const playable=position();assert.ok(e.actions('dominion',playable).some(a=>a.kind==='move'));assert.equal(e.apply('dominion',playable,'end|control:end').turn,'red');
});
test('Practice bots select only team-legal actions in both alliances',()=>{
 for(const team of DOMINION_TEAMS)for(const seat of team.seats){const s=position(seat);put(s,seat,'elephant',4,4);put(s,team.seats.find(c=>c!==seat),'pawn',4,5);s.dice.values=[2,2];for(let i=0;i<8;i++){const action=e.chooseBot('dominion',s);assert.ok(e.actions('dominion',s).some(a=>a.id===action));assert.doesNotThrow(()=>e.apply('dominion',s,action));}}
});
