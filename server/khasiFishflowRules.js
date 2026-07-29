const KHASI_FISHFLOW_RULESET = Object.freeze({ gameId: "khasi-fishflow", rulesetVersion: "mawkar-katiya-das-gupta-1924-digital-1.0.0", traditionalName: "Mawkar Katiya", players: 2, pitsPerSide: 7, openingSeedsPerPit: 5, totalSeeds: 70 });
const SIDES = Object.freeze(["aurora", "ember"]);
const PIT_IDS = Object.freeze(["a0","a1","a2","a3","a4","a5","a6","e6","e5","e4","e3","e2","e1","e0"]);
const SIDE_PITS = Object.freeze({ aurora: Object.freeze(["a0","a1","a2","a3","a4","a5","a6"]), ember: Object.freeze(["e6","e5","e4","e3","e2","e1","e0"]) });
const OPPOSITE = Object.freeze(Object.fromEntries(Array.from({ length: 7 }, (_, index) => [[`a${index}`,`e${index}`],[`e${index}`,`a${index}`]]).flat()));
const otherSide = (side) => side === "aurora" ? "ember" : "aurora";
const sideName = (side) => side === "ember" ? "Ember Current" : "Aurora Current";
const clone = (value) => JSON.parse(JSON.stringify(value));

function createKhasiFishflowState({ mode = "online", starter = "aurora" } = {}) {
  const state = { gameId: KHASI_FISHFLOW_RULESET.gameId, rulesetVersion: KHASI_FISHFLOW_RULESET.rulesetVersion, mode, currentPlayer: starter === "ember" ? "ember" : "aurora", round: 1, turn: 1, pits: Object.fromEntries(PIT_IDS.map((id) => [id,5])), active: Object.fromEntries(PIT_IDS.map((id) => [id,true])), stores: { aurora:0, ember:0 }, reserves: { aurora:0, ember:0 }, handicapValue: { aurora:0, ember:0 }, partialPit: { aurora:null, ember:null }, fullSide:null, phase:"play", winner:null, winReason:null, lastMove:null, history:[] };
  assertStateInvariant(state); return state;
}
function createKhasiCaptureDrill() { const state = createKhasiFishflowState({ mode:"drill" }); for (const id of PIT_IDS) state.pits[id]=0; state.pits.a0=1; state.pits.e2=4; assertStateInvariant(state); return state; }
function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.phase !== "play" || state.winner || side !== state.currentPlayer) return [];
  const blocked = state.partialPit[side];
  return SIDE_PITS[side].filter((id) => state.active[id] && state.pits[id] > 0 && id !== blocked).map((pitId) => ({ type:"sow", pitId }));
}
function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid:false, reason:"Missing Mawkar Katiya state." };
  if (state.winner || state.phase !== "play") return { valid:false, reason:"This Mawkar Katiya match is not accepting moves." };
  if (side !== state.currentPlayer) return { valid:false, reason:"It is not this current's turn." };
  if (!action || action.type !== "sow" || typeof action.pitId !== "string") return { valid:false, reason:"Choose one legal pit on your row." };
  return getLegalActions(state, side).some((candidate) => candidate.pitId === action.pitId) ? { valid:true } : { valid:false, reason:"That pit is empty, inactive, restricted, or on the rival row." };
}
function nextActiveIndex(state, cursor) { for (let offset=1; offset<=PIT_IDS.length; offset+=1) { const index=(cursor+offset)%PIT_IDS.length; if (state.active[PIT_IDS[index]]) return index; } return -1; }
function applyPartialPitTax(state, activeSide, pitId) { if (state.fullSide !== activeSide) return 0; const loser=otherSide(activeSide); if (state.partialPit[loser] !== pitId || state.pits[pitId] <= 0) return 0; state.pits[pitId]-=1; state.stores[activeSide]+=1; return 1; }
function applyReactiveHandicap(state, activeSide, pitId) { const defender=otherSide(activeSide); const target=Number(state.handicapValue[defender]||0); if (!target || !state.active[pitId] || state.pits[pitId] !== target) return 0; const captured=state.pits[pitId]; state.pits[pitId]=0; state.stores[defender]+=captured; return captured; }
function resolveRelay(state, startPit, side) {
  let hand=state.pits[startPit]; state.pits[startPit]=0; let cursor=PIT_IDS.indexOf(startPit); let sowCount=0; let relays=0; let taxCaptured=0; let reactiveCaptured=0; const seen=new Set();
  while (true) {
    const signature=`${cursor}|${hand}|${PIT_IDS.map((id)=>state.pits[id]).join(",")}|${state.stores.aurora}|${state.stores.ember}`;
    if (seen.has(signature)) return { error:"That relay enters a repeated sowing cycle." }; seen.add(signature);
    while (hand>0) { cursor=nextActiveIndex(state,cursor); if (cursor<0) return { error:"No active pit remains for sowing." }; const pitId=PIT_IDS[cursor]; state.pits[pitId]+=1; hand-=1; sowCount+=1; taxCaptured+=applyPartialPitTax(state,side,pitId); reactiveCaptured+=applyReactiveHandicap(state,side,pitId); }
    const nextIndex=nextActiveIndex(state,cursor); if (nextIndex<0) return { error:"No active pit remains after the relay." }; const nextPit=PIT_IDS[nextIndex];
    if (state.pits[nextPit]>0) { hand=state.pits[nextPit]; state.pits[nextPit]=0; cursor=nextIndex; relays+=1; continue; }
    const capturePit=OPPOSITE[nextPit]; if (capturePit && state.active[capturePit] && state.pits[capturePit]>0) { state.stores[side]+=state.pits[capturePit]; state.pits[capturePit]=0; }
    return { sowCount, relays, stopPit:PIT_IDS[cursor], gapPit:nextPit, capturePit, taxCaptured, reactiveCaptured };
  }
}
function boardSeedCount(state) { return PIT_IDS.reduce((sum,id)=>sum+Number(state.pits[id]||0),0); }
function settleUnplayablePartial(state, force=false) { const winner=state.fullSide; if (!winner) return; const loser=otherSide(winner); const pitId=state.partialPit[loser]; if (!pitId || state.pits[pitId]<=0) return; const legalWithout=SIDE_PITS[loser].some((id)=>state.active[id]&&state.pits[id]>0&&id!==pitId); const winnerCan=SIDE_PITS[winner].some((id)=>state.active[id]&&state.pits[id]>0); if (!force&&(legalWithout||winnerCan)) return; state.stores[winner]+=state.pits[pitId]; state.pits[pitId]=0; }
function distributeRound(state, side, total) { let remaining=total; for (const pitId of SIDE_PITS[side]) { if (remaining>=5) { state.pits[pitId]=5; state.active[pitId]=true; remaining-=5; } else if (remaining>0) { state.pits[pitId]=remaining; state.active[pitId]=true; state.partialPit[side]=pitId; state.handicapValue[side]=remaining; remaining=0; } } if (remaining>0) { state.reserves[side]=remaining; state.handicapValue[side]=remaining; } }
function finishRound(state) {
  state.lastMove.roundEnded=true; const totals={ aurora:state.stores.aurora+state.reserves.aurora, ember:state.stores.ember+state.reserves.ember };
  if (totals.aurora+totals.ember!==70) throw new Error("Mawkar Katiya ownership total changed at round end.");
  if (totals.aurora===70||totals.ember===70) { state.winner=totals.aurora>totals.ember?"aurora":"ember"; state.winReason="all-seeds-owned"; state.phase="finished"; return; }
  state.round+=1; state.currentPlayer=totals.aurora>=totals.ember?"aurora":"ember"; state.stores={aurora:0,ember:0}; state.reserves={aurora:0,ember:0}; state.handicapValue={aurora:0,ember:0}; state.partialPit={aurora:null,ember:null}; state.fullSide=null;
  for (const id of PIT_IDS) { state.pits[id]=0; state.active[id]=false; }
  for (const side of SIDES) distributeRound(state,side,totals[side]);
  if (totals.aurora>=35&&totals.ember<35) state.fullSide="aurora"; if (totals.ember>=35&&totals.aurora<35) state.fullSide="ember";
  state.phase="play"; state.history.push({ type:"round-start", round:state.round, totals, fullSide:state.fullSide, partialPit:clone(state.partialPit), handicapValue:clone(state.handicapValue) });
}
function applyAction(state, action, side = state.currentPlayer) {
  const validation=validateAction(state,action,side); if (!validation.valid) return { state, error:validation.reason };
  const next=clone(state); const ownBefore=next.stores[side]; const oppBefore=next.stores[otherSide(side)]; const relay=resolveRelay(next,action.pitId,side); if (relay.error) return { state,error:relay.error };
  next.lastMove={ type:"sow", side, pitId:action.pitId, sowCount:relay.sowCount, relays:relay.relays, stopPit:relay.stopPit, gapPit:relay.gapPit, capturePit:relay.capturePit, captured:next.stores[side]-ownBefore, opponentHandicapCapture:next.stores[otherSide(side)]-oppBefore, taxCaptured:relay.taxCaptured, reactiveCaptured:relay.reactiveCaptured, roundEnded:false };
  next.history.push({ type:"move", round:next.round, turn:next.turn, move:clone(next.lastMove) }); next.currentPlayer=otherSide(side); next.turn+=1; settleUnplayablePartial(next);
  if (boardSeedCount(next)===0) finishRound(next); else if (!getLegalActions(next,next.currentPlayer).length) { const fallback=otherSide(next.currentPlayer); if (getLegalActions(next,fallback).length) next.currentPlayer=fallback; else { settleUnplayablePartial(next,true); if (boardSeedCount(next)===0) finishRound(next); } }
  assertStateInvariant(next); return { state:next,error:null };
}
function getPlayerSummary(state,side){ return { captured:state.stores[side], reserve:state.reserves[side], activePits:SIDE_PITS[side].filter((id)=>state.active[id]).length, handicapValue:state.handicapValue[side], partialPit:state.partialPit[side] }; }
function resultTitle(state){ return state.winner?`${sideName(state.winner)} owns all seventy stones`:"Khasi relay in progress"; }
function resultDetail(state){ return state.winReason==="all-seeds-owned"?"The final handicap round transferred every stone to one player.":"The Mawkar Katiya match is complete."; }
function assertStateInvariant(state){ const total=boardSeedCount(state)+state.stores.aurora+state.stores.ember+state.reserves.aurora+state.reserves.ember; if(total!==70) throw new Error(`Mawkar Katiya seed invariant failed: ${total}.`); for(const id of PIT_IDS){ if(!Number.isInteger(state.pits[id])||state.pits[id]<0) throw new Error(`Invalid pit count at ${id}.`); if(!state.active[id]&&state.pits[id]!==0) throw new Error(`Inactive pit ${id} contains stones.`); } return true; }
module.exports={ KHASI_FISHFLOW_RULESET,SIDES,PIT_IDS,SIDE_PITS,OPPOSITE,otherSide,sideName,createKhasiFishflowState,createKhasiCaptureDrill,getLegalActions,validateAction,applyAction,boardSeedCount,getPlayerSummary,resultTitle,resultDetail,assertStateInvariant };
