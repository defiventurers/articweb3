import { createEmptyBoard, makePiece, getMovementPreviewTargets, getPawnPromotionType, PIECE_NAME, TEAM_LABEL } from '../../game/gameRules.js';
export const TEAMS = ['red', 'blue', 'green', 'yellow'];
export const FORWARD = { red: [0, 1], blue: [0, -1], green: [-1, 0], yellow: [1, 0] };
export const LESSONS = {
  pawn: { title: 'Snow Guard', icon: '🐧', shape: 'One forward · capture diagonally', dice: '1 or 5', rule: 'Advance one square into empty ice. Capture one square diagonally forward. Your team decides which way is forward.', difference: 'Its move and attack go to different squares.', challenge: 'Capture a diagonal enemy. The enemy directly ahead blocks your advance.' },
  elephant: { title: 'War Mammoth', icon: '🦣', shape: 'Straight lines · stops at pieces', dice: '2', rule: 'Slide any distance along a row or column. Stop at the first piece: capture an enemy there, or stop before a friend.', difference: 'The only long-range slider. It cannot jump or move diagonally.', challenge: 'Capture the first enemy in the open row. You cannot reach the piece behind it.' },
  horse: { title: 'Aurora Unicorn', icon: '🦄', shape: 'Two + one · jumps', dice: '3', rule: 'Jump two squares along a row or column, then one sideways. Only the landing square matters.', difference: 'It jumps over blockers and lands on the opposite square colour.', challenge: 'Jump over the nearby friend and capture the enemy at the end of an L.' },
  ship: { title: 'Icebreaker', icon: '🚢', shape: 'Exactly two diagonally · jumps', dice: '4 or 6', rule: 'Jump exactly two squares diagonally. The intervening square may be occupied. Capture only on the landing square.', difference: 'A short diagonal jumper, with no one-square or long diagonal move.', challenge: 'Jump over the friend in the middle and capture the enemy two diagonals away.' },
  king: { title: 'Frost King', icon: '👑', shape: 'One square · any direction', dice: '1 or 5', rule: 'Move or capture one square in any direction. A friend blocks the destination. Capturing the original royal King eliminates its kingdom.', difference: 'There is no palace or check rule here. Every on-board square is available.', challenge: 'Capture the neighbouring enemy. Your King cannot land on its own friend.' },
};
export const squareName = (r, c) => `${'ABCDEFGH'[c]}${8-r}`;
export const inside = (r,c) => Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < 8 && c >= 0 && c < 8;
export function createLesson(type, team, enemy, example = 'attack') {
  const board = createEmptyBoard();
  let position = { row: 4, col: 3 };
  if (type === 'pawn' && example === 'promotion') {
    position = ({ red: {row:3,col:6}, blue:{row:3,col:1}, green:{row:1,col:3}, yellow:{row:6,col:3} })[team];
  }
  board[position.row][position.col] = makePiece(team,type,type==='king');
  const put = (dr,dc,t=enemy,p='pawn',royal=false) => {
    const r=position.row+dr,c=position.col+dc;
    if(inside(r,c)) board[r][c]=makePiece(t,p,royal);
  };
  if(example==='attack' || example==='royal') {
    if(type==='pawn') {
      const [dr,dc]=FORWARD[team];
      const sides=dr===0 ? [[-1,dc],[1,dc]] : [[dr,-1],[dr,1]];
      sides.forEach(([r,c],i)=>put(r,c,enemy,i===0 && example==='royal'?'king':'pawn',i===0 && example==='royal'));
      put(dr,dc); // cannot capture straight ahead
    } else if(type==='elephant') {
      put(0,2,enemy,example==='royal'?'king':'pawn',example==='royal'); put(0,3); put(-1,0,team);
    } else if(type==='horse') {
      put(-2,1,enemy,example==='royal'?'king':'pawn',example==='royal'); put(-1,0,team); put(1,2);
    } else if(type==='ship') {
      put(-2,2,enemy,example==='royal'?'king':'pawn',example==='royal'); put(-1,1,team); put(2,-2);
    } else {
      put(-1,1,enemy,example==='royal'?'king':'pawn',example==='royal'); put(1,0,team);
    }
  }
  return {board,position};
}
export function lessonTargets(scene) {
  return getMovementPreviewTargets({board:scene.board,gameOver:false},scene.position.row,scene.position.col);
}
export function moveLesson(scene,row,col) {
  const move=lessonTargets(scene).find(m=>m.toRow===row && m.toCol===col);
  if(!move) return null;
  const board=scene.board.map(line=>line.map(p=>p?{...p}:null));
  const piece=board[scene.position.row][scene.position.col];
  const captured=board[row][col];
  board[row][col]=piece; board[scene.position.row][scene.position.col]=null;
  let message=captured ? `${PIECE_NAME[piece.type]} captured ${TEAM_LABEL[captured.team]} ${PIECE_NAME[captured.type]} on ${squareName(row,col)}.` : `${PIECE_NAME[piece.type]} moved to ${squareName(row,col)}.`;
  const promotion=piece.type==='pawn' && getPawnPromotionType(piece.team,row,col);
  if(promotion) { piece.type=promotion; piece.isRoyal=false; message+=` Promoted to ${PIECE_NAME[promotion]}.${promotion==='king'?' This is a fighter King, not a royal King.':''}`; }
  if(captured?.type==='king' && captured.isRoyal!==false) {
    for(const line of board) for(let c=0;c<8;c++) if(line[c]?.team===captured.team) line[c]=null;
    message+=` ${TEAM_LABEL[captured.team]} kingdom eliminated: its remaining pieces are removed.`;
  }
  return {board,position:{row,col},message};
}
