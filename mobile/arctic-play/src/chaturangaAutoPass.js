import {isLongDiceState,longDiceActions,applyLongDice} from './chaturangaLongDice.js';

// UI assistance submits existing, server-validated pass actions. It never changes rules.
export function automaticPassPlan(state,legal){
 if(!isLongDiceState(state)||!state.dice?.rolled||state.gameOver||state.mobileResult||state.revivalPassRequired)return null;
 legal ||= longDiceActions(state);
 const unused=[0,1].filter(i=>!state.dice.used[i]);
 const moves=legal.filter(a=>a.kind==='move');
 const blocked=unused.filter(i=>!moves.some(a=>a.raw.dieIndex===i));
 if(!blocked.length)return null;
 if(!moves.length){const action=legal.find(a=>a.kind==='end');return action?{action,dice:blocked,wholeTurn:true}:null;}
 const safe=blocked.filter(index=>!moves.some(move=>{
  const next=applyLongDice(state,move.id);
  return next.turn===state.turn&&next.mobileTurnNumber===state.mobileTurnNumber&&longDiceActions(next).some(a=>a.kind==='move'&&a.raw.dieIndex===index);
 }));
 const action=safe.length&&legal.find(a=>a.kind==='pass'&&a.raw.index===safe[0]);
 return action?{action,dice:[safe[0]],wholeTurn:false}:null;
}
export function chaturangaRollKey(matchId,state){return state?`${matchId}:${state.turn}:${state.mobileTurnNumber||0}:${state.dice?.values?.join(',')}`:'';}
