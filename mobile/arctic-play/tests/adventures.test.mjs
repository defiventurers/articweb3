import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),e=require('../build/games.cjs'),a=require('../build/adventures.cjs'),l=require('../build/learning.cjs');
const start=(id,key,variant)=>a.adventurePosition(id,key,variant);
const finish=(id,key,variant)=>{let p=start(id,key,variant);const ids=[];while(!p.complete&&p.legal.length){ids.push(p.legal[0].id);p=a.adventurePosition(id,key,variant,ids);}return p;};

test('All 28 discoveries have solvable, immutable engine-backed snapshots; comparisons never invent a legal move',()=>{
  const keys=new Set();let solved=0;
  for(const {id} of e.GAME_LIST){
    const story=a.ADVENTURES[id];assert.equal(story.missions.length,4);assert.ok(story.title&&story.welcome&&story.stamp);
    for(const m of story.missions){
      assert.ok(!keys.has(`${id}:${m.key}`));keys.add(`${id}:${m.key}`);assert.ok(m.task&&m.why&&m.after&&m.hint);let possible=false;
      for(const [variant] of m.variants||[['default']]){
        const p=start(id,m.key,variant),before=JSON.stringify(p),legal=new Set(e.actions(id,p.state).map(a=>a.id));
        for(const action of p.legal){assert.ok(legal.has(action.id),`${id}/${m.key}/${variant}: real action`);assert.equal(action.source,p.focus);}
        for(const marker of p.notice||[])assert.ok(e.board(id).cells.some(c=>c.id===marker.cell));
        if(p.legal.length){assert.ok(finish(id,m.key,variant).complete,`${id}/${m.key}: can finish`);possible=true;}
        assert.equal(JSON.stringify(p),before);assert.throws(()=>a.adventurePosition(id,m.key,variant,['invented-action']),/highlighted/);
      }
      assert.ok(possible,`${id}/${m.key}: at least one solvable setup`);solved++;
    }
  }
  assert.equal(solved,28);
});

test('Comparison switches expose actual screen, leg, river, Flag and terrain differences',()=>{
  for(const [id,key] of [['sanguo','one-screen'],['xiangqi','cannon-bridge']])for(const v of ['zero','one','two'])assert.equal(start(id,key,v).legal.length,v==='one'?1:0);
  for(const [id,key] of [['sanguo','clear-leg'],['xiangqi','horse-door'],['sanyou','flag-path']]){assert.equal(start(id,key,'blocked').legal.length,0);assert.ok(start(id,key,'clear').legal.length);}
  assert.equal(start('xiangqi','river-passport','home').legal.length,0);assert.ok(start('xiangqi','river-passport','across').legal.length);
  assert.equal(start('sanyou','terrain-lines','chariot').legal.length,0);assert.ok(start('sanyou','terrain-lines','cannon').legal.length);
  for(const [id,key] of [['yanyi','leaping-horse'],['dominion','icebreaker-hop']])assert.deepEqual(start(id,key,'occupied').legal.map(a=>a.target),start(id,key,'clear').legal.map(a=>a.target));
  assert.equal(e.inCheck('xiangqi',start('xiangqi','palace-home','open').state),true);assert.equal(e.inCheck('xiangqi',start('xiangqi','palace-home','closed').state),false);
});

test('Unique outcomes are real: promotion, royal safety, three rotated homes, Garden, transferred ownership, Han and allies',()=>{
  const promoted=finish('shogi','golden-pawn').state;assert.ok(promoted.board.some(p=>p?.side==='red'&&p.type==='pawn'&&p.promoted));
  const checked=start('shogi','king-shelter');assert.ok(e.inCheck('shogi',checked.state));const safe=finish('shogi','king-shelter').state;safe.turn='red';assert.equal(e.inCheck('shogi',safe),false);
  for(const seat of ['red','green','blue']){const p=start('sannin','two-forwards',seat);assert.equal(p.state.turn,seat);assert.equal(p.legal.length,2);assert.equal(e.pieces('sannin',p.state).find(p=>p.source===start('sannin','two-forwards',seat).focus).owner,seat);}
  assert.equal(finish('sannin','garden-visit').state.outcome.type,'garden');
  const inherited=start('sanguo','owner-ring'),piece=e.pieces('sanguo',inherited.state).find(p=>p.source===inherited.focus);assert.equal(piece.owner,'red');assert.equal(piece.origin,'green');assert.ok(inherited.state.defeated.includes('green'));
  const han=finish('yanyi','wake-han').state;assert.equal(han.hanOwner,'green');assert.deepEqual(new Set(han.alliance),new Set(['red','blue']));assert.equal(han.pieces.filter(p=>p.origin==='han'&&p.owner==='green').length,4);
  const allies=start('yanyi','allied-colours');assert.ok(!e.actions('yanyi',allies.state).some(a=>a.source===allies.focus&&a.target==='8,9'));assert.ok(allies.legal.some(a=>a.target==='10,8'));
});

test('Arctic Dominion teaches a whole two-dice turn and the difference between a royal King and an ordinary capture',()=>{
  const p=start('dominion','two-dice'),first=p.legal[0],half=a.adventurePosition('dominion','two-dice','default',[first.id]);
  assert.equal(half.complete,false);assert.equal(half.state.turn,'green');assert.deepEqual(half.state.dice.used,[true,false]);assert.ok(half.legal.every(a=>a.raw.dieIndex===1));
  const done=a.adventurePosition('dominion','two-dice','default',[first.id,half.legal[0].id]);assert.equal(done.complete,true);assert.equal(done.state.turn,'red');
  const eliminated=finish('dominion','royal-watch').state;assert.ok(eliminated.eliminatedTeams.includes('red'));assert.ok(!eliminated.board.flat().some(p=>p?.team==='red'));assert.equal(eliminated.gameOver,false);
  assert.ok(!finish('dominion','guard-nibble').state.eliminatedTeams.length);
});

test('Adventure stamps validate known games and missions, retain first completion and leave legacy learning data intact',()=>{
  const invalid={unknown:{fake:123},shogi:{'pawn-catch':'watched','helper-drop':-1,'golden-pawn':Infinity,fake:123}};assert.deepEqual(a.adventureProgress(invalid),{});
  const old={shogi:{move:123,capture:456}},copy=JSON.stringify(old);const saved=a.recordAdventure(invalid,'shogi','pawn-catch',123);assert.deepEqual(saved,{shogi:{'pawn-catch':123}});
  assert.deepEqual(a.recordAdventure(saved,'shogi','pawn-catch',456),saved);assert.throws(()=>a.recordAdventure(saved,'shogi','wake-han',567),/discovery/);assert.throws(()=>start('yanyi','wake-han','invented'),/setups/);
  assert.deepEqual(l.learningProgress(old),old);assert.equal(JSON.stringify(old),copy);
});
