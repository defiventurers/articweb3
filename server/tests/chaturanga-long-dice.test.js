const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createArcticPlayService}=require('../arcticPlayService'),engine=require('../arcticPlayGames.cjs');
const capability='chaturanga-long-dice-v1';
test('long-dice tables validate client, actor, revision and legal actions through the real worker',async t=>{
 const rooms=new Map(),saved=new Map();let sequence=0;
 const service=createArcticPlayService({requireLogin:false,accessOptions:{requireAccount:false},rooms,send:(w,p)=>w.packets.push(p),ok:(w,r,type,payload)=>w.packets.push({requestId:r,type,payload}),fail:(w,r,message)=>w.packets.push({requestId:r,type:'error',payload:{message}}),saveRoomSafe:async r=>saved.set(r.roomCode,structuredClone(r)),loadSavedRoom:async c=>saved.get(c)});t.after(()=>service.close());
 const make=()=>({ws:{readyState:1,packets:[]},session:{playerId:randomUUID()}});
 async function call(c,type,p={}){const requestId=String(++sequence);await service.dispatch(c.ws,requestId,type,{...c.session,capabilities:[capability],...p});return c.ws.packets.find(x=>x.requestId===requestId);}
 const host=make();assert.equal((await call(host,'ap_room_create',{tableId:'dominion',rulesProfile:capability,teamMode:'2v2',capabilities:[]})).type,'error');
 const created=await call(host,'ap_room_create',{tableId:'dominion',rulesProfile:capability,teamMode:'2v2'});assert.notEqual(created.type,'error',JSON.stringify(created));
 host.session={...host.session,roomCode:created.payload.room.roomCode,seatToken:created.payload.seatToken};const clients=[host];
 assert.equal((await call(make(),'ap_room_join',{roomCode:host.session.roomCode,capabilities:[]})).type,'error');
 for(let i=1;i<4;i++){const c=make(),joined=await call(c,'ap_room_join',{roomCode:host.session.roomCode});assert.notEqual(joined.type,'error');c.session={...c.session,roomCode:host.session.roomCode,seatToken:joined.payload.seatToken};clients.push(c);}
 for(const c of clients)assert.notEqual((await call(c,'ap_room_ready',{ready:true})).type,'error');
 const started=await call(host,'ap_room_start');assert.equal(started.payload.room.status,'playing');const room=rooms.get(host.session.roomCode);
 assert.equal(room.gameState.rulesProfile,capability);assert.equal(room.gameState.teamMode,'2v2');
 const active=clients.find(c=>room.players[c.session.playerId].seat===room.gameState.turn),other=clients.find(c=>c!==active),initial=JSON.stringify(room.gameState);
 for(const [c,p]of [[other,{}],[active,{revision:room.revision-1}],[active,{actionId:'roll-one|control:roll-one'}]])assert.equal((await call(c,'ap_game_action',{revision:room.revision,actionId:'roll-long|control:roll-long',...p})).type,'error');
 assert.equal(JSON.stringify(room.gameState),initial);
 const roll=await call(active,'ap_game_action',{revision:room.revision,actionId:'roll-long|control:roll-long'});assert.notEqual(roll.type,'error');assert.ok(room.gameState.dice.values.every(v=>v>=2&&v<=5));assert.equal(room.gameState.dice.values.length,2);
 const before=structuredClone(room.gameState.board);const pass=await call(active,'ap_game_action',{revision:room.revision,actionId:'pass-die|control:pass-die:0'});assert.notEqual(pass.type,'error');assert.deepEqual(room.gameState.dice.used,[true,false]);
 assert.notEqual((await call(active,'ap_game_action',{revision:room.revision,actionId:'end|control:end'})).type,'error');assert.deepEqual(room.gameState.board,before);assert.equal(room.gameState.turn,'red');
 const restored=await call(active,'ap_room_get',{verifyStored:true});assert.equal(restored.payload.storageVerified,true);assert.equal(restored.payload.room.gameState.rulesProfile,capability);
 const legacy=engine.create('dominion');assert.equal(legacy.rulesProfile,undefined);assert.ok(engine.actions('dominion',legacy).some(a=>a.id==='roll|control:roll'));
});
