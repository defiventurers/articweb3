const {randomUUID,createHash,timingSafeEqual}=require('node:crypto');
const {createFairPlayService}=require('./fairPlayService');
const {createCompanyStore}=require('./companyStore');
const engine=require('./fairPlayEngine.cjs');
const sdk=import('../shared/fair-play/core.js');
const {VERSION}=require('./coTuLenhEngine.cjs');
const CAPABILITY='ctl-fair-play-v1';
function createCoTuLenhProofs({rooms,ok,fail,publish,confirm,baseDispatch,saveRoomSafe,proofOptions={}}){
 const store=proofOptions.store||createCompanyStore(),fair=createFairPlayService({store,engine,saveRoom:saveRoomSafe,...proofOptions}),processing=new Set();
 const allowed=room=>room.gameState.deployment==='standard'&&!room.gameState.clock?.limitMs;
 function attach(room,team,payload){if(!fair.enabled()||!allowed(room)||!payload.capabilities?.includes(CAPABILITY))return;const seat=room.seats[team];if(seat?.fairKey&&(seat.fairKey.x!==payload.fairKey.x||seat.fairKey.y!==payload.fairKey.y))throw Error('Use the original game-proof key for this seat.');if(seat.accessOwner&&payload._proofActor&&seat.accessOwner.id!==payload._proofActor)throw Error('This seat belongs to another signed-in account.');room.fairEnabled=true;room.matchId||=randomUUID();room.tableId='co-tu-lenh';seat.fairKey=payload.fairKey;if(payload._proofActor&&!seat.accessOwner)seat.accessOwner={kind:'account',id:payload._proofActor};}
 const summary=room=>({...fair.summary(room),coverage:'Standard untimed tables. Secret deployment and timed games retain server validation.'});
 function authenticate(room,token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error('No authorized seat for this room');const digest=createHash('sha256').update(token).digest();const team=['red','blue'].find(t=>room.seats[t]?.digest&&timingSafeEqual(Buffer.from(room.seats[t].digest,'hex'),digest));if(!team)throw Error('No authorized seat for this room');return team;}
 async function dispatch(ws,id,type,payload={}){try{
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid payload');
  if(payload.rulesVersion!==VERSION)throw Error('Use the matching Commander Chess rules update.');
  if(['ctl_room_create','ctl_room_join','ctl_room_sync'].includes(type)){
   if(payload.capabilities?.includes(CAPABILITY)){payload={...payload,fairKey:await fair.validateKey(payload.fairKey),_proofActor:null};if(payload.cloudSession&&proofOptions.withAccountSession)payload._proofActor=await proofOptions.withAccountSession(payload.cloudSession,a=>a.id);}
   const existing=rooms.get(String(payload.roomCode||'').trim().toUpperCase());if(existing?.fairEnabled&&!payload.capabilities?.includes(CAPABILITY))throw Error('Update Commander Chess to join this signed table.');
   if(existing?.fairEnabled&&type==='ctl_room_sync')attach(existing,authenticate(existing,payload.token),payload);
   return baseDispatch(ws,id,type,payload);
  }
  const room=rooms.get(String(payload.roomCode||'').trim().toUpperCase());if(!room?.fairEnabled)return baseDispatch(ws,id,type,payload);
  const team=authenticate(room,payload.token);
  if(type==='ctl_fair_get'){if(!room.fair?.bundle)throw Error('Start this standard untimed table to create its signed proof.');return ok(ws,id,'ctl_fair_ack',{bundle:fair.bundle(room)});}
  if(type==='ctl_room_start'){
   if(room.status!=='waiting'||!room.seats.red||!room.seats.blue)throw Error('Both teams must join a waiting table.');
   if(!room.seats.red.fairKey||!room.seats.blue.fairKey)throw Error('Both players need the signed-proof update.');
   room.players=Object.fromEntries(['red','blue'].map(seat=>[seat,{id:seat,seat,kind:'human',bot:false,fairKey:room.seats[seat].fairKey,accessOwner:room.seats[seat].accessOwner}]));
   if(processing.has(room.roomCode))throw Error('This table is starting.');
   processing.add(room.roomCode);try{await fair.start(room);room.status='playing';room.revision++;publish(room);return confirm(ws,id,room,team);}finally{processing.delete(room.roomCode);}
  }
  if(type==='ctl_game_action'){
   if(room.status!=='playing'||room.gameState.turn!==team)throw Error('Wait for your turn in an active match.');
   if(payload.revision!==room.revision)throw Error('Stale room revision');if(processing.has(room.roomCode))throw Error('A move is being validated.');
   const core=await sdk,actionId='ctl:'+core.canonical(payload.action);processing.add(room.roomCode);
   try{await fair.apply(room,{signed:payload.fairIntent,actorId:team,actionId,run:()=>engine.apply('co-tu-lenh',room.gameState,actionId)});room.revision++;if(engine.result(room.gameState))room.status='finished';publish(room);return confirm(ws,id,room,team);}finally{processing.delete(room.roomCode);}
  }
  return baseDispatch(ws,id,type,payload);
 }catch(e){return fail(ws,id,e.message||'Commander proof request failed.');}}
 return{attach,summary,dispatch,enabled:fair.enabled,close:async()=>{await fair.close();if(!proofOptions.store)await store.close();},capability:CAPABILITY};
}
module.exports={createCoTuLenhProofs,CAPABILITY};
