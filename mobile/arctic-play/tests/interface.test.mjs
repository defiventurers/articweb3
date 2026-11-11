import {verifiedAccount} from './account-fixture.mjs';
import test from 'node:test';
import {GAME_HISTORY} from '../src/gameHistory.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(new URL('../build-deps/package.json',import.meta.url));
const {JSDOM,VirtualConsole}=require('jsdom');
const engine=createRequire(import.meta.url)('../build/games.cjs');
const js=fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setTimeout(resolve,60));
const waitFor=async(predicate,label)=>{const deadline=Date.now()+10000;while(!predicate()){if(Date.now()>deadline)throw new Error(`Timed out: ${label}`);await new Promise(resolve=>setTimeout(resolve,20));}};
test('Phone interface: six nondice engines, legal board taps, English rules, invitations and native APK sharing; long dice have a separate flow suite',{timeout:120000},async t=>{
  t.mock.method(globalThis.crypto,'getRandomValues',array=>{array.fill(0);return array;});
  const errors=[],calls=[];const virtual=new VirtualConsole();virtual.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:virtual,beforeParse(window){
    Object.defineProperty(window,'innerWidth',{value:360});Object.defineProperty(window,'innerHeight',{value:800});
    window.crypto.randomUUID=randomUUID;const m=createRequire(import.meta.url)('../src/unlockModel.cjs');let access=m.empty();for(const c of m.CHALLENGES)access=m.complete(access,c.id,m.POINTS.find(n=>m.solved(c.id,n.id)).id);for(const id of ['sanguo','sanyou','sannin','yanyi'])access=m.spend(access,id);window.localStorage.setItem('arctic-play.v1.hall-journey.v1.device',JSON.stringify(access));window.localStorage.setItem('arctic-play.v1.hall-journey.v1.11111111-1111-4111-8111-111111111111',JSON.stringify(access));window.WebSocket=undefined;window.Android={setDarkTheme:dark=>calls.push(['theme',dark]),shareApp:()=>calls.push(['shareApp']),backgroundApp:()=>calls.push(['background']),shareText:(title,text)=>calls.push(['shareText',title,text])};window.HTMLElement.prototype.scrollIntoView=function(){};
    window.Worker=class {postMessage(data){setTimeout(()=>{try{const response=data.task==='legal'?{requestId:data.requestId,legal:engine.actions(data.id,data.state),checked:engine.inCheck(data.id,data.state)}:data.task==='apply'?{requestId:data.requestId,state:engine.apply(data.id,data.state,data.actionId)}:{sequence:data.sequence,action:engine.chooseBot(data.id,data.state)};this.onmessage?.({data:response});}catch(error){this.onmessage?.({data:{requestId:data.requestId,error:error.message}});}},0);}terminate(){}};
  }});
  t.after(()=>dom.window.close());const {window}=dom,doc=window.document;verifiedAccount(window);window.eval(js);await settle();
  await waitFor(()=>doc.querySelector('.home-landing'),'branded home');[...doc.querySelectorAll('.bottom-nav button')].find(b=>b.textContent==='Games').click();await settle();
  assert.equal(doc.querySelectorAll('.expedition-game').length,1);assert.equal(doc.querySelectorAll('.bottom-nav button').length,5);
  function button(text){const found=[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()===text);assert.ok(found,`Button: ${text}`);return found;}
  for(const game of engine.GAME_LIST.filter(g=>g.id!=='dominion')){
    const stories=JSON.parse(fs.readFileSync(new URL('../src/heritageStories.json',import.meta.url)));
    for(let n=0;n<9 && doc.querySelector('.expedition-hero strong')?.textContent!==stories.games[game.id].title;n++){doc.querySelector('[aria-label="Next game"]').click();await settle();}
    doc.querySelector('.expedition-actions .secondary').click();await settle();button('Mode & seat →').click();await settle();assert.ok(doc.querySelector('.seat-choice'));button('Done · Back to play').click();await settle();
    button('On this phonePass the phone between players').click();await settle();
    if(game.id==='dominion'){await waitFor(()=>button('Roll two dice').disabled===false,'dice ready');button('Roll two dice').click();await settle();}
    await waitFor(()=>doc.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.',`${game.id} legal worker ready`);
    assert.equal(doc.querySelectorAll('[data-cell]').length,engine.board(game.id).cells.length);assert.equal(doc.querySelector('.match-header h1').textContent,game.name+' ('+GAME_HISTORY[game.id].english+')');
    const state=engine.create(game.id);if(game.id==='dominion')state.dice={rolled:true,values:[1,1],used:[false,false]};const action=engine.actions(game.id,state)[0],moving=engine.pieces(game.id,state).find(p=>p.source===action.source);
    doc.querySelector(`[data-cell="${moving.cell}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await settle();
    await waitFor(()=>game.id==='dominion'?doc.querySelectorAll('.game-board [data-cell] circle').length>0:doc.querySelectorAll('.destinations button').length>0,`${game.id} selected legal destinations`);
    assert.ok(game.id==='dominion'||doc.querySelectorAll('.destinations button').length>0,`${game.id}: ${doc.querySelector('.selection-hint')?.textContent}; ${doc.querySelector('.turn-line')?.textContent}; errors=${errors.map(e=>e.message).join(';')}`);
    doc.querySelector(`[data-cell="${action.target}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await settle();
    if(game.id==='dominion'){button('Use die 1 (1)').click();await settle();}
    if(doc.querySelector('[aria-label="Choose your move"]')){button(action.promote?'Promote':'Keep unpromoted').click();await settle();}
    const next=engine.apply(game.id,state,action.id),expectedTurn=engine.seatName(game.id,engine.turn(next));
    await waitFor(()=>doc.querySelector('.turn-line')?.textContent.includes(expectedTurn),`${game.id} accepted move (${doc.querySelector('.selection-hint')?.textContent}; ${doc.querySelector('.toast')?.textContent})`);
    assert.match(doc.querySelector('.turn-line').textContent,new RegExp(expectedTurn));
    doc.querySelector('[aria-label="Read game rules"]').click();await settle();await waitFor(()=>doc.querySelector('.full-rules-guide'),'full guide');assert.ok(doc.querySelector('.rule-health'));assert.ok(!/[\u4e00-\u9fff]/.test(doc.querySelector('.full-rules-guide').textContent));
    window.arcticBack();await settle();doc.querySelector('[aria-label="Back to games"]').click();await settle();button('Games').click();await settle();
  }
  window.arcticJoin('ABC234');await settle();assert.equal(doc.querySelector('#room-code').dataset.code,'ABC234');window.arcticBack();await settle();
  button('Passport').click();await settle();doc.querySelector('[aria-label="Passport settings"]').click();await settle();button('Share the Android appSend the APK directly to a friend').click();assert.ok(calls.some(c=>c[0]==='shareApp'));assert.ok(calls.some(c=>c[0]==='theme'&&c[1]===true));assert.deepEqual(errors,[]);dom.window.close();
});
