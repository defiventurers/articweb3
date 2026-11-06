import {HALL_ORDER,HALLS} from './gathering.js';

export const PASSPORT_PAGES=['Arrival','Lanterns I','Lanterns II','The Crown'];
const names={xiangqi:'Xiangqi',shogi:'Shogi',sannin:'Sannin Shogi',sanguo:'Sanguo Qi',sanyou:'San You Qi',yanyi:'Sanguo Yan Yi Qi',dominion:'Chaturanga'};
const validTime=value=>Number.isFinite(value)&&value>0&&value<=8640000000000000?value:null;
// A read-only projection of existing learning records. Never grants game access.
export function passportSnapshot(progress={}){
 const stamps=HALL_ORDER.map(id=>({id,name:names[id],title:HALLS[id].memory,mission:HALLS[id].challenges[0].mission,earnedAt:validTime(progress?.halls?.[id]?.learnedAt)}));
 const count=stamps.filter(s=>s.earnedAt).length;
 return {stamps,count,next:stamps.find(s=>!s.earnedAt)||null,crownedAt:count===stamps.length?Math.max(...stamps.map(s=>s.earnedAt)):null};
}
export const passportDate=value=>validTime(value)?new Date(value).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'';
export function passportPage(value){return Number.isInteger(value)&&value>=0&&value<PASSPORT_PAGES.length?value:0;}
