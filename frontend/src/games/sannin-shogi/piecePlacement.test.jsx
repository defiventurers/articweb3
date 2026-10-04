// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SanninPiecePlacement from './SanninPiecePlacement.jsx';
import SanninShogiApp, { SanninBoard } from './SanninShogiApp.jsx';
import { createInitialState } from './rules.js';
import { HEX_CELLS } from './hex.js';
import { artworkPoint, BATTLE_VIEWBOX, FULL_VIEWBOX, PIECE_SIZE } from './boardGeometry.js';
import { PLACEMENT_KEY, sanitisePlacement, placementCss, shiftPlacement } from './piecePlacement.js';

let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.requestAnimationFrame = callback => callback();
  localStorage.clear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const button = name => [...host.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent) === name);
const click = async name => act(async () => button(name).click());
const select = async (label, value) => act(async () => {
  const el = [...host.querySelectorAll('label')].find(l => l.textContent.startsWith(label)).querySelector('select');
  el.value = value; el.dispatchEvent(new Event('change', { bubbles: true }));
});

describe('Sannin wooden-piece workshop', () => {
  it('ignores invalid stored coordinates and exports finite fractional CSS offsets', () => {
    expect(sanitisePlacement({ '0,0': { x: .25, y: -1 }, '20,0': { x: 1, y: 2 }, '1,0': { x: NaN, y: 0 }, '2,0': { x: 999, y: 0 } })).toEqual({ '0,0': { x: .25, y: -1 } });
    const shifted = shiftPlacement({}, ['0,0'], .25, -1);
    expect(placementCss(shifted)).toContain('.sannin-square[data-cell="0,0"] { --sannin-piece-x: 0.25px; --sannin-piece-y: -1px; }');
    expect(shiftPlacement(shifted, ['0,0'], 1000, -1000)['0,0']).toEqual({ x: 120, y: -120 });
    const [x, y, w, h] = BATTLE_VIEWBOX.split(' ').map(Number);
    for (const cell of HEX_CELLS) {
      const point = artworkPoint(cell);
      expect(point.x).toBeGreaterThan(x + 32); expect(point.x).toBeLessThan(x + w - 32);
      expect(point.y).toBeGreaterThan(y + 32); expect(point.y).toBeLessThan(y + h - 32);
    }
  });
  it('uses all 127 native wood tokens, saves selected/row/all adjustments, and undoes a reset', async () => {
    await act(async () => root.render(<SanninPiecePlacement />));
    expect(host.querySelectorAll('.sannin-piece image')).toHaveLength(127);
    expect([...host.querySelectorAll('.sannin-piece image')].every(p => p.getAttribute('width') === String(PIECE_SIZE))).toBe(true);
    await click('Move piece right');
    expect(JSON.parse(localStorage.getItem(PLACEMENT_KEY))).toEqual({ '0,0': { x: 1, y: 0 } });
    await select('Apply adjustments to', 'row'); await click('Move piece up');
    const rowMap = JSON.parse(localStorage.getItem(PLACEMENT_KEY));
    expect(Object.keys(rowMap)).toHaveLength(13); expect(rowMap['0,0']).toEqual({ x: 1, y: -1 });
    expect(host.querySelector('textarea').value).toContain('--sannin-piece-y: -1px');
    await select('Apply adjustments to', 'all'); await click('Move piece down');
    expect(Object.keys(JSON.parse(localStorage.getItem(PLACEMENT_KEY)))).toHaveLength(127);
    await click('Reset all'); expect(JSON.parse(localStorage.getItem(PLACEMENT_KEY))).toEqual({});
    await click('Undo'); expect(Object.keys(JSON.parse(localStorage.getItem(PLACEMENT_KEY)))).toHaveLength(127);
    await select('Preview', 'starting'); expect(host.querySelectorAll('.sannin-piece image')).toHaveLength(54);
    await select('Preview', 'one'); expect(host.querySelectorAll('.sannin-piece image')).toHaveLength(1);
  });
  it('converts pointer dragging from screen pixels to board coordinates before saving', async () => {
    await act(async () => root.render(<SanninPiecePlacement />));
    const cell = host.querySelector('[data-cell="0,0"]'), svg = host.querySelector('svg');
    svg.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform() { return { x: this.x / 2, y: this.y / 2 }; } });
    cell.getScreenCTM = () => ({ inverse: () => ({}) });
    cell.setPointerCapture = vi.fn(); cell.hasPointerCapture = () => true; cell.releasePointerCapture = vi.fn();
    await act(async () => cell.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, button: 0, bubbles: true })));
    await act(async () => cell.dispatchEvent(new MouseEvent('pointermove', { clientX: 106, clientY: 92, bubbles: true })));
    await act(async () => cell.dispatchEvent(new MouseEvent('pointerup', { clientX: 106, clientY: 92, bubbles: true })));
    expect(JSON.parse(localStorage.getItem(PLACEMENT_KEY))['0,0']).toEqual({ x: 3, y: -4 });
    await click('Undo'); expect(JSON.parse(localStorage.getItem(PLACEMENT_KEY))).toEqual({});
  });
  it('shares saved offsets with battle and frames the whole playable area', async () => {
    localStorage.setItem(PLACEMENT_KEY, JSON.stringify({ '6,-3': { x: 2, y: -1 } }));
    await act(async () => root.render(<SanninBoard state={createInitialState()} selected={null} legalActions={[]} onCell={() => {}} onCancel={() => {}} />));
    expect(host.querySelector('.sannin-board').getAttribute('viewBox')).toBe(BATTLE_VIEWBOX);
    expect(host.querySelector('[data-cell="6,-3"] .sannin-piece-placement').style.getPropertyValue('--sannin-piece-x')).toBe('2px');
    await act(async () => root.render(<SanninBoard state={createInitialState()} selected={null} legalActions={[]} onCell={() => {}} onCancel={() => {}} fullArtwork />));
    expect(host.querySelector('.sannin-board').getAttribute('viewBox')).toBe(FULL_VIEWBOX);
  });
  it('opens a focused battlefield and a keyboard-managed mobile panel', async () => {
    const width = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    await act(async () => root.render(<SanninShogiApp />));
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent.includes('3 players')).click());
    await click('Start 3-player game');
    expect(host.querySelector('.sannin-match')).toBeTruthy();
    expect(host.querySelector('.sannin-scroll-rail')).toBeNull();
    await click('Focus view'); expect(host.querySelector('.sannin-roster')).toBeNull();
    await click('Focus view'); expect(host.querySelector('.sannin-roster')).toBeTruthy();
    width.mockReturnValue(390);
    await act(async () => window.dispatchEvent(new Event('resize')));
    const opener = button('Match panel'); opener.focus();
    await click('Match panel'); expect(host.querySelector('[role="dialog"]')).toBeTruthy();
    await act(async () => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull(); expect(document.activeElement).toBe(opener);
    await click('Full artwork'); expect(host.querySelector('.sannin-board').getAttribute('viewBox')).toBe(FULL_VIEWBOX);
    await click('Battlefield'); expect(host.querySelector('.sannin-board').getAttribute('viewBox')).toBe(BATTLE_VIEWBOX);
  });
});
