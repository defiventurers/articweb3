import {useEffect,useRef,useState} from 'react';
import model from './unlockModel.cjs';
import {read,write} from './storage.js';
import {cloudSnapshot,watchCloud} from './cloud.js';
import {roomClient} from './network.js';
export {model as UNLOCKS};
const scope=()=>cloudSnapshot().session?.accountId||'device';
const key=id=>'hall-journey.v1.'+id;
function savedProgress(id){
 const saved=read(key(id),null);if(saved)return model.clean(saved);
 const owner=read('legacy-journey-account.v1',null);
 if(id!=='device'&&(!owner||owner===id)){write('legacy-journey-account.v1',id);const progress=model.clean(read(key('device'),{}));write(key(id),progress);write('hall-win-evidence.v1.'+id,read('hall-win-evidence.v1.device',[]));return progress;}
 return model.empty();
}
const tokenKey='hall-device-token.v1';
export function useHallAccess(playerId,offlineEntitlements={}){
  const [revision,setRevision]=useState(0),ref=useRef(null),syncing=useRef(null),active=useRef(true);
  if(!ref.current)ref.current={scope:scope(),progress:savedProgress(scope()),entitlements:{},festivals:[],serverNow:0,receivedAt:0,service:false,status:'Progress stays on this phone'};
  const publish=patch=>{ref.current={...ref.current,...patch};if(patch.progress&&!write(key(ref.current.scope),model.clean(patch.progress)))ref.current.status='Phone storage is full. Free space to keep your progress.';if(active.current)setRevision(n=>n+1);};
  function credentials(){return{playerId,accessToken:read(tokenKey,null),...(cloudSnapshot().session?{cloudSession:cloudSnapshot().session.session}:{})};}
  function accept(value,expected=scope()){
    if(expected!==scope()||expected!==ref.current.scope)return;
    publish({progress:model.clean(value.progress),entitlements:value.entitlements||{},festivals:model.festivalsFrom(value.festivals),serverNow:value.serverNow||0,receivedAt:performance.now(),service:true,status:expected==='device'?'Journey synced on this phone':'Journey saved to your account'});
  }
  async function uploadProof(proof){if(proof.id==='nine-ice-forts')return roomClient.call('ap_access_foundation',{...credentials(),proof});let response;for(let start=0,part=0;start<proof.actions.length;start+=150,part++)response=await roomClient.call('ap_access_replay',{...credentials(),part,final:start+150>=proof.actions.length,proof:{...proof,actions:proof.actions.slice(start,start+150)}});return response;}
  async function refresh(){
    if(syncing.current)return syncing.current;
    const expected=scope();
    const task=(async()=>{
      try{
        if(typeof WebSocket!=='function')return false;
        let snapshot=await roomClient.call('ap_access_open',credentials());
        if(snapshot.progress?.version!==1||!Number.isSafeInteger(snapshot.serverNow))throw Error('The unlock service needs an update.');
        if(expected!==scope())return false;
        if(snapshot.accessToken)write(tokenKey,snapshot.accessToken);
        const local=ref.current.progress;
        for(const [id,point]of Object.entries(local.solutions))if(snapshot.progress?.solutions?.[id]===undefined)snapshot=await roomClient.call('ap_access_complete',{...credentials(),challengeId:id,point});
        const evidenceKey='hall-win-evidence.v1.'+expected;
        for(const proof of read(evidenceKey,[]))if(proof.id==='nine-ice-forts'?!snapshot.progress?.foundationWins?.[proof.signature]:!snapshot.progress?.wins?.[proof.id])snapshot=await uploadProof(proof);
        for(const id of Object.keys(local.keyHalls))if(!model.earned(id,snapshot.progress))snapshot=await roomClient.call('ap_access_spend',{...credentials(),tableId:id});
        if(expected!==scope())return false;
        write(evidenceKey,[]);accept(snapshot,expected);return true;
      }catch(e){if(expected===scope())publish({service:false,entitlements:{},festivals:[],status:'Offline journey · Online syncing is not ready yet'});return false;}
    })();
    syncing.current=task;try{return await task;}finally{if(syncing.current===task)syncing.current=null;}
  }
  useEffect(()=>{
    active.current=true;if(cloudSnapshot().session?.session||read(tokenKey,null))refresh();
    const onScope=()=>{const next=scope();if(next!==ref.current.scope){ref.current={scope:next,progress:savedProgress(next),entitlements:{},festivals:[],serverNow:0,receivedAt:0,service:false,status:'Restoring your journey…'};setRevision(n=>n+1);const prior=syncing.current;Promise.resolve(prior).finally(()=>{if(active.current)refresh();});}};
    const unwatch=watchCloud(onScope),unlisten=roomClient.listen(value=>{if(value.accessRefresh)refresh();});
    const online=()=>{if(cloudSnapshot().session?.session||read(tokenKey,null))refresh();},visible=()=>{if(document.visibilityState==='visible')online();};
    window.addEventListener('online',online);document.addEventListener('visibilitychange',visible);
    const timer=setInterval(()=>{if(ref.current.festivals.length)setRevision(n=>n+1);},1000);
    return()=>{active.current=false;clearInterval(timer);unwatch();unlisten();window.removeEventListener('online',online);document.removeEventListener('visibilitychange',visible);};
  },[playerId]);
  async function complete(id,point){
    const expected=scope(),next=model.complete(ref.current.progress,id,point);
    if(ref.current.service){try{const value=await roomClient.call('ap_access_complete',{...credentials(),challengeId:id,point});accept(value,expected);return;}catch{}}
    if(expected===scope())publish({progress:next,service:false,status:'Formation saved on this phone · Sync when online'});
  }
  async function spend(id){
    const expected=scope();
    if(ref.current.service){const value=await roomClient.call('ap_access_spend',{...credentials(),tableId:id});accept(value,expected);}
    else publish({progress:model.spend(ref.current.progress,id),status:'Hall opened permanently on this phone'});
  }
  function award(verified,proof,expected=ref.current.scope){
    const current=ref.current;if(expected!==scope()||current.scope!==expected)return;if(current.progress.wins[verified.id])return;
    publish({progress:model.win(current.progress,verified.id,verified.matchId)});
    const evidenceKey='hall-win-evidence.v1.'+current.scope;
    write(evidenceKey,[...read(evidenceKey,[]).filter(p=>p.id!==verified.id),proof].slice(-8));refresh();
  }
  function awardFoundation(verified,proof){const current=ref.current;if(current.progress.foundationWins[verified.signature])return;publish({progress:model.foundationWin(current.progress,verified)});const evidenceKey='hall-win-evidence.v1.'+current.scope;write(evidenceKey,[...read(evidenceKey,[]),{...proof,signature:verified.signature}].slice(-8));refresh();}
  function state(){const s=ref.current;return{progress:s.progress,entitlements:{...offlineEntitlements,...s.entitlements},festivals:s.festivals,now:s.serverNow?Math.floor(s.serverNow+performance.now()-s.receivedAt):0};}
  function allowed(id){return model.access(id,state());}
  async function ensureOnline(){if(!await refresh())throw Error('Online unlock syncing needs the updated game service. Your earned halls and formations work offline.');}
  return{...ref.current,entitlements:{...offlineEntitlements,...ref.current.entitlements},revision,allowed,state,credentials,refresh,complete,spend,award,awardFoundation,ensureOnline};
}
