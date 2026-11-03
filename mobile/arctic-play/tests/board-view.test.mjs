import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),e=require('../build/games.cjs'),v=require('../build/boardView.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

for(const game of e.GAME_LIST){
 test(`${game.name}: every army starts below the others and its opening pawns advance upward`,()=>{
  for(const seat of game.seats){
   const state=e.create(game.id);state.turn=seat;
   if(game.id==='dominion'){state.currentPlayerIndex=game.seats.indexOf(seat);state.dice={rolled:true,values:[1,1],used:[false,false]};}
   const view=v.boardGeometry(game.id,seat),cells=new Map(view.cells.map(c=>[c.id,c])),units=e.pieces(game.id,state);
   const average=side=>units.filter(p=>p.owner===side).reduce((n,p,_,all)=>n+cells.get(p.cell).y/all.length,0);
   for(const other of game.seats.filter(s=>s!==seat))assert.ok(average(seat)>average(other),seat+' below '+other);
   const pawns=units.filter(p=>p.owner===seat&&/pawn|soldier|scout|snow guard/i.test(p.label));
   const moves=e.actions(game.id,state).filter(a=>a.target&&pawns.some(p=>p.source===a.source));
   assert.ok(moves.length,seat+' has opening pawn moves');
   let forward=0;
   for(const move of moves){const from=cells.get(units.find(p=>p.source===move.source).cell),to=cells.get(move.target);assert.ok(to.y<=from.y+1e-7,seat+' never advances down');if(to.y<from.y-1)forward++;}
   assert.ok(forward,seat+' advances upward');
   for(const unit of units.filter(p=>p.owner===seat))assert.equal(v.pieceRotation(unit,view.angle),0,seat+' artwork faces upright');
  }
 });

 test(`${game.name}: every rotated cell retains its identity, board alignment, distances and full tap area`,()=>{
  const original=e.board(game.id),[x,y,w,h]=original.viewBox.split(' ').map(Number),cx=x+w/2,cy=y+h/2;
  for(const seat of game.seats){
   const view=v.boardGeometry(game.id,seat),[left,top,width,height]=view.viewBox.split(' ').map(Number),a=view.angle*Math.PI/180;
   assert.deepEqual(view.cells.map(c=>c.id),original.cells.map(c=>c.id));
   for(const [i,cell]of view.cells.entries()){
    const source=original.cells[i];close(cx+(cell.x-cx)*Math.cos(-a)-(cell.y-cy)*Math.sin(-a),source.x);close(cy+(cell.x-cx)*Math.sin(-a)+(cell.y-cy)*Math.cos(-a),source.y);
    assert.ok(cell.x-view.size/2>=left-1e-7&&cell.x+view.size/2<=left+width+1e-7,seat+' horizontal bounds '+cell.id);
    assert.ok(cell.y-view.size/2>=top-1e-7&&cell.y+view.size/2<=top+height+1e-7,seat+' vertical bounds '+cell.id);
    if(i){const before=original.cells[i-1],after=view.cells[i-1];close(Math.hypot(cell.x-after.x,cell.y-after.y),Math.hypot(source.x-before.x,source.y-before.y));}
   }
  }
 });

 test(`${game.name}: views do not alter game state, actions, captures or later camera positions`,t=>{
  if(game.id==='dominion')t.mock.method(globalThis.crypto,'getRandomValues',a=>{a.fill(0);return a;});
  const initialViews=new Map(game.seats.map(seat=>[seat,v.boardGeometry(game.id,seat)]));
  let state=e.create(game.id);
  for(let n=0;n<game.players*2;n++){
   const before=JSON.stringify(state),legal=e.actions(game.id,state),action=legal.find(a=>a.target)||legal[0];
   assert.ok(action);
   const expected=e.apply(game.id,state,action.id);
   for(const seat of game.seats){v.boardGeometry(game.id,seat);assert.equal(JSON.stringify(state),before);assert.deepEqual(e.actions(game.id,state),legal);assert.deepEqual(e.apply(game.id,state,action.id),expected);assert.deepEqual(v.boardGeometry(game.id,seat),initialViews.get(seat));}
   state=expected;
  }
 });
}

test('Online seats and bot practice stay fixed through all turns; a shared phone follows the active army',()=>{
 for(const game of e.GAME_LIST)for(const seat of game.seats)for(const turn of game.seats){
  assert.equal(v.matchPerspective({id:game.id,online:true,seat,turn,mode:'hotseat',humans:game.seats}),seat);
  assert.equal(v.matchPerspective({id:game.id,mode:'bots',humans:[seat],turn}),seat);
  assert.equal(v.matchPerspective({id:game.id,mode:'hotseat',humans:game.seats,turn}),turn);
 }
 assert.equal(v.viewSeat('xiangqi','blue'),'black');assert.equal(v.viewSeat('dominion','pink'),'yellow');
 assert.equal(v.viewSeat('yanyi','han'),'red');assert.equal(v.viewSeat('sannin','missing'),'red');
});

test('Readability: round tokens remain upright and zero-degree wedges still follow the camera',()=>{
 assert.equal(v.pieceRotation({rotation:0},180),180);
 assert.equal(v.pieceRotation({rotation:180},180),0);
 assert.equal(v.pieceRotation({rotation:-120},120),0);
 assert.equal(v.pieceRotation({rotation:120},-120),0);
 for(const angle of [0,90,120,180,-90,-120])assert.equal(v.pieceRotation({},angle),0);
});
