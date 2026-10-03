// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it } from 'vitest';
import Guide from './ArcticMovementGuide.jsx';
import { TutorialBoard } from '../../components/TutorialBoard.jsx';
let host,root;
beforeEach(async()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<Guide/>));});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
const button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent===text);
const cell=s=>host.querySelector(`[data-square="${s}"]`);
const click=async el=>{expect(el).toBeTruthy();await act(async()=>el.click());};
const select=async(el,value)=>{await act(async()=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));});};
const lesson=async name=>click([...host.querySelectorAll('.adg-roster button')].find(b=>b.querySelector('strong').textContent===name));
it('defaults Red, shows 64 bounded squares and changes Guard direction with all four kingdoms',async()=>{
 expect(button('Red').getAttribute('aria-pressed')).toBe('true');expect(host.querySelectorAll('.adg-cell')).toHaveLength(64);
 for(const [t,target] of [['Red','E5'],['Blue','C5'],['Green','C5'],['Pink','C3']]) {await click(button(t));expect(cell(target).dataset.capture).toBe('true');}
});
it('captures, undoes, resets and rejects a blocked Guard move',async()=>{
 const initial=host.querySelectorAll('.adg-cell.enemy').length;
 await click(cell('E4'));expect(host.querySelector('.adg-cell.selected').dataset.square).toBe('D4');
 await click(cell('E5'));expect(host.querySelectorAll('.adg-cell.enemy')).toHaveLength(initial-1);
 await click(button('Undo'));expect(host.querySelectorAll('.adg-cell.enemy')).toHaveLength(initial);
 await click(button('Reset lesson'));expect(host.querySelector('.adg-cell.selected').dataset.square).toBe('D4');
});
it('mixes enemy kingdoms, removes pieces, adds friends and keeps setup inside the board',async()=>{
 await click(button('Open board'));await click(button('Add / remove enemies'));await click(cell('A8'));
 await select(host.querySelector('.adg-fields select'),'green');await click(cell('H1'));
 expect(cell('A8').getAttribute('aria-label')).toContain('Blue');expect(cell('H1').getAttribute('aria-label')).toContain('Green');
 await click(cell('A8'));expect(cell('A8').querySelector('img')).toBeNull();
 await click(button('Add / remove friends'));await click(cell('A8'));expect(cell('A8').classList.contains('friend')).toBe(true);
 await click(button('Choose starting square'));await click(cell('H8'));expect(host.querySelector('.selected').dataset.square).toBe('H8');
});
it('uses one matching die per move and undo restores the spent face',async()=>{
 await click(button('Open board'));await click(host.querySelector('input[type="checkbox"]'));
 await select(host.querySelector('[aria-label="Die 1"]'),'3');expect(host.querySelectorAll('.adg-cell.legal')).toHaveLength(0);
 await select(host.querySelector('[aria-label="Die 1"]'),'1');await click(cell('E4'));
 expect(host.querySelector('[aria-label="Die 1"]').parentElement.textContent).toContain('used');expect(host.querySelectorAll('.adg-cell.legal')).toHaveLength(0);
 await click(button('Undo'));expect(host.querySelector('[aria-label="Die 1"]').parentElement.textContent).toContain('available');
});
it('shows native promotion and the new movement rule, royal elimination and its undo',async()=>{
 await click(button('Try promotion'));await click(cell('H5'));expect(cell('H5').textContent).toContain('FIGHTER');expect(host.querySelector('.adg-promoted-rule').textContent).toContain('Now moves as Frost King');
 await lesson('War Mammoth');await click(button('Capture a royal King'));await click(cell('F4'));
 expect(host.querySelectorAll('.adg-cell.enemy')).toHaveLength(0);await click(button('Undo'));expect(host.querySelectorAll('.adg-cell.enemy')).toHaveLength(2);
});

it('lets a captured promoted fighter King leave its kingdom on the board',async()=>{
 await lesson('War Mammoth');await click(button('Open board'));
 const selects=host.querySelectorAll('.adg-fields select');await select(selects[1],'fighter-king');await click(button('Add / remove enemies'));await click(cell('F4'));
 await select(selects[1],'pawn');await click(cell('G4'));await click(button('Add / remove enemies'));await click(cell('F4'));
 expect(cell('G4').classList.contains('enemy')).toBe(true);expect(host.querySelector('[role="status"]').textContent).not.toContain('eliminated');
});

it('the existing academy actually removes the captured royal kingdom',async()=>{
 await act(async()=>root.render(<TutorialBoard/>));
 const cells=host.querySelectorAll('.tutorial-cell');await click(cells[4*8+2]);await click(cells[5*8+3]);
 expect(host.querySelectorAll('.tutorial-cell img')).toHaveLength(1);expect(host.querySelector('.tutorial-feedback').textContent).toContain('kingdom eliminated');
});
it('the existing academy promotes Guards and allows the promoted piece to keep moving',async()=>{
 await act(async()=>root.render(<TutorialBoard/>));
 for(let c=2;c<7;c++){const cells=host.querySelectorAll('.tutorial-cell');await click(cells[4*8+c]);await click(cells[4*8+c+1]);}
 const king=host.querySelector('[aria-label="red king"]');expect(king).toBeTruthy();await click(king);expect(host.querySelectorAll('.tutorial-cell.legal')).toHaveLength(5);
});
