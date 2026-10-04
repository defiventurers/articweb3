import { describe, expect, it } from 'vitest';
import { battleLayout, BATTLE_FOOTER_HEIGHT } from './battleLayout.js';
import { BATTLE_ASPECT } from './boardGeometry.js';
describe('Sannin battle space allocation', () => {
  it('assigns wide-screen letterbox space to two working panels while fitting every hex', () => {
    for (const [width, height] of [[1920, 900], [1536, 710], [1363, 872]]) {
      const result = battleLayout(width, height, BATTLE_ASPECT);
      expect(result.mode).toBe('wide');
      expect(result.boardWidth / BATTLE_ASPECT).toBeCloseTo(height - BATTLE_FOOTER_HEIGHT);
      expect((width - result.boardWidth) / 2).toBeGreaterThanOrEqual(220);
    }
  });
  it('uses one rail when only one fits, and a drawer on phones or portrait screens', () => {
    expect(battleLayout(1260, 872, BATTLE_ASPECT).mode).toBe('single');
    expect(battleLayout(390, 710, BATTLE_ASPECT).mode).toBe('compact');
    expect(battleLayout(1000, 1050, BATTLE_ASPECT).mode).toBe('compact');
    expect(battleLayout(1400, 850, 1334 / 1179).boardWidth).toBeLessThan(1400);
  });
});
