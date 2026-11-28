const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createFairPlayService}=require('../fairPlayService');
const engine=require('../fairPlayEngine.cjs');
const manifest=require('../../shared/fair-play/rules-manifest.json');

async function fixture(t,changeHeader=()=>{}) {
  const core=await import('../../shared/fair-play/core.js');
  const server=await core.generateKey(),keys=await Promise.all(engine.game('shogi').seats.map(()=>core.generateKey()));
  const room={tableId:'shogi',matchId:'28ba2c00-b7ba-4dfc-a5df-257361653700',fairEnabled:true,gameState:engine.create('shogi'),players:{}};
  for(const [n,seat] of engine.game('shogi').seats.entries())room.players['actor'+n]={id:'actor'+n,seat,bot:false,fairKey:keys[n].publicKey};
  const service=createFairPlayService({engine,privateKey:server.privateKey,trustedKeys:[server.publicKey],anchor:{config:()=>({configured:false,chainId:46630,registry:null})}});
  t.after(()=>service.close());
  await service.start(room);
  changeHeader(room.fair.bundle.header);
  room.fair.bundle=await core.makeHeader(room.fair.bundle.header,server.privateKey);
  const actor=Object.values(room.players).find(p=>p.seat===engine.turn(room.gameState));
  const actionId=engine.actions('shogi',room.gameState)[0].id;
  const signed=await core.makeIntent({bundle:room.fair.bundle,actor:actor.id,actionId,before:room.gameState},keys[Number(actor.id.slice(5))].privateKey);
  let runs=0;
  return {core,room,service,run:()=>service.apply(room,{signed,actorId:actor.id,actionId,run:()=>{runs++;return engine.apply('shogi',room.gameState,actionId);}}),runs:()=>runs};
}

test('restored historical, unknown and wrong-version proofs remain unchanged on attempted continuation',async t=>{
  for(const [name,change] of [
    ['historical',h=>h.rulesHash='63845f4daef97f9721ccecd9cb3c7ef363842835a2566f8f48c7e515863cd952'],
    ['unknown',h=>h.rulesHash='0'.repeat(64)],
    ['wrong version',h=>h.rulesVersion='unpublished-version'],
    ['wrong protocol',h=>h.protocol='unpublished-protocol'],
  ])await t.test(name,async t=>{
    const f=await fixture(t,change),before=f.core.canonical(f.room);
    await assert.rejects(f.run,e=>e.status===409&&/original published rules/.test(e.message));
    assert.equal(f.runs(),0,'must reject before gameplay, beacon or receipt mutation');
    assert.equal(f.core.canonical(f.room),before);
    assert.equal(f.service.bundle(f.room),f.room.fair.bundle,'export remains available');
  });
});

test('an exact current authority continues; rotation cannot append receipts with the wrong server key',async t=>{
  const valid=await fixture(t);
  await valid.run();
  assert.equal(valid.runs(),1);
  assert.equal(valid.room.fair.bundle.header.rulesHash,manifest.rulesHash);
  assert.equal(valid.room.fair.bundle.events.length,1);
  const next=await valid.core.generateKey();
  const old=await fixture(t,h=>{h.serverPublicKey=next.publicKey;});
  const before=old.core.canonical(old.room);
  await assert.rejects(old.run,e=>e.status===409&&/original recording key/.test(e.message));
  assert.equal(old.runs(),0);
  assert.equal(old.core.canonical(old.room),before);
});

test('restoring an unsupported signed bot room preserves its state and never schedules repeated work',async t=>{
  const {createArcticPlayService}=require('../arcticPlayService');
  const gameplay=require('../arcticPlayGames.cjs');
  const core=await import('../../shared/fair-play/core.js'),key=await core.generateKey();
  const rooms=new Map(),scheduled=[];
  const original=setTimeout;
  t.mock.method(global,'setTimeout',(fn,delay,...args)=>{
    if(delay===550){scheduled.push(fn);return {unref(){}};}
    return original(fn,delay,...args);
  });
  const service=createArcticPlayService({rooms,requireLogin:false,accessOptions:{requireAccount:false},send(){},ok(){},fail(){},fairOptions:{privateKey:key.privateKey,trustedKeys:[key.publicKey],anchor:{config:()=>({configured:false,chainId:46630})}}});
  t.after(()=>service.close());
  for(const allBots of [false,true]){
    const room={roomCode:'RESTOR',gameId:'arctic-play',tableId:'shogi',rulesetVersion:gameplay.VERSION,status:'playing',revision:9,gameState:gameplay.create('shogi'),players:{bot:{id:'bot',seat:'red',bot:true},human:{id:'human',seat:'blue',bot:allBots}},fair:{bundle:{header:{protocol:manifest.protocol,rulesHash:'63845f4daef97f9721ccecd9cb3c7ef363842835a2566f8f48c7e515863cd952',rulesVersion:engine.VERSION},events:[]}}};
    const before=core.canonical(room);rooms.set(room.roomCode,room);service.restoreRoom(room);
    assert.equal(core.canonical(room),before,'restoration must preserve the unsupported signed record and board');
    assert.equal(scheduled.length,0,'an unavailable rules/key authority is not a transient bot error');
  }
});
