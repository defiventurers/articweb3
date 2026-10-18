// Adapt the existing Arctic Dominion authority; its board, dice and royal rules
// remain unchanged. Online rolls are generated inside the server's rule worker.
import rules from '../../../server/gameRules.js';

export const PIECE_NAMES=rules.PIECE_NAME;
export const DICE_ROLES=rules.DICE_ROLLS;
export const pieceArt=(team,type)=>`dominion/${team==='yellow'?'pink':team}-${({king:'frost-king',horse:'aurora-unicorn',elephant:'war-mammoth',ship:'icebreaker',pawn:'snow-guard'})[type]}.webp`;
const normalize=state=>{const {updatedAt,...position}=state;return {...position,turn:rules.currentTeam(state),selected:null,legalMoves:[]};};

export function createDominion(){
  const state=rules.createInitialGameState();
  state.board=state.board.map((row,r)=>row.map((piece,c)=>piece?{...piece,id:`${piece.team}-${piece.type}-${r}-${c}`}:null));
  return normalize(state);
}

export function dominionActions(state){
  if(state.gameOver||state.mobileResult)return [];
  if(!state.dice.rolled)return [{id:'roll|control:roll',kind:'roll',source:'control:roll',target:null,promote:false,raw:{kind:'roll'}}];
  const moves=[];
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const piece=state.board[row][col];
    if(piece?.team!==rules.currentTeam(state))continue;
    // Clear selection before querying so selectSquare cannot interpret a click
    // as a move from a previously selected piece.
    for(const move of rules.selectSquare({...state,selected:null,legalMoves:[]},row,col).legalMoves){
      const source=`piece:${piece.id}`,target=`${move.toRow},${move.toCol}`;
      moves.push({id:`move|${source}|${target}|die:${move.dieIndex}`,source,target,kind:'move',promote:false,raw:move});
    }
  }
  return moves.length?moves:[{id:'end|control:end',kind:'end',source:'control:end',target:null,promote:false,raw:{kind:'end'}}];
}

function rollD6(){
  // Rejection sampling keeps the six faces equally likely. No client-supplied
  // roll or forced value is accepted by the mobile action protocol.
  const byte=new Uint8Array(1);
  do{globalThis.crypto.getRandomValues(byte);}while(byte[0]>=252);
  return byte[0]%6+1;
}

export function applyDominion(state,action){
  if(action.kind==='roll'){
    const values=[rollD6(),rollD6()];
    let next=rules.rollDiceForState(state,values);
    const skipped=!rules.hasAnyLegalMoveForTeam(next);
    if(skipped)next=rules.endTurn(next);
    return normalize({...next,mobileLastRoll:{team:rules.currentTeam(state),values,skipped}});
  }
  if(action.kind==='end')return normalize(rules.endTurn(state));
  return normalize(rules.applyMove(state,action.raw));
}
