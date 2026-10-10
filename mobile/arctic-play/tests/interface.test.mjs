import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
const {JSDOM,VirtualConsole}=require('jsdom');
const engine=createRequire(import.meta.url)('../build/games.cjs');
const js=fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setTimeout(resolve,60));
const waitFor=async(predicate,label)=>{const deadline=Date.now()+10000;while(!predicate()){if(Date.now()>deadline)throw new Error(`Timed out: ${label}`);await new Promise(resolve=>setTimeout(resolve,20));}};
test('Phone interface: six games, all offline boards, legal taps, English rules, invitations and native APK sharing',{timeout:30000},async()=>{
  const errors=[],calls=[];const virtual=new VirtualConsole();virtual.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:virtual,beforeParse(window){
    Object.defineProperty(window,'innerWidth',{value:360});Object.defineProperty(window,'innerHeight',{value:800});
    window.crypto.randomUUID=randomUUID;window.Android={setDarkTheme:dark=>calls.push(['theme',dark]),shareApp:()=>calls.push(['shareApp']),backgroundApp:()=>calls.push(['background']),shareText:(title,text)=>calls.push(['shareText',title,text])};window.HTMLElement.prototype.scrollIntoView=function(){};
    window.Worker=class {postMessage(data){setTimeout(()=>{try{const response=data.task==='legal'?{requestId:data.requestId,legal:engine.actions(data.id,data.state),checked:engine.inCheck(data.id,data.state)}:data.task==='apply'?{requestId:data.requestId,state:engine.apply(data.id,data.state,data.actionId)}:{sequence:data.sequence,action:engine.chooseBot(data.id,data.state)};this.onmessage?.({data:response});}catch(error){this.onmessage?.({data:{requestId:data.requestId,error:error.message}});}},0);}terminate(){}};
  }});
  const {window}=dom,doc=window.document;window.eval(js);await settle();
  assert.equal(doc.querySelectorAll('.game-card').length,6);assert.equal(doc.querySelectorAll('.bottom-nav button').length,5);
  function button(text){const found=[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()===text);assert.ok(found,`Button: ${text}`);return found;}
  for(const game of engine.GAME_LIST){
    doc.querySelector(`[aria-label="Play ${game.name}"]`).click();await settle();assert.ok(doc.querySelector('.seat-choice'));
    button('On this phonePass the phone between players').click();await settle();
    await waitFor(()=>doc.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.',`${game.id} legal worker ready`);
    assert.equal(doc.querySelectorAll('[data-cell]').length,engine.board(game.id).cells.length);assert.equal(doc.querySelector('.match-header h1').textContent,game.name);
    const state=engine.create(game.id),action=engine.actions(game.id,state)[0],moving=engine.pieces(game.id,state).find(p=>p.source===action.source);
    doc.querySelector(`[data-cell="${moving.cell}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await settle();
    await waitFor(()=>doc.querySelectorAll('.destinations button').length>0,`${game.id} selected legal destinations`);
    assert.ok(doc.querySelectorAll('.destinations button').length>0,`${game.id}: ${doc.querySelector('.selection-hint')?.textContent}; ${doc.querySelector('.turn-line')?.textContent}; errors=${errors.map(e=>e.message).join(';')}`);
    doc.querySelector(`[data-cell="${action.target}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await settle();
    if(doc.querySelector('[aria-label="Choose your move"]')){button(action.promote?'Promote':'Keep unpromoted').click();await settle();}
    const next=engine.apply(game.id,state,action.id);assert.match(doc.querySelector('.turn-line').textContent,new RegExp(engine.seatName(game.id,engine.turn(next))));
    doc.querySelector('[aria-label="Read game rules"]').click();await settle();assert.ok(doc.querySelector('.rulebook').textContent.length>400);assert.ok(!/[\u4e00-\u9fff]/.test(doc.querySelector('.rulebook').textContent));
    window.arcticBack();await settle();doc.querySelector('[aria-label="Back to games"]').click();await settle();button('Games').click();await settle();
  }
  window.arcticJoin('ABC234');await settle();assert.equal(doc.querySelector('#room-code').value,'ABC234');window.arcticBack();await settle();
  button('Profile').click();await settle();button('Share the Android appSend the APK directly to a friend').click();assert.ok(calls.some(c=>c[0]==='shareApp'));assert.ok(calls.some(c=>c[0]==='theme'&&c[1]===true));assert.deepEqual(errors,[]);dom.window.close();
});
