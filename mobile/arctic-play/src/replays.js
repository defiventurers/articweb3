import {VERSION} from './games.ts';
import {read,write} from './storage.js';
import {replayRequest} from './replayModel.js';
export const REPLAY_KEY='replay-cards.v1';
export function rememberReplay(request,actionIds){try{const r=replayRequest(request);if(!actionIds.length||actionIds.length>12)return;const key=[r.id,r.task,r.key||r.mission||r.activity?.lesson].join(':');const cards=read(REPLAY_KEY,{});if(!cards[key]){cards[key]={request:r,actionIds:[...actionIds],at:Date.now(),version:VERSION};write(REPLAY_KEY,Object.fromEntries(Object.entries(cards).sort((a,b)=>b[1].at-a[1].at).slice(0,60)));window.dispatchEvent(new Event('arctic-replays'));}}catch{}}
