import {ADVENTURES,missionFor} from './adventures.js';

// Comparisons can still show a blocked route. A beginner's first setup should
// be actionable, with its alternatives available only when asked for.
const START={sanguo:{'one-screen':'one','clear-leg':'clear'},sanyou:{'flag-path':'clear','terrain-lines':'cannon'},xiangqi:{'river-passport':'across','cannon-bridge':'one','horse-door':'clear','palace-home':'open'}};
export const INTRO_KEY=id=>`learning-intro.v1.${id}`;
export function preferredSetup(id,key){const mission=missionFor(id,key);return START[id]?.[key]||mission.variants?.[0][0]||'default';}
export function briefFeedback(text){return String(text).match(/^.*?[.!?](?:\s|$)/)?.[0].trim()||String(text);}
export function nextUntried(id,progress){return ADVENTURES[id].missions.find(m=>!progress[id]?.[m.key])?.key||ADVENTURES[id].missions[0].key;}
