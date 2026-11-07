import {useEffect,useRef} from 'react';
import {read,write} from './storage.js';
import {cleanConquests,qualifyingConquest} from './adventureModel.js';
export const conquestScope=()=>read('cloud-session',{}).accountId||'device';
export const conquestKey=scope=>'conquest-stamps.v1.'+scope;
export function readConquests(scope=conquestScope()){return cleanConquests(read(conquestKey(scope),{}));}
export function recordConquest(entry,scope=conquestScope()){
 if(!entry||scope!==conquestScope())return false;
 const current=readConquests(scope);if(current[entry.id])return false;
 const next=cleanConquests({...current,[entry.id]:entry});return !!next[entry.id]&&write(conquestKey(scope),next);
}
// Cosmetic victories only. Never writes hall unlocks, purchases or Passport lanterns.
export function useConquestOutcome(input){
 const tracker=useRef(null),scope=input.scope||conquestScope();
 useEffect(()=>{
  const active=input.enabled!==false&&input.id;
  if(!active){tracker.current=null;return;}
  const key=scope+':'+input.id+':'+(input.matchId||'current');
  let t=tracker.current;
  if(!t||t.key!==key){t={key,started:false,eligible:true,count:0,matchId:input.matchId||input.id+':'+Date.now()};tracker.current=t;}
  if(!input.outcome){
   if(input.actions===0){t.eligible=true;t.count=0;}
   else if(input.actions<t.count)t.eligible=false;
   t.started=true;t.count=input.actions||0;return;
  }
  const entry=qualifyingConquest({...input,matchId:t.matchId,started:t.started,eligible:input.eligible!==false&&t.eligible,actions:input.actions||0});
  if(entry)recordConquest(entry,scope);
 },[scope,input.id,input.matchId,input.outcome,input.mode,input.seat,input.actions,input.eligible,input.enabled]);
}
