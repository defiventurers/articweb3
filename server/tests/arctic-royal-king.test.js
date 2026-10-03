const {test}=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../gameRules');
function state() {
 const s=rules.createInitialGameState();s.board=Array.from({length:8},()=>Array(8).fill(null));s.currentPlayerIndex=1;s.dice={values:[2,1],used:[false,false],rolled:true};
 s.board[7][0]={team:'red',type:'king',isRoyal:true};s.board[0][7]={team:'blue',type:'king',isRoyal:true};s.board[4][3]={team:'red',type:'elephant',isRoyal:false};s.board[4][5]={team:'blue',type:'king',isRoyal:false};s.board[4][6]={team:'blue',type:'pawn',isRoyal:false};return s;
}
test('capturing a promoted fighter King preserves its royal King and remaining army',()=>{
 const s=state(),chosen=rules.selectSquare(s,4,3),move=chosen.legalMoves.find(m=>m.toRow===4&&m.toCol===5);
 const next=rules.applyMove(chosen,move);assert.equal(next.board[4][6].team,'blue');assert.equal(next.board[0][7].team,'blue');assert.deepEqual(next.eliminatedTeams,[]);assert.equal(next.gameOver,false);
});
test('capturing the royal King eliminates its team including any fighter King',()=>{
 const s=state();s.board[4][5].isRoyal=true;
 const chosen=rules.selectSquare(s,4,3),next=rules.applyMove(chosen,chosen.legalMoves.find(m=>m.toRow===4&&m.toCol===5));
 assert.equal(next.board.flat().some(p=>p?.team==='blue'),false);assert.deepEqual(next.eliminatedTeams,['blue']);assert.equal(next.winner,'red');
});
test('a fighter King does not keep a kingdom alive without its royal King',()=>{
 const s=state();s.board[0][7]=null;const chosen=rules.selectSquare(s,4,3),next=rules.applyMove(chosen,chosen.legalMoves.find(m=>m.toRow===4&&m.toCol===4));
 assert.equal(next.gameOver,true);assert.equal(next.winner,'red');
});
test('older states with no isRoyal flag still recognise original Kings',()=>{
 const s=state();delete s.board[0][7].isRoyal;const chosen=rules.selectSquare(s,4,3),next=rules.applyMove(chosen,chosen.legalMoves.find(m=>m.toRow===4&&m.toCol===4));
 assert.equal(next.gameOver,false);
});
