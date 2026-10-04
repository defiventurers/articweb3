import { describe, expect, it } from 'vitest';
import { shogiBattleLayout } from './battleLayout.js';
describe('Shogi battlefield fit', () => {
  it.each([[1363,872,820], [1920,1016,964]])('fills available height at %s × %s while retaining two usable panels', (width,height,size) => {
    const result = shogiBattleLayout(width,height);
    expect(result).toEqual({mode:'wide',boardSize:size});
    expect((width-size)/2).toBeGreaterThanOrEqual(240);
    expect(size+52).toBe(height);
  });
  it('uses one panel when two would squeeze the board', () => expect(shogiBattleLayout(1200,872)).toEqual({mode:'single',boardSize:820}));
  it.each([[390,780],[1000,1100],[844,326]])('keeps all squares on screen in portrait or landscape at %s × %s', (width,height) => {
    const result=shogiBattleLayout(width,height);
    expect(result.mode).toBe('compact');
    expect(result.boardSize).toBeLessThanOrEqual(width);
    expect(result.boardSize+52).toBeLessThanOrEqual(height);
  });
  it('keeps the board at full height in focus view',()=>expect(shogiBattleLayout(1363,872,true).boardSize).toBe(820));
});
