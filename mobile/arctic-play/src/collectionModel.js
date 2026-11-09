import {gatheringProgress} from './gathering.js';
import {GUIDES,LEGACY_GUIDE_NAMES} from './brand.js';
import catalogue from './collectionCatalog.cjs';
export const {PRODUCTS,PACK_ID,productById}=catalogue;
export const HOST_IDS=['polly','pengu','retsba','abster'];
export const SCENES={classic:{name:'The Ice Camp',image:null},aurora:{name:'Aurora Observatory',image:'art/collections/aurora/camp.webp',product:PACK_ID},court:{name:'Lantern Court',image:'art/collections/lantern-court-camp.webp',product:'lantern-court-v1'},library:{name:'Moonlit Library',image:'art/collections/moonlit-library-camp.webp',product:'moonlit-study-v1'}};
export const DECORATIONS={none:{name:'Empty space'},'guest-lantern':{name:'Eighth Lantern keepsake',gathering:true,image:'art/collections/aurora-lantern-decoration.webp'},'earned-lantern':{name:'Library lantern',earned:true,image:'art/collections/aurora-lantern-decoration.webp'},lantern:{name:'Aurora Lantern',product:'lantern-court-v1',image:'art/collections/aurora-lantern-decoration.webp'},blossom:{name:'Snow Blossom',product:'lantern-court-v1',image:'art/collections/snow-blossom-decoration.webp'},tea:{name:'Moonlit Tea Set',product:'moonlit-study-v1',image:'art/collections/moonlit-tea-set.webp'},telescope:{name:'Stargazer Telescope',product:'moonlit-study-v1',image:'art/collections/stargazer-telescope.webp'},pedestal:{name:'Memory Pedestal',product:'moonlit-study-v1',image:'art/collections/memory-pedestal.webp'}};
export const ILLUSTRATED_REACTIONS=[{id:'polly-heart',host:'polly',label:'Thank you!',image:'art/collections/polly-heart-reaction.webp'},{id:'pengu-nod',host:'pengu',label:'Well played!',image:'art/collections/pengu-well-played-reaction.webp'},{id:'retsba-salute',host:'retsba',label:'Good game!',image:'art/collections/retsba-salute-reaction.webp'},{id:'abster-eureka',host:'abster',label:'I figured it out!',image:'art/collections/abster-eureka-reaction.webp'}];
export const PINS=[{id:'first',label:'First discovery',symbol:'✦',kind:'first'},{id:'safe',label:'Royal guardian',symbol:'♔',kind:'safe'},{id:'retry',label:'Thoughtful retry',symbol:'↻',kind:'retry'},{id:'friends',label:'Shared table',symbol:'♡',kind:'friends'}];
export function earnedPins(journey){return PINS.filter(p=>Object.keys(journey?.memories||{}).some(k=>k.split(':')[1]===p.kind));}
export function chapterLantern(chapter){return ['horse','han','home'].every(k=>Number.isFinite(chapter?.[k])&&chapter[k]>0);}
export function ownsProduct(entitlements,id){return entitlements?.[id]?.active===true;}
export function availableDecoration(id,entitlements,chapter,gathering={}){const d=Object.hasOwn(DECORATIONS,id)?DECORATIONS[id]:null;return !!d&&(!d.product||ownsProduct(entitlements,d.product))&&(!d.earned||chapterLantern(chapter))&&(!d.gathering||!!gatheringProgress(gathering).revealedAt);}
export function appearanceFor(choices={},entitlements={},chapter={},journey={},gathering={}){
 const outfits={};for(const host of HOST_IDS){const id=choices.outfits?.[host],p=PRODUCTS.find(p=>p.outfit===id);if(p&&ownsProduct(entitlements,p.id))outfits[host]=id;}
 const selected=Object.hasOwn(SCENES,choices.camp)?SCENES[choices.camp]:null,camp=selected&&(!selected.product||ownsProduct(entitlements,selected.product))?choices.camp:'classic';
 const decorations=['left','right'].reduce((v,slot)=>{const id=choices.decorations?.[slot];v[slot]=availableDecoration(id,entitlements,chapter,gathering)?id:'none';return v;},{});
 if(decorations.right!=='none'&&decorations.right===decorations.left)decorations.right='none';
 const pins=earnedPins(journey),pin=pins.find(p=>p.id===choices.pin)?.id||'none',table=['aurora','court'].includes(choices.table)&&PRODUCTS.some(p=>p.table===choices.table&&ownsProduct(entitlements,p.id))?choices.table:'classic';
 return{outfits,camp,decorations,pin,table,memory:typeof choices.memory==='string'&&Object.hasOwn(journey.memories||{},choices.memory)?choices.memory:null,frame:ownsProduct(entitlements,PACK_ID)&&choices.frame==='aurora'?'aurora':'classic',badge:ownsProduct(entitlements,PACK_ID)&&choices.badge===true,owned:ownsProduct(entitlements,PACK_ID)};
}
export function portraitFor(host,outfit){return outfit==='founder'?`art/collections/aurora/${host}.webp`:outfit==='court'?`art/collections/lantern-court/${host}.webp`:null;}
// Readable backwards-compatible transport; this text is never a receipt.
export function illustratedText(id){const r=ILLUSTRATED_REACTIONS.find(r=>r.id===id);return r?`🐧 ${GUIDES[r.host].name}: ${r.label} · Little Victories`:null;}
export function parseIllustrated(text){return ILLUSTRATED_REACTIONS.find(r=>text===illustratedText(r.id)||text===`🐧 ${LEGACY_GUIDE_NAMES[r.host]}: ${r.label} · Little Victories`)||null;}
