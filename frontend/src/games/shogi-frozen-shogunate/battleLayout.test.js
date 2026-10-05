import { describe, expect, it } from 'vitest';
import { shogiBattleLayout } from './battleLayout.js';
describe('Shogi battlefield fit', () => {
  it.each([[1363,872], [1920,1016], [1200,872]])('fills available height at %s × %s while retaining two usable panels', (width,height) => {
    const result = shogiBattleLayout(width,height);
    expect(result.mode).toBe('wide');
    expect(result.boardSize + result.panelWidth * 2).toBeCloseTo(width);
    expect(result.panelWidth).toBeGreaterThanOrEqual(212);
    expect(result.panelWidth).toBeLessThanOrEqual(260);
    expect(result.boardHeight+44).toBeCloseTo(height);
  });
  it('uses one panel when two would squeeze the board', () => {
    const result = shogiBattleLayout(1100,1000);
    expect(result.mode).toBe('single');
    expect(result.boardSize + result.panelWidth).toBe(1100);
  });
  it.each([[390,780],[900,1400],[844,326]])('keeps all squares on screen in portrait or landscape at %s × %s', (width,height) => {
    const result=shogiBattleLayout(width,height);
    expect(result.mode).toBe('compact');
    expect(result.boardSize).toBe(width);
    expect(result.boardHeight+44).toBe(height);
  });
  it('fills both dimensions in focus view',()=> {
    const result = shogiBattleLayout(1363,872,true);
    expect(result.boardSize).toBe(1363);
    expect(result.boardHeight).toBe(828);
  });
});
