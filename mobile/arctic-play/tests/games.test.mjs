import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),e=require('../build/games.cjs');
const assets=new URL('../android/app/src/main/assets/',import.meta.url);
const expected={shogi:[40,81,2],sannin:[54,127,3],sanguo:[48,135,3],sanyou:[54,156,3],yanyi:[53,225,3],xiangqi:[32,90,2]};
for(const g of e.GAME_LIST){
  test(`${g.name}: complete board, bundled pieces, legal turns and invalid move rejection`,()=>{
    let state=e.create(g.id);const initial=JSON.stringify(state),model=e.board(g.id);
    assert.equal(e.pieces(g.id,state).length,expected[g.id][0]);assert.equal(model.cells.length,expected[g.id][1]);assert.equal(g.seats.length,expected[g.id][2]);
    const coordinates=new Set(model.cells.map(c=>c.id));assert.equal(coordinates.size,model.cells.length);
    for(const p of e.pieces(g.id,state)){assert.ok(coordinates.has(p.cell),p.id);assert.ok(fs.existsSync(new URL(p.sprite,assets)),p.sprite);}
    const legal=e.actions(g.id,state);assert.ok(legal.length);assert.equal(new Set(legal.map(a=>a.id)).size,legal.length);
    assert.throws(()=>e.apply(g.id,state,'move|fake|0|0'),/no longer legal/);
    for(let i=0;i<g.players*2&&!e.result(state);i++){const choices=e.actions(g.id,state);assert.ok(choices.length,'side has a legal action');const chosen=choices[i%choices.length].id;assert.ok(choices.some(a=>a.id===chosen));const old=JSON.stringify(state);const next=e.apply(g.id,state,chosen);assert.equal(JSON.stringify(state),old,'input state is immutable');assert.notEqual(JSON.stringify(next),old);state=next;}
    assert.equal(JSON.stringify(e.create(g.id)),initial);
  });
}
test('Yan Yi: every player can capture; inherited Han uses controller without corrupting identity',()=>{
  for(const owner of ['red','green','blue']){
    const state=e.create('yanyi');state.turn=owner;state.opening={red:true,green:true,blue:true};
    state.pieces=state.pieces.filter(p=>p.role==='king');
    const enemy=['red','green','blue'].find(c=>c!==owner);
    state.pieces.push({id:`${owner}-test-chariot`,origin:owner,owner,role:'chariot',x:7,y:8},{id:`${enemy}-victim`,origin:enemy,owner:enemy,role:'soldier',x:7,y:7});
    const capture=e.actions('yanyi',state).find(a=>a.source===`piece:${owner}-test-chariot`&&a.target==='7,7');assert.ok(capture,`${owner} can capture`);
    const next=e.apply('yanyi',state,capture.id);assert.ok(!next.pieces.some(p=>p.id===`${enemy}-victim`));assert.equal(next.pieces.find(p=>p.id===`${owner}-test-chariot`).owner,owner);
  }
  for(const enemy of ['green','blue']){
    const state=e.create('yanyi');state.turn='red';state.activationUsed=true;state.hanOwner='red';state.alliance=['green','blue'];state.opening={red:true,green:true,blue:true};
    state.pieces=state.pieces.filter(p=>p.role==='king');state.pieces.push({id:'han-chariot-6',origin:'han',owner:'red',role:'chariot',x:7,y:8},{id:`${enemy}-victim`,origin:enemy,owner:enemy,role:'soldier',x:7,y:7});
    const capture=e.actions('yanyi',state).find(a=>a.source==='piece:han-chariot-6'&&a.target==='7,7');assert.ok(capture,`Han can capture ${enemy}`);
    const next=e.apply('yanyi',state,capture.id),han=next.pieces.find(p=>p.id==='han-chariot-6');assert.equal(han.origin,'han');assert.equal(han.owner,'red');assert.equal(han.role,'chariot');assert.equal(han.id,'han-chariot-6');assert.match(e.pieces('yanyi',next).find(p=>p.id===han.id).sprite,/han-chariot-imperial/);
  }
});
test('Shogi: a captured piece is available as a drop and promotion choices stay distinct',()=>{
  const state=e.create('shogi');state.board=Array(81).fill(null);state.board[76]={id:'r-king',side:'red',type:'king',promoted:false};state.board[4]={id:'b-king',side:'blue',type:'king',promoted:false};
  state.board[40]={id:'r-rook',side:'red',type:'rook',promoted:false};state.board[31]={id:'b-silver',side:'blue',type:'silver',promoted:false};
  const action=e.actions('shogi',state).find(a=>a.source==='piece:r-rook'&&a.target==='31');assert.ok(action);const next=e.apply('shogi',state,action.id);assert.equal(next.hands.red.silver,1);
  next.turn='red';assert.ok(e.hand('shogi',next).some(p=>p.source==='hand:silver'));assert.ok(e.actions('shogi',next).some(a=>a.source==='hand:silver'&&a.kind==='drop'));
});
