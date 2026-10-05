const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createServer } = require("node:net");
const { randomBytes } = require("node:crypto");
const path = require("node:path");
const WebSocket = require("ws");
const { getLegalActions } = require("../shogiEngine.cjs");

test("production lobby sockets invite, start, play, reconnect and run a Shogi worker bot", {timeout:30000}, async t => {
  const reservation=createServer();reservation.listen(0,"127.0.0.1");await once(reservation,"listening");
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const child=spawn(process.execPath,["-r","./allGamesBackendBootstrap.js","-e",'require("./allGamesBackendBootstrap.js").loadAllGamesBackend()'],{cwd:path.join(__dirname,".."),env:{...process.env,PORT:String(port),DATABASE_URL:"",ETH_SETTLEMENT_SIGNER:"",HIGH_STAKES_ENABLED:"false"},stdio:["ignore","pipe","pipe"]});
  const sockets=[];let errors="";child.stderr.on("data",chunk=>{errors+=chunk.toString();});
  t.after(async()=>{for(const ws of sockets) ws.terminate();if(child.exitCode===null){child.kill();await once(child,"exit");}});
  let ready=false;
  for(let i=0;i<60;i++) {
    if(child.exitCode!==null) throw new Error(`Lobby startup failed: ${errors}`);
    try { const health=await (await fetch(`http://127.0.0.1:${port}/health`)).json();assert.equal(health.supportsShogi,true);assert.equal(health.supportsSanninShogi,true);ready=true;break;} catch {await new Promise(resolve=>setTimeout(resolve,100));}
  }
  assert.ok(ready,errors);
  let serial=0;
  async function connect(){const ws=new WebSocket(`ws://127.0.0.1:${port}`);sockets.push(ws);await once(ws,"open");return ws;}
  function request(ws,type,payload={}) {
    const requestId=`test-${++serial}`;
    return new Promise((resolve,reject)=>{
      const handler=raw=>{const packet=JSON.parse(raw);if(packet.requestId!==requestId)return;clearTimeout(timer);ws.off("message",handler);resolve(packet);};
      const timer=setTimeout(()=>{ws.off("message",handler);reject(new Error(`Timed out: ${type}`));},5000);
      ws.on("message",handler);ws.send(JSON.stringify({type,requestId,payload}));
    });
  }
  const token=()=>randomBytes(32).toString("hex");
  const hostWs=await connect(),friendWs=await connect(),hostToken=token(),friendToken=token();
  const created=await request(hostWs,"sh_room_create",{name:"Host",humanCount:2,faction:"red",difficulty:"hard",visibility:"private",token:hostToken});
  assert.notEqual(created.type,"error",created.payload.message);
  const roomCode=created.payload.room.roomCode,host={roomCode,playerId:created.payload.playerId,token:hostToken};
  const joined=await request(friendWs,"sh_room_join",{roomCode,name:"Friend",token:friendToken});
  assert.notEqual(joined.type,"error",joined.payload.message);
  const friend={roomCode,playerId:joined.payload.playerId,token:friendToken};
  for(const [ws,creds] of [[hostWs,host],[friendWs,friend]]) await request(ws,"sh_room_ready",{...creds,ready:true});
  const started=await request(hostWs,"sh_room_start",host);assert.equal(started.payload.room.status,"playing");
  const moved=await request(hostWs,"sh_game_action",{...host,revision:started.payload.room.revision,action:getLegalActions(started.payload.room.gameState)[0]});
  assert.equal(moved.payload.room.gameState.turn,"blue");
  assert.deepEqual((await request(friendWs,"sh_game_state",friend)).payload.room.gameState,moved.payload.room.gameState);
  assert.equal((await request(hostWs,"spectate_room",{roomCode})).type,"error");
  friendWs.close();await once(friendWs,"close");
  assert.equal((await request(await connect(),"sh_game_state",friend)).payload.room.players.length,2);
  const soloToken=token();
  const soloRoom=await request(hostWs,"sh_room_create",{name:"Blue human",humanCount:1,faction:"blue",difficulty:"hard",visibility:"private",token:soloToken});
  const solo={roomCode:soloRoom.payload.room.roomCode,playerId:soloRoom.payload.playerId,token:soloToken};
  await request(hostWs,"sh_room_ready",{...solo,ready:true});await request(hostWs,"sh_room_start",solo);
  let reply;
  for(let i=0;i<70;i++){reply=await request(hostWs,"sh_game_state",solo);if(reply.payload.room.gameState.ply>1)break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert.equal(reply.payload.room.gameState.ply,2);assert.equal(reply.payload.room.gameState.turn,"blue");
});
