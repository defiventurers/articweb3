// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import Guide, { canPlace } from './SanguoMovementGuide.jsx';
import { ALL_NODE_IDS, getNodePoint } from '../game/sanguoMovementLesson';
import { sanguoAdvisorTargets } from '../game/sanguoAdvisorMoves';
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(async () => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(<Guide />)); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const button = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent === text)!;
const click = async (el: Element) => { expect(el).toBeTruthy(); await act(async () => (el as HTMLElement).click()); };
it('uses 135 approved points and confines all team palace placements', () => {
  expect(ALL_NODE_IDS).toHaveLength(135);
  expect(ALL_NODE_IDS.every(n => getNodePoint(n))).toBe(true);
  for (const team of ['red', 'blue', 'green']) {
    expect(ALL_NODE_IDS.filter(n => canPlace('general', team, n))).toHaveLength(9);
    expect(ALL_NODE_IDS.filter(n => canPlace('advisor', team, n))).toHaveLength(5);
    expect(ALL_NODE_IDS.filter(n => canPlace('elephant', team, n))).toHaveLength(45);
  }
});
it('starts red and switches teams without allowing foreign palace placement', async () => {
  expect(button('red').getAttribute('aria-pressed')).toBe('true');
  await click(button('blue')); await click(button('Choose starting point'));
  expect(host.querySelector<HTMLButtonElement>('[aria-label="Place at RED L5-2"]')!.disabled).toBe(true);
  expect(host.querySelector<HTMLButtonElement>('[aria-label="Move to BLUE L5-2"]')!.disabled).toBe(false);
});
it('cannon demonstrates one-screen capture and undo', async () => {
  await click(button('Cannon')); await click(button('Try an attack example'));
  expect(host.querySelectorAll('.is-enemy')).toHaveLength(2);
  await click(host.querySelector('[aria-label="Capture at RED L5-5"]')!);
  expect(host.querySelectorAll('.is-enemy')).toHaveLength(1);
  expect(host.textContent).toContain('Captured blue Soldier.');
  await click(button('Undo move')); expect(host.querySelectorAll('.is-enemy')).toHaveLength(2);
});
it('horse blocker can be removed to unlock its attack', async () => {
  await click(button('Horse')); await click(button('Try an attack example'));
  expect(host.querySelector<HTMLButtonElement>('[aria-label="Place at RED L3-4"]')!.disabled).toBe(true);
  await click(button('Add / remove enemies')); await click(host.querySelector('[aria-label="Remove enemy at RED L2-3"]')!); await click(button('Done adding enemies'));
  expect(host.querySelector<HTMLButtonElement>('[aria-label="Capture at RED L3-4"]')!.disabled).toBe(false);
});
it('soldier river lesson branches to both enemy kingdoms and unlocks sideways', async () => {
  await click(button('Soldier')); await click(button('Try the river'));
  expect(host.querySelector('[aria-label="Move to BLUE L5-5"]')).toBeTruthy();
  expect(host.querySelector('[aria-label="Move to GREEN L5-5"]')).toBeTruthy();
  await click(host.querySelector('[aria-label="Move to BLUE L5-5"]')!);
  expect(host.textContent).toContain('sideways unlocked');
  expect(host.querySelector('[aria-label="Move to BLUE L4-5"]')).toBeTruthy();
});
it('offers optional Bannerman blocker example and both enemy teams', async () => {
  await click(button('Bannerman')); await click(button('Try an attack example'));
  expect(host.querySelector<HTMLButtonElement>('[aria-label="Place at RED L5-4"]')!.disabled).toBe(true);
  await click(button('Add / remove enemies')); await click(host.querySelector('[aria-label="Remove enemy at RED L4-2"]')!); await click(button('Done adding enemies'));
  expect(host.querySelector('[aria-label="Capture at RED L5-4"]')).toBeTruthy();
  expect([...host.querySelector('select')!.options].map(o => o.value)).toEqual(['blue','green']);
});
it('engine rejects an advisor placed in a foreign palace', () => {
  expect(sanguoAdvisorTargets({ id:'guard', sector:'red', controller:'red', role:'guard', node:{sector:'blue',rank:3,file:4} }, [])).toEqual([]);
});

it('all non-blocked role examples provide a capture for every team', async () => {
  for (const team of ['red', 'blue', 'green']) {
    await click(button(team));
    for (const role of ['General', 'Advisor', 'Elephant', 'Chariot', 'Cannon', 'Soldier']) {
      await click(button(role)); await click(button('Try an attack example'));
      expect(host.querySelector('.is-capture'), `${team} ${role} should show an attack`).toBeTruthy();
    }
  }
});
