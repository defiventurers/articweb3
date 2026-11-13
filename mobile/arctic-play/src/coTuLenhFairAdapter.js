// Standard, untimed Commander Chess proof adapter. Hidden deployment and clocks
// retain their original server protocol and are explicitly outside this format.
import * as rules from '../../../frontend/src/games/co-tu-lenh/rules.js';
import {canonical} from '../../../shared/fair-play/core.js';
export const TABLE={id:'co-tu-lenh',name:'Cờ Tư Lệnh',players:2,seats:['red','blue']};
export const isCommander=id=>id===TABLE.id;
export const ownsState=s=>s?.rulesVersion===rules.VERSION&&Array.isArray(s.pieces);
export const create=(id,options={})=>rules.createInitialState(options.rulesProfile||rules.DEFAULT_PROFILE,{deployment:'standard',timeLimitMinutes:0});
export const encode=action=>'ctl:'+canonical(action);
function decode(id){if(typeof id!=='string'||!id.startsWith('ctl:')||id.length>10000)throw Error('Invalid Commander proof action.');const a=JSON.parse(id.slice(4));if(!a||typeof a!=='object'||Array.isArray(a))throw Error('Invalid Commander action.');return a;}
export function validateAction(id,state,key){const raw=decode(key);rules.applyAction(state,raw);return {id:key,kind:raw.kind,raw};}
export function actions(id,state){if(rules.isFinished(state))return [];const all=state.pieces.filter(p=>p.alive&&p.team===state.turn).flatMap(p=>rules.legalActions(state,p.id));if(state.turnContext)try{rules.applyAction(state,{kind:'end-turn'});all.push({kind:'end-turn'});}catch{}all.push({kind:'concede'});return all.map(raw=>({id:encode(raw),kind:raw.kind,raw}));}
export const apply=(id,state,key)=>rules.applyAction(state,decode(key));
export const turn=state=>state.turn;
export const result=state=>rules.isFinished(state)?{winner:state.winner||null,draw:!state.winner,reason:state.winReason||'Game complete'}:null;
export const forfeit=(id,state)=>rules.applyAction(state,{kind:'concede'});
export const board=()=>({viewBox:'0 0 1100 1200',size:75,cells:Array.from({length:132},(_,n)=>{const x=n%11,y=Math.floor(n/11);return{id:x+','+y,x:50+x*100,y:50+(11-y)*100,label:'Column '+(x+1)+', row '+(y+1)};})});
export const pieces=(id,state)=>state.pieces.filter(p=>p.alive&&!p.carrier).map(p=>({id:p.id,source:'piece:'+p.id,cell:p.x+','+p.y,owner:p.team,origin:p.team,label:p.type,sprite:'art/co-tu-lenh/pieces/'+p.team+'-'+p.type+'.webp'}));
