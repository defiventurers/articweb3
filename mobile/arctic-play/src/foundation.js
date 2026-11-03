// The actual existing Navakankari engine, shared without changing its rules.
export * from '../../../frontend/src/games/nine-ice-forts/rules.js';
export {chooseBotAction} from '../../../frontend/src/games/nine-ice-forts/bot.js';
import * as rules from '../../../frontend/src/games/nine-ice-forts/rules.js';
import {chooseBotAction as chooseStrong} from '../../../frontend/src/games/nine-ice-forts/bot.js';
export function beginnerAction(state){const legal=rules.getLegalActions(state);if(!legal.length)return null;return state.pendingRemoval?chooseStrong(state):legal[(state.turn*7+state.noCapturePly*3)%legal.length];}
export async function verifyFoundation(proof){
  if(proof?.id!=='nine-ice-forts'||typeof proof.matchId!=='string'||!proof.matchId||proof.matchId.length>120||!Array.isArray(proof.actions)||!proof.actions.length||proof.actions.length>2000)throw Error('A complete foundation-game move record is required.');
  let state=rules.createNineIceFortsState({mode:'bots'});
  for(const key of proof.actions){
    if(typeof key!=='string'||key.length>30||state.winner)throw Error('Invalid foundation move record.');
    const [type,a,b,...extra]=key.split(':'),action=type==='move'?{type,from:a,to:b}:{type,nodeId:a};
    if(extra.length||rules.actionKey(action)!==key)throw Error('Invalid foundation action.');
    if(state.currentPlayer==='coral'&&rules.actionKey(beginnerAction(state))!==key)throw Error('The foundation bot’s move record could not be verified.');
    const next=rules.applyAction(state,action);if(next.error)throw Error(next.error);state=next.state;
  }
  if(state.winner!=='blue')throw Error('Win against the foundation bot to earn a Lantern Key.');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(proof.actions.join('|'))),signature=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  return {id:'nine-ice-forts',matchId:proof.matchId,signature};
}
