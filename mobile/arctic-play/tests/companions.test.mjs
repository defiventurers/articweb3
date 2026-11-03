import {verifiedAccount} from './account-fixture.mjs';
import {workerResponse} from './worker-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {COMPANION_KEY,companionPreferences,companionLine,hostFor,allowCompanionEvent,CHAT_PROMPTS,finishCompanionEvent} from '../src/companions.js';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
const {JSDOM,VirtualConsole}=require('jsdom');
const engine=createRequire(import.meta.url)('../build/games.cjs');

test('Companion preferences validate stored input and keep each guide in its role',()=>{
  assert.deepEqual(companionPreferences(null),{mode:'lively',guide:'auto',motion:true});
  assert.deepEqual(companionPreferences({mode:'unknown',guide:'__proto__',motion:'yes'}),{mode:'lively',guide:'auto',motion:true});
  assert.deepEqual(companionPreferences({mode:'off',guide:'abster',motion:false}),{mode:'off',guide:'abster',motion:false});
  const prefs=companionPreferences();
  assert.equal(hostFor('capture',{},prefs),'retsba');assert.equal(hostFor('discovery',{},prefs),'abster');
  assert.equal(hostFor('turn',{},prefs),'pengu');assert.equal(hostFor('welcome',{},prefs),'polly');
  assert.equal(hostFor('match',{screen:'match',gameId:'xiangqi'},prefs),'pengu');
  assert.equal(hostFor('capture',{},companionPreferences({guide:'polly'})),'polly');
});

test('Automatic dialogue obeys Quiet, Off, dismissal, foreground and modal/input gates',()=>{
  const input={preferences:companionPreferences(),last:{at:10000,key:'old'},event:'move',now:11000,key:'new'};
  assert.equal(allowCompanionEvent(input),false,'rapid moves do not spam');
  assert.equal(allowCompanionEvent({...input,now:33000}),true);
  assert.equal(allowCompanionEvent({...input,event:'win'}),true,'actual results can replace routine chatter');
  assert.equal(allowCompanionEvent({...input,event:'win',key:'old'}),false,'duplicate result is suppressed');
  for(const mode of ['quiet','off'])assert.equal(allowCompanionEvent({...input,event:'win',preferences:companionPreferences({mode})}),false);
  for(const change of [{visible:false},{blocked:true},{snoozed:true},{dismissedUntil:20000}])assert.equal(allowCompanionEvent({...input,event:'win',...change}),false);
});

test('All four authored voices vary, keep journal facts accurate and avoid claiming a win on a shared phone',()=>{
  for(const host of ['polly','retsba','pengu','abster']){
    for(const prompt of CHAT_PROMPTS){
      assert.ok(companionLine(prompt.id,{name:'Explorer'},0,host).length>30);
      if(prompt.id!=='journal')assert.notEqual(companionLine(prompt.id,{},0,host),companionLine(prompt.id,{},1,host));
    }
  }
  assert.match(companionLine('hello',{name:'Snow Friend'},0,'polly'),/Snow Friend/);
  assert.match(companionLine('journal',{journal:{shogi:1,xiangqi:2,bogus:99}}),/2 of 7/);
  assert.match(companionLine('journal',{journal:{shogi:-1}}),/first discovery/);
  assert.doesNotMatch(companionLine('finished'),/win for you|you won/i);
  assert.match(companionLine('loss'),/not a measure of you/);
  assert.equal(finishCompanionEvent({outcome:{winner:'red'},online:true,seat:'blue',humans:['red','blue']}),'loss','another human winning is not your win');
  assert.equal(finishCompanionEvent({outcome:{winner:'blue'},online:true,seat:'blue'}),'win');
  assert.equal(finishCompanionEvent({outcome:{winner:'red + blue'},online:true,seat:'blue'}),'win','alliance winners include the current player');
  assert.equal(finishCompanionEvent({outcome:{winner:null},online:true,seat:'blue'}),'finished','unknown winners do not invent a loss');
  assert.equal(finishCompanionEvent({outcome:{winner:'red'},hotseat:true,humans:['red','blue']}),'finished');
  assert.equal(finishCompanionEvent({outcome:{draw:true},online:true,seat:'blue'}),'draw');
});

const waitFor=async(predicate,label='companion UI')=>{const end=Date.now()+6000;while(!predicate()){if(Date.now()>end)throw new Error(`Timed out: ${label}`);await new Promise(resolve=>setTimeout(resolve,12));}};
function openApp(saved={}){
  const errors=[],virtual=new VirtualConsole();virtual.on('jsdomError',error=>errors.push(error.message));
  let now=Date.now();
  const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:virtual,beforeParse(window){
    window.WebSocket=undefined;window.crypto.randomUUID=randomUUID;window.Date.now=()=>now;window.Android={setDarkTheme(){},appReady(){}};window.HTMLElement.prototype.scrollIntoView=function(){};
    window.localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'existing',name:'Snow Friend',avatar:'green'}));
    window.localStorage.setItem('arctic-play.v1.favorites','["xiangqi"]');
    for(const [key,value] of Object.entries(saved))window.localStorage.setItem(key,value);
    window.Worker=class{postMessage(data){setTimeout(()=>{try{const response=workerResponse(data);this.onmessage?.({data:response});}catch(error){this.onmessage?.({data:{requestId:data.requestId,error:error.message}});}},0);}terminate(){}};
  }});
  const {window}=dom,doc=window.document;
  verifiedAccount(window);window.eval(fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8'));
  return {dom,window,doc,errors,advance:ms=>{now+=ms;},button:text=>[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()===text)};
}

test('Each mascot responds, the chosen friend and Quiet/Off persist, and saved game data is preserved',{timeout:20000},async t=>{
 const app=openApp();t.after(()=>app.dom.window.close());const{doc,window,button}=app;await waitFor(()=>doc.querySelector('.home-landing'));button('Games').click();await waitFor(()=>doc.querySelectorAll('.game-card').length===7);assert.equal(doc.querySelector('.companion-dock'),null);
 const profile=window.localStorage.getItem('arctic-play.v1.profile'),favorites=window.localStorage.getItem('arctic-play.v1.favorites');button('Chats').click();await waitFor(()=>button('Your Camp'));button('Your Camp').click();await waitFor(()=>doc.querySelector('.camp-roster'));assert.equal(doc.querySelectorAll('.camp-roster button').length,4);doc.querySelector('.camp-conversations').open=true;
 for(const name of ['Polly','Retsba','Pengu','Abster']){doc.querySelector(`[aria-label="Meet ${name}"]`).click();await waitFor(()=>doc.querySelector('.camp-identity h3')?.textContent===name);button('High five!').click();await waitFor(()=>doc.querySelector('.camp-stage [data-pose="celebrate"]'));button('Share a thought').click();await waitFor(()=>doc.querySelector('.camp-stage [data-pose="curious"]'));}
 button('Keep Abster beside me').click();await waitFor(()=>button('Abster is your companion'));button('Companion settings').click();await waitFor(()=>doc.querySelector('.companion-modes'));const radio=n=>doc.querySelector(`.companion-modes [role="radio"]:nth-child(${n})`);radio(2).click();await waitFor(()=>radio(2).getAttribute('aria-checked')==='true');doc.querySelector('[aria-label="Mascot motion"]').click();await waitFor(()=>doc.querySelector('[aria-label="Mascot motion"]').getAttribute('aria-checked')==='false');window.arcticBack();await waitFor(()=>!doc.querySelector('[role="dialog"]'));button('Home').click();await waitFor(()=>doc.querySelector('.home-landing'));assert.equal(doc.querySelector('.companion-dock'),null);button('Chats').click();await waitFor(()=>doc.querySelector('.memory-shelf'));
 button('Your Camp').click();await waitFor(()=>button('Companion settings'));button('Companion settings').click();await waitFor(()=>doc.querySelector('.companion-modes'));radio(3).click();window.arcticBack();await waitFor(()=>!doc.querySelector('[role="dialog"]'));assert.equal(doc.querySelector('.director-mascot'),null);const settings=window.localStorage.getItem('arctic-play.v1.'+COMPANION_KEY);assert.deepEqual(JSON.parse(settings),{mode:'off',guide:'abster',motion:false});assert.equal(window.localStorage.getItem('arctic-play.v1.profile'),profile);assert.equal(window.localStorage.getItem('arctic-play.v1.favorites'),favorites);
 const restarted=openApp({['arctic-play.v1.'+COMPANION_KEY]:settings});t.after(()=>restarted.dom.window.close());await waitFor(()=>restarted.doc.querySelector('.home-landing'));restarted.button('Games').click();await waitFor(()=>restarted.doc.querySelectorAll('.game-card').length===7);assert.equal(restarted.doc.querySelector('.director-mascot'),null);restarted.doc.querySelector('[aria-label="How to play Shogi"]').click();await waitFor(()=>restarted.doc.querySelector('[aria-label="Quick Rules"]'));restarted.doc.querySelector('[aria-label="Quick Rules"]').click();await waitFor(()=>restarted.doc.querySelector('.learning-activity[data-ready="true"]'));assert.equal(restarted.doc.querySelector('.director-mascot'),null);assert.ok(restarted.doc.querySelector('.teaching-host'));assert.deepEqual(app.errors,[]);assert.deepEqual(restarted.errors,[]);
});

test('Companion camp preserves an actual accepted board position, without interrupting play',{timeout:20000},async t=>{
  const app=openApp({'arctic-play.v1.practice.shogi':JSON.stringify({id:'shogi',state:engine.create('shogi'),mode:'hotseat',humans:['red','blue'],history:[],guide:true})});t.after(()=>app.dom.window.close());const {doc,window,button}=app;await waitFor(()=>doc.querySelector('.home-landing'));button('Games').click();
  await waitFor(()=>doc.querySelector('[aria-label="Play Shogi"]'));
  doc.querySelector('[aria-label="Play Shogi"]').click();await waitFor(()=>button('Continue saved practice'));button('Continue saved practice').click();
  await waitFor(()=>doc.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.');
  const state=engine.create('shogi'),action=engine.actions('shogi',state)[0],piece=engine.pieces('shogi',state).find(p=>p.source===action.source);
  app.advance(23000);doc.querySelector(`[data-cell="${piece.cell}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await waitFor(()=>doc.querySelector('.destinations button'));doc.querySelector(`[data-cell="${action.target}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  await waitFor(()=>JSON.parse(window.localStorage.getItem('arctic-play.v1.archive-journal')||'{}').shogi);
  assert.ok(JSON.parse(window.localStorage.getItem('arctic-play.v1.archive-journal')).shogi);
  const position=window.localStorage.getItem('arctic-play.v1.practice.shogi');
  assert.equal(doc.querySelector('.match-board-wrap .companion-dock'),null,'the mascot is outside the board');
  doc.querySelector('.companion-main').click();await waitFor(()=>doc.querySelector('.camp-prompts'));button('Take a breath').click();await waitFor(()=>doc.querySelector('.camp-stage [data-pose="listening"]'));window.arcticBack();await waitFor(()=>doc.querySelector('.companion-dock'));
  assert.equal(window.localStorage.getItem('arctic-play.v1.practice.shogi'),position);assert.equal(doc.querySelectorAll('[data-cell]').length,81);
  assert.equal(doc.querySelectorAll('.last-move-ring').length,2);assert.deepEqual(app.errors,[]);
});
