const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createArcticPlayService}=require('../arcticPlayService');
const engine=require('../arcticPlayEngine.cjs');

test('Dominion End turn accepts zero or one move and enforces seat, revision and roll phase',async t=>{
  const rooms=new Map(),saved=new Map();let request=0;
  const service=createArcticPlayService({requireLogin:false,accessOptions:{requireAccount:false},rooms,send:(ws,p)=>ws.packets.push(p),ok:(ws,r,type,payload)=>ws.packets.push({requestId:r,type,payload}),fail:(ws,r,message)=>ws.packets.push({requestId:r,type:'error',payload:{message}}),saveRoomSafe:async room=>saved.set(room.roomCode,structuredClone(room)),loadSavedRoom:async code=>saved.get(code)});
  t.after(()=>service.close());
  async function call(client,type,payload={}){
    const requestId=String(++request);await service.dispatch(client.ws,requestId,type,{...client.session,...payload});
    const response=client.ws.packets.find(p=>p.requestId===requestId);assert.ok(response);return response;
  }
  const clients=[];
  for(let i=0;i<4;i++){
    const client={ws:{readyState:1,packets:[]},session:{playerId:randomUUID()}};
    const created=await call(client,i?'ap_room_join':'ap_room_create',{tableId:'dominion',roomCode:clients[0]?.session.roomCode,name:`Turn test ${i+1}`});
    assert.notEqual(created.type,'error');
    client.session={...client.session,roomCode:created.payload.room.roomCode,seatToken:created.payload.seatToken};
    client.seat=created.payload.room.players.find(p=>p.id===client.session.playerId).seat;clients.push(client);
    assert.notEqual((await call(client,'ap_room_ready',{ready:true})).type,'error');
  }
  assert.notEqual((await call(clients[0],'ap_room_start')).type,'error');
  const room=rooms.get(clients[0].session.roomCode),end='end|control:end';
  // Use a legal deterministic rolled position so zero/one-move checks do not
  // depend on production randomness. The service still applies every action
  // through its real rule worker and authenticated command path.
  const prepare=()=>{room.gameState=engine.create('dominion');room.gameState.dice={rolled:true,values:[1,5],used:[false,false]};room.revision++;};
  let actor=clients.find(c=>c.seat===engine.turn(room.gameState));
  const untouched=JSON.stringify(room.gameState);
  assert.equal((await call(actor,'ap_game_action',{revision:room.revision,actionId:end})).type,'error','cannot end before rolling');
  assert.equal(JSON.stringify(room.gameState),untouched);
  for(const count of [0,1]){
    prepare();actor=clients.find(c=>c.seat===engine.turn(room.gameState));
    if(count){
      const move=engine.actions('dominion',room.gameState).find(a=>a.kind==='move'&&a.raw.dieIndex===0);
      assert.notEqual((await call(actor,'ap_game_action',{revision:room.revision,actionId:move.id})).type,'error');
      assert.deepEqual(room.gameState.dice.used,[true,false]);
    }
    assert.ok(engine.actions('dominion',room.gameState).some(a=>a.kind==='move'),'ending remains optional while moves exist');
    const wrong=clients.find(c=>c!==actor),revision=room.revision,before=structuredClone(room.gameState.board);
    assert.equal((await call(wrong,'ap_game_action',{revision,actionId:end})).type,'error','other seats cannot end this turn');
    assert.equal((await call(actor,'ap_game_action',{revision:revision-1,actionId:end})).type,'error','stale command is rejected');
    assert.equal((await call(actor,'ap_game_action',{revision,actionId:end,seatToken:'0'.repeat(64)})).type,'error','invalid credentials are rejected');
    assert.equal(room.revision,revision);
    const response=await call(actor,'ap_game_action',{revision,actionId:end});assert.notEqual(response.type,'error',JSON.stringify(response));
    assert.equal(room.revision,revision+1);assert.deepEqual(room.gameState.board,before);
    assert.equal(engine.turn(room.gameState),'red');assert.deepEqual(room.gameState.dice,{rolled:false,values:[null,null],used:[false,false]});
    assert.ok(clients.every(c=>c.ws.packets.some(p=>p.type==='ap_room_update'&&p.payload.room.revision===room.revision)),'all seats receive the new turn');
    const resumed=await call(actor,'ap_room_get',{verifyStored:true});assert.notEqual(resumed.type,'error');
    assert.equal(resumed.payload.storageVerified,true);assert.equal(resumed.payload.savedRevision,room.revision);
    assert.equal((await call(actor,'ap_game_action',{revision,actionId:end})).type,'error','replay cannot end the following turn');
  }
});
