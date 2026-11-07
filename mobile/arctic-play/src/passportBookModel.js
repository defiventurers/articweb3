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

// National flags only where the selected edition and flag overlap.
// An origin seal is not a reconstruction of a historical flag.
export const STAMP_ORIGINS={
 xiangqi:{place:'China',mark:'CN',period:'10th–13th c.',art:'lantern-xiangqi-river.webp',motif:'River crossing',kind:'origin'},
 shogi:{place:'Japan',mark:'JP',period:'15th–16th c. form',art:'lantern-shogi-second-sunrise.webp',motif:'Second sunrise',kind:'origin'},
 sannin:{place:'Japan',mark:'JP',period:'c. 1930',art:'lantern-sannin-third-path.webp',motif:'Three paths',kind:'flag',flag:'japan'},
 sanguo:{place:'China',mark:'CN',period:'Date disputed',art:'lantern-sanguo-changing-banner.webp',motif:'Changing banners',kind:'origin'},
 sanyou:{place:'China',mark:'CN',period:'17th–18th c.',art:'lantern-sanyou-three-signals.webp',motif:'Three signals',kind:'origin'},
 yanyi:{place:'China',mark:'CN',period:'2005 edition',art:'lantern-yanyi-imperial.webp',motif:'Imperial lantern',kind:'flag',flag:'china'},
 dominion:{place:'Indian roots',mark:'IN',period:'Modern adaptation',art:'lantern-chaturanga-new-winter.webp',motif:'A new winter',kind:'origin'},
};
export function passportMoment(value){
 if(!validTime(value))return null;
 const date=new Date(value);
 return {iso:date.toISOString(),date:passportDate(value),time:date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',timeZoneName:'short'}),full:date.toLocaleString(undefined,{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'long'})};
}
