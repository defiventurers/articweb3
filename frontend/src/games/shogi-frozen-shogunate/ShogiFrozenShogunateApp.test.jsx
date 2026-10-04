// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShogiFrozenShogunateApp } from './ShogiFrozenShogunateApp.jsx';
vi.mock('../../components/AudioToggle.jsx',()=>({AudioToggle:()=> <button className="audio-toggle">Mute sound</button>}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let host, root;
afterEach(async()=>{if(root) await act(()=>root.unmount());host?.remove();root=null;vi.restoreAllMocks();});
async function render(width=1363,height=936) {
  Object.defineProperty(window,'innerWidth',{configurable:true,value:width});
  Object.defineProperty(window,'innerHeight',{configurable:true,value:height});
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(()=>root.render(<ShogiFrozenShogunateApp />));
}
async function click(element) { await act(()=>element.click()); }
const button=name=>[...host.querySelectorAll('button')].find(b=>b.textContent===name||b.getAttribute('aria-label')===name);
const cell=coordinate=>[...host.querySelectorAll('[role="gridcell"]')].find(c=>c.getAttribute('aria-label').startsWith(`${coordinate},`));
describe('Shogi board-first match screen',()=>{
  it('renders both side panels and the full board with one keyboard entry',async()=>{
    await render();
    expect(host.querySelector('[data-layout]').dataset.layout).toBe('wide');
    expect(host.querySelector('.shogi-command')).toBeTruthy();
    expect(host.querySelector('.shogi-hands')).toBeTruthy();
    expect(host.querySelectorAll('[role="gridcell"]')).toHaveLength(81);
    expect(host.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
  });
  it('shows legal movement guidance, commits a destination, updates history, and undoes',async()=>{
    await render();await click(cell('9g'));
    expect(host.querySelector('.shogi-piece-guide').textContent).toContain('One square straight forward');
    await click(button('Move to 9f'));
    expect(cell('9f').getAttribute('aria-label')).toContain('Crimson Shogunate Pawn');
    expect(host.querySelector('.shogi-battle-status').textContent).toContain('Sapphire');
    expect(host.querySelector('.shogi-recent').textContent).toContain('9g → 9f');
    await click(button('Undo'));
    expect(cell('9g').getAttribute('aria-label')).toContain('Crimson Shogunate Pawn');
    expect(host.querySelector('.shogi-recent').textContent).toContain('Your moves appear here');
  });
  it('focus view keeps the board and controls while hiding both panels',async()=>{
    await render();await click(button('Focus view'));
    expect(host.querySelector('.shogi-play').classList.contains('is-focused')).toBe(true);
    expect(host.querySelector('.shogi-hands')).toBeNull();
    expect(host.querySelectorAll('[role="gridcell"]')).toHaveLength(81);
    await click(button('Focus view'));expect(host.querySelector('.shogi-command')).toBeTruthy();
  });
  it('opens a compact drawer and closes after selecting a destination',async()=>{
    await render(390,844);await click(cell('9g'));await click(button('Match panel'));
    expect(host.querySelector('[role="dialog"]').getAttribute('aria-label')).toBe('Match panel');
    expect(document.activeElement).toBe(button('Close match panel'));
    await click(button('Move to 9f'));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(cell('9f').getAttribute('aria-label')).toContain('Pawn');
  });
  it('navigates squares without crossing a rank edge and clears selection with Escape',async()=>{
    await render();await click(cell('9g'));
    await act(()=>cell('9g').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})));
    expect(cell('9g').getAttribute('tabindex')).toBe('0');
    await act(()=>cell('9g').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true})));
    expect(document.activeElement).toBe(cell('9f'));
    await act(()=>cell('9f').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    expect(host.querySelector('[aria-selected="true"]')).toBeNull();
  });
  it('retains rules and research navigation and the bot mode',async()=>{
    await render();await click(button('Rulebook'));
    expect(host.textContent).toContain('Field Guide to the Frozen Shogunate');
    await click(button('Research Notes'));expect(host.textContent).toContain('documented modern game');
    await click(button('Play'));
    const mode=host.querySelector('select');await act(()=>{mode.value='bot';mode.dispatchEvent(new Event('change',{bubbles:true}));});
    expect(mode.value).toBe('bot');
  });
});
