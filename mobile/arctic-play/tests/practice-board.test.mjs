import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const r=createRequire(import.meta.url),e=r('../build/games.cjs'),p=r('../build/practiceBoard.cjs'),l=r('../build/learning.cjs'),c=r('../build/curriculum.cjs');
const key=a=>a.target+'|'+!!a.promote;
test('All seven practice boards start empty; stock uses the real pieces and placement cannot overwrite or duplicate',()=>{
 for(const{id}of e.GAME_LIST){
  const empty=p.emptyPractice(id),stock=p.practiceStock(id);assert.equal(e.pieces(id,empty).length,0);assert.equal(stock.length,e.pieces(id,e.create(id)).length);
  const first=stock[0],placed=p.placePracticePiece(id,empty,first.id,first.cell);assert.equal(placed.units.length,1);assert.equal(e.pieces(id,empty).length,0);
  assert.throws(()=>p.placePracticePiece(id,placed.state,first.id,e.board(id).cells.find(c=>c.id!==first.cell).id),/already/);
  assert.throws(()=>p.placePracticePiece(id,placed.state,stock[1].id,first.cell),/empty/);
  assert.throws(()=>p.placePracticePiece(id,empty,'invented',first.cell),/list/);
  assert.throws(()=>p.placePracticePiece(id,empty,first.id,'outside'),/board/);
  assert.throws(()=>p.movePracticePiece(id,placed.state,first.source,'invented'),/not allowed/);
 }
});
test('Practice targets match canonical match movement with complete armies, for every seat of all seven games',()=>{
 for(const definition of e.GAME_LIST){
  const id=definition.id;let state=p.emptyPractice(id);
  for(const unit of p.practiceStock(id))state=p.placePracticePiece(id,state,unit.id,unit.cell).state;
  for(const seat of definition.seats){
   const query=structuredClone(state);query.turn=seat;
   if(id==='dominion')query.currentPlayerIndex=['green','red','blue','yellow'].indexOf(seat);
   for(const unit of e.pieces(id,state).filter(u=>u.owner===seat)){
    if(id==='dominion'){const raw=l.rawUnits(id,state).find(p=>p.id===unit.id),die={king:1,pawn:1,elephant:2,horse:3,ship:4}[raw.type];query.dice={rolled:true,values:[die,6],used:[false,true]};}
    const actual=new Set(p.practiceActions(id,state,unit.source).map(key));
    const expected=new Set(e.actions(id,query).filter(a=>a.source===unit.source&&a.kind==='move').map(key));
    assert.deepEqual(actual,expected,id+'/'+seat+'/'+unit.label);
   }
  }
 }
});
test('A placed Shogi Rook cannot teleport, cross a blocker, capture a friend or jump past a captured rival',()=>{
 const stock=p.practiceStock('shogi'),rook=stock.find(u=>u.role==='rook'&&u.owner==='red'),friend=stock.find(u=>u.role==='pawn'&&u.owner==='red'),foe=stock.find(u=>u.role==='pawn'&&u.owner==='blue');
 let state=p.emptyPractice('shogi');for(const[u,cell]of [[rook,'40'],[friend,'31'],[foe,'22']])state=p.placePracticePiece('shogi',state,u.id,cell).state;
 let legal=p.practiceActions('shogi',state,rook.source);assert.ok(!legal.some(a=>['31','22','13','30'].includes(a.target)));
 assert.throws(()=>p.movePracticePiece('shogi',state,rook.source,`practice|${rook.source}|22|0`),/not allowed/);
 state=p.removePracticePiece('shogi',state,friend.source).state;legal=p.practiceActions('shogi',state,rook.source);
 assert.ok(legal.some(a=>a.target==='22'));assert.ok(!legal.some(a=>a.target==='13'));
 const next=p.movePracticePiece('shogi',state,rook.source,legal.find(a=>a.target==='22'&&!a.promote).id);
 assert.equal(next.units.length,1);assert.equal(next.units[0].cell,'22');assert.equal(next.captured,true);
});
test('Xiangqi Horse legs and Cannon screens remain effective with freely placed pieces',()=>{
 const stock=p.practiceStock('xiangqi'),find=(role,side)=>stock.find(u=>u.role===role&&u.owner===side);
 const horse=find('horse','red'),friend=find('soldier','red'),foe=find('soldier','black'),cannon=find('cannon','red');
 let state=p.emptyPractice('xiangqi');state=p.placePracticePiece('xiangqi',state,horse.id,'7,4').state;state=p.placePracticePiece('xiangqi',state,friend.id,'6,4').state;
 assert.ok(!p.practiceActions('xiangqi',state,horse.source).some(a=>a.target==='5,5'));
 state=p.removePracticePiece('xiangqi',state,friend.source).state;assert.ok(p.practiceActions('xiangqi',state,horse.source).some(a=>a.target==='5,5'));
 state=p.emptyPractice('xiangqi');for(const[u,cell]of [[cannon,'5,4'],[friend,'4,4'],[foe,'1,4']])state=p.placePracticePiece('xiangqi',state,u.id,cell).state;
 assert.ok(p.practiceActions('xiangqi',state,cannon.source).some(a=>a.target==='1,4'));
 state=p.removePracticePiece('xiangqi',state,friend.source).state;assert.ok(!p.practiceActions('xiangqi',state,cannon.source).some(a=>a.target==='1,4'));
});
test('Promotion changes subsequent practice moves and Han activation keeps yellow artwork with correct control',()=>{
 const pawn=p.practiceStock('shogi').find(u=>u.role==='pawn'&&u.owner==='red');let state=p.placePracticePiece('shogi',p.emptyPractice('shogi'),pawn.id,'9').state;
 const legal=p.practiceActions('shogi',state,pawn.source).filter(a=>a.target==='0');assert.equal(legal.length,1);assert.equal(legal[0].promote,true);
 let next=p.movePracticePiece('shogi',state,pawn.source,legal[0].id);assert.ok(next.legal.some(a=>a.target==='9'));assert.match(next.units[0].label,/Tokin|promot/i);
 const lesson=l.lessonPosition('yanyi','special'),action=lesson.legal[0],canonical=e.apply('yanyi',lesson.state,action.id),move=p.practiceActions('yanyi',lesson.state,action.source).find(a=>a.target===action.target);
 next=p.movePracticePiece('yanyi',lesson.state,action.source,move.id);assert.equal(next.state.hanOwner,canonical.hanOwner);assert.deepEqual(next.state.alliance,canonical.alliance);
 assert.deepEqual(next.state.pieces.filter(p=>p.origin==='han'),canonical.pieces.filter(p=>p.origin==='han'));
 assert.ok(next.units.filter(p=>p.origin==='han').every(p=>p.owner==='red'&&p.sprite.includes('/han-')));
});
test('Full-rule completion counts validated practice, persists per game and reaches 100% only for all known steps',()=>{
 for(const{id}of e.GAME_LIST){const cards=c.courseCards(id),read=Object.fromEntries(cards.map(x=>[x.key,123]));assert.equal(c.courseCompletion(id,{read}).percent,0);const practiced={...read,invented:123};assert.equal(c.courseCompletion(id,{practiced}).percent,100);delete practiced[cards.at(-1).key];assert.ok(c.courseCompletion(id,{practiced}).percent<100);assert.equal(c.courseCompletion(id,{practiced:{[cards[0].key]:123}}).done,1);}
 assert.ok(c.courseCards('dominion').some(c=>c.cue.includes('Green + Pink')));
});
