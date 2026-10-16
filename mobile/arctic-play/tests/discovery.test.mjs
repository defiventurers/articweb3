import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
const {JSDOM,VirtualConsole}=require('jsdom');
const engine=createRequire(import.meta.url)('../build/games.cjs');

test('The rebrand preserves saved data and records a guided legal move in the Archive journal',{timeout:20000},async()=>{
  const errors=[],virtual=new VirtualConsole();virtual.on('jsdomError',error=>errors.push(error));
  const profile=JSON.stringify({id:'existing-player',name:'Returning Explorer',avatar:'green'}),favorites=JSON.stringify(['sanyou']);
  const practice=JSON.stringify({id:'shogi',state:engine.create('shogi'),mode:'hotseat',humans:['red','blue'],history:[],guide:false});
  const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:virtual,beforeParse(window){
    window.crypto.randomUUID=randomUUID;window.Android={setDarkTheme(){},appReady(){}};window.HTMLElement.prototype.scrollIntoView=function(){};
    window.localStorage.setItem('arctic-play.v1.profile',profile);window.localStorage.setItem('arctic-play.v1.favorites',favorites);window.localStorage.setItem('arctic-play.v1.practice.shogi',practice);window.localStorage.setItem('arctic-play.v1.theme','"light"');
    window.Worker=class{postMessage(data){setTimeout(()=>{try{const response=data.task==='legal'?{requestId:data.requestId,legal:engine.actions(data.id,data.state),checked:engine.inCheck(data.id,data.state)}:{requestId:data.requestId,state:engine.apply(data.id,data.state,data.actionId)};this.onmessage?.({data:response});}catch(error){this.onmessage?.({data:{requestId:data.requestId,error:error.message}});}},0);}terminate(){}};
  }});
  const {window}=dom,doc=window.document;
  const button=text=>[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
  const waitFor=async predicate=>{const deadline=Date.now()+5000;while(!predicate()){if(Date.now()>deadline)throw new Error('Discovery UI timed out');await new Promise(resolve=>setTimeout(resolve,15));}};
  try{
    window.eval(fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8'));
    await waitFor(()=>doc.querySelectorAll('.game-card').length===7);
    assert.equal(doc.documentElement.dataset.theme,'light');assert.match(doc.querySelector('.brand-wordmark').textContent,/ANTARCTICKINGDOMS/);
    assert.equal(doc.querySelectorAll('.card-origin').length,7);assert.match(doc.querySelector('.lobby-footnote').textContent,/Antarctic Gaming Co/);
    button('Discover').click();await waitFor(()=>doc.querySelector('.archive-journal'));
    assert.equal(doc.querySelectorAll('.guide-card').length,4);assert.match(doc.querySelector('.archive-story').textContent,/imagined Antarctic/);
    assert.equal(doc.querySelector('progress').value,0);assert.equal(window.localStorage.getItem('arctic-play.v1.practice.shogi'),practice);
    doc.querySelector('.journal-row').click();await waitFor(()=>doc.querySelector('.quickstart-cover'));
    assert.match(doc.querySelector('.host-note').textContent,/Pengu/);assert.equal(doc.querySelector('progress').value,0,'reading a guide does not fabricate completion');
    button('Try your first move').click();await waitFor(()=>doc.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.');
    assert.ok(doc.querySelector('.first-move-guide .guide-face'),'the host guides outside the playable board');
    const state=engine.create('shogi'),action=engine.actions('shogi',state)[0],unit=engine.pieces('shogi',state).find(p=>p.source===action.source);
    doc.querySelector(`[data-cell="${unit.cell}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await waitFor(()=>doc.querySelectorAll('.destinations button').length>0);
    doc.querySelector(`[data-cell="${action.target}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
    await waitFor(()=>JSON.parse(window.localStorage.getItem('arctic-play.v1.archive-journal')||'{}').shogi>0);
    doc.querySelector('[aria-label="Back to games"]').click();await waitFor(()=>doc.querySelector('progress')?.value===1);
    assert.equal(doc.querySelectorAll('.journal-row.explored').length,1);assert.equal(window.localStorage.getItem('arctic-play.v1.profile'),profile);assert.equal(window.localStorage.getItem('arctic-play.v1.favorites'),favorites);
    button('Games').click();await waitFor(()=>doc.querySelectorAll('.game-card').length===7);
    doc.querySelector('[aria-label="Play Arctic Dominion"]').click();await waitFor(()=>doc.querySelector('.heritage-label'));
    doc.querySelector('.heritage-label').click();await waitFor(()=>doc.querySelector('.heritage-details'));
    assert.match(doc.querySelector('.heritage-details').textContent,/modern Chaturanga-inspired adaptation/);assert.match(doc.querySelector('.archive-truth').textContent,/fictional/);
    assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
});
