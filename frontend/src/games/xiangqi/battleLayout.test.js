import { expect, it } from 'vitest';
import { xiangqiBattleLayout, XIANGQI_BOARD_ASPECT } from './battleLayout.js';
it.each([[1920,1016,'wide'],[1366,704,'wide'],[1024,704,'single'],[1024,1300,'compact'],[390,784,'compact'],[844,330,'wide']])('fits %s × %s with %s organization', (width,height,mode)=>{
  const layout=xiangqiBattleLayout(width,height);
  expect(layout.mode).toBe(mode);
  expect(layout.boardWidth).toBeLessThanOrEqual(width);
  expect(layout.boardHeight + 44 + (mode==='compact' ? 48 : 0)).toBeLessThanOrEqual(height);
  expect(layout.boardWidth/layout.boardHeight).toBeCloseTo(XIANGQI_BOARD_ASPECT);
  const spare=width-layout.boardWidth;
  if(mode==='wide') expect(spare/2).toBeGreaterThanOrEqual(220);
  if(mode==='single') expect(spare).toBeGreaterThanOrEqual(250);
});
it('uses portrait-phone spare height for the briefing, while short landscape stays clear',()=>{
  expect(xiangqiBattleLayout(390,784).briefingHeight).toBeGreaterThan(90);
  expect(xiangqiBattleLayout(844,330).briefingHeight).toBe(0);
});
it('focus gives the entire height to the board without changing its geometry',()=>{
  const normal=xiangqiBattleLayout(600,330),focused=xiangqiBattleLayout(600,330,true);
  expect(focused.boardHeight).toBe(normal.boardHeight+48);
  expect(focused.boardWidth/focused.boardHeight).toBeCloseTo(XIANGQI_BOARD_ASPECT);
});
