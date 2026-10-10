const test=require('node:test'),assert=require('node:assert/strict');
const {createArcticPlayService}=require('../arcticPlayService');
const engine=require('../arcticPlayEngine.cjs');
const {randomUUID}=require('node:crypto');
function harness(){
  const rooms=new Map(),snapshots=[];
  const service=createArcticPlayService({rooms,send:(ws,p)=>ws.packets.push(p),ok:(ws,r,t,p)=>ws.packets.push({requestId:r,type:t,payload:p}),fail:(ws,r,message)=>ws.packets.push({requestId:r,type:'error',payload:{message}}),saveRoomSafe:async room=>{assert.ok(Number.isFinite(Number(room.createdAt)),'PostgreSQL room store requires epoch milliseconds');for(const player of Object.values(room.players))assert.ok(Number.isFinite(Number(player.joinedAt)),'PostgreSQL player timestamp must be numeric');snapshots.push(room);},loadSavedRoom:async code=>snapshots.findLast(room=>room.roomCode===code)});
  const socket=()=>({readyState:1,packets:[]});let counter=0;
  async function call(ws,type,payload){const id=String(++counter);await service.dispatch(ws,id,type,payload);const answer=ws.packets.find(p=>p.requestId===id);assert.ok(answer);return answer;}
  return {rooms,snapshots,service,socket,call};
}
for(const game of engine.GAME_LIST)test(`${game.name}: private room, every seat, move validation, authenticated chat and reconnect`,async t=>{
  const h=harness();t.after(()=>h.service.close());const clients=[];
  for(let i=0;i<game.players;i++){
    const ws=h.socket(),playerId=randomUUID();const response=await h.call(ws,i===0?'ap_room_create':'ap_room_join',{tableId:game.id,name:`Friend ${i+1}`,playerId,roomCode:clients[0]?.session.roomCode});
    assert.notEqual(response.type,'error');assert.match(response.payload.seatToken,/^[a-f0-9]{64}$/);
    const session={roomCode:response.payload.room.roomCode,playerId,seatToken:response.payload.seatToken};clients.push({ws,session,seat:response.payload.room.players.find(p=>p.id===playerId).seat});
    assert.ok(!JSON.stringify(response.payload.room).includes('tokenHash'));assert.ok(!JSON.stringify(response.payload.room).includes('seatToken'));
    await h.call(ws,'ap_room_ready',{...session,ready:true});
  }
  const host=clients[0],code=host.session.roomCode;
  const premature=await h.call(clients[1].ws,'ap_room_start',clients[1].session);assert.equal(premature.type,'error');
  let started=await h.call(host.ws,'ap_room_start',host.session);assert.equal(started.payload.room.status,'playing');
  const attacker=h.socket();const unauthorized=await h.call(attacker,'ap_room_get',{...host.session,seatToken:'f'.repeat(64)});assert.equal(unauthorized.type,'error');
  for(let i=0;i<game.players*2;i++){
    const room=h.rooms.get(code),before=JSON.stringify(room.gameState),actor=clients.find(c=>c.seat===engine.turn(room.gameState));const legal=engine.actions(game.id,room.gameState);assert.ok(legal.length);
    const wrong=clients.find(c=>c!==actor);assert.equal((await h.call(wrong.ws,'ap_game_action',{...wrong.session,revision:room.revision,actionId:legal[0].id})).type,'error');
    assert.equal((await h.call(actor.ws,'ap_game_action',{...actor.session,revision:room.revision-1,actionId:legal[0].id})).type,'error');
    assert.equal((await h.call(actor.ws,'ap_game_action',{...actor.session,revision:room.revision,actionId:'invalid'})).type,'error');assert.equal(JSON.stringify(room.gameState),before);
    const response=await h.call(actor.ws,'ap_game_action',{...actor.session,revision:room.revision,actionId:legal[0].id});assert.notEqual(response.type,'error');assert.notEqual(JSON.stringify(room.gameState),before);
    assert.ok(clients.every(c=>c.ws.packets.some(p=>p.type==='ap_room_update'&&p.payload.room.revision===room.revision)));
  }
  const room=h.rooms.get(code),revision=room.revision;
  const message=await h.call(host.ws,'ap_room_chat',{...host.session,text:'Hello from my phone!'});assert.equal(message.payload.room.chat.at(-1).text,'Hello from my phone!');assert.equal(room.revision,revision);
  assert.equal((await h.call(attacker,'ap_room_chat',{...host.session,seatToken:'0'.repeat(64),text:'Injected'})).type,'error');
  h.service.disconnected(host.ws);host.ws.readyState=3;const reconnected=h.socket();const resumed=await h.call(reconnected,'ap_room_join',host.session);assert.notEqual(resumed.type,'error');assert.equal(resumed.payload.room.players.find(p=>p.id===host.session.playerId).seat,host.seat);assert.equal(resumed.payload.room.chat.at(-1).text,'Hello from my phone!');
  const verified=await h.call(reconnected,'ap_room_get',{...host.session,verifyStored:true});assert.equal(verified.payload.storageVerified,true);assert.equal(verified.payload.savedRevision,room.revision);
  await new Promise(resolve=>setImmediate(resolve));assert.ok(h.snapshots.length);const persisted=h.snapshots.at(-1);assert.equal(persisted.roomMode,'free');assert.ok(persisted.players[host.session.playerId].tokenHash);assert.ok(!JSON.stringify(persisted).includes(host.session.seatToken));
});
test('Only explicit fill-with-bots starts a table with empty seats; bot completes its turn',async t=>{
  const h=harness();t.after(()=>h.service.close());const ws=h.socket(),playerId=randomUUID();const created=await h.call(ws,'ap_room_create',{tableId:'yanyi',seat:'red',playerId,name:'Host'});
  const session={roomCode:created.payload.room.roomCode,playerId,seatToken:created.payload.seatToken};await h.call(ws,'ap_room_ready',{...session,ready:true});assert.equal((await h.call(ws,'ap_room_start',session)).type,'error');
  const started=await h.call(ws,'ap_room_start',{...session,fillWithBots:true});assert.equal(started.payload.room.players.filter(p=>p.bot).length,2);
  await new Promise(resolve=>setTimeout(resolve,1800));const room=h.rooms.get(session.roomCode);assert.equal(engine.turn(room.gameState),'red');assert.ok(room.revision>started.payload.room.revision);
});
test('Leaving the last human seat ends the room instead of running unattended bot games',async t=>{
  const h=harness();t.after(()=>h.service.close());const ws=h.socket(),playerId=randomUUID();const created=await h.call(ws,'ap_room_create',{tableId:'sannin',playerId,name:'Host'});
  const credentials={roomCode:created.payload.room.roomCode,playerId,seatToken:created.payload.seatToken};await h.call(ws,'ap_room_ready',{...credentials,ready:true});await h.call(ws,'ap_room_start',{...credentials,fillWithBots:true});
  const left=await h.call(ws,'ap_room_leave',credentials);assert.equal(left.payload.room.status,'finished');assert.equal(engine.result(left.payload.room.gameState).draw,true);
  const revision=left.payload.room.revision;await new Promise(resolve=>setTimeout(resolve,650));assert.equal(h.rooms.get(credentials.roomCode).revision,revision);
});
