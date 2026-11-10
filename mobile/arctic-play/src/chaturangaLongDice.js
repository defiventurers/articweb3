// Versioned, free-play Chaturaji-inspired edition. Old states remain on the legacy authority.
import base from '../../../server/gameRules.js';
import {DOMINION_TEAMS,teamFor,teammates} from './dominionTeams.js';
export const LONG_DICE_PROFILE='chaturanga-long-dice-v1';
export const LONG_DICE_ACTION='roll-long|control:roll-long';
export const LONG_DICE_ROLES=Object.freeze({2:['ship'],3:['horse'],4:['elephant'],5:['king','pawn']});
export const HERITAGE_NAMES=Object.freeze({ship:'Boat',horse:'Knight',elephant:'Rook',king:'King',pawn:'Pawn'});
const originalFace={2:4,3:3,4:2,5:5};
const seats=base.PLAYERS;
const clone=state=>({...state,board:state.board.map(row=>row.map(p=>p?{...p}:null)),dice:{...state.dice,values:[...state.dice.values],used:[...state.dice.used]},royalCaptures:{...state.royalCaptures},frozenTeams:[...(state.frozenTeams||[])],revivalAvailable:[...(state.revivalAvailable||[])],moveLog:[...(state.moveLog||[])]});
export const isLongDiceState=state=>state?.rulesProfile===LONG_DICE_PROFILE;
const royal=(p,team)=>p?.team===team&&p.type==='king'&&p.isRoyal!==false;
const hasKing=(state,team)=>state.board.some(row=>row.some(p=>royal(p,team)));
export const needsKingReturn=state=>isLongDiceState(state)&&state.revivalAvailable?.includes(state.turn)&&!hasKing(state,state.turn);
function normalize(state){const {updatedAt,...next}=state;return {...next,turn:seats[next.currentPlayerIndex],selected:null,legalMoves:[]};}
export function createLongDiceGame(options={}){
 const state=base.createInitialGameState();
 state.board=state.board.map((row,r)=>row.map((p,c)=>p?{...p,id:`${p.team}-${p.type}-${r}-${c}`}:null));
 return normalize({...state,rulesProfile:LONG_DICE_PROFILE,teamMode:options.teamMode==='2v2'?'2v2':'free-for-all',dice:{...state.dice,count:2},mobileTurnNumber:0,royalCaptures:Object.fromEntries(seats.map(s=>[s,0])),frozenTeams:[],revivalAvailable:[],revivalPassRequired:false});
}
const control=(id,kind,raw)=>({id,kind,source:'control:'+kind,target:null,promote:false,raw});
export function longDiceActions(state){
 if(state.gameOver||state.mobileResult)return [];
 if(needsKingReturn(state))return state.board.flatMap((row,r)=>row.flatMap((p,c)=>p?[]:[{id:`revive|control:revive|${r},${c}`,kind:'revive',source:'control:revive',target:`${r},${c}`,promote:false,raw:{row:r,col:c}}]));
 if(state.revivalPassRequired)return [control('end|control:end','end',{kind:'end'})];
 if(!hasKing(state,state.turn))return [];
 if(!state.dice.rolled)return [control(LONG_DICE_ACTION,'roll',{kind:'roll',count:2}),control('skip|control:skip','skip',{kind:'skip'})];
 const query={...state,selected:null,legalMoves:[],dice:{...state.dice,values:state.dice.values.map(v=>originalFace[v]||null)}},moves=[];
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const p=state.board[r][c];if(p?.team!==state.turn)continue;
  for(const move of base.selectSquare(query,r,c).legalMoves){
   const victim=state.board[move.toRow][move.toCol];
   if(state.teamMode==='2v2'&&victim&&teammates(p.team,victim.team))continue;
   const source=`piece:${p.id}`,target=`${move.toRow},${move.toCol}`;
   moves.push({id:`move|${source}|${target}|die:${move.dieIndex}`,source,target,kind:'move',promote:false,raw:move});
  }
 }
 return [...moves,...state.dice.used.flatMap((used,index)=>used?[]:[control(`pass-die|control:pass-die:${index}`,'pass',{index})]),control('end|control:end','end',{kind:'end'})];
}
function nextTurn(state){
 let index=state.currentPlayerIndex;
 for(let i=0;i<seats.length;i++){index=(index+1)%seats.length;if(hasKing(state,seats[index])||state.revivalAvailable.includes(seats[index]))break;}
 return normalize({...state,currentPlayerIndex:index,mobileTurnNumber:(state.mobileTurnNumber||0)+1,dice:{rolled:false,values:[null,null],used:[false,false],count:2},revivalPassRequired:false});
}
function checkWinner(state){
 const alive=seats.filter(s=>hasKing(state,s));
 if(state.teamMode==='2v2'){
  const teams=DOMINION_TEAMS.filter(t=>t.seats.some(s=>alive.includes(s)));
  if(teams.length<=1)return {...state,gameOver:true,winner:teams[0]?.seats[0]||null,winningTeam:teams[0]?.id||null,winningSeats:teams[0]?[...teams[0].seats]:[]};
 }else if(alive.length<=1)return {...state,gameOver:true,winner:alive[0]||null};
 return state;
}
function randomFace(){const bytes=new Uint8Array(1);globalThis.crypto.getRandomValues(bytes);return bytes[0]%4+2;}
export function applyLongDice(state,actionOrId,verifiedRoll){
 const id=typeof actionOrId==='string'?actionOrId:actionOrId?.id;
 const action=longDiceActions(state).find(a=>a.id===id);if(!action)throw Error('This action is no longer legal.');
 let next=clone(state);
 if(action.kind==='roll'){
  if(verifiedRoll&&(!Array.isArray(verifiedRoll.values)||verifiedRoll.values.length!==2||verifiedRoll.values.some(v=>!Number.isInteger(v)||v<2||v>5)))throw Error('The verified long dice do not match this roll.');
  const values=verifiedRoll?[...verifiedRoll.values]:[randomFace(),randomFace()];
  next.dice={rolled:true,values,used:[false,false],count:2};
  next.mobileLastRoll={team:state.turn,values:[...values],count:2,skipped:false};
  return normalize(next); // Unusable dice must be passed by the player.
 }
 if(action.kind==='skip'){next.mobileLastSkip={team:state.turn,turnNumber:state.mobileTurnNumber||0};return nextTurn(next);}
 if(action.kind==='end')return nextTurn(next);
 if(action.kind==='pass'){
  next.dice.used[action.raw.index]=true;
  return next.dice.used.every(Boolean)?nextTurn(next):normalize(next);
 }
 if(action.kind==='revive'){
  const {row,col}=action.raw;
  next.board[row][col]={id:`${state.turn}-royal-return-${state.royalCaptures[state.turn]}`,team:state.turn,type:'king',isRoyal:true};
  next.frozenTeams=next.frozenTeams.filter(s=>s!==state.turn);next.revivalAvailable=next.revivalAvailable.filter(s=>s!==state.turn);
  next.dice={rolled:true,values:[null,null],used:[true,false],count:2};next.revivalPassRequired=true;
  next.moveLog.unshift(`${base.TEAM_LABEL[state.turn]} returned their King. Pass the second move.`);
  return normalize(next);
 }
 const m=action.raw,piece=next.board[m.fromRow][m.fromCol],victim=next.board[m.toRow][m.toCol];
 next.board[m.toRow][m.toCol]=piece;next.board[m.fromRow][m.fromCol]=null;next.dice.used[m.dieIndex]=true;
 next.moveLog.unshift(`${base.TEAM_LABEL[piece.team]} ${victim?'captured '+base.TEAM_LABEL[victim.team]+' '+HERITAGE_NAMES[victim.type]:'moved '+HERITAGE_NAMES[piece.type]}`);
 if(piece.type==='pawn'){
  const promotion=base.PROMOTION_PIECES[piece.team]?.[`${m.toRow},${m.toCol}`];
  if(promotion){piece.type=promotion;piece.isRoyal=false;next.moveLog.unshift(`${base.TEAM_LABEL[piece.team]} Pawn promoted to ${HERITAGE_NAMES[promotion]}`);}
 }
 if(victim&&royal(victim,victim.team)){
  next.royalCaptures[victim.team]=(next.royalCaptures[victim.team]||0)+1;
  if(!next.frozenTeams.includes(victim.team))next.frozenTeams.push(victim.team);
  next.revivalAvailable=next.revivalAvailable.filter(s=>s!==victim.team);
  next.moveLog.unshift(`${base.TEAM_LABEL[victim.team]} is frozen; their remaining pieces stay on the board.`);
  if(next.teamMode==='2v2'){
   const partner=teamFor(piece.team).seats.find(s=>s!==piece.team);
   if(next.frozenTeams.includes(partner)&&next.royalCaptures[partner]===1&&!next.revivalAvailable.includes(partner))next.revivalAvailable.push(partner);
  }
 }
 next.moveLog=next.moveLog.slice(0,8);next=checkWinner(next);
 if(next.gameOver)return normalize(next);
 return next.dice.used.every(Boolean)?nextTurn(next):normalize(next);
}
export function longDiceResult(state){if(state.mobileResult)return state.mobileResult;if(!state.gameOver)return null;return {winner:state.winner||null,winners:state.winningSeats,winningTeam:state.winningTeam,draw:!state.winner,reason:state.winningTeam?'Both opposing royal kingdoms captured':state.winner?'Last surviving royal kingdom':'No royal kingdom remains'};}
export function chooseLongDiceBot(state){
 const legal=longDiceActions(state);if(!legal.length)return null;
 const roll=legal.find(a=>a.kind==='roll');if(roll)return roll.id;
 const revivals=legal.filter(a=>a.kind==='revive');if(revivals.length){
  // Prefer a protected edge square, while all empty squares remain legal for humans.
  return revivals.sort((a,b)=>Math.min(a.raw.row,7-a.raw.row,a.raw.col,7-a.raw.col)-Math.min(b.raw.row,7-b.raw.row,b.raw.col,7-b.raw.col))[0].id;
 }
 const moves=legal.filter(a=>a.kind==='move');if(moves.length){
  const value={king:1000,elephant:10,horse:5,ship:3,pawn:1};
  const score=a=>(value[a.raw.captured?.type]||0)*100+(Math.abs(a.raw.fromRow-3.5)+Math.abs(a.raw.fromCol-3.5)-Math.abs(a.raw.toRow-3.5)-Math.abs(a.raw.toCol-3.5))*.2+Math.random()*.15;
  return moves.map(a=>({a,score:score(a)})).sort((a,b)=>b.score-a.score)[0].a.id;
 }
 return legal.find(a=>a.kind==='end')?.id||legal[0].id;
}
