import { describe, expect, it } from 'vitest';
import { SHOGI_BOARD_ASPECT, shogiBattleLayout } from './battleLayout.js';
describe('Shogi battlefield fit', () => {
  it.each([[1363,872], [1920,1016], [1200,872]])('fills available height at %s × %s while retaining two usable panels', (width,height) => {
    const result = shogiBattleLayout(width,height);
    expect(result.mode).toBe('wide');
    expect(result.boardSize / result.boardHeight).toBeCloseTo(SHOGI_BOARD_ASPECT);
    expect((width-result.boardSize)/2).toBeGreaterThanOrEqual(240);
    expect(result.boardHeight+44).toBeCloseTo(height);
  });
  it('uses one panel when two would squeeze the board', () => expect(shogiBattleLayout(1100,1000).mode).toBe('single'));
  it.each([[390,780],[1000,1400],[844,326]])('keeps all squares on screen in portrait or landscape at %s × %s', (width,height) => {
    const result=shogiBattleLayout(width,height);
    expect(result.mode).toBe('compact');
    expect(result.boardSize).toBeLessThanOrEqual(width);
    expect(result.boardHeight+44).toBeLessThanOrEqual(height);
  });
  it('keeps the board at full height in focus view',()=>expect(shogiBattleLayout(1363,872,true).boardHeight).toBeCloseTo(828));
});
