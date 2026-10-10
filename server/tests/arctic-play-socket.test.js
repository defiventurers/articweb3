const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{once}=require('node:events'),{createServer}=require('node:net'),{randomUUID}=require('node:crypto');
const path=require('node:path'),WebSocket=require('ws'),engine=require('../arcticPlayEngine.cjs');
test('Production bootstrap exposes six Android tables over real sockets and preserves website services',{timeout:30000},async t=>{
  const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const child=spawn(process.execPath,['-r','./allGamesBackendBootstrap.js','-e','require("./allGamesBackendBootstrap.js").loadAllGamesBackend()'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DATABASE_URL:'',ETH_SETTLEMENT_SIGNER:'',HIGH_STAKES_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
  let errors='';child.stderr.on('data',data=>errors+=data);const sockets=[];
  t.after(async()=>{for(const ws of sockets)ws.terminate();if(child.exitCode===null){child.kill();await once(child,'exit');}});
  let health;for(let i=0;i<80;i++){if(child.exitCode!==null)throw new Error(errors);try{health=await(await fetch(`http://127.0.0.1:${port}/arctic-play/health`)).json();break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}
  assert.equal(health?.ok,true,errors);assert.equal(health.games.length,6);assert.equal(health.version,engine.VERSION);
  const legacy=await(await fetch(`http://127.0.0.1:${port}/health`)).json();for(const key of ['supportsShogi','supportsXiangqi','supportsSanninShogi','supportsSanYouQi','supportsSanguoQi'])assert.equal(legacy[key],true,key);
  let serial=0;
  async function connect(){const ws=new WebSocket(`ws://127.0.0.1:${port}`);sockets.push(ws);await once(ws,'open');return ws;}
  function request(ws,type,payload){const requestId=`android-${++serial}`;return new Promise((resolve,reject)=>{const handler=raw=>{const packet=JSON.parse(raw);if(packet.requestId!==requestId)return;clearTimeout(timer);ws.off('message',handler);resolve(packet);};const timer=setTimeout(()=>{ws.off('message',handler);reject(new Error(`Timed out: ${type}`));},8000);ws.on('message',handler);ws.send(JSON.stringify({type,requestId,payload}));});}
  for(const game of engine.GAME_LIST){
    const clients=[];
    for(let i=0;i<game.players;i++){
      const ws=await connect(),playerId=randomUUID(),response=await request(ws,i?'ap_room_join':'ap_room_create',{tableId:game.id,playerId,name:`Phone ${i+1}`,roomCode:clients[0]?.credentials.roomCode});assert.notEqual(response.type,'error',response.payload.message);
      const credentials={roomCode:response.payload.room.roomCode,playerId,seatToken:response.payload.seatToken};clients.push({ws,credentials});assert.notEqual((await request(ws,'ap_room_ready',{...credentials,ready:true})).type,'error');
    }
    const host=clients[0],started=await request(host.ws,'ap_room_start',host.credentials);assert.equal(started.payload.room.status,'playing');
    const legal=engine.actions(game.id,started.payload.room.gameState),moved=await request(host.ws,'ap_game_action',{...host.credentials,revision:started.payload.room.revision,actionId:legal[0].id});assert.notEqual(moved.type,'error',moved.payload.message);assert.notEqual(engine.turn(moved.payload.room.gameState),engine.turn(started.payload.room.gameState));
    const chat=await request(clients[1].ws,'ap_room_chat',{...clients[1].credentials,text:`Hello, ${game.name}`});assert.equal(chat.payload.room.chat.at(-1).text,`Hello, ${game.name}`);
    assert.equal((await request(host.ws,'game_state',{roomCode:host.credentials.roomCode})).type,'error','legacy controls cannot modify Android tables');
    const invite=await(await fetch(`http://127.0.0.1:${port}/arctic-play/join?room=${host.credentials.roomCode}`)).text();assert.ok(invite.includes(`arcticplay://room/${host.credentials.roomCode}`));
    for(const c of clients)c.ws.close();
  }
});
