const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { AURORA_GANJIFA_RULESET, STRONG_SUITS, WEAK_SUITS, makeDeck, createAcademyState, getLegalActions, applyAction, playerProjection } = require("../auroraGanjifaRules.js");
const { createAuroraGanjifaService } = require("../auroraGanjifaService.js");
const { injectAuroraGanjifa } = require("../auroraGanjifaBackendBootstrap.js");
const { injectPolarTablan } = require("../polarTablanBackendBootstrap.js");
const { injectAuroraVulture } = require("../auroraVultureBackendBootstrap.js");
const { injectTwoStones } = require("../twoStonesBackendBootstrap.js");
const { injectCowrieKingdoms } = require("../cowrieKingdomsBackendBootstrap.js");
const { injectIceRings } = require("../iceRingsBackendBootstrap.js");
const { injectSkyTempleRun } = require("../skyTempleRunBackendBootstrap.js");
const { injectFortyGlacierGuards } = require("../fortyGlacierGuardsBackendBootstrap.js");
const { injectCrownRun } = require("../crownRunBackendBootstrap.js");
const { injectGlacierTrail } = require("../glacierTrailBackendBootstrap.js");
const { injectSixteenIceWarriors } = require("../sixteenIceWarriorsBackendBootstrap.js");
const { injectBreakTheIce, injectFishflow, injectFourWingIceHunt, injectIceHunters, injectNineIceForts } = require("../loadMultiGameBackend.js");
const { transformBackendSource } = require("../loadPrizeBackend.js");

function harness() {
  const rooms=new Map(), packets=[], saved=[], history=[], sockets=new Map();
  const profiles=new Map([["0xa",{wallet:"0xa",name:"A"}],["0xb",{wallet:"0xb",name:"B"}],["0xc",{wallet:"0xc",name:"C"}],["0xd",{wallet:"0xd",name:"D"}]]);
  const ws={readyState:1,send(){}};
  const service=createAuroraGanjifaService({rooms,profiles,sockets,send(_ws,packet){packets.push(packet);},ok(_ws,requestId,type,payload){packets.push({requestId,type,payload});},fail(_ws,requestId,message){packets.push({requestId,type:"error",payload:{message}});},walletOf(value){return String(value||"").toLowerCase();},profileFor(wallet){return profiles.get(String(wallet||"").toLowerCase());},saveRoomSafe(room){saved.push(JSON.parse(JSON.stringify(room)));},async saveHistoryEntry(entry){history.push(entry);},async getHistoryForWallet(wallet,gameId){return history.filter(entry=>entry.wallet===wallet&&(!gameId||entry.gameId===gameId));}});
  return {rooms,packets,saved,history,service,ws};
}
function payload(h,type){return [...h.packets].reverse().find(packet=>packet.type===type)?.payload;}

test("Mughal teaching deck has eight suits, 96 unique cards and reversed numeral orders",()=>{
  const deck=makeDeck(); assert.equal(deck.length,96); assert.equal(new Set(deck.map(card=>card.id)).size,96); assert.equal(STRONG_SUITS.length,4); assert.equal(WEAK_SUITS.length,4);
  const strongAce=deck.find(card=>card.id==="taj-1"), strongTen=deck.find(card=>card.id==="taj-10");
  const weakAce=deck.find(card=>card.id==="surkh-1"), weakTen=deck.find(card=>card.id==="surkh-10");
  assert.ok(strongAce.strength>strongTen.strength); assert.ok(weakTen.strength>weakAce.strength);
});

test("three and four player deals divide the full pack equally and Taj Raja opens",()=>{
  for(const count of [3,4]){const state=createAcademyState({playerCount:count,seed:42});assert.equal(state.seats.length,count);assert.equal(state.seats.every(seat=>state.hands[seat].length===96/count),true);assert.equal(state.hands[state.currentPlayer].some(card=>card.id==="taj-raja"),true);}
});

test("follow-suit is compulsory and highest led-suit denomination wins",()=>{
  const state=createAcademyState({playerCount:3,seed:2});
  state.hands={north:[makeDeck().find(c=>c.id==="taj-7"),makeDeck().find(c=>c.id==="surkh-10")],west:[makeDeck().find(c=>c.id==="taj-1"),makeDeck().find(c=>c.id==="surkh-1")],south:[makeDeck().find(c=>c.id==="taj-10"),makeDeck().find(c=>c.id==="barat-raja")]};
  state.currentPlayer="north";state.leader="north";state.currentTrick=[];state.completedTricks=[];state.tricksWon={north:0,west:0,south:0};state.capturedCards={north:0,west:0,south:0};
  let next=applyAction(state,{cardId:"taj-7"},"north").state;
  assert.deepEqual(getLegalActions(next,"west").map(a=>a.cardId),["taj-1"]);
  next=applyAction(next,{cardId:"taj-1"},"west").state;
  next=applyAction(next,{cardId:"taj-10"},"south").state;
  assert.equal(next.tricksWon.west,1);assert.equal(next.currentPlayer,"west");
});

test("private projection exposes only the viewer hand",()=>{
  const state=createAcademyState({playerCount:3,seed:4});const view=playerProjection(state,"north");
  assert.equal(view.privateHand.length,32);assert.equal(view.hands,undefined);assert.deepEqual(view.handCounts,{north:32,west:32,south:32});
  assert.equal(playerProjection(state,null).privateHand.length,0);
});

test("authoritative rooms wait for every seat, deal private hands and reject wrong turns",()=>{
  const h=harness();h.service.createRoom(h.ws,"create",{wallet:"0xa",playerCount:3,visibility:"private"});const created=payload(h,"ag_room_create_result").room;assert.equal(created.status,"waiting");
  h.service.joinRoom(h.ws,"join-b",{wallet:"0xb",roomCode:created.roomCode});h.service.joinRoom(h.ws,"join-c",{wallet:"0xc",roomCode:created.roomCode});
  const joined=payload(h,"ag_room_join_result").room;assert.equal(joined.status,"playing");assert.equal(joined.gameState.privateHand.length,32);assert.equal(joined.gameState.hands,undefined);assert.equal(typeof joined.shuffleCommitment,"string");assert.equal(joined.shuffleReveal,null);
  const room=h.rooms.get(created.roomCode);const wrong=Object.values(room.players).find(player=>player.seat!==room.gameState.currentPlayer);h.service.action(h.ws,"wrong",{wallet:wrong.wallet,roomCode:room.roomCode,action:{cardId:room.gameState.hands[wrong.seat][0].id}});assert.match(payload(h,"error").message,/not your turn/i);
});

test("persisted hidden-state rooms restore without leaking hands through room listings",()=>{
  const h=harness();h.service.createRoom(h.ws,"create",{wallet:"0xa",playerCount:4,visibility:"public"});const roomCode=payload(h,"ag_room_create_result").room.roomCode;["0xb","0xc","0xd"].forEach((wallet,index)=>h.service.joinRoom(h.ws,`join-${index}`,{wallet,roomCode}));
  const room=h.rooms.get(roomCode);assert.equal(h.service.restoreRoom(JSON.parse(JSON.stringify(room))),true);h.service.listRooms(h.ws,"list");const list=payload(h,"ag_room_list_result").rooms;assert.equal(list.length,0);assert.equal(h.service.roomView(room).gameState.privateHand.length,0);
});

test("backend transformer installs Ganjifa dispatch, restore and private-state health flags",()=>{
  const source=fs.readFileSync(path.join(__dirname,"..","index.js"),"utf8");
  const transformed=injectAuroraGanjifa(injectPolarTablan(injectAuroraVulture(injectTwoStones(injectCowrieKingdoms(injectIceRings(injectSkyTempleRun(injectFortyGlacierGuards(injectCrownRun(injectGlacierTrail(injectSixteenIceWarriors(injectIceHunters(injectBreakTheIce(injectFishflow(injectFourWingIceHunt(injectNineIceForts(transformBackendSource(source)))))))))))))))));
  assert.match(transformed,/createAuroraGanjifaService/);assert.match(transformed,/type === "ag_game_action"/);assert.match(transformed,/auroraGanjifa\.restoreRoom\(room\)/);assert.match(transformed,/supportsAuroraGanjifa: true/);assert.match(transformed,/privateCardState: true/);
});
