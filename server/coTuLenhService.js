const {randomBytes,createHash,timingSafeEqual}=require('node:crypto');
const {VERSION,DEFAULT_PROFILE,RULE_PROFILES,resolveProfile,createInitialState,applyAction,startMatch,expireClock,isFinished,applyDeployment,confirmDeployment}=require('./coTuLenhEngine.cjs');
const ID='co-tu-lenh';
const hash=s=>createHash('sha256').update(String(s)).digest('hex');
const goodToken=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
const codeOf=c=>String(c||'').trim().toUpperCase();
const auth=(seat,token)=>goodToken(token)&&seat?.digest&&timingSafeEqual(Buffer.from(seat.digest,'hex'),Buffer.from(hash(token),'hex'));
function createCoTuLenhService({rooms,send,ok,fail,saveRoomSafe,now=Date.now}){
  const sessions=new Map();let closed=false;
  const isRoom=r=>r?.gameId===ID;
  function view(room,team){
    let gameState=room.gameState;
    if(gameState.phase==='setup')gameState={...gameState,lastMove:gameState.lastMove?.team===team?gameState.lastMove:null,pieces:gameState.pieces.map(p=>p.team===team?p:{id:p.id,type:p.type,team:p.team,alive:true,hero:false,carrier:null,x:null,y:null,hidden:true})};
    return {gameId:ID,rulesVersion:VERSION,roomCode:room.roomCode,status:room.status,revision:room.revision,createdAt:room.createdAt,updatedAt:room.updatedAt,gameState,
      seats:Object.fromEntries(['red','blue'].map(t=>[t,room.seats[t]?{name:room.seats[t].name,connected:sessions.get(`${room.roomCode}:${t}`)?.readyState===1}:{name:null,connected:false}]))};
  }
  function publish(room){
    room.updatedAt=now();saveRoomSafe(room);
    for(const team of ['red','blue']){const ws=sessions.get(`${room.roomCode}:${team}`);if(ws?.readyState===1)send(ws,{type:'ctl_room_state',payload:{room:view(room,team)}});}
  }
  function bind(ws,room,team){
    const key=`${room.roomCode}:${team}`;sessions.set(key,ws);
    if(!ws.ctlBindings){ws.ctlBindings=new Set();ws.on('close',()=>{for(const k of ws.ctlBindings){if(sessions.get(k)!==ws)continue;sessions.delete(k);const [code]=k.split(':');const r=rooms.get(code);if(isRoom(r))publish(r);}});}
    ws.ctlBindings.add(key);
  }
  function freshCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let v;do{v=Array.from(randomBytes(6),b=>chars[b%chars.length]).join('');}while(rooms.has(v));return v;}
  const reject=(ws,id,message)=>fail(ws,id,message);
  const confirm=(ws,id,room,team)=>ok(ws,id,'ctl_ack',{room:view(room,team),team});
  function expireRoom(room){
    if(room.status!=='playing'||room.gameState?.rulesVersion!==VERSION)return false;
    const next=expireClock(room.gameState,now());if(next===room.gameState)return false;
    room.gameState=next;room.status='finished';room.revision++;publish(room);return true;
  }
  const ticker=setInterval(()=>{for(const room of rooms.values())if(isRoom(room))expireRoom(room);},1000);ticker.unref?.();
  function dispatch(ws,id,type,payload={}){
    if(closed)return reject(ws,id,'Service unavailable');
    if(!payload||typeof payload!=='object'||Array.isArray(payload))return reject(ws,id,'Invalid payload');
    if(payload.rulesVersion!==VERSION)return reject(ws,id,'YouTuber Rules require the matching v0.5 app and backend.');
    if(type==='ctl_room_create'){
      if(!goodToken(payload.token))return reject(ws,id,'Invalid seat credential');
      const team=payload.team==='blue'?'blue':'red',profile=resolveProfile(payload.mode||DEFAULT_PROFILE);
      if(!RULE_PROFILES[profile])return reject(ws,id,'Unknown rules profile');
      if(payload.deployment!==undefined&&!['standard','secret'].includes(payload.deployment))return reject(ws,id,'Unknown deployment mode');
      if(payload.timeLimitMinutes!==undefined&&![0,10,15].includes(payload.timeLimitMinutes))return reject(ws,id,'Clock must be untimed, 10 or 15 minutes');
      const room={roomCode:freshCode(),gameId:ID,roomMode:'co-tu-lenh-private',visibility:'private',rulesetVersion:VERSION,status:'waiting',revision:0,createdAt:now(),updatedAt:now(),seats:{red:null,blue:null},
        gameState:createInitialState(profile,{deployment:payload.deployment,timeLimitMinutes:payload.timeLimitMinutes})};
      room.seats[team]={name:String(payload.name||'Commander').slice(0,24),digest:hash(payload.token)};
      rooms.set(room.roomCode,room);bind(ws,room,team);publish(room);return confirm(ws,id,room,team);
    }
    if(type==='ctl_room_list')return ok(ws,id,'ctl_room_list_ack',{rooms:[]});
    const room=rooms.get(codeOf(payload.roomCode));if(!isRoom(room))return reject(ws,id,'Room not found');
    if(room.gameState?.rulesVersion!==VERSION)return reject(ws,id,'Room uses an older rules engine; create a new v0.5 match');
    if(type==='ctl_room_join'){
      if(!goodToken(payload.token))return reject(ws,id,'Invalid seat credential');
      const team=payload.team;if(!['red','blue'].includes(team))return reject(ws,id,'Choose a team');
      const seat=room.seats[team];if(seat&&!auth(seat,payload.token))return reject(ws,id,'Team already claimed');
      if(!seat){if(room.status!=='waiting')return reject(ws,id,'Match already started');room.seats[team]={name:String(payload.name||'Commander').slice(0,24),digest:hash(payload.token)};room.revision++;}
      bind(ws,room,team);expireRoom(room);publish(room);return confirm(ws,id,room,team);
    }
    const team=['red','blue'].find(t=>auth(room.seats[t],payload.token));if(!team)return reject(ws,id,'No authorized seat for this room');
    if(expireRoom(room))return confirm(ws,id,room,team);
    if(type==='ctl_room_sync'){bind(ws,room,team);return confirm(ws,id,room,team);}
    if(type==='ctl_room_start'){
      if(!room.seats.red||!room.seats.blue)return reject(ws,id,'Both teams must join');
      if(room.status==='finished')return reject(ws,id,'Match finished');
      if(room.status==='waiting'){room.gameState=startMatch(room.gameState,now());room.status=room.gameState.phase==='setup'?'setup':'playing';room.revision++;publish(room);}
      return confirm(ws,id,room,team);
    }
    if(['ctl_game_action','ctl_setup_move','ctl_setup_ready'].includes(type)){
      if(!Number.isSafeInteger(payload.revision)||payload.revision!==room.revision)return reject(ws,id,'Stale room revision');
      try{
        let next;
        if(type==='ctl_setup_move'){
          if(room.status!=='setup')return reject(ws,id,'Deployment is not active');
          const a=payload.action||{};next=applyDeployment(room.gameState,team,a.id,a.x,a.y);
        }else if(type==='ctl_setup_ready'){
          if(room.status!=='setup')return reject(ws,id,'Deployment is not active');
          next=confirmDeployment(room.gameState,team,now());
        }else{
          if(room.status!=='playing')return reject(ws,id,'Match not active');
          if(room.gameState.turn!==team)return reject(ws,id,'Not your turn');
          next=applyAction(room.gameState,payload.action);
        }
        room.gameState=next;room.revision++;
        if(isFinished(next))room.status='finished';else if(next.phase==='playing')room.status='playing';
        publish(room);return confirm(ws,id,room,team);
      }catch(error){return reject(ws,id,error.message);}
    }
    return reject(ws,id,'Unknown Commander Chess request');
  }
  return {dispatch,restoreRoom(room){if(isRoom(room))room.gameState=room.gameState||createInitialState();},close(){closed=true;clearInterval(ticker);sessions.clear();}};
}
module.exports={createCoTuLenhService};
