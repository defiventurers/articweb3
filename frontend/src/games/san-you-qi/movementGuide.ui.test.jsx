// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import Guide from './SanYouQiMovementGuide.jsx';
let host, root;
beforeEach(async () => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(<Guide />)); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const button = text => [...host.querySelectorAll('button')].find(b => b.textContent === text);
const click = async el => { expect(el).toBeTruthy(); await act(async () => el.click()); };
it('defaults red, switches teams and keeps king setup confined', async () => {
  expect(button('red').getAttribute('aria-pressed')).toBe('true');
  await click(button('Choose starting point'));
  expect(host.querySelector('[aria-label="Place at C20"]').disabled).toBe(true);
  await click(button('blue'));
  expect(host.querySelector('img[alt="blue General"]').src).toMatch(/blue_team_SEfacing/);
  await click(button('Choose starting point'));
  expect(host.querySelector('[aria-label="Place at RED L5-2"]').disabled).toBe(true);
  expect(host.querySelector('[aria-label="Move to BLUE L5-2"]').disabled).toBe(false);
});
it('demonstrates cannon capture and restores screen and target with undo', async () => {
  await click(button('Cannon')); await click(button('Try an attack example'));
  expect(host.querySelectorAll('.is-enemy')).toHaveLength(2);
  await click(host.querySelector('[aria-label="Capture at RED L5-5"]'));
  expect(host.querySelectorAll('.is-enemy')).toHaveLength(1);
  await click(button('Undo move'));
  expect(host.querySelectorAll('.is-enemy')).toHaveLength(2);
  expect(host.querySelector('[aria-label="Capture at RED L5-5"]').disabled).toBe(false);
});
it('allows both enemy teams and toggles enemy removal', async () => {
  await click(button('Chariot')); await click(button('Add / remove enemies'));
  const select = host.querySelector('select');
  expect([...select.options].map(o => o.value)).toEqual(['blue', 'green']);
  await click(host.querySelector('[aria-label="Add enemy at RED L5-3"]'));
  expect(host.querySelectorAll('.is-enemy')).toHaveLength(1);
  await click(host.querySelector('[aria-label="Remove enemy at RED L5-3"]'));
  expect(host.querySelectorAll('.is-enemy')).toHaveLength(0);
});
