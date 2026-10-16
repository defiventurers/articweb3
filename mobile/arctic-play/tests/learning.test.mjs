import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),e=require('../build/games.cjs'),l=require('../build/learning.cjs');

test('Every game has three solvable lessons; only canonical accepted moves complete them',()=>{
  for(const {id} of e.GAME_LIST)for(const kind of l.CHALLENGES){
    const p=l.lessonPosition(id,kind),before=JSON.stringify(p),legal=new Set(e.actions(id,p.state).map(a=>a.id));
    assert.ok(p.legal.length,`${id} ${kind}`);
    for(const a of p.legal)assert.ok(legal.has(a.id),`${id} ${kind}: real legal action`);
    for(const a of p.legal.filter((_,index)=>index===0||index===p.legal.length-1)){
      const next=l.acceptLesson(id,p,a.id);
      assert.ok(e.pieces(id,next).some(piece=>piece.source===a.source&&piece.cell===a.target)||a.kind==='drop',`${id} ${kind}: actual board transition`);
      if(kind==='capture')assert.ok(!e.pieces(id,next).some(piece=>piece.id===p.victim),`${id}: victim removed from board`);
      assert.equal(JSON.stringify(p),before,'a lesson position is immutable during validation');
    }
    assert.throws(()=>l.acceptLesson(id,p,'invented-move'),/highlighted/);
  }
});

test('Special lessons demonstrate actual drops, screened captures, Flag steps, Han control and dice usage',()=>{
  for(const id of ['shogi','sannin']){
    const p=l.lessonPosition(id,'special'),a=p.legal[0],next=l.acceptLesson(id,p,a.id);
    assert.equal(a.kind,'drop');assert.ok(e.pieces(id,next).some(piece=>piece.cell===a.target&&piece.owner==='red'));
  }
  for(const id of ['sanguo','xiangqi']){
    const p=l.lessonPosition(id,'special'),a=p.legal[0],noScreen=structuredClone(p.state);
    const screen=noScreen.pieces.find(piece=>id==='sanguo'?piece.node.sector==='red'&&piece.node.rank===2&&piece.node.file===3:piece.row===5&&piece.col===1);
    noScreen.pieces=noScreen.pieces.filter(piece=>piece.id!==screen.id);
    assert.ok(!e.actions(id,noScreen).some(candidate=>candidate.source===a.source&&candidate.target===a.target),'removing the single screen prevents this capture');
  }
  const flag=l.lessonPosition('sanyou','special');assert.equal(flag.legal[0].target,'red:L4-5');
  const han=l.lessonPosition('yanyi','special'),activated=l.acceptLesson('yanyi',han,han.legal[0].id);
  assert.equal(activated.hanOwner,'green');assert.equal(activated.activationUsed,true);assert.deepEqual(new Set(activated.alliance),new Set(['red','blue']));
  assert.equal(activated.pieces.filter(p=>p.origin==='han'&&p.owner==='green').length,4);
  const dice=l.lessonPosition('dominion','move'),moved=l.acceptLesson('dominion',dice,dice.legal[0].id);
  assert.equal(moved.dice.used[0],true);assert.equal(moved.dice.used[1],false);assert.equal(moved.turn,'green');
});

test('Every starting piece type has a guide and an engine-backed movement example, including the immobile Emperor',()=>{
  for(const {id} of e.GAME_LIST){
    const state=e.create(id),types=new Set(l.rawUnits(id,state).map(p=>l.unitRole(id,p)));
    assert.deepEqual(new Set(l.PIECE_GUIDES[id].map(p=>p[0])),types,`${id}: no starting piece type is missing`);
    for(const [role,name,move,note] of l.PIECE_GUIDES[id]){
      assert.ok(name&&move&&note);const p=l.piecePosition(id,role),legal=e.actions(id,p.state);
      if(id==='yanyi'&&role==='emperor')assert.equal(p.legal.length,0);
      else assert.ok(p.legal.length,`${id} ${role}: visible legal destinations`);
      for(const a of p.legal)assert.ok(legal.some(real=>real.id===a.id));
    }
  }
});

test('Free boards accept arbitrary on-board arrangements, swap occupied points and reject corrupt saved positions',()=>{
  for(const {id} of e.GAME_LIST){
    const initial=l.initialFreeBoard(id),first=initial[0],last=initial.at(-1),before=JSON.stringify(initial);
    const swapped=l.freeBoardMove(id,initial,first.source,last.cell);
    assert.equal(swapped.find(p=>p.id===first.id).cell,last.cell);assert.equal(swapped.find(p=>p.id===last.id).cell,first.cell);
    assert.equal(JSON.stringify(initial),before);assert.equal(swapped.length,initial.length);
    const minimal=swapped.map(({id,cell})=>({id,cell}));assert.deepEqual(l.initialFreeBoard(id,minimal),swapped);
    for(const invalid of [[{id:'fake',cell:first.cell}],[{id:first.id,cell:'outside'}],[{id:first.id,cell:first.cell},{id:last.id,cell:first.cell}]])assert.deepEqual(l.initialFreeBoard(id,invalid),initial);
    assert.throws(()=>l.freeBoardMove(id,initial,first.source,'outside'),/board/);
    assert.deepEqual(l.initialFreeBoard(id,[]),[],'an intentionally cleared board can stay cleared');
  }
});

test('Reading, skipping and free exploration cannot fabricate lesson completion',()=>{
  assert.deepEqual(l.learningProgress({shogi:{move:'read',capture:-2,special:Infinity},unknown:{move:12}}),{});
  const progress=l.recordLesson({},'shogi','capture',123);assert.deepEqual(progress,{shogi:{capture:123}});
  assert.deepEqual(l.recordLesson(progress,'shogi','free',456),progress);assert.deepEqual(l.recordLesson(progress,'unknown','move',456),progress);
  assert.deepEqual(l.recordLesson(progress,'shogi','capture',456),progress,'first completion is retained');
  assert.deepEqual(l.PRACTICE_LINKS,{},'an unprovided external URL is not invented');
});
