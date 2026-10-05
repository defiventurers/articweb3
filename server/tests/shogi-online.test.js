const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { randomBytes } = require("node:crypto");
const { createShogiService } = require("../shogiService.js");
const { getLegalActions, chooseShogiSearchAction, RULESET_VERSION } = require("../shogiEngine.cjs");
const token = () => randomBytes(32).toString("hex");

function harness(t, options={}) {
  const rooms=new Map(), packets=[], saves=[];
  const service=createShogiService({ rooms, send:(ws,packet)=>packets.push({ws,...packet}), ok:(ws,requestId,type,payload)=>packets.push({ws,requestId,type,payload}), fail:(ws,requestId,message)=>packets.push({ws,requestId,type:"error",payload:{message}}), saveRoomSafe:room=>saves.push(room), chooseBot:async state=>chooseShogiSearchAction(state,"easy"), botDelay:1, ...options });
  t.after(()=>service.close());
  let serial=0;
  const socket=()=>Object.assign(new EventEmitter(),{readyState:1});
  const call=(ws,type,payload={})=>{const requestId=String(++serial);service.dispatch(ws,requestId,type,payload);return packets.find(packet=>packet.requestId===requestId);};
  function create(count=2,visibility="public",faction="red") {
    const ws=socket(),secret=token();
    const result=call(ws,"sh_room_create",{name:"Host",humanCount:count,visibility,faction,difficulty:"hard",token:secret});
    assert.notEqual(result.type,"error",result.payload.message);
    return {ws,room:result.payload.room,creds:{roomCode:result.payload.room.roomCode,playerId:result.payload.playerId,token:secret}};
  }
  function join(code) {
    const ws=socket(),secret=token(),result=call(ws,"sh_room_join",{roomCode:code,name:"Friend",token:secret});
    assert.notEqual(result.type,"error",result.payload.message);
    return {ws,room:result.payload.room,creds:{roomCode:code,playerId:result.payload.playerId,token:secret}};
  }
  function start(host,others=[],fillWithBots=false) {
    for(const player of [host,...others]) call(player.ws,"sh_room_ready",{...player.creds,ready:true});
    return call(host.ws,"sh_room_start",{...host.creds,fillWithBots});
  }
  return {service,rooms,packets,saves,socket,call,create,join,start};
}

test("two Shogi seats start only when ready and reject third players",t=>{
  const h=harness(t),host=h.create();
  assert.equal(h.call(host.ws,"sh_room_start",host.creds).type,"error");
  const friend=h.join(host.room.roomCode);
  assert.equal(h.call(friend.ws,"sh_room_start",friend.creds).type,"error");
  assert.equal(h.call(h.socket(),"sh_room_join",{roomCode:host.room.roomCode,name:"Third",token:token()}).type,"error");
  const started=h.start(host,[friend]);
  assert.equal(started.payload.room.status,"playing");
  assert.equal(started.payload.room.gameState.board.filter(Boolean).length,40);
  assert.equal(started.payload.room.difficulty,"hard");
  assert.equal(h.call(h.socket(),"sh_room_create",{name:"Wrong",humanCount:3,faction:"red",difficulty:"easy",token:token()}).type,"error");
});

test("private rooms stay out of listings and public rooms expose no credentials",t=>{
  const h=harness(t);h.create(2,"private");const host=h.create();
  const list=h.call(host.ws,"sh_room_list").payload.rooms;
  assert.equal(list.length,1);assert.equal(list[0].roomCode,host.room.roomCode);
  assert.equal(JSON.stringify(host.room).includes(host.creds.token),false);
  assert.equal(JSON.stringify(host.room).includes("tokenHash"),false);
});

test("only the current authenticated seat can submit a legal action at the current revision",t=>{
  const h=harness(t),host=h.create(),friend=h.join(host.room.roomCode);
  const room=h.start(host,[friend]).payload.room,action=getLegalActions(room.gameState)[0];
  assert.equal(h.call(friend.ws,"sh_game_action",{...friend.creds,revision:room.revision,action}).type,"error");
  assert.equal(h.call(host.ws,"sh_game_action",{...host.creds,token:token(),revision:room.revision,action}).type,"error");
  assert.equal(h.call(host.ws,"sh_game_action",{...host.creds,revision:room.revision,action:{kind:"move",from:0,to:80}}).type,"error");
  const moved=h.call(host.ws,"sh_game_action",{...host.creds,revision:room.revision,action});
  assert.equal(moved.payload.room.gameState.turn,"blue");
  assert.ok(h.packets.some(packet=>packet.ws===friend.ws&&packet.type==="sh_room_state"&&packet.payload.room.revision===room.revision+1));
  const reply=getLegalActions(moved.payload.room.gameState)[0];
  assert.equal(h.call(friend.ws,"sh_game_action",{...friend.creds,revision:room.revision,action:reply}).type,"error");
  assert.notEqual(h.call(friend.ws,"sh_game_action",{...friend.creds,revision:room.revision+1,action:reply}).type,"error");
});

test("a Blue human starts after the Red bot's opening move",async t=>{
  const h=harness(t),host=h.create(1,"private","blue");
  assert.equal(h.start(host).payload.room.status,"playing");
  for(let i=0;i<30&&h.rooms.get(host.room.roomCode).gameState.ply===1;i++) await new Promise(resolve=>setTimeout(resolve,10));
  const game=h.rooms.get(host.room.roomCode).gameState;
  assert.equal(game.ply,2);assert.equal(game.turn,"blue");
});

test("reconnect preserves the seat and match; leaving transfers the active seat to a bot",t=>{
  const h=harness(t),host=h.create(),friend=h.join(host.room.roomCode);h.start(host,[friend]);
  friend.ws.readyState=3;friend.ws.emit("close");
  const ws=h.socket(),restored=h.call(ws,"sh_game_state",friend.creds).payload.room;
  assert.equal(restored.players.length,2);assert.equal(restored.players.find(p=>p.id===friend.creds.playerId).connected,true);
  h.call(ws,"sh_room_leave",friend.creds);
  assert.equal(h.rooms.get(host.room.roomCode).seats.blue.kind,"bot");
  assert.equal(h.call(ws,"sh_game_state",friend.creds).type,"error");
});

test("restored rooms with incompatible rules are cancelled",t=>{
  const h=harness(t),host=h.create(),room=h.rooms.get(host.room.roomCode);
  assert.equal(room.rulesetVersion,RULESET_VERSION);
  room.rulesetVersion="old";h.service.restoreRoom(room);assert.equal(room.status,"cancelled");
});
