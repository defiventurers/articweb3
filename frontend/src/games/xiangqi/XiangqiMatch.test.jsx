// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { XiangqiMatch } from '../heritage-arcade/ported/components/XiangqiBoard.tsx';
import { createInitialState } from './engine.ts';
const mock = vi.hoisted(() => ({ workers: [] }));
vi.mock('./bot.worker.ts?worker', () => ({ default: class {
  constructor() { mock.workers.push(this); }
  postMessage() {} terminate() { this.terminated = true; }
} }));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let host,root;
afterEach(async()=>{await act(()=>root?.unmount());host?.remove();mock.workers=[];vi.useRealTimers();});
async function render(props={}) {
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(()=>root.render(<XiangqiMatch config={{humans:['red','black'],difficulty:'medium'}} onSetup={()=>{}} onExitToLibrary={()=>{}} {...props} />));
}
const square=(rank,file)=>host.querySelector(`[aria-label="rank ${rank}, file ${file}"]`);
const click=async node=>act(()=>node.dispatchEvent(new MouseEvent('click',{bubbles:true})));
it('full-cell hit areas select and move pieces, with upright artwork and keyboard support',async()=>{
  await render();
  expect(host.querySelectorAll('.xiangqi-hit-area')).toHaveLength(90);
  const soldier=square(4,'a'),hit=soldier.querySelector('rect');
  expect(+hit.getAttribute('width')).toBeGreaterThan(76);
  await click(hit); expect(soldier.querySelector('.selected')).toBeTruthy();
  await act(()=>square(5,'a').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  expect(square(5,'a').querySelector('image')).toBeTruthy();
  expect(square(4,'a').querySelector('image')).toBeNull();
  expect([...host.querySelectorAll('image')].every(image=>!image.hasAttribute('transform'))).toBe(true);
  await click([...host.querySelectorAll('button')].find(b=>b.textContent.trim()==='Undo'));
  expect(square(4,'a').querySelector('image')).toBeTruthy();
});
it('locks online input until the seat can act and sends the move to the server',async()=>{
  const onAction=vi.fn(),room={gameState:createInitialState()};
  await render({online:{room,canAct:false,onAction,notice:'Waiting'}});
  await click(square(4,'a'));expect(host.querySelector('.selected')).toBeNull();
  await act(()=>root.render(<XiangqiMatch config={{humans:['red'],difficulty:'hard'}} onSetup={()=>{}} onExitToLibrary={()=>{}} online={{room,canAct:true,onAction,notice:'Your turn'}} />));
  await click(square(4,'a'));await click(square(5,'a'));
  expect(onAction).toHaveBeenCalledWith({pieceId:'red-soldier-0',to:{row:5,col:0}});
  expect(square(4,'a').querySelector('image')).toBeTruthy();
});
it('undo cancels bot work and restores the previous human decision after a reply',async()=>{
  vi.useFakeTimers();
  await render({config:{humans:['red'],difficulty:'medium'}});
  await click(square(4,'a'));await click(square(5,'a'));
  expect(host.querySelector('[role=status]').textContent).toContain('thinking');
  await click(square(4,'c'));expect(host.querySelector('.selected')).toBeNull();
  const worker=mock.workers.at(-1);
  // Black soldier reply is legal after the human's opening.
  await act(()=>worker.onmessage({data:{action:{pieceId:'black-soldier-0',to:{row:4,col:0}}}}));
  await click([...host.querySelectorAll('button')].find(b=>b.textContent.trim()==='Undo'));
  expect(square(4,'a').querySelector('image')).toBeTruthy();
  expect(square(7,'a').querySelector('image')).toBeTruthy();
  expect(worker.terminated).toBe(true);
});
