import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import ShanshuiApp from './ShanshuiApp.jsx';
import { createInitialState, getLegalActions } from './rules.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, element;
beforeEach(() => { localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(() => { act(() => root.unmount()); element.remove(); });
function render() { act(() => root.render(<ShanshuiApp onExit={vi.fn()}/>)); }
function click(text) { const button = [...element.querySelectorAll('button')].find(b => b.textContent.trim() === text || b.textContent.trim().startsWith(text)); expect(button, text).toBeTruthy(); act(() => button.click()); }
describe('Shanshui shared Android/web experience', () => {
  it('plays legal moves, advances army order, keeps state through undo and shows both board themes', () => {
    render(); click('Two players'); expect(element.querySelectorAll('[data-shanshui-point]')).toHaveLength(169);
    const s = createInitialState(), a = getLegalActions(s)[0], p = s.pieces.find(p => p.id === a.pieceId);
    act(() => element.querySelector(`[data-shanshui-point="${p.row},${p.col}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(element.textContent).toContain('destinations');
    act(() => element.querySelector(`[data-shanshui-point="${a.to.row},${a.to.col}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(element.querySelector('.shanshui-turn h2').textContent).toBe('Blue to move');
    click('Undo'); expect(element.querySelector('.shanshui-turn h2').textContent).toBe('Red to move');
    act(() => element.querySelector('[aria-label="Toggle light and dark board"]').click());
    expect(element.querySelector('svg image').getAttribute('href')).toContain('board-light.webp');
  });
  it('opens an empty editor, validates before play, loads the full starting position and locks editing', () => {
    render(); click('Arrange the board freely'); expect(element.querySelectorAll('svg image')).toHaveLength(1);
    click('Validate & play locally'); expect(element.querySelector('[role="alert"]').textContent).toContain('exactly one General');
    click('Starting position'); expect(element.querySelectorAll('svg image')).toHaveLength(69);
    click('Lock arrangement'); expect(element.textContent).toContain('Arrangement locked');
    click('Validate & play locally'); expect(element.querySelector('.shanshui-turn h2').textContent).toBe('Red to move');
  });
  it('teaches a single piece without match turns and provides quick/full rules progress', () => {
    render(); click('Full rules'); expect(element.querySelector('progress').value).toBe(1);
    click('Next'); expect(element.querySelector('progress').value).toBe(2);
    act(() => element.querySelector('[aria-label="Close dialog"]').click()); click('Learn piece movement');
    expect(element.querySelectorAll('svg image')).toHaveLength(2); expect(element.textContent).toContain('no opponents, turns or match result');
    click('Mountain infantry'); expect(element.textContent).toContain('opposite foot');
    expect(element.querySelectorAll('svg image')).toHaveLength(2);
  });
  it('labels the four-human adaptation and retains all four army identities', () => {
    render(); click('Four-player 2v2'); expect(element.textContent).toContain('FOUR-PLAYER 2v2 · ADAPTATION');
    expect(element.querySelectorAll('svg image')).toHaveLength(69); expect(element.querySelector('.shanshui-army-strip').textContent).toContain('Purple');
  });
});
