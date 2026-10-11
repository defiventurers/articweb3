import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
const {JSDOM,VirtualConsole}=require('jsdom');
const engine=createRequire(import.meta.url)('../build/games.cjs');
const js=fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8');
const waitFor=async(predicate,label)=>{const deadline=Date.now()+10000;while(!predicate()){if(Date.now()>deadline)throw new Error(`Timed out: ${label}`);await new Promise(resolve=>setTimeout(resolve,20));}};
const settle=()=>new Promise(resolve=>setTimeout(resolve,50));
function openApp(prepare=()=>{}){
  const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(window){
    window.crypto.randomUUID=randomUUID;window.Android={setDarkTheme:()=>{}};window.HTMLElement.prototype.scrollIntoView=function(){};
    window.Worker=class{postMessage(data){setTimeout(()=>{try{const response=data.task==='legal'?{requestId:data.requestId,legal:engine.actions(data.id,data.state),checked:engine.inCheck(data.id,data.state)}:{requestId:data.requestId,state:engine.apply(data.id,data.state,data.actionId)};this.onmessage?.({data:response});}catch(error){this.onmessage?.({data:{requestId:data.requestId,error:error.message}});}},0);}terminate(){}};
    prepare(window);
  }});
  dom.window.eval(js);
  const document=dom.window.document;
  const button=text=>{const found=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);assert.ok(found,`Button: ${text}`);return found;};
  return {dom,document,window:dom.window,errors,button};
}

test('First-move guides use legal moves for all six games; undo removes the route',{timeout:30000},async t=>{
  const app=openApp();t.after(()=>app.dom.window.close());const {document,window,button}=app;await settle();
  for(const game of engine.GAME_LIST){
    document.querySelector(`[aria-label="Play ${game.name}"]`).click();await settle();button('Quick start & first move').click();await settle();
    assert.equal(document.querySelector('.quickstart-steps').children.length,3);assert.ok(document.querySelector('.quickstart-goal').textContent.length>25);
    button('Try your first move').click();await waitFor(()=>document.querySelector('.suggested-piece')&&document.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.',`${game.name} guided piece ready`);
    const state=engine.create(game.id),action=engine.actions(game.id,state).find(a=>a.source.startsWith('piece:')),piece=engine.pieces(game.id,state).find(p=>p.source===action.source);
    document.querySelector(`[data-cell="${piece.cell}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await settle();
    assert.match(document.querySelector('.first-move-guide').textContent,/Choose a highlighted destination/);
    document.querySelector(`[data-cell="${action.target}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await settle();
    if(document.querySelector('[aria-label="Choose your move"]')){button(action.promote?'Promote':'Keep unpromoted').click();}
    await waitFor(()=>!document.querySelector('.first-move-guide'),`${game.name} guide complete`);assert.equal(document.querySelectorAll('.last-move-ring').length,2);
    assert.match(document.querySelector('.last-move-note').textContent,/Last move:/);
    document.querySelector('[aria-label="Match options"]').click();await settle();button('Undo your last turnAvailable in offline practice').click();await settle();
    assert.equal(document.querySelectorAll('.last-move-ring').length,0);
    document.querySelector('[aria-label="Back to games"]').click();await settle();button('Games').click();await settle();
  }
  assert.deepEqual(app.errors,[]);
});

test('Favorites do not open games, full invitation links paste into Join, and existing profiles survive',async t=>{
  const profile={id:randomUUID(),name:'Returning friend',avatar:'green'};
  const app=openApp(window=>window.localStorage.setItem('arctic-play.v1.profile',JSON.stringify(profile)));t.after(()=>app.dom.window.close());const {document,window,button}=app;await settle();
  document.querySelector('[aria-label="Favorite Shogi"]').click();await settle();assert.equal(document.querySelector('[role="dialog"]'),null);assert.equal(document.querySelector('[aria-label="Unfavorite Shogi"]').getAttribute('aria-pressed'),'true');
  document.querySelector('[aria-label="Join a room"]').click();await settle();
  const paste=new window.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(paste,'clipboardData',{value:{getData:()=> 'Join me for Shogi on Arctic Play. Room: ABC234\nhttps://articweb3.onrender.com/arctic-play/join?room=abc234'}});document.querySelector('#room-code').dispatchEvent(paste);await settle();
  assert.equal(document.querySelector('#room-code').value,'ABC234');assert.equal(button('Join table').disabled,false);
  window.arcticBack();await settle();button('Profile').click();await settle();assert.equal(document.querySelector('.profile-card h2').textContent,profile.name);
  assert.deepEqual(JSON.parse(window.localStorage.getItem('arctic-play.v1.profile')),profile);assert.deepEqual(app.errors,[]);
});

test('Saved seat resumes and a guest automatically enters the board when the host starts',async t=>{
  const profile={id:randomUUID(),name:'Guest',avatar:'blue'},host=randomUUID();
  let room={roomCode:'ABC234',tableId:'shogi',rulesetVersion:engine.VERSION,status:'waiting',hostId:host,revision:2,createdAt:Date.now(),players:[{id:host,name:'Host',seat:'red',ready:true,connected:true},{id:profile.id,name:'Guest',seat:'blue',ready:true,connected:true}],gameState:engine.create('shogi'),chat:[]};
  const session={roomCode:room.roomCode,playerId:profile.id,seatToken:'saved-seat-token'};let socket,request;
  const app=openApp(window=>{
    window.localStorage.setItem('arctic-play.v1.profile',JSON.stringify(profile));window.localStorage.setItem('arctic-play.v1.rooms',JSON.stringify({ABC234:{session,room,at:Date.now()}}));
    window.WebSocket=class{static OPEN=1;constructor(){socket=this;this.readyState=0;setTimeout(()=>{this.readyState=1;this.onopen?.();},0);}send(message){request=JSON.parse(message);setTimeout(()=>this.onmessage?.({data:JSON.stringify({type:'ap_room_joined',requestId:request.requestId,payload:{room,seatToken:session.seatToken}})}),0);}close(){this.readyState=3;}};
  });t.after(()=>app.dom.window.close());const {document,button}=app;await settle();document.querySelector('.resume-table').click();await waitFor(()=>document.querySelector('.room-code'),'saved room opened');
  assert.equal(request.payload.seatToken,session.seatToken);assert.equal(request.payload.playerId,profile.id);
  room={...room,status:'playing',revision:3};socket.onmessage({data:JSON.stringify({type:'ap_room_update',payload:{room}})});await waitFor(()=>document.querySelector('.match-header'),'guest board opened');
  assert.equal(document.querySelectorAll('[data-cell]').length,81);
  document.querySelector('[aria-label="Match options"]').click();await settle();button('Private tableRoom ABC234').click();await settle();assert.ok(document.querySelector('.room-code'));
  room={...room,chat:[{id:randomUUID(),name:'Host',seat:'red',text:'Ready!',at:new Date().toISOString()}]};socket.onmessage({data:JSON.stringify({type:'ap_room_update',payload:{room}})});await settle();
  assert.ok(document.querySelector('.room-code'),'chat updates preserve a deliberately opened table screen');assert.equal(document.querySelector('.match-header'),null);assert.deepEqual(app.errors,[]);
});
