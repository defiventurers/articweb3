import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),e=require('../build/games.cjs'),canonical=require('../../../server/gameRules.js');
const stripped=board=>board.map(row=>row.map(p=>{if(!p)return null;const {id,...piece}=p;return piece;}));
function position(units=[],values=[1,1],team='green'){
  const state=e.create('dominion');state.board=Array.from({length:8},()=>Array(8).fill(null));
  for(const [seat,row,col] of [['green',7,4],['red',4,0],['blue',3,7],['yellow',0,3]])state.board[row][col]={id:`${seat}-royal`,team:seat,type:'king',isRoyal:true};
  for(const [row,col,piece] of units)state.board[row][col]=piece;
  state.currentPlayerIndex=canonical.PLAYERS.indexOf(team);state.turn=team;
  state.dice={rolled:true,values,used:[false,false]};return state;
}
const unit=(id,type,team='green',isRoyal=false)=>({id,type,team,isRoyal});

test('Arctic Dominion retains the original four armies, Pink artwork and royal identity',()=>{
  const state=e.create('dominion');assert.deepEqual(stripped(state.board),canonical.createInitialGameState().board);
  assert.deepEqual(e.game('dominion').seats,canonical.PLAYERS);assert.equal(e.turn(state),'green');
  assert.equal(e.seatName('dominion','yellow'),'Pink');assert.equal(e.pieces('dominion',state).filter(p=>p.label.includes('(royal)')).length,4);
  assert.ok(e.pieces('dominion',state).filter(p=>p.owner==='yellow').every(p=>p.sprite.includes('/pink-')));
  assert.deepEqual(e.actions('dominion',state).map(a=>a.kind),['roll']);assert.equal(e.inCheck('dominion',state),false);
});

test('All die faces match canonical legal moves and keep both activation choices',()=>{
  for(let die=1;die<=6;die++){
    const state=position([[4,4,unit('mammoth','elephant')],[4,5,unit('unicorn','horse')],[5,4,unit('ship','ship')],[5,5,unit('guard','pawn')]], [die,die]);
    const actual=e.actions('dominion',state).filter(a=>a.kind==='move');
    const expected=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(state.board[r][c]?.team==='green')expected.push(...canonical.selectSquare(state,r,c).legalMoves);
    assert.deepEqual(actual.map(a=>a.raw),expected);assert.ok(actual.length>0);assert.ok(actual.every(a=>canonical.DICE_ROLLS[die].includes(state.board[a.raw.fromRow][a.raw.fromCol].type)));
    assert.equal(new Set(actual.map(a=>a.id)).size,actual.length);
    assert.ok(actual.some(a=>a.raw.dieIndex===0));assert.ok(actual.some(a=>a.raw.dieIndex===1));
  }
});

test('Rolls use unbiased runtime entropy, cannot be forged or rerolled, and spend each die once',t=>{
  const bytes=[255,0,2];t.mock.method(globalThis.crypto,'getRandomValues',array=>{array[0]=bytes.shift()??0;return array;});
  const initial=e.create('dominion'),rolled=e.apply('dominion',initial,'roll|control:roll');
  assert.deepEqual(rolled.dice.values,[1,3]);assert.deepEqual(initial.dice.values,[null,null]);
  assert.throws(()=>e.apply('dominion',initial,'roll|control:roll|6,6'),/no longer legal/);
  assert.throws(()=>e.apply('dominion',rolled,'roll|control:roll'),/no longer legal/);
  assert.ok(!e.actions('dominion',rolled).some(a=>a.kind==='end'),'available moves cannot be skipped');
  const first=e.actions('dominion',rolled).find(a=>a.raw.dieIndex===0),next=e.apply('dominion',rolled,first.id);
  assert.equal(next.dice.used[0],true);assert.equal(e.turn(next),'green');
  assert.ok(e.actions('dominion',next).every(a=>a.raw.dieIndex===1));assert.throws(()=>e.apply('dominion',next,first.id),/no longer legal/);
  const second=e.actions('dominion',next)[0],ended=e.apply('dominion',next,second.id);
  assert.equal(e.turn(ended),'red');assert.equal(ended.dice.rolled,false);
});

test('An unusable original roll passes automatically, including after one consumed die',t=>{
  t.mock.method(globalThis.crypto,'getRandomValues',array=>{array[0]=1;return array;});
  const state=e.create('dominion'),skipped=e.apply('dominion',state,e.actions('dominion',state)[0].id);
  assert.equal(e.turn(skipped),'red');assert.equal(skipped.dice.rolled,false);assert.equal(skipped.mobileLastRoll.skipped,true);assert.deepEqual(skipped.mobileLastRoll.values,[2,2]);
  const partial=position([], [1,2]);const move=e.actions('dominion',partial).find(a=>a.raw.dieIndex===0),next=e.apply('dominion',partial,move.id);
  assert.equal(e.turn(next),'red');assert.equal(next.dice.rolled,false,'missing Mammoth cannot consume the remaining die');
});

test('The Unicorn and Icebreaker jump while Mammoths stop at blockers and Guards capture diagonally',()=>{
  let state=position([[4,4,unit('ship','ship')],[3,3,unit('block','pawn')]], [4,6]);
  assert.ok(e.actions('dominion',state).some(a=>a.source==='piece:ship'&&a.target==='2,2'));
  assert.ok(!e.actions('dominion',state).some(a=>a.source==='piece:ship'&&a.target==='3,3'));
  state=position([[4,4,unit('unicorn','horse')],[3,4,unit('block','pawn')]], [3,3]);
  assert.ok(e.actions('dominion',state).some(a=>a.source==='piece:unicorn'&&a.target==='2,3'));
  state=position([[4,4,unit('mammoth','elephant')],[4,5,unit('friend','pawn')],[4,2,unit('enemy','pawn','red')]], [2,2]);
  assert.ok(e.actions('dominion',state).some(a=>a.source==='piece:mammoth'&&a.target==='4,2'));
  assert.ok(!e.actions('dominion',state).some(a=>a.source==='piece:mammoth'&&['4,1','4,5','4,6'].includes(a.target)));
  state=position([[4,4,unit('guard','pawn')],[3,3,unit('diagonal','pawn','red')],[3,4,unit('straight','pawn','red')]], [1,1]);
  assert.ok(e.actions('dominion',state).some(a=>a.source==='piece:guard'&&a.target==='3,3'));
  assert.ok(!e.actions('dominion',state).some(a=>a.source==='piece:guard'&&a.target==='3,4'));
});

test('Guard promotion keeps a stable ID; a promoted King does not eliminate its kingdom',()=>{
  const state=position([[1,4,unit('guard','pawn')]], [1,1]);const promotion=e.actions('dominion',state).find(a=>a.source==='piece:guard'&&a.target==='0,4');
  const promoted=e.apply('dominion',state,promotion.id);assert.equal(promoted.board[0][4].id,'guard');assert.equal(promoted.board[0][4].type,'king');assert.equal(promoted.board[0][4].isRoyal,false);
  const captureState=position([[4,4,unit('mammoth','elephant')],[4,5,unit('fighter','king','red',false)]], [2,2]);
  const move=e.actions('dominion',captureState).find(a=>a.source==='piece:mammoth'&&a.target==='4,5'),next=e.apply('dominion',captureState,move.id);
  assert.ok(next.board[4][0]?.isRoyal);assert.ok(!next.eliminatedTeams.includes('red'));assert.equal(e.result(next),null);
});

test('Royal capture removes the defeated army, skips its turn and ends on the final royal',()=>{
  const state=position([[4,3,unit('mammoth','elephant')],[2,2,unit('red-fighter','king','red',false)]], [2,2]);
  const move=e.actions('dominion',state).find(a=>a.source==='piece:mammoth'&&a.target==='4,0'),next=e.apply('dominion',state,move.id);
  assert.ok(next.board.flat().every(p=>p?.team!=='red'));assert.deepEqual(next.eliminatedTeams,['red']);
  next.dice.used=[true,true];assert.equal(e.turn(e.apply('dominion',next,'end|control:end')),'blue');
  const final=position([[4,3,unit('mammoth','elephant')]], [2,2]);final.board[3][7]=null;final.board[0][3]=null;
  const win=e.apply('dominion',final,e.actions('dominion',final).find(a=>a.source==='piece:mammoth'&&a.target==='4,0').id);
  assert.equal(e.result(win).winner,'green');assert.deepEqual(e.actions('dominion',win),[]);
});

test('Casual bots complete dice phases for all four kingdoms without changing canonical legality',()=>{
  let state=e.create('dominion');const seen=new Set();
  for(let i=0;i<60&&!e.result(state);i++){
    seen.add(e.turn(state));const action=e.chooseBot('dominion',state);assert.ok(e.actions('dominion',state).some(a=>a.id===action));state=e.apply('dominion',state,action);
  }
  assert.deepEqual([...seen].sort(),['blue','green','red','yellow']);
});
