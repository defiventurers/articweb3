import {generateKey,publicKey,makeIntent} from '../../../shared/fair-play/core.js';
import {futureRound} from '../../../shared/fair-play/beacon.js';
import {read,write,getProfile} from './storage.js';
let creating;
export async function gameProofKey() {
  const id=getProfile().id, name='fair-game-key.v1:'+id;
  const saved=read(name,null);
  if(saved?.privateKey&&saved?.publicKey)return saved;
  if(creating)return creating;
  creating=(async()=>{const key=await generateKey();if(!write(name,key))throw Error('This phone could not save its game proof key.');return key;})().finally(()=>{creating=null;});
  return creating;
}
export async function signGameRequest(type,payload,room) {
  if(['ap_room_create','ap_room_join'].includes(type))return {...payload,fairKey:publicKey((await gameProofKey()).publicKey)};
  if(!room?.fair?.available||!['ap_game_action','ap_room_leave'].includes(type)||room.status!=='playing')return payload;
  if(room.fair.pending&&type==='ap_game_action')return {...payload,actionId:room.fair.pending.signed.intent.actionId,fairIntent:room.fair.pending.signed};
  const actionId=type==='ap_room_leave'?null:payload.actionId;
  const fairIntent=await makeIntent({bundle:room.fair,actor:payload.playerId,actionId,before:room.gameState,kind:type==='ap_room_leave'?'resign':'action',beaconRound:actionId?.startsWith('roll')?futureRound():null},(await gameProofKey()).privateKey);
  return {...payload,fairIntent};
}
export function retainReceipt(room) {
  if(!room.fair?.available)return;
  const name='fair-receipts.v1',all=read(name,{}),old=all[room.matchId];
  const entries=old?.events||[],last=room.fair.lastEvent;
  if(last&&!entries.some(e=>e.seq===last.seq))entries.push(last);
  all[room.matchId]={header:room.fair.header,headerHash:room.fair.headerHash,headerSignature:room.fair.headerSignature,events:entries.slice(-250),seenCount:room.fair.eventCount,at:Date.now()};
  const keep=Object.entries(all).sort((a,b)=>b[1].at-a[1].at).slice(0,6);
  write(name,Object.fromEntries(keep));
}
