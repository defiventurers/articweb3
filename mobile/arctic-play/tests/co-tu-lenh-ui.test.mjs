import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {verifiedAccount} from './account-fixture.mjs';
import {createInitialState,allLegalActions,airDefenceZones} from '../../../frontend/src/games/co-tu-lenh/rules.js';
const {JSDOM,VirtualConsole}=createRequire(new URL('../build-deps/package.json',import.meta.url))('jsdom');
const bundle=fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8');
async function until(fn){for(let i=0;i<1200;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');}
function button(d,text){const b=[...d.querySelectorAll('button')].find(n=>n.textContent.trim()===text);assert.ok(b,text);b.click();}
function setSelect(w,element,value){element.value=value;element.dispatchEvent(new w.Event('change',{bubbles:true}));}
test('packaged Games route runs Commander local, practice, bot, profiles, tutorial and rotated defence geometry',{timeout:30000},async t=>{
  const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM('<div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){
    w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=structuredClone;
    Object.defineProperty(w,'crypto',{value:webcrypto});w.WebSocket=undefined;w.confirm=()=>true;
    w.HTMLElement.prototype.scrollIntoView=function(){};verifiedAccount(w);
  }});t.after(()=>dom.window.close());dom.window.eval(bundle);const w=dom.window,d=w.document;
  await until(()=>d.querySelector('.bottom-nav'));button(d,'Games');await until(()=>d.querySelector('[aria-label="Play Cờ Tư Lệnh"]'));
  assert.ok(d.querySelector('[aria-label="Play Shanshui Xiangqi"]'));
  assert.equal(d.querySelectorAll('.hall-card').length,7);
  d.querySelector('[aria-label="Play Cờ Tư Lệnh"]').click();await until(()=>d.querySelector('.ctl-setup'));
  const profiles=d.querySelector('.ctl-prefs select');assert.equal(profiles.options.length,4);
  const ids=[...profiles.options].map(o=>o.value);
  for(const id of ids){
    setSelect(w,d.querySelector('.ctl-prefs select'),id);await new Promise(r=>setTimeout(r,5));
    [...d.querySelectorAll('.ctl-choices button')].find(b=>b.textContent.includes('Pass & Play')).click();await new Promise(r=>setTimeout(r,5));
    button(d,'Begin battle');await until(()=>d.querySelector('.ctl-board'));
    assert.equal(d.querySelectorAll('.ctl-board g[role=button]').length,132);
    assert.equal(d.querySelectorAll('.ctl-board image').length,39);
    assert.equal(d.querySelector('.ctl-range-toggle').getAttribute('aria-pressed'),'false');
    assert.match(d.querySelector('.ctl-foot').textContent,new RegExp(id));
    button(d,'⚙ Setup');await until(()=>d.querySelector('.ctl-setup'));
  }
  [...d.querySelectorAll('.ctl-choices button')].find(b=>b.textContent.includes('Practice & Learn')).click();await new Promise(r=>setTimeout(r,5));
  button(d,'Begin battle');await until(()=>d.querySelector('.ctl-board'));
  const initial=createInitialState(ids.at(-1)),action=allLegalActions(initial).find(a=>a.kind==='move'),unit=initial.pieces.find(p=>p.id===action.id);
  const point=(x,y)=>d.querySelectorAll('.ctl-board g[role=button]')[y*11+x];
  point(unit.x,unit.y).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await until(()=>d.querySelectorAll('.ctl-board [aria-label*="legal target"]').length);
  point(action.x,action.y).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await until(()=>d.querySelector('.ctl-score b').textContent.includes('BLUE TO MOVE'));
  button(d,'↶ Undo');await until(()=>d.querySelector('.ctl-score b').textContent.includes('RED TO MOVE'));
  d.querySelector('.ctl-range-toggle').click();await until(()=>d.querySelector('.ctl-defence-zones'));
  const zones=airDefenceZones(initial),centres=()=>[...d.querySelectorAll('.ctl-defence-zones ellipse')].map(e=>({x:+e.getAttribute('cx'),y:+e.getAttribute('cy'),color:e.getAttribute('stroke')}));
  const before=centres();assert.equal(before.length,zones.length);assert.ok(before.some(p=>p.color==='#ef4658'));assert.ok(before.some(p=>p.color==='#2f9fff'));
  assert.equal(d.querySelectorAll('.ctl-defence-zones circle').length,zones.reduce((n,z)=>n+z.points.length,0));
  button(d,'⇄ Rotate view');await new Promise(r=>setTimeout(r,10));
  centres().forEach((p,i)=>{assert.ok(Math.abs(p.x-(1199-before[i].x))<1e-8);assert.ok(Math.abs(p.y-(1312-before[i].y))<1e-8);});
  const target=point(0,0).querySelector('circle[fill="transparent"]');assert.equal(+target.getAttribute('cx'),1051);assert.equal(+target.getAttribute('cy'),229);
  button(d,'+ Zoom');await new Promise(r=>setTimeout(r,10));assert.equal(d.querySelector('.ctl-board').style.width,'125%');
  button(d,'How to Play');await until(()=>d.querySelector('.ctl-modal'));for(let i=0;i<3;i++){button(d,'Next');await new Promise(r=>setTimeout(r,5));}button(d,'Play');await until(()=>!d.querySelector('.ctl-modal'));
  button(d,'⚙ Setup');await until(()=>d.querySelector('.ctl-setup'));
  [...d.querySelectorAll('.ctl-choices button')].find(b=>b.textContent.includes('Quick Play vs Bot')).click();await new Promise(r=>setTimeout(r,10));
  setSelect(w,d.querySelectorAll('.ctl-prefs select')[1],'blue');await new Promise(r=>setTimeout(r,10));button(d,'Begin battle');
  await until(()=>d.querySelector('.ctl-score b')?.textContent.includes('BLUE TO MOVE'));
  assert.deepEqual(errors,[]);
});
