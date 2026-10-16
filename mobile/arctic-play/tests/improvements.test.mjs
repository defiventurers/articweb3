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

test('First-move guides use legal moves for all seven games; undo removes the route',{timeout:30000},async t=>{
  t.mock.method(globalThis.crypto,'getRandomValues',array=>{array.fill(0);return array;});
  const app=openApp();t.after(()=>app.dom.window.close());const {document,window,button}=app;await settle();
  for(const game of engine.GAME_LIST){
    document.querySelector(`[aria-label="Play ${game.name}"]`).click();await settle();button('Quick start & first move').click();await settle();
    assert.equal(document.querySelector('.quickstart-steps').children.length,3);assert.ok(document.querySelector('.quickstart-goal').textContent.length>25);
    button('Try your first move').click();if(game.id==='dominion'){await waitFor(()=>document.querySelector('.dice-heading button')?.disabled===false,'guided dice ready');assert.match(document.querySelector('.first-move-guide').textContent,/Roll both dice/);button('Roll both dice').click();await settle();assert.ok(document.querySelector('.first-move-guide'),'rolling retains the guide');}await waitFor(()=>document.querySelector('.suggested-piece')&&document.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.',`${game.name} guided piece ready`);
    const state=engine.create(game.id);if(game.id==='dominion')state.dice={rolled:true,values:[1,1],used:[false,false]};const action=engine.actions(game.id,state).find(a=>a.source.startsWith('piece:')),piece=engine.pieces(game.id,state).find(p=>p.source===action.source);
    document.querySelector(`[data-cell="${piece.cell}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await settle();
    assert.match(document.querySelector('.first-move-guide').textContent,/Choose a highlighted destination/);
    document.querySelector(`[data-cell="${action.target}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await settle();
    if(game.id==='dominion')button('Use die 1 (1)').click();
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

test('Saved seats resume, guests enter when the host starts, and live updates survive visiting How to Play',async t=>{
  const profile={id:randomUUID(),name:'Guest',avatar:'blue'},host=randomUUID();
  let room={roomCode:'ABC234',tableId:'shogi',rulesetVersion:engine.VERSION,status:'waiting',hostId:host,revision:2,createdAt:Date.now(),players:[{id:host,name:'Host',seat:'red',ready:true,connected:true},{id:profile.id,name:'Guest',seat:'blue',ready:true,connected:true}],gameState:engine.create('shogi'),chat:[]};
  const session={roomCode:room.roomCode,playerId:profile.id,seatToken:'saved-seat-token'},requests=[];let socket,request;
  const app=openApp(window=>{
    window.localStorage.setItem('arctic-play.v1.profile',JSON.stringify(profile));window.localStorage.setItem('arctic-play.v1.rooms',JSON.stringify({ABC234:{session,room,at:Date.now()}}));
    window.WebSocket=class{static OPEN=1;constructor(){socket=this;this.readyState=0;setTimeout(()=>{this.readyState=1;this.onopen?.();},0);}send(message){request=JSON.parse(message);requests.push(request.type);setTimeout(()=>this.onmessage?.({data:JSON.stringify({type:'ap_room_joined',requestId:request.requestId,payload:{room,seatToken:session.seatToken}})}),0);}close(){this.readyState=3;}};
  });t.after(()=>app.dom.window.close());const {document,button}=app;await settle();document.querySelector('.resume-table').click();await waitFor(()=>document.querySelector('.room-code'),'saved room opened');
  assert.equal(request.payload.seatToken,session.seatToken);assert.equal(request.payload.playerId,profile.id);
  room={...room,status:'playing',revision:3};socket.onmessage({data:JSON.stringify({type:'ap_room_update',payload:{room}})});await waitFor(()=>document.querySelector('.match-header'),'guest board opened');
  assert.equal(document.querySelectorAll('[data-cell]').length,81);
  const requestsBefore=[...requests];
  document.querySelector('[aria-label="Match options"]').click();await settle();button('How to playLessons, pieces and a separate free board').click();await waitFor(()=>document.querySelector('.how-to-play'),'school opened');
  button('Free board').click();await waitFor(()=>document.querySelector('.free-board-section'),'independent free board opened');
  const action=engine.actions('shogi',room.gameState)[0];room={...room,gameState:engine.apply('shogi',room.gameState,action.id),revision:4};
  socket.onmessage({data:JSON.stringify({type:'ap_room_update',payload:{room}})});await settle();
  assert.ok(document.querySelector('.free-board-section'),'a live move does not close school');
  app.window.arcticBack();await waitFor(()=>document.querySelector('.match-header'),'return to live table');
  assert.match(document.querySelector(`[data-cell="${action.target}"]`).getAttribute('aria-label'),/Red Pawn/);
  assert.deepEqual(requests,requestsBefore,'learning sends no detach, resign, chat or game action');
  assert.equal(JSON.parse(app.window.localStorage.getItem('arctic-play.v1.rooms')).ABC234.room.revision,4);
  document.querySelector('[aria-label="Match options"]').click();await settle();button('Private tableRoom ABC234').click();await settle();assert.ok(document.querySelector('.room-code'));
  room={...room,chat:[{id:randomUUID(),name:'Host',seat:'red',text:'Ready!',at:new Date().toISOString()}]};socket.onmessage({data:JSON.stringify({type:'ap_room_update',payload:{room}})});await settle();
  assert.ok(document.querySelector('.room-code'),'chat updates preserve a deliberately opened table screen');assert.equal(document.querySelector('.match-header'),null);assert.deepEqual(app.errors,[]);
});

test('Dark is the default and the saved theme applies to navigation, boards and dialogs',async t=>{
  const native=[];
  const app=openApp(window=>{window.Android.setDarkTheme=dark=>native.push(dark);});t.after(()=>app.dom.window.close());const {document,window,button}=app;await settle();
  assert.equal(document.documentElement.dataset.theme,'dark');assert.equal(native.at(-1),true);assert.equal(JSON.parse(window.localStorage.getItem('arctic-play.v1.theme')),'dark');
  assert.equal(document.querySelectorAll('.cover-hero').length,engine.GAME_LIST.length);assert.equal(document.querySelectorAll('.cover-board').length,0);
  button('Profile').click();await settle();const control=document.querySelector('[role="switch"][aria-label="Dark mode"]');assert.equal(control.getAttribute('aria-checked'),'true');control.click();await settle();
  assert.equal(document.documentElement.dataset.theme,'light');assert.equal(control.getAttribute('aria-checked'),'false');assert.equal(native.at(-1),false);
  button('Games').click();await settle();document.querySelector('[aria-label="Play Shogi"]').click();await settle();button('On this phonePass the phone between players').click();await waitFor(()=>document.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.','light board ready');
  assert.equal(document.documentElement.dataset.theme,'light');document.querySelector('[aria-label="Read game rules"]').click();await settle();assert.ok(document.querySelector('.rulebook'));assert.equal(document.documentElement.dataset.theme,'light');assert.equal(native.at(-1),false);
  const saved=JSON.parse(window.localStorage.getItem('arctic-play.v1.theme'));assert.equal(saved,'light');
  const restarted=openApp(w=>w.localStorage.setItem('arctic-play.v1.theme',JSON.stringify(saved)));t.after(()=>restarted.dom.window.close());await settle();assert.equal(restarted.document.documentElement.dataset.theme,'light');restarted.button('Profile').click();await settle();restarted.document.querySelector('[role="switch"]').click();await settle();assert.equal(restarted.document.documentElement.dataset.theme,'dark');assert.deepEqual(app.errors,[]);assert.deepEqual(restarted.errors,[]);
});
