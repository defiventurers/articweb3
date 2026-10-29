// Isolated, free Android tables. Existing website room protocols are untouched.
const { randomBytes, randomUUID, createHash, timingSafeEqual } = require('node:crypto');
const engine = require('./arcticPlayEngine.cjs');
const { URL } = require('node:url');
const browserAssetsReady=require('node:fs').existsSync(require('node:path').join(__dirname,'arcticPlayWeb/index.html'));
const { createArcticPlayWorkerPool } = require('./arcticPlayWorkerPool');
const {serveArcticPlayWeb}=require('./arcticPlayWeb');
const {servePrivyWallet}=require('./privyWalletWeb');
const TEAM_CAPABILITY='dominion-teams-v1';
const dominionTeamsReady=engine.create('dominion',{teamMode:'2v2'}).teamMode==='2v2';
const ROOM_GAME_ID = 'arctic-play';
const hash = token => createHash('sha256').update(String(token || '')).digest('hex');
const nameOf = value => String(value || 'Player').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24) || 'Player';
const publicPlayer = p => ({id:p.id,name:p.name,seat:p.seat,ready:p.ready,bot:!!p.bot});

function createArcticPlayService({rooms,send,ok,fail,saveRoomSafe=async()=>{},loadSavedRoom=async()=>null,companyOptions,accessOptions={},requireLogin=true}) {
  const subscriptions = new Map(), bots = new Map(), writes = new Map(), rates = new WeakMap(), processing = new Set();
  const workers=createArcticPlayWorkerPool();
  const company=require('./companyService').createCompanyService(companyOptions);
  const access=require('./companyAccess').createAccessService({store:company.store,withAccount:company.withAccountSession,onVerifiedProgress:company.syncPassportAchievements,...accessOptions});
  const settling=new Set();
  const proofParts=new WeakMap();
  function settleAccess(room){if(room.status!=='finished'||settling.has(room.matchId))return;settling.add(room.matchId);access.recordRoom(room).then(()=>{for(const [ws,s]of subscriptions)if(s.roomCode===room.roomCode&&ws.readyState===1)send(ws,{type:'ap_access_refresh',payload:{}});}).catch(e=>console.error('[arctic-play] Unlock save pending:',e.message)).finally(()=>settling.delete(room.matchId));}
  function requireTeamClient(room,payload){
    if(room.gameState?.teamMode==='2v2'&&!(Array.isArray(payload.capabilities)&&payload.capabilities.includes(TEAM_CAPABILITY)))throw new Error('This 2v2 table needs the latest app. Update Antarctic Kingdoms or open the invitation in your browser.');
  }
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
    return {roomCode:room.roomCode,matchId:room.matchId,tableId:room.tableId,rulesetVersion:room.rulesetVersion,status:room.status,hostId:room.hostId,revision:room.revision,createdAt:room.createdAt,players:Object.values(room.players).map(p=>({...publicPlayer(p),connected:p.bot || [...subscriptions].some(([ws,s])=>ws.readyState===1&&s.roomCode===room.roomCode&&s.playerId===p.id)})),gameState:room.gameState,chat:room.chat || []};
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
    broadcast(room); persist(room); schedule(room);settleAccess(room);
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
        if(room.revision===revision&&room.status==='playing'){room.gameState=state;room.actionCount=(room.actionCount||0)+1;advance(room);}
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
  function requireRoomAccount(player,actor){
    if(!requireLogin)return;
    if(player.accessOwner?.kind==='account'&&player.accessOwner.id!==actor.id)throw Error('This seat belongs to another signed-in account.');
    player.accessOwner={kind:'account',id:actor.id};
  }
  async function dispatch(ws,requestId,type,payload={}) {
    try {
      if(!payload || typeof payload!=='object' || Array.isArray(payload)) throw new Error('Invalid app request.');
      rate(ws,'requests',180);
      const actor=requireLogin?await company.withAccountSession(payload.cloudSession,a=>({id:a.id})):null;
      if(type==='ap_access_open')return ok(ws,requestId,type+'_ok',await access.open(payload));
      if(type==='ap_access_status')return ok(ws,requestId,type+'_ok',await access.snapshot(payload));
      if(type==='ap_access_complete')return ok(ws,requestId,type+'_ok',await access.action(payload,'complete'));
      if(type==='ap_access_spend')return ok(ws,requestId,type+'_ok',await access.action(payload,'spend'));
      if(type==='ap_access_foundation'){rate(ws,'proof',6);await access.identity(payload);const proof=await workers.run({foundationProof:payload.proof});return ok(ws,requestId,type+'_ok',await access.action(payload,'foundation',proof));}
      if(type==='ap_access_replay'){
        const owner=await access.identity(payload);let input=payload.proof;
        if(payload.part!==undefined){
          if(!Number.isInteger(payload.part)||payload.part<0||payload.part>19||!Array.isArray(input?.actions)||input.actions.length>150)throw Error('Invalid move-record part.');
          if(payload.part===0){rate(ws,'proof',6);proofParts.set(ws,{owner:owner.kind+':'+owner.id,at:Date.now(),next:0,proof:{...input,actions:[]}});}
          const staged=proofParts.get(ws);
          if(!staged||staged.next!==payload.part||staged.owner!==owner.kind+':'+owner.id||staged.proof.matchId!==input.matchId||Date.now()-staged.at>120000)throw Error('Restart the move-record upload.');
          staged.proof.actions.push(...input.actions);staged.next++;if(staged.proof.actions.length>2000){proofParts.delete(ws);throw Error('That move record is too long.');}
          if(payload.final!==true)return ok(ws,requestId,type+'_ok',{pending:true});input=staged.proof;proofParts.delete(ws);
        }else rate(ws,'proof',6);
        const proof=await workers.run({accessProof:input});return ok(ws,requestId,type+'_ok',await access.action(payload,'win',proof));
      }
      if(type==='ap_room_preview'){rate(ws,'preview',15);const r=getRoom(payload.roomCode);return ok(ws,requestId,type+'_ok',{roomCode:r.roomCode,tableId:r.tableId,status:r.status});}
      let room, me, token, storedRevision=null;
      if(type==='ap_room_create') {
        rate(ws,'create',6);
        const definition=engine.game(payload.tableId); if(!definition) throw new Error('Choose a game from Arctic Play.');
        const id=playerId(payload.playerId);
        const grant=await access.authorize(payload,definition.id);
        if([...rooms.values()].filter(r=>r.gameId===ROOM_GAME_ID&&r.status==='waiting'&&r.hostId===id).length>=5) throw new Error('You already have five waiting rooms. Reuse one of them.');
        let code; do {code=Array.from(randomBytes(6),x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%32]).join('');} while(rooms.has(code));
        if(payload.teamMode!=null&&(!['2v2','free-for-all'].includes(payload.teamMode)||definition.id!=='dominion'))throw new Error('Choose a supported Arctic Dominion mode.');
        if(payload.teamMode==='2v2'&&!dominionTeamsReady)throw new Error('Team tables are awaiting a game-rules update. Choose free-for-all for now.');
        const gameState=engine.create(definition.id,{teamMode:payload.teamMode});
        requireTeamClient({gameState},payload);
        if(payload.seat!=null&&!definition.seats.includes(payload.seat))throw new Error('Choose a kingdom at this table.');
        const seat=payload.seat||definition.seats[0];
        const created=newPlayer(id,payload.name,seat);token=created.token;created.player.accessOwner=grant.owner;
        room={gameId:ROOM_GAME_ID,tableId:definition.id,rulesetVersion:engine.VERSION,roomCode:code,roomMode:'free',visibility:'private',status:'waiting',matchId:randomUUID(),hostId:id,players:{[id]:created.player},gameState,chat:[],revision:0,createdAt:Date.now()};
        room.accessVersion=1;room.actionCount=0;rooms.set(code,room);attach(ws,room,created.player);await persist(room);
      } else if(type==='ap_room_join') {
        rate(ws,'join',30);
        room=getRoom(payload.roomCode);requireTeamClient(room,payload);const id=playerId(payload.playerId);
        if(room.players[id]) {
          me=authenticate(room,payload);requireRoomAccount(me,actor);if(room.status==='waiting'){const grant=await access.authorize(payload,room.tableId);me.accessOwner=grant.owner;}attach(ws,room,me);
        } else {
          if(room.status!=='waiting') throw new Error('This match has started. Only its original players can rejoin.');
          const grant=await access.authorize(payload,room.tableId);
          const definition=engine.game(room.tableId);
          const used=Object.values(room.players).map(p=>p.seat);
          if(payload.seat!=null&&(!definition.seats.includes(payload.seat)||used.includes(payload.seat)))throw new Error('That kingdom is unavailable. Choose an open seat.');
          const seat=payload.seat||definition.seats.find(s=>!used.includes(s));
          if(!seat) throw new Error('This table is full. Ask your friend to create a new room.');
          const created=newPlayer(id,payload.name,seat);token=created.token;created.player.accessOwner=grant.owner;
          room.players[id]=created.player;room.revision++;attach(ws,room,created.player);await persist(room);
        }
        broadcast(room);
      } else {
        room=getRoom(payload.roomCode);requireTeamClient(room,payload);me=authenticate(room,payload);requireRoomAccount(me,actor);attach(ws,room,me);
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
        else if(type==='ap_room_seat') {
          if(room.status!=='waiting')throw new Error('Kingdoms are locked once the match starts.');
          if(!engine.game(room.tableId).seats.includes(payload.seat))throw new Error('Choose a kingdom at this table.');
          if(Object.values(room.players).some(p=>p.id!==me.id&&p.seat===payload.seat))throw new Error('That kingdom is occupied. Choose an open seat.');
          if(me.seat!==payload.seat){me.seat=payload.seat;me.team=payload.seat;me.ready=false;advance(room);}
        }
        else if(type==='ap_room_ready') {
          if(room.status!=='waiting') throw new Error('The match has already started.');
          me.ready=!!payload.ready;advance(room);
        } else if(type==='ap_room_start') {
          if(me.id!==room.hostId || room.status!=='waiting') throw new Error('Only the host can start a waiting table.');
          const humans=Object.values(room.players).filter(p=>!p.bot);
          for(const player of humans)await access.authorizeOwner(player.accessOwner,room.tableId);
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
            room.gameState=state;room.actionCount=(room.actionCount||0)+1;advance(room);
          } finally {processing.delete(room.roomCode);schedule(room);}
        } else if(type==='ap_room_chat') {
          rate(ws,'chat',12,10000);
          const text=String(payload.text || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim().slice(0,500);
          if(!text) throw new Error('Write a message first.');
          room.chat=(room.chat || []).concat({id:randomUUID(),playerId:me.id,name:me.name,seat:me.seat,text,at:new Date().toISOString()}).slice(-100);
          // Chat never changes the board revision, so typing cannot invalidate a move.
          broadcast(room);await persist(room);
        } else if(type==='ap_room_leave') {
          if(room.status==='playing')room.progressDisqualified=true;
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
    schedule(room);settleAccess(room);
  }
  function disconnected(ws) {const sub=subscriptions.get(ws);subscriptions.delete(ws);if(sub){const room=rooms.get(sub.roomCode);if(room)broadcast(room);} }
  function handleHttp(req,res) {
    if(company.handleHttp(req,res))return true;
    const url=new URL(req.url,'https://articweb3.onrender.com');
    if(servePrivyWallet(req,res,url))return true;
    if(serveArcticPlayWeb(req,res,url))return true;
    if(url.pathname==='/arctic-play/health') {res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,version:engine.VERSION,capabilities:[...(dominionTeamsReady?[TEAM_CAPABILITY]:[]),...(browserAssetsReady?['browser-play-v1']:[]),'hall-access-v1','account-play-v1'],accessSync:access.configured(),webAppUrl:browserAssetsReady?'https://articweb3.onrender.com/arctic-play/app/':null,buildCommit:process.env.RENDER_GIT_COMMIT||null,games:engine.GAME_LIST.map(g=>({id:g.id,name:g.name,players:g.players}))}));return true;}
    if(url.pathname==='/arctic-play/join') {
      const code=codeOf(url.searchParams.get('room'));const valid=/^[A-Z2-9]{6}$/.test(code);const safe=valid?code:'------';
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"});
      res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Join Antarctic Kingdoms</title><style>body{font:17px system-ui;background:#eaf6ff;color:#15384b;text-align:center;margin:0;padding:48px 22px max(28px,env(safe-area-inset-bottom))}main{max-width:400px;margin:auto}img{width:76px;height:76px;border-radius:20px}h1{font:700 32px Georgia;line-height:1.2;margin:22px 0 12px}strong{display:block;font-size:36px;letter-spacing:5px;margin:24px 0}a{display:block;text-decoration:none;background:#197ca8;color:white;border-radius:17px;padding:18px 12px;font-size:18px;font-weight:700;min-height:24px}a.android{background:transparent;color:#1c6584;font-size:15px;margin-top:12px;padding:13px;border:1px solid #9bc5d9}p{line-height:1.5}small{display:block;font-size:14px;line-height:1.5;color:#45677b;margin:14px 0}a:focus-visible{outline:3px solid #06344f;outline-offset:4px}</style><main><img src="/arctic-play/app/art/brand/icon.webp" alt="Antarctic Kingdoms"/><h1>You're invited to play</h1><p>One private table. Your friends, on any phone.</p><strong aria-label="Room code">${safe}</strong>${valid?`<a href="/arctic-play/app/?room=${safe}">Play in browser · iPhone &amp; Android</a><small>Open in Safari, sign in and join.<br>No download needed.</small><a class="android" href="arcticplay://room/${safe}">Open Android app</a>`:'<p>Ask your friend to send the complete room invitation.</p><a href="/arctic-play/app/">Open the games</a>'}<small>Android and iPhone players share the same board and chat.<br>Return to this link to rejoin your saved seat.</small></main></html>`);return true;
    }
    return false;
  }
  function close(){for(const timer of bots.values())clearTimeout(timer);bots.clear();subscriptions.clear();workers.close();company.close().catch(()=>{});}
  return {dispatch,restoreRoom,handleHttp,disconnected,close,view};
}
module.exports={createArcticPlayService,ROOM_GAME_ID};
