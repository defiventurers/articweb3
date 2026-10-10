// Isolated, free Android tables. Existing website room protocols are untouched.
const { randomBytes, randomUUID, createHash, timingSafeEqual } = require('node:crypto');
const engine = require('./arcticPlayEngine.cjs');
const { URL } = require('node:url');
const { createArcticPlayWorkerPool } = require('./arcticPlayWorkerPool');
const ROOM_GAME_ID = 'arctic-play';
const hash = token => createHash('sha256').update(String(token || '')).digest('hex');
const nameOf = value => String(value || 'Player').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24) || 'Player';
const publicPlayer = p => ({id:p.id,name:p.name,seat:p.seat,ready:p.ready,bot:!!p.bot});

function createArcticPlayService({rooms,send,ok,fail,saveRoomSafe=async()=>{},loadSavedRoom=async()=>null}) {
  const subscriptions = new Map(), bots = new Map(), writes = new Map(), rates = new WeakMap(), processing = new Set();
  const workers=createArcticPlayWorkerPool();
  function codeOf(value) { return String(value || '').toUpperCase().replace(/\s/g,''); }
  function getRoom(code) {
    const room=rooms.get(codeOf(code));
    if(!room || room.gameId!==ROOM_GAME_ID) throw new Error('Room not found. Check the six-character invitation code.');
    if(room.rulesetVersion!==engine.VERSION) throw new Error('This room uses an older app version. Create a new room.');
    return room;
  }
  function rate(ws,kind,limit,period=60000) {
    let counters=rates.get(ws); if(!counters) rates.set(ws,counters={});
    const now=Date.now(), item=counters[kind];
    if(!item || now-item.at>period) counters[kind]={at:now,count:1};
    else if(++item.count>limit) throw new Error('Please wait a moment before trying again.');
  }
  function authenticate(room,payload) {
    const player=room.players[payload.playerId];
    const token=String(payload.seatToken || '');
    if(!player || player.bot || !/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{64}$/.test(player.tokenHash || '') || !timingSafeEqual(Buffer.from(player.tokenHash,'hex'),Buffer.from(hash(token),'hex'))) throw new Error('Rejoin with your saved invitation on this phone. This seat could not be authenticated.');
    return player;
  }
  function attach(ws,room,player) {
    // A live connection subscribes to one private room, not a stream of guessed codes.
    subscriptions.set(ws,{roomCode:room.roomCode,playerId:player.id});
  }
  function view(room) {
    return {roomCode:room.roomCode,tableId:room.tableId,rulesetVersion:room.rulesetVersion,status:room.status,hostId:room.hostId,revision:room.revision,createdAt:room.createdAt,players:Object.values(room.players).map(p=>({...publicPlayer(p),connected:p.bot || [...subscriptions].some(([ws,s])=>ws.readyState===1&&s.roomCode===room.roomCode&&s.playerId===p.id)})),gameState:room.gameState,chat:room.chat || []};
  }
  function broadcast(room) {
    const packet={type:'ap_room_update',payload:{room:view(room)}};
    for(const [ws,s] of subscriptions) if(s.roomCode===room.roomCode && ws.readyState===1) send(ws,packet);
  }
  function persist(room) {
    room.updatedAt=new Date().toISOString();
    const snapshot=JSON.parse(JSON.stringify(room));
    const previous=writes.get(room.roomCode) || Promise.resolve();
    const next=previous.catch(()=>{}).then(()=>saveRoomSafe(snapshot)).catch(error=>console.error('[arctic-play] Room persistence failed:',error.message));
    writes.set(room.roomCode,next);
    next.finally(()=>{if(writes.get(room.roomCode)===next) writes.delete(room.roomCode);});
    return next;
  }
  function advance(room) {
    room.revision++;
    if(engine.result(room.gameState)) room.status='finished';
    broadcast(room); persist(room); schedule(room);
  }
  function schedule(room) {
    if(bots.has(room.roomCode) || processing.has(room.roomCode)) return;
    if(room.status!=='playing') return;
    const actor=Object.values(room.players).find(p=>p.seat===engine.turn(room.gameState));
    if(!actor?.bot) return;
    const timer=setTimeout(async()=>{
      bots.delete(room.roomCode);
      if(room.status!=='playing' || !Object.values(room.players).find(p=>p.seat===engine.turn(room.gameState))?.bot) return;
      const revision=room.revision;processing.add(room.roomCode);
      try {
        const state=await workers.run({tableId:room.tableId,state:room.gameState,bot:true});
        if(room.revision===revision&&room.status==='playing'){room.gameState=state;advance(room);}
      } catch(error) { console.error('[arctic-play] Bot move failed:',error.message); }
      finally {processing.delete(room.roomCode);schedule(room);}
    },550);
    timer.unref?.(); bots.set(room.roomCode,timer);
  }
  function playerId(value) {
    if(!/^[a-z0-9-]{20,64}$/i.test(String(value || ''))) throw new Error('The app profile is missing. Reopen the app.');
    return String(value);
  }
  function newPlayer(id,name,seat,bot=false) {
    const token=bot?null:randomBytes(32).toString('hex');
    return {token,player:{id,name:nameOf(name),wallet:`ap:${id}`,seat,team:seat,ready:bot,bot,joinedAt:Date.now(),tokenHash:token?hash(token):null}};
  }
  async function dispatch(ws,requestId,type,payload={}) {
    try {
      if(!payload || typeof payload!=='object' || Array.isArray(payload)) throw new Error('Invalid app request.');
      rate(ws,'requests',180);
      let room, me, token, storedRevision=null;
      if(type==='ap_room_create') {
        rate(ws,'create',6);
        const definition=engine.game(payload.tableId); if(!definition) throw new Error('Choose one of the six Arctic games.');
        const id=playerId(payload.playerId);
        if([...rooms.values()].filter(r=>r.gameId===ROOM_GAME_ID&&r.status==='waiting'&&r.hostId===id).length>=5) throw new Error('You already have five waiting rooms. Reuse one of them.');
        let code; do {code=Array.from(randomBytes(6),x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%32]).join('');} while(rooms.has(code));
        const seat=definition.seats.includes(payload.seat)?payload.seat:definition.seats[0];
        const created=newPlayer(id,payload.name,seat);token=created.token;
        room={gameId:ROOM_GAME_ID,tableId:definition.id,rulesetVersion:engine.VERSION,roomCode:code,roomMode:'free',visibility:'private',status:'waiting',matchId:randomUUID(),hostId:id,players:{[id]:created.player},gameState:engine.create(definition.id),chat:[],revision:0,createdAt:Date.now()};
        rooms.set(code,room);attach(ws,room,created.player);await persist(room);
      } else if(type==='ap_room_join') {
        rate(ws,'join',30);
        room=getRoom(payload.roomCode);const id=playerId(payload.playerId);
        if(room.players[id]) {
          me=authenticate(room,payload);attach(ws,room,me);
        } else {
          if(room.status!=='waiting') throw new Error('This match has started. Only its original players can rejoin.');
          const definition=engine.game(room.tableId);
          const used=Object.values(room.players).map(p=>p.seat);
          const seat=definition.seats.includes(payload.seat)&&!used.includes(payload.seat)?payload.seat:definition.seats.find(s=>!used.includes(s));
          if(!seat) throw new Error('This table is full. Ask your friend to create a new room.');
          const created=newPlayer(id,payload.name,seat);token=created.token;
          room.players[id]=created.player;room.revision++;attach(ws,room,created.player);await persist(room);
        }
        broadcast(room);
      } else {
        room=getRoom(payload.roomCode);me=authenticate(room,payload);attach(ws,room,me);
        if(type==='ap_room_get') {
          broadcast(room);schedule(room);
          if(payload.verifyStored) {
            rate(ws,'storage-check',3);
            await persist(room);const saved=await loadSavedRoom(room.roomCode);
            if(!saved)throw new Error('This room has not been saved to the database.');
            authenticate(saved,payload);
            const normalize=value=>Array.isArray(value)?value.map(normalize):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalize(value[key])])):value;
            if(saved.revision!==room.revision||JSON.stringify(normalize(saved.gameState))!==JSON.stringify(normalize(room.gameState)))throw new Error('The saved board is still synchronizing. Please retry.');
            storedRevision=saved.revision;
          }
        }
        else if(type==='ap_room_ready') {
          if(room.status!=='waiting') throw new Error('The match has already started.');
          me.ready=!!payload.ready;advance(room);
        } else if(type==='ap_room_start') {
          if(me.id!==room.hostId || room.status!=='waiting') throw new Error('Only the host can start a waiting table.');
          const humans=Object.values(room.players).filter(p=>!p.bot);
          if(humans.some(p=>!p.ready)) throw new Error('Every player must tap Ready first.');
          if(humans.some(p=>![...subscriptions].some(([socket,s])=>socket.readyState===1&&s.roomCode===room.roomCode&&s.playerId===p.id))) throw new Error('Wait for all invited players to reconnect.');
          const definition=engine.game(room.tableId), used=Object.values(room.players).map(p=>p.seat),empty=definition.seats.filter(s=>!used.includes(s));
          if(empty.length && !payload.fillWithBots) throw new Error('Invite a friend to every seat, or choose Start with bots.');
          for(const seat of empty){const created=newPlayer(`bot-${randomUUID()}`,`${engine.seatName(room.tableId,seat)} bot`,seat,true);room.players[created.player.id]=created.player;}
          room.status='playing';advance(room);
        } else if(type==='ap_game_action') {
          if(room.status!=='playing') throw new Error('This match is not in progress.');
          if(payload.revision!==room.revision) throw new Error('The board changed. Wait for the refreshed position and try again.');
          if(me.seat!==engine.turn(room.gameState)) throw new Error('Wait for your turn.');
          if(processing.has(room.roomCode)) throw new Error('A move is being validated. Wait for the refreshed board.');
          if(typeof payload.actionId!=='string'||payload.actionId.length>180) throw new Error('Invalid move.');
          rate(ws,'moves',15,10000);
          processing.add(room.roomCode);
          const revision=room.revision;
          try {
            const state=await workers.run({tableId:room.tableId,state:room.gameState,actionId:payload.actionId});
            if(room.revision!==revision||room.status!=='playing') throw new Error('The table changed while validating the move. Reconnect and try again.');
            room.gameState=state;advance(room);
          } finally {processing.delete(room.roomCode);schedule(room);}
        } else if(type==='ap_room_chat') {
          rate(ws,'chat',12,10000);
          const text=String(payload.text || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim().slice(0,500);
          if(!text) throw new Error('Write a message first.');
          room.chat=(room.chat || []).concat({id:randomUUID(),playerId:me.id,name:me.name,seat:me.seat,text,at:new Date().toISOString()}).slice(-100);
          // Chat never changes the board revision, so typing cannot invalidate a move.
          broadcast(room);await persist(room);
        } else if(type==='ap_room_leave') {
          me.left=true;
          if(room.status==='waiting') {
            delete room.players[me.id];
            if(!Object.keys(room.players).length) room.status='cancelled';
            else if(room.hostId===me.id) room.hostId=Object.keys(room.players)[0];
          } else if(room.status==='playing') {
            if(['yanyi','sanguo','shogi','xiangqi'].includes(room.tableId)) room.gameState=engine.forfeit(room.tableId,room.gameState,me.seat);
            else {me.bot=true;me.ready=true;me.name+=' (bot)';me.tokenHash=null;}
            if(!Object.values(room.players).some(p=>!p.bot&&!p.left)&&!engine.result(room.gameState)) room.gameState={...room.gameState,mobileResult:{winner:null,draw:true,reason:'All players left the table.'}};
          }
          subscriptions.delete(ws);advance(room);
          return ok(ws,requestId,'ap_room_left',{room:view(room)});
        } else if(type==='ap_room_detach') {
          subscriptions.delete(ws);broadcast(room);
          return ok(ws,requestId,'ap_room_detached',{});
        } else throw new Error('Unknown Android room control.');
      }
      return ok(ws,requestId,`${type}_ok`,{room:view(room),...(token?{seatToken:token}: {}),...(storedRevision!==null?{storageVerified:true,savedRevision:storedRevision}:{})});
    } catch(error) { return fail(ws,requestId,error.message || 'The room request failed.'); }
  }
  function restoreRoom(room) {
    if(room?.gameId!==ROOM_GAME_ID||room.rulesetVersion!==engine.VERSION)return;
    if(room.status==='playing'&&!Object.values(room.players).some(p=>!p.bot&&!p.left)&&!engine.result(room.gameState)) {
      room.gameState={...room.gameState,mobileResult:{winner:null,draw:true,reason:'All players left the table.'}};room.status='finished';room.revision++;persist(room);
    }
    schedule(room);
  }
  function disconnected(ws) {const sub=subscriptions.get(ws);subscriptions.delete(ws);if(sub){const room=rooms.get(sub.roomCode);if(room)broadcast(room);} }
  function handleHttp(req,res) {
    const url=new URL(req.url,'https://articweb3.onrender.com');
    if(url.pathname==='/arctic-play/health') {res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,version:engine.VERSION,buildCommit:process.env.RENDER_GIT_COMMIT||null,games:engine.GAME_LIST.map(g=>({id:g.id,name:g.name,players:g.players}))}));return true;}
    if(url.pathname==='/arctic-play/join') {
      const code=codeOf(url.searchParams.get('room'));const valid=/^[A-Z2-9]{6}$/.test(code);const safe=valid?code:'------';
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"});
      res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Join Arctic Play</title><style>body{font:18px system-ui;background:#f5f8fc;color:#203145;text-align:center;margin:0;padding:64px 24px}main{max-width:400px;margin:auto}h1{font-size:32px}strong{display:block;font-size:42px;letter-spacing:6px;margin:30px}a{display:block;text-decoration:none;background:#2293f4;color:white;border-radius:20px;padding:18px;font-weight:700}p{line-height:1.6}</style><main><h1>You're invited to play</h1><p>Six classic strategy games. One private table with your friends.</p><strong>${safe}</strong>${valid?`<a href="arcticplay://room/${safe}">Open Arctic Play</a>`:''}<p>Already installed? Tap the button or enter this code in Games → Join room.</p><p>Need the app? Ask your friend to share the Arctic Play APK from their Profile tab.</p></main></html>`);return true;
    }
    return false;
  }
  function close(){for(const timer of bots.values())clearTimeout(timer);bots.clear();subscriptions.clear();workers.close();}
  return {dispatch,restoreRoom,handleHttp,disconnected,close,view};
}
module.exports={createArcticPlayService,ROOM_GAME_ID};
