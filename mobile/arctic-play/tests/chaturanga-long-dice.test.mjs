import test from 'node:test';import assert from 'node:assert/strict';
import {LONG_DICE_PROFILE,LONG_DICE_ACTION,LONG_DICE_ROLES,createLongDiceGame,longDiceActions,applyLongDice,chooseLongDiceBot,needsKingReturn} from '../src/chaturangaLongDice.js';
import {createDominion,dominionActions,applyDominion} from '../src/dominion.js';
const put=(s,t,type,r,c,royal=false)=>s.board[r][c]={id:`${t}-${type}-${r}-${c}`,team:t,type,isRoyal:royal};
function position(team='green',mode='2v2'){
 const s=createLongDiceGame({teamMode:mode});s.board=Array.from({length:8},()=>Array(8).fill(null));
 for(const[t,r,c]of [['green',7,7],['yellow',0,0],['red',0,7],['blue',7,0]])put(s,t,'king',r,c,true);
 s.currentPlayerIndex=['green','red','blue','yellow'].indexOf(team);s.turn=team;return s;
}
const rolled=(state,values)=>applyLongDice(state,LONG_DICE_ACTION,{values});
test('new profile has only paired long dice; legacy creation/actions remain unchanged',()=>{
 const s=createDominion({rulesProfile:LONG_DICE_PROFILE,teamMode:'2v2'});
 assert.equal(s.rulesProfile,LONG_DICE_PROFILE);assert.equal(s.teamMode,'2v2');
 assert.deepEqual(longDiceActions(s).map(a=>a.id),[LONG_DICE_ACTION,'skip|control:skip']);
 const old=createDominion();assert.equal(old.rulesProfile,undefined);assert.ok(dominionActions(old).some(a=>a.raw.count===1));
 assert.throws(()=>applyLongDice(s,'roll-one|control:roll-one'),/no longer legal/);
});
test('faces 2/3/4/5 mean boat/knight/rook/king-or-pawn; movement retains canonical geometry',()=>{
 const expected={2:'ship',3:'horse',4:'elephant',5:'king'};
 for(const face of [2,3,4,5]){
  const s=position();for(const [type,r,c]of [['ship',4,4],['horse',3,3],['elephant',2,2],['pawn',5,5]])put(s,'green',type,r,c);
  const next=rolled(s,[face,face]),moves=longDiceActions(next).filter(a=>a.kind==='move');assert.ok(moves.length);
  for(const a of moves)assert.ok(LONG_DICE_ROLES[face].includes(next.board[a.raw.fromRow][a.raw.fromCol].type));
  assert.ok(moves.some(a=>next.board[a.raw.fromRow][a.raw.fromCol].type===expected[face]));
 }
 const s=position();put(s,'green','ship',4,4);put(s,'yellow','pawn',3,3);
 assert.ok(longDiceActions(rolled(s,[2,2])).some(a=>a.target==='2,2'));
});
test('CSPRNG emits only equally sized four-face buckets; online values cannot inject 1 or 6',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'crypto');let i=0;
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues(bytes){bytes[0]=i++%256;return bytes}}});t.after(()=>Object.defineProperty(globalThis,'crypto',old));
 const counts={2:0,3:0,4:0,5:0};for(let n=0;n<128;n++)for(const v of applyLongDice(position(),LONG_DICE_ACTION).dice.values)counts[v]++;
 assert.deepEqual(Object.values(counts),[64,64,64,64]);
 for(const values of [[1,3],[5,6],[2],[2,3,4],[2.5,3]])assert.throws(()=>rolled(position(),values),/verified long dice/);
});
test('missing pieces require manual passing, with independent one-die and remaining-turn pass',()=>{
 const s=position(),n=rolled(s,[2,3]);assert.equal(n.turn,'green');assert.equal(n.dice.rolled,true);assert.equal(longDiceActions(n).filter(a=>a.kind==='move').length,0);
 const one=applyLongDice(n,'pass-die|control:pass-die:0');assert.deepEqual(one.dice.used,[true,false]);assert.equal(one.turn,'green');
 const both=applyLongDice(one,'pass-die|control:pass-die:1');assert.equal(both.turn,'red');assert.equal(both.mobileTurnNumber,1);
 assert.equal(applyLongDice(n,'end|control:end').turn,'red');assert.equal(applyLongDice(s,'skip|control:skip').turn,'red');
});
test('the same piece can spend doubles sequentially, and no spent die can be reused',()=>{
 const s=position();put(s,'green','elephant',4,4);let n=rolled(s,[4,4]);
 const first=longDiceActions(n).find(a=>a.target==='4,5'&&a.raw.dieIndex===1);n=applyLongDice(n,first.id);assert.deepEqual(n.dice.used,[false,true]);
 assert.ok(longDiceActions(n).filter(a=>a.kind==='move').every(a=>a.raw.dieIndex===0));
 const second=longDiceActions(n).find(a=>a.target==='4,6');n=applyLongDice(n,second.id);assert.equal(n.turn,'red');
});
test('royal capture freezes the surviving army, skips its turn and does not change the input',()=>{
 const s=position();put(s,'green','elephant',0,5);put(s,'red','pawn',2,4);const n=rolled(s,[4,4]),before=JSON.stringify(n);
 const captured=applyLongDice(n,longDiceActions(n).find(a=>a.target==='0,7').id);assert.equal(JSON.stringify(n),before);
 assert.ok(captured.frozenTeams.includes('red'));assert.equal(captured.royalCaptures.red,1);assert.equal(captured.board[2][4].team,'red');
 assert.equal(applyLongDice(captured,'end|control:end').turn,'blue');
});
test('partner capture unlocks one king return on any empty square, followed by mandatory second-move pass',()=>{
 const s=position('blue');s.board[0][7]=null;s.frozenTeams=['red'];s.royalCaptures.red=1;put(s,'red','pawn',2,4);put(s,'blue','elephant',0,3);
 let n=rolled(s,[4,4]);n=applyLongDice(n,longDiceActions(n).find(a=>a.target==='0,0').id);assert.ok(n.revivalAvailable.includes('red'));
 n=applyLongDice(n,'end|control:end');assert.equal(n.turn,'green');n=applyLongDice(n,'skip|control:skip');assert.equal(n.turn,'red');assert.ok(needsKingReturn(n));
 const drops=longDiceActions(n);assert.equal(drops.length,n.board.flat().filter(p=>!p).length);assert.ok(drops.every(a=>a.kind==='revive'));
 n=applyLongDice(n,'revive|control:revive|3,3');assert.equal(n.board[3][3].isRoyal,true);assert.equal(n.board[3][3].team,'red');assert.deepEqual(longDiceActions(n).map(a=>a.id),['end|control:end']);
 assert.throws(()=>applyLongDice(n,LONG_DICE_ACTION),/no longer legal/);assert.equal(applyLongDice(n,'end|control:end').turn,'blue');
});
test('a twice-captured royal cannot return; promoted fighter kings do not freeze an army',()=>{
 const s=position('blue');s.board[0][7]=null;s.frozenTeams=['red'];s.royalCaptures.red=2;put(s,'blue','elephant',0,3);
 let n=rolled(s,[4,4]);n=applyLongDice(n,longDiceActions(n).find(a=>a.target==='0,0').id);assert.ok(!n.revivalAvailable.includes('red'));
 const fighter=position();put(fighter,'red','king',4,6,false);put(fighter,'green','elephant',4,4);
 const r=rolled(fighter,[4,4]),after=applyLongDice(r,longDiceActions(r).find(a=>a.target==='4,6').id);assert.equal(after.royalCaptures.red,0);assert.ok(!after.frozenTeams.includes('red'));
});
test('allied captures remain forbidden, and a team wins only after both enemy royals fall',()=>{
 const s=position();put(s,'green','elephant',0,3);const n=rolled(s,[4,4]);assert.ok(!longDiceActions(n).some(a=>a.target==='0,0'));
 let a=applyLongDice(n,longDiceActions(n).find(a=>a.target==='0,7').id);assert.equal(a.gameOver,false);
 a.board[0][7]=null;put(a,'green','elephant',7,3);
 a=applyLongDice(a,longDiceActions(a).find(x=>x.target==='7,0').id);assert.equal(a.gameOver,true);assert.deepEqual(a.winningSeats,['green','yellow']);
});
test('bots use paired rolls, legal moves, king return and manual-pass actions without stalling',()=>{
 let s=createLongDiceGame({teamMode:'2v2'});
 for(let i=0;i<120&&!s.gameOver;i++){const id=chooseLongDiceBot(s);assert.ok(longDiceActions(s).some(a=>a.id===id));s=applyLongDice(s,id);}
 const p=position();assert.equal(chooseLongDiceBot(p),LONG_DICE_ACTION);const r=rolled(p,[2,3]);assert.equal(chooseLongDiceBot(r),'end|control:end');
 const legacy=createDominion();assert.equal(applyDominion(legacy,dominionActions(legacy).find(a=>a.kind==='skip')).turn,'red');
});
