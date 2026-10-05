import { describe, expect, it } from 'vitest';
import { SHOGI_MAX_BOARD_ASPECT, shogiBattleLayout } from './battleLayout.js';
describe('Shogi battlefield fit', () => {
  it.each([[1363,872], [1920,1016], [1200,872], [2560,1384]])('keeps a tall board at %s × %s with no unused desktop columns', (width,height) => {
    const result = shogiBattleLayout(width,height);
    expect(result.mode).toBe('wide');
    expect(result.boardSize + result.panelWidth * 2).toBeCloseTo(width);
    expect(result.panelWidth).toBeGreaterThanOrEqual(212);
    expect(result.boardSize / result.boardHeight).toBeCloseTo(SHOGI_MAX_BOARD_ASPECT);
    expect(result.boardHeight+44).toBeCloseTo(height);
  });
  it('uses one panel when two would squeeze the board', () => {
    const result = shogiBattleLayout(1100,1000);
    expect(result.mode).toBe('single');
    expect(result.boardSize + result.panelWidth).toBe(1100);
    expect(result.boardSize / result.boardHeight).toBeCloseTo(SHOGI_MAX_BOARD_ASPECT);
  });
  it.each([[390,780],[900,1400],[844,326]])('keeps all squares on screen in portrait or landscape at %s × %s', (width,height) => {
    const result=shogiBattleLayout(width,height);
    expect(result.mode).toBe('compact');
    expect(result.boardSize).toBe(Math.min(width, (height-44) * SHOGI_MAX_BOARD_ASPECT));
    expect(result.boardSize / result.boardHeight).toBeLessThanOrEqual(SHOGI_MAX_BOARD_ASPECT);
    expect(result.boardHeight+44).toBe(height);
  });
  it('preserves the tall board in focus view',()=> {
    const result = shogiBattleLayout(1363,872,true);
    expect(result.boardSize).toBeCloseTo(828 * SHOGI_MAX_BOARD_ASPECT);
    expect(result.boardHeight).toBe(828);
  });
});
