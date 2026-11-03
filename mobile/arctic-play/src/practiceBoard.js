// A position editor followed by movement practice. The shared rule authorities
// supply targets; turns, dice rolls and match adjudication stay in full games.
import * as sh from '../../../frontend/src/games/shogi-frozen-shogunate/rules.js';
import * as ss from '../../../frontend/src/games/sannin-shogi/rules.js';
import * as sg from '../../../frontend/src/games/heritage-arcade/ported/game/sanguoRules.ts';
import * as sy from '../../../frontend/src/games/san-you-qi/rules.js';
import * as yy from '../../../frontend/src/games/heritage-arcade/ported/game/sanguoYanYiRules.ts';
import * as xq from '../../../frontend/src/games/heritage-arcade/ported/game/xiangqiRules.ts';
import dominion from '../../../server/gameRules.js';
import {create,pieces,board} from './games.ts';
import {rawUnits,unitRole,owner,relocate} from './learning.js';
const clone=value=>JSON.parse(JSON.stringify(value));
export function practiceStock(id){const state=create(id),shown=pieces(id,state);return rawUnits(id,state).map(p=>({...shown.find(u=>u.id===p.id),role:unitRole(id,p),faction:shown.find(u=>u.id===p.id).origin||owner(id,p)||'han'}));}
export function emptyPractice(id){const state=create(id);if(id==='shogi'){state.board=Array(81).fill(null);state.hands={red:sh.emptyHand(),blue:sh.emptyHand()};}else if(id==='dominion'){state.board=Array.from({length:8},()=>Array(8).fill(null));state.gameOver=false;state.winner=null;}else state.pieces=[];if(id==='yanyi'){state.opening={red:true,green:true,blue:true};state.ply=3;}return state;}
function at(id,state,source){return rawUnits(id,state).find(p=>'piece:'+p.id===source);}
function royalty(id,piece){return id!=='dominion'&&['king','general'].includes(unitRole(id,piece));}
function variants(id,state,piece,from,target){
 if(id==='shogi'&&!piece.promoted&&!['king','gold'].includes(piece.type)&&(sh.isPromotionZone(piece.side,Math.floor(+from/9))||sh.isPromotionZone(piece.side,Math.floor(+target/9)))){const row=Math.floor(+target/9),forced=['pawn','lance'].includes(piece.type)?(piece.side==='red'?row===0:row===8):piece.type==='knight'&&(piece.side==='red'?row<=1:row>=7);return forced?[true]:[false,true];}
 if(id==='sannin'&&!piece.promoted&&!['gold','knight'].includes(piece.type)&&(ss.isPromotionZone(from,piece.owner)||ss.isPromotionZone(target,piece.owner)||from==='0,0'||target==='0,0')){const test=clone(state);relocate(id,test,piece.id,target);return ['pawn','lance'].includes(piece.type)&&!ss.getPseudoTargets(test,at(id,test,'piece:'+piece.id)).length?[true]:[false,true];}
 return [false];
}
function kingSafe(id,state,side){
 if(id==='shogi')return !rawUnits(id,state).some(p=>p.side===side&&p.type==='king')||!sh.isInCheck(state,side);
 if(id==='sannin')return !ss.isInCheck(state,side);
 if(id==='sanyou')return !sy.isInCheck(state,side);
 if(id==='xiangqi')return !state.pieces.some(p=>p.side===side&&p.role==='general')||!xq.isInCheck(side,state.pieces);
 return true;
}
export function practiceActions(id,state,source){
 const piece=at(id,state,source),shown=pieces(id,state),unit=shown.find(p=>p.source===source);if(!piece||!unit)return [];
 let targets=[];
 if(id==='shogi'){
  // Mask only other friendly attack profiles, retaining every occupied square
  // and side. This asks the canonical attack resolver for this piece's targets.
  const masked=state.board.map(p=>p&&p.id!==piece.id&&p.side===piece.side?{...p,type:'practice-blocker'}:p);
  targets=board(id).cells.filter(c=>sh.isSquareAttacked(masked,+c.id,piece.side)).map(c=>c.id);
 }else if(id==='sannin')targets=ss.getPseudoTargets(state,piece);
 else if(id==='sanguo')targets=sg.legalSanguoTargets(piece,state.pieces).map(n=>`${n.sector}-${n.rank}-${n.file}`);
 else if(id==='sanyou')targets=sy.getPseudoTargets(state,piece);
 else if(id==='yanyi')targets=yy.legalYanYiTargets(state,piece).map(n=>`${n.x},${n.y}`);
 else if(id==='xiangqi')targets=xq.pseudoLegalTargets(piece,state.pieces).map(n=>`${n.row},${n.col}`);
 else if(id==='dominion'){
  const die={king:1,pawn:1,elephant:2,horse:3,ship:4}[piece.type],query={...state,currentPlayerIndex:dominion.PLAYERS.indexOf(piece.team),gameOver:false,selected:null,legalMoves:[],dice:{rolled:true,values:[die,6],used:[false,true]}};
  const [r,c]=unit.cell.split(',').map(Number);
  return dominion.selectSquare(query,r,c).legalMoves.map(raw=>({id:`practice|${source}|${raw.toRow},${raw.toCol}|0`,kind:'move',source,target:`${raw.toRow},${raw.toCol}`,promote:false,raw}));
 }
 return [...new Set(targets)].flatMap(target=>{
  const victim=shown.find(p=>p.cell===target),rawVictim=at(id,state,victim?.source);
  if(rawVictim&&royalty(id,rawVictim))return [];
  const preview=clone(state);relocate(id,preview,piece.id,target);
  if(!kingSafe(id,preview,owner(id,piece)))return [];
  return variants(id,state,piece,unit.cell,target).map(promote=>({id:`practice|${source}|${target}|${promote?1:0}`,kind:'move',source,target,promote}));
 });
}
export function practicePosition(id,state=emptyPractice(id),source=null){return{state,units:pieces(id,state),legal:source?practiceActions(id,state,source):[],selected:source,stock:practiceStock(id)};}
export function placePracticePiece(id,state,prototypeId,cell){
 if(!board(id).cells.some(c=>c.id===cell))throw Error('Choose a point on this board.');
 if(pieces(id,state).some(p=>p.cell===cell))throw Error('Choose an empty board point.');
 if(rawUnits(id,state).some(p=>p.id===prototypeId))throw Error('That piece is already on the board.');
 const original=create(id),prototype=rawUnits(id,original).find(p=>p.id===prototypeId);if(!prototype)throw Error('Choose a piece from the list.');
 const next=clone(state),piece=clone(prototype);if(id==='shogi')next.board[+cell]=piece;
 else if(id==='dominion'){const[r,c]=cell.split(',').map(Number);next.board[r][c]=piece;}
 else{next.pieces.push(piece);relocate(id,next,piece.id,cell);}
 if(id==='yanyi'&&piece.origin==='han'&&next.hanOwner){const p=at(id,next,'piece:'+piece.id);if(p.role==='emperor')throw Error('Han is already active. Clear the board to try its Emperor again.');p.owner=next.hanOwner;}
 return practicePosition(id,next,'piece:'+piece.id);
}
export function movePracticePiece(id,state,source,actionId){
 const action=practiceActions(id,state,source).find(a=>a.id===actionId);if(!action)throw Error('That move is not allowed. Choose a highlighted destination.');
 const piece=at(id,state,source),unit=pieces(id,state).find(p=>p.source===source),victim=pieces(id,state).find(p=>p.cell===action.target);
 let next=clone(state);
 if(id==='dominion'){
  next.dice={rolled:true,values:[{king:1,pawn:1,elephant:2,horse:3,ship:4}[piece.type],6],used:[false,true]};next.currentPlayerIndex=dominion.PLAYERS.indexOf(piece.team);
  const {updatedAt,...moved}=dominion.applyMove(next,action.raw);next={...moved,gameOver:false,winner:null,eliminatedTeams:[],selected:null,legalMoves:[]};
 }else{
  relocate(id,next,piece.id,action.target);const moved=at(id,next,source);if(action.promote)moved.promoted=true;
  if(id==='sanyou'){moved.lastMoveFrom=piece.node;moved.hasMoved=true;if(sy.territoryOf(moved.node,moved.faction)==='enemy'){moved.leftHome=true;if(moved.role==='soldier')moved.promoted=true;}}
  // Mirror the authority's movement-triggered Han activation without adjudicating
  // missing Kings in an intentionally partial practice position.
  if(id==='yanyi'&&piece.role==='horse'&&!state.activationUsed){
   const point=yy.YAN_YI_ALLIANCE_POINTS.find(p=>`${p.point.x},${p.point.y}`===action.target),capturedEmperor=victim&&at(id,state,victim.source)?.role==='emperor';
   let hanOwner=null,alliance=null;
   if(capturedEmperor){hanOwner=piece.owner;alliance=yy.YAN_YI_FACTIONS.filter(f=>f!==piece.owner);}
   else if(point&&point.faction!==piece.owner){hanOwner=yy.YAN_YI_FACTIONS.find(f=>f!==piece.owner&&f!==point.faction);alliance=[piece.owner,point.faction];}
   if(hanOwner)next={...next,activationUsed:true,hanOwner,alliance,pieces:next.pieces.filter(p=>p.role!=='emperor').map(p=>p.origin==='han'&&p.owner===null?{...p,owner:hanOwner}:p)};
  }
 }
 return{...practicePosition(id,next,source),trail:{from:unit.cell,to:action.target},captured:!!victim};
}
export function removePracticePiece(id,state,source){const piece=at(id,state,source);if(!piece)throw Error('Choose a placed piece.');const next=clone(state);if(id==='shogi')next.board=next.board.map(p=>p?.id===piece.id?null:p);else if(id==='dominion')next.board=next.board.map(row=>row.map(p=>p?.id===piece.id?null:p));else next.pieces=next.pieces.filter(p=>p.id!==piece.id);return practicePosition(id,next);}
export function practiceRequest({id,op,state,source,prototypeId,cell,actionId}){if(op==='empty')return practicePosition(id);if(op==='place')return placePracticePiece(id,state,prototypeId,cell);if(op==='move')return movePracticePiece(id,state,source,actionId);if(op==='remove')return removePracticePiece(id,state,source);if(op==='select')return practicePosition(id,state,source);throw Error('Choose a practice-board action.');}
