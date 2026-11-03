const { randomUUID, randomBytes, createHash, timingSafeEqual }=require('node:crypto');
const { createInitialState, applyAction, VERSION, RULE_PROFILES, resolveProfile }=require('./coTuLenhEngine.cjs');
const ID='co-tu-lenh';
const codeOf=v=>String(v||'').trim().toUpperCase();
const hash=v=>createHash('sha256').update(v).digest('hex');
const goodToken=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const auth=(seat,token)=>goodToken(token)&&seat?.digest&&timingSafeEqual(Buffer.from(seat.digest,'hex'),Buffer.from(hash(token),'hex'));
function createCoTuLenhService({rooms,send,ok,fail,saveRoomSafe,now=Date.now}){
  const sessions=new Map();
  let closed=false;
  const isRoom=r=>r?.gameId===ID;
  const view=r=>({gameId:ID,rulesVersion:VERSION,roomCode:r.roomCode,status:r.status,revision:r.revision,createdAt:r.createdAt,
    updatedAt:r.updatedAt,gameState:r.gameState,seats:Object.fromEntries(['red','blue'].map(team=>[team,r.seats[team]?{name:r.seats[team].name,connected:sessions.get(`${r.roomCode}:${team}`)?.readyState===1}:{name:null,connected:false}]))});
  function publish(room){room.updatedAt=now();saveRoomSafe(room);for(const team of ['red','blue']){
    const ws=sessions.get(`${room.roomCode}:${team}`);if(ws?.readyState===1)send(ws,{type:'ctl_room_state',payload:{room:view(room)}});
  }}
  function bind(ws,room,team){
    const key=`${room.roomCode}:${team}`;
    sessions.set(key,ws);
    if(!ws.ctlBindings){ws.ctlBindings=new Set();ws.on('close',()=>{for(const k of ws.ctlBindings){if(sessions.get(k)!==ws)continue;sessions.delete(k);const [code]=k.split(':');const room=rooms.get(code);if(isRoom(room))publish(room);}});}
    ws.ctlBindings.add(key);
  }
  function freshCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let v;do{v=Array.from(randomBytes(6),b=>chars[b%chars.length]).join('');}while(rooms.has(v));return v;}
  const reject=(ws,id,message)=>fail(ws,id,message);
  const confirm=(ws,id,room,team)=>ok(ws,id,'ctl_ack',{room:view(room),team});
  function dispatch(ws,id,type,payload={}){
    if(closed)return reject(ws,id,'Service unavailable');
    if(!payload||typeof payload!=='object'||Array.isArray(payload))return reject(ws,id,'Invalid payload');
    if(payload.rulesVersion!==VERSION)return reject(ws,id,'Commander Chess carrier rules require the matching v0.4 app and backend.');
    if(type==='ctl_room_create'){
      const token=payload.token;
      if(!goodToken(token))return reject(ws,id,'Invalid seat credential');
      const team=payload.team==='blue'?'blue':'red';
      const code=freshCode();const name=String(payload.name||'Commander').slice(0,24);
      const profile=resolveProfile(payload.mode||'ancientchess_2015_standard');
      if(!RULE_PROFILES[profile])return reject(ws,id,'Unknown rules profile');
      const room={roomCode:code,gameId:ID,status:'waiting',revision:0,createdAt:now(),updatedAt:now(),
        seats:{red:null,blue:null},gameState:createInitialState(profile)};
      room.seats[team]={name,digest:hash(token)};rooms.set(code,room);bind(ws,room,team);publish(room);return confirm(ws,id,room,team);
    }
    if(type==='ctl_room_list')return ok(ws,id,'ctl_room_list_ack',{rooms:[]}); // deliberately private rooms only
    const code=codeOf(payload.roomCode);const room=rooms.get(code);
    if(!isRoom(room))return reject(ws,id,'Room not found');
    if(room.gameState?.rulesVersion!==VERSION)return reject(ws,id,'Room uses an older rules engine; create a new v0.4 match');
    if(type==='ctl_room_join'){
      const token=payload.token;if(!goodToken(token))return reject(ws,id,'Invalid seat credential');
      const team=payload.team;
      if(team!=='red'&&team!=='blue')return reject(ws,id,'Choose a team');
      const seat=room.seats[team];
      if(seat&&!auth(seat,token))return reject(ws,id,'Team already claimed');
      if(!seat){if(room.status!=='waiting')return reject(ws,id,'Match already started');room.seats[team]={name:String(payload.name||'Commander').slice(0,24),digest:hash(token)};room.revision++;}
      bind(ws,room,team);publish(room);return confirm(ws,id,room,team);
    }
    const team=['red','blue'].find(t=>auth(room.seats[t],payload.token));
    if(!team)return reject(ws,id,'No authorized seat for this room');
    if(type==='ctl_room_sync'){bind(ws,room,team);return confirm(ws,id,room,team);}
    if(type==='ctl_room_start'){
      if(!room.seats.red||!room.seats.blue)return reject(ws,id,'Both teams must join');
      if(room.status==='finished')return reject(ws,id,'Match finished');
      room.status='playing';room.revision++;publish(room);return confirm(ws,id,room,team);
    }
    if(type==='ctl_game_action'){
      if(room.gameState.rulesVersion!==VERSION)return reject(ws,id,'Room uses an older rules engine; create a new v0.4 match');
      if(room.status!=='playing')return reject(ws,id,'Match not active');
      if(!Number.isSafeInteger(payload.revision)||payload.revision!==room.revision)return reject(ws,id,'Stale room revision');
      if(room.gameState.turn!==team)return reject(ws,id,'Not your turn');
      try{const next=applyAction(room.gameState,payload.action);room.gameState=next;room.revision++;if(next.winner)room.status='finished';publish(room);return confirm(ws,id,room,team);}catch(error){return reject(ws,id,error.message);}
    }
    return reject(ws,id,'Unknown Commander Chess request');
  }
  return {dispatch,restoreRoom(room){if(isRoom(room))room.gameState=room.gameState||createInitialState();},close(){closed=true;sessions.clear();}};
}
module.exports={createCoTuLenhService};