// Shared authority supplies movement, dice and royal rules. This mobile edition
// also permits ending a rolled turn with either or both dice unused.
// Online rolls are generated inside the server's rule worker.
import rules from '../../../server/gameRules.js';
import {LONG_DICE_PROFILE,isLongDiceState,createLongDiceGame,longDiceActions,applyLongDice} from './chaturangaLongDice.js';
import {DOMINION_TEAMS,teammates,teamGame} from './dominionTeams.js';

export const PIECE_NAMES=rules.PIECE_NAME;
export const DICE_ROLES=rules.DICE_ROLLS;
export const pieceArt=(team,type)=>`launch-v1/chaturanga-pieces/${team==='yellow'?'pink':team}-${({king:'frost-king',horse:'aurora-unicorn',elephant:'war-mammoth',ship:'icebreaker',pawn:'snow-guard'})[type]}.webp`;
const normalize=state=>{const {updatedAt,...position}=state;return {...position,turn:rules.currentTeam(state),selected:null,legalMoves:[]};};
const finish=(before,next,extra={})=>normalize({...next,mobileTurnNumber:(before.mobileTurnNumber||0)+(rules.currentTeam(before)!==rules.currentTeam(next)?1:0),...extra});

export function createDominion(options={}){
  if(options.rulesProfile===LONG_DICE_PROFILE)return createLongDiceGame(options);
  const state=rules.createInitialGameState();
  state.board=state.board.map((row,r)=>row.map((piece,c)=>piece?{...piece,id:`${piece.team}-${piece.type}-${r}-${c}`}:null));
  return normalize({...state,mobileTurnNumber:0,teamMode:options.teamMode==='2v2'?'2v2':'free-for-all'});
}

export function dominionActions(state){
  if(isLongDiceState(state))return longDiceActions(state);
  if(state.gameOver||state.mobileResult)return [];
  if(!state.dice.rolled)return [
    {id:'roll|control:roll',kind:'roll',source:'control:roll',target:null,promote:false,raw:{kind:'roll',count:2}},
    {id:'roll-one|control:roll-one',kind:'roll',source:'control:roll-one',target:null,promote:false,raw:{kind:'roll',count:1}},
    {id:'skip|control:skip',kind:'skip',source:'control:skip',target:null,promote:false,raw:{kind:'skip'}}
  ];
  const moves=[];
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const piece=state.board[row][col];
    if(piece?.team!==rules.currentTeam(state))continue;
    // Clear selection before querying so selectSquare cannot interpret a click
    // as a move from a previously selected piece.
    for(const move of rules.selectSquare({...state,selected:null,legalMoves:[]},row,col).legalMoves){
      const targetPiece=state.board[move.toRow][move.toCol];
      if(teamGame(state)&&targetPiece&&teammates(piece.team,targetPiece.team))continue;
      const source=`piece:${piece.id}`,target=`${move.toRow},${move.toCol}`;
      moves.push({id:`move|${source}|${target}|die:${move.dieIndex}`,source,target,kind:'move',promote:false,raw:move});
    }
  }
  return [...moves,{id:'end|control:end',kind:'end',source:'control:end',target:null,promote:false,raw:{kind:'end'}}];
}

function rollD6(){
  // Rejection sampling keeps the six faces equally likely. No client-supplied
  // roll or forced value is accepted by the mobile action protocol.
  const byte=new Uint8Array(1);
  do{globalThis.crypto.getRandomValues(byte);}while(byte[0]>=252);
  return byte[0]%6+1;
}

export function applyDominion(state,action,verifiedRoll){
  if(isLongDiceState(state))return applyLongDice(state,action,verifiedRoll);
  if(action.kind==='roll'){
    const count=action.raw.count===1?1:2;
    if(verifiedRoll&&(!Array.isArray(verifiedRoll.values)||verifiedRoll.values.length!==count||verifiedRoll.values.some(v=>!Number.isInteger(v)||v<1||v>6)))throw Error('The verified dice do not match this roll.');
    const values=verifiedRoll?[...verifiedRoll.values]:Array.from({length:count},rollD6);
    let next=rules.rollDiceForState(state,count===1?[values[0],values[0]]:values);
    next={...next,dice:{...next.dice,values:count===1?[values[0],null]:values,used:count===1?[false,true]:[false,false],count}};
    const skipped=!dominionActions(next).some(candidate=>candidate.kind==='move');
    if(skipped)next=rules.endTurn(next);
    return finish(state,next,{mobileLastRoll:{team:rules.currentTeam(state),values,count,skipped}});
  }
  if(action.kind==='skip')return finish(state,rules.endTurn(state),{mobileLastSkip:{team:rules.currentTeam(state),turnNumber:state.mobileTurnNumber||0}});
  if(action.kind==='end')return finish(state,rules.endTurn(state));
  let next=rules.applyMove(state,action.raw);
  if(teamGame(next)){
    const alive=DOMINION_TEAMS.filter(team=>team.seats.some(seat=>next.board.flat().some(piece=>piece?.team===seat&&piece.type==='king'&&piece.isRoyal!==false)));
    if(alive.length<=1)next={...next,gameOver:true,winner:alive[0]?.seats[0]||null,winningTeam:alive[0]?.id||null,winningSeats:alive[0]?[...alive[0].seats]:[],selected:null,legalMoves:[]};
    // Base rules do not know alliances. Pass when only allied captures remain.
    if(!next.gameOver&&next.dice.rolled&&!dominionActions(next).some(candidate=>candidate.kind==='move'))next=rules.endTurn(next);
  }
  return finish(state,next);
}
