import { describe, it, expect } from 'vitest';
import { canPlace } from './SanYouQiMovementGuide.jsx';
import { ALL_NODE_IDS } from './topology.js';
import { getPseudoTargets } from './rules.js';
const piece = (role, node, faction = 'red', id = role) => ({ id, role, node, faction, owner: faction, status: 'board' });
const targets = (p, enemies = []) => getPseudoTargets({ pieces: [p, ...enemies] }, p.id);
describe('movement lesson restrictions', () => {
  for (const faction of ['red', 'blue', 'green']) {
    it(`${faction} king and advisor setup stays in original palace`, () => {
      expect(ALL_NODE_IDS.filter(n => canPlace('general', faction, n))).toHaveLength(9);
      expect(ALL_NODE_IDS.filter(n => canPlace('advisor', faction, n))).toHaveLength(5);
      expect(canPlace('general', faction, 'C20')).toBe(false);
      expect(canPlace('elephant', faction, 'C20')).toBe(false);
    });
  }
  it('cannon requires one screen and captures the second enemy', () => {
    const cannon = piece('cannon', 'red:L5-1');
    const target = piece('soldier', 'red:L5-5', 'blue', 'target');
    expect(targets(cannon, [target])).not.toContain(target.node);
    expect(targets(cannon, [piece('soldier', 'red:L5-3', 'green', 'screen'), target])).toContain(target.node);
  });
  it('horse cannot move through an occupied leg', () => {
    const horse = piece('horse', 'red:L2-2');
    expect(targets(horse)).toContain('red:L3-4');
    expect(targets(horse, [piece('soldier', 'red:L2-3', 'blue')])).not.toContain('red:L3-4');
  });
  it('sea blocks chariot and mountain blocks cannon, with sea cannon crossing open', () => {
    expect(targets(piece('chariot', 'C3'))).not.toContain('C17');
    expect(targets(piece('cannon', 'C3'))).toContain('C17');
    expect(targets(piece('cannon', 'C2'))).not.toContain('C18');
    expect(targets(piece('cannon', 'C1'))).not.toContain('blue:L8-5');
  });
});
