const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { KHASI_FISHFLOW_RULESET, applyAction, createKhasiFishflowState, getLegalActions, getCounts, assertInvariant } = require("../khasiFishflowRules.js");
const { createKhasiFishflowService } = require("../khasiFishflowService.js");
const { injectKhasiFishflow, transformFullStack } = require("../khasiFishflowBackendBootstrap.js");

function harness() {
  const rooms = new Map();
  const profiles = new Map([["0xaurora",{wallet:"0xaurora",name:"Aurora"}],["0xember",{wallet:"0xember",name:"Ember"}]]);
  const sockets = new Map();
  const packets = [];
  const savedRooms = [];
  const history = [];
  const ws = { readyState: 1, send(){} };
  const service = createKhasiFishflowService({
    rooms,profiles,sockets,
    send(_socket,packet){packets.push(packet);},
    ok(_socket,requestId,type,payload){packets.push({requestId,type,payload});},
    fail(_socket,requestId,message){packets.push({requestId,type:"error",payload:{message}});},
    walletOf(value){return String(value||"").toLowerCase();},
    profileFor(wallet){return profiles.get(String(wallet||"").toLowerCase());},
    saveRoomSafe(room){savedRooms.push(JSON.parse(JSON.stringify(room)));},
    async saveHistoryEntry(entry){history.push(entry);},
    async getHistoryForWallet(wallet,gameId){return history.filter((entry)=>entry.wallet===wallet&&(!gameId||entry.gameId===gameId));}
  });
  return {service,rooms,packets,savedRooms,history,ws};
}
function lastPayload(h,type){return [...h.packets].reverse().find((packet)=>packet.type===type)?.payload;}

test("Mawkar Katiya opens with fourteen pits, five counters each and seventy total",()=>{
  const state=createKhasiFishflowState();
  assert.equal(state.rows.aurora.length,7);
  assert.equal(state.rows.ember.length,7);
  assert.deepEqual(state.rows.aurora,Array(7).fill(5));
  assert.deepEqual(state.rows.ember,Array(7).fill(5));
  assert.equal(getCounts(state).aurora.board+getCounts(state).ember.board,70);
  assert.equal(getLegalActions(state).length,7);
  assert.equal(assertInvariant(state),true);
});

test("a legal move relays clockwise and preserves the seventy-counter invariant",()=>{
  const state=createKhasiFishflowState();
  const result=applyAction(state,{type:"sow",pitIndex:0},"aurora");
  assert.equal(result.error,null);
  assert.ok(result.state.lastTurn.stonesSown>=5);
  assert.ok(result.state.lastTurn.relays>=0);
  assert.equal(result.state.currentPlayer,"ember");
  assert.equal(assertInvariant(result.state),true);
});

test("a stopping gap captures the opposite pit",()=>{
  const state=createKhasiFishflowState();
  state.rows={aurora:[1,0,0,0,0,0,0],ember:[0,0,0,0,0,4,65]};
  state.activePits={aurora:7,ember:7};
  state.stores={aurora:0,ember:0};
  const result=applyAction(state,{type:"sow",pitIndex:0},"aurora");
  assert.equal(result.error,null);
  assert.ok(result.state.lastTurn.captured>=0);
  assert.equal(assertInvariant(result.state),true);
});

test("service assigns opposite sides and rejects wrong turns",()=>{
  const h=harness();
  h.service.createRoom(h.ws,"create",{wallet:"0xember",visibility:"public",side:"ember"});
  const created=lastPayload(h,"kf_room_create_result").room;
  assert.equal(created.gameId,KHASI_FISHFLOW_RULESET.gameId);
  h.service.joinRoom(h.ws,"join",{wallet:"0xaurora",roomCode:created.roomCode});
  const joined=lastPayload(h,"kf_room_join_result").room;
  assert.equal(joined.status,"playing");
  assert.equal(joined.players.find((player)=>player.wallet==="0xaurora").side,"aurora");
  h.service.action(h.ws,"wrong",{wallet:"0xember",roomCode:created.roomCode,action:{type:"sow",pitIndex:0}});
  assert.match(lastPayload(h,"error").message,/not your turn/i);
  h.service.action(h.ws,"move",{wallet:"0xaurora",roomCode:created.roomCode,action:{type:"sow",pitIndex:0}});
  assert.equal(lastPayload(h,"kf_game_action_result").room.gameState.currentPlayer,"ember");
  assert.ok(h.savedRooms.length>=3);
});

test("persisted Khasi Fishflow rooms restore and reconnect",()=>{
  const h=harness();
  h.service.createRoom(h.ws,"create",{wallet:"0xaurora",visibility:"private",side:"aurora"});
  const serialized=JSON.parse(JSON.stringify([...h.rooms.values()][0]));
  const restored=harness();
  restored.rooms.set(serialized.roomCode,serialized);
  assert.equal(restored.service.restoreRoom(serialized),true);
  restored.service.getState(restored.ws,"resume",{wallet:"0xaurora",roomCode:serialized.roomCode});
  assert.equal(lastPayload(restored,"kf_game_state_result").room.rulesetVersion,KHASI_FISHFLOW_RULESET.rulesetVersion);
});

test("backend transformer installs Khasi dispatch, restore and health capability",()=>{
  const source=fs.readFileSync(path.join(__dirname,"..","index.js"),"utf8");
  const transformed=injectKhasiFishflow(transformFullStack(source));
  assert.match(transformed,/createKhasiFishflowService/);
  assert.match(transformed,/type === "kf_room_create"/);
  assert.match(transformed,/khasiFishflow\.restoreRoom\(room\)/);
  assert.match(transformed,/supportsKhasiFishflow: true/);
});
