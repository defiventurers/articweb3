import { expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { createEmptyBoard, makePiece, PLAYERS, getPawnPromotionType, DICE_ROLLS } from '../../game/gameRules.js';
import { LESSONS, TEAMS, FORWARD, inside, createLesson, lessonTargets, moveLesson } from './movementLesson.js';
const server = createRequire(import.meta.url)('../../../../server/gameRules.js');
for (const team of TEAMS) for (const type of Object.keys(LESSONS)) {
  it(`${team} ${type}: all 64 starts stay on board and match the multiplayer engine`,()=>{
    for(let row=0;row<8;row++) for(let col=0;col<8;col++) {
      const board=createEmptyBoard();
      for(let r=0;r<8;r++) for(let c=0;c<8;c++) if((r*8+c)%11===0) board[r][c]=makePiece((r+c)%2?team:TEAMS.find(t=>t!==team),'pawn');
      board[row][col]=makePiece(team,type,type==='king');
      const scene={board,position:{row,col}};
      const targets=lessonTargets(scene);
      targets.forEach(m=>{expect(inside(m.toRow,m.toCol)).toBe(true);expect(m.captured?.team).not.toBe(team);});
      const face=Number(Object.keys(DICE_ROLLS).find(v=>DICE_ROLLS[v].includes(type)));
      const native=server.selectSquare({...server.createInitialGameState(),board,currentPlayerIndex:PLAYERS.indexOf(team),dice:{values:[face,face],used:[false,true],rolled:true}},row,col);
      const coords=ms=>ms.map(m=>`${m.toRow},${m.toCol}`).sort();
      expect(coords(targets)).toEqual(coords(native.legalMoves));
    }
  });
}
it('Mammoth stops at the first occupied square in each lane',()=>{
  const scene=createLesson('elephant','red','blue');
  const coords=lessonTargets(scene).map(m=>`${m.toRow},${m.toCol}`);
  expect(coords).toContain('4,5'); expect(coords).not.toContain('4,6');expect(coords).not.toContain('3,3'); expect(moveLesson(scene,4,6)).toBeNull();
});
for(const type of ['ship','horse']) it(`${type} jumps over blockers and captures only at its exact landing square`,()=>{
  const scene=createLesson(type,'red','blue');
  const [r,c]=type==='ship'?[2,5]:[2,4];
  expect(moveLesson(scene,r,c)?.board[r][c]?.type).toBe(type);
  expect(moveLesson(scene,3,type==='ship'?4:3)).toBeNull();
});
for(const team of TEAMS) it(`${team} Guard captures diagonally, cannot take the piece ahead, and promotes using the actual edge map`,()=>{
  const scene=createLesson('pawn',team,TEAMS.find(t=>t!==team));
  const [dr,dc]=FORWARD[team],{row,col}=scene.position;
  expect(moveLesson(scene,row+dr,col+dc)).toBeNull();expect(lessonTargets(scene)).toHaveLength(2);
  const promotion=createLesson('pawn',team,TEAMS.find(t=>t!==team),'promotion');
  const r=promotion.position.row+dr,c=promotion.position.col+dc;
  const next=moveLesson(promotion,r,c);
  expect(next.board[r][c].type).toBe(getPawnPromotionType(team,r,c)); expect(next.board[r][c].isRoyal).toBe(false);
});
it('royal captures remove that kingdom; fighter captures preserve it',()=>{
  const scene=createLesson('elephant','red','blue','royal');
  expect(moveLesson(scene,4,5).board.flat().some(p=>p?.team==='blue')).toBe(false);
  scene.board[4][5].isRoyal=false;
  expect(moveLesson(scene,4,5).board[4][6].team).toBe('blue');
});
it('King has no palace restriction and no off-board destinations',()=>{
  const scene={board:createEmptyBoard(),position:{row:0,col:0}};scene.board[0][0]=makePiece('red','king',true);
  expect(lessonTargets(scene)).toHaveLength(3);expect(moveLesson(scene,-1,0)).toBeNull();
});
