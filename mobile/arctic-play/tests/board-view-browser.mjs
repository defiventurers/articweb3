// Real portrait-phone taps against the shipped bundle and authoritative rooms.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {createServer} from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),e=require('../build/games.cjs'),v=require('../build/boardView.cjs');
const {chromium}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));
const WebSocket=createRequire(new URL('../../../server/package.json',import.meta.url))('ws');
const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const base=`http://127.0.0.1:${port}`,out=path.resolve(process.env.QA_OUTPUT||'verification/release-4.5/orientation');await fs.mkdir(out,{recursive:true});
const child=spawn(process.execPath,['-r','./allGamesBackendBootstrap.js','-e','require("./allGamesBackendBootstrap.js").loadAllGamesBackend()'],{cwd:fileURLToPath(new URL('../../../server/',import.meta.url)),env:{...process.env,PORT:String(port),DATABASE_URL:'',HIGH_STAKES_ENABLED:'false'},stdio:['ignore','ignore','pipe']});
let startup='';child.stderr.on('data',s=>startup+=s);process.on('exit',()=>child.kill());
for(let i=0;;i++){try{if((await fetch(base+'/arctic-play/health')).ok)break;}catch{}if(i===150)throw Error(startup);await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,args:['--no-sandbox']});
const contexts=[],sockets=[],checks=[],errors=[];let serial=0;
const record=s=>{checks.push(s);console.log('PASS',s);};
async function socket(){const ws=new WebSocket(base.replace('http:','ws:'));sockets.push(ws);await once(ws,'open');return ws;}
function call(ws,type,payload){const requestId='view-'+(++serial);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',handler);reject(Error('Timed out '+type));},15000);const handler=raw=>{const p=JSON.parse(raw);if(p.requestId!==requestId)return;clearTimeout(timer);ws.off('message',handler);if(p.type==='error')reject(Error(p.payload.message));else resolve(p.payload);};ws.on('message',handler);ws.send(JSON.stringify({type,requestId,payload:{...payload,capabilities:['dominion-teams-v1']}}));});}
async function pageFor({name='Player',playerId=randomUUID(),saved,practice,width=390}={}){
 const context=await browser.newContext({viewport:{width,height:width===320?740:844},isMobile:true,hasTouch:true});contexts.push(context);
 await context.addInitScript(({base,name,playerId,saved,practice})=>{
  const original=window.fetch.bind(window);window.fetch=(input,options)=>original(typeof input==='string'&&input.startsWith('https://articweb3.onrender.com/')?base+input.slice('https://articweb3.onrender.com'.length):input,options);
  const Socket=window.WebSocket;window.WebSocket=class extends Socket{constructor(url,...rest){super(url==='wss://articweb3.onrender.com'?base.replace('http:','ws:'):url,...rest);}};
  // Keep the bot's turn paused for the fixed-camera practice check only.
  if(practice?.mode==='bots'){const Worker=window.Worker;window.Worker=class extends Worker{constructor(url,...rest){super(url,...rest);this.isBot=String(url).endsWith('bot.js');}postMessage(data,...rest){if(!this.isBot)super.postMessage(data,...rest);}};}
  localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:playerId,name,avatar:'blue'}));
  localStorage.setItem('arctic-play.v1.mascot-companions',JSON.stringify({mode:'off',motion:false}));
  localStorage.setItem('arctic-play.v1.gathering-settings',JSON.stringify({enabled:false,sound:false}));
  if(saved)localStorage.setItem('arctic-play.v1.rooms',JSON.stringify(saved));
  if(practice)localStorage.setItem('arctic-play.v1.practice.'+practice.id,JSON.stringify(practice));
 },{base,name,playerId,saved,practice});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(name+': '+error.message));return page;
}
async function room(page,code){return page.evaluate(code=>JSON.parse(localStorage.getItem('arctic-play.v1.rooms'))[code].room,code);}
async function revision(pages,code,previous){for(const p of pages)await p.waitForFunction(({code,previous})=>JSON.parse(localStorage.getItem('arctic-play.v1.rooms'))?.[code]?.room.revision>previous,{code,previous});}
async function tapCell(page,cell){const svg=page.getByTestId('game-board');await svg.scrollIntoViewIfNeeded();const point=await svg.locator(`[data-cell="${cell}"]`).evaluate(g=>{const c=g.querySelector('circle'),p=g.ownerSVGElement.createSVGPoint();p.x=c.cx.baseVal.value;p.y=c.cy.baseVal.value;const t=p.matrixTransform(g.getScreenCTM());return{x:t.x,y:t.y};});await page.touchscreen.tap(point.x,point.y);}
function playableMove(id,state){
 const units=e.pieces(id,state),legal=e.actions(id,state),view=v.boardGeometry(id,state.turn),cells=new Map(view.cells.map(c=>[c.id,c])),[x,,width]=view.viewBox.split(' ').map(Number);
 const moves=legal.filter(a=>a.target&&units.some(p=>p.source===a.source));
 return moves.sort((a,b)=>{const score=action=>{const unit=units.find(p=>p.source===action.source);return (/pawn|soldier|scout|snow guard/i.test(unit.label)?0:100000)+Math.abs(cells.get(unit.cell).x-(x+width/2));};return score(a)-score(b);})[0];
}
async function move(page,id,state,action){
 const unit=e.pieces(id,state).find(p=>p.source===action.source);assert.ok(unit);await page.locator('.selection-hint').filter({hasText:/Tap a piece|Roll both|legal/}).waitFor();
 await tapCell(page,unit.cell);await page.locator(`[data-piece="${unit.id}"][aria-pressed=true]`).waitFor();await tapCell(page,action.target);
 const options=e.actions(id,state).filter(a=>a.source===action.source&&a.target===action.target);
 if(options.length>1)await page.getByRole('button',{name:id==='dominion'?`Use die ${action.raw.dieIndex+1} (${state.dice.values[action.raw.dieIndex]})`:action.promote?'Promote':'Keep unpromoted',exact:true}).click();
}
async function assertView(page,id,seat,state){
 await page.waitForFunction(()=>[...document.querySelectorAll('.player-pill img')].every(img=>img.complete&&img.naturalWidth>0));
 const svg=page.getByTestId('game-board');assert.equal(await svg.getAttribute('data-perspective'),seat);const geometry=v.boardGeometry(id,seat);
 const shown=await svg.locator('[data-cell]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.cell,piece:n.dataset.piece,x:n.querySelector('circle').cx.baseVal.value,y:n.querySelector('circle').cy.baseVal.value})));
 assert.equal(shown.length,geometry.cells.length);const cells=new Map(geometry.cells.map(c=>[c.id,c]));for(const p of shown){assert.ok(Math.abs(p.x-cells.get(p.id).x)<.001);assert.ok(Math.abs(p.y-cells.get(p.id).y)<.001);}
 const units=e.pieces(id,state);for(const p of units)assert.equal(shown.find(c=>c.id===p.cell)?.piece,p.id);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'fits portrait phone');
 const box=await svg.boundingBox();assert.ok(box.width>=200&&box.height>=200);assert.equal(await svg.getAttribute('data-view-angle'),String(geometry.angle));
}
async function openSaved(page,game){await page.goto(base+'/arctic-play/app/');await page.getByRole('navigation',{name:'Main navigation'}).getByText('Games',{exact:true}).click();await page.getByRole('button',{name:'Play '+game.name,exact:true}).click();await page.getByRole('button',{name:'Continue saved practice',exact:true}).click();await page.locator('.match-header').waitFor();}
try{
 for(const game of e.GAME_LIST){
  const clients=[];
  for(const seat of game.seats){const ws=await socket(),playerId=randomUUID(),response=await call(ws,clients.length?'ap_room_join':'ap_room_create',{tableId:game.id,seat,playerId,name:seat+' player',roomCode:clients[0]?.credentials.roomCode,...(game.id==='dominion'?{teamMode:'2v2'}:{})});const credentials={roomCode:response.room.roomCode,playerId,seatToken:response.seatToken};clients.push({ws,seat,credentials});await call(ws,'ap_room_ready',{...credentials,ready:true});}
  const start=await call(clients[0].ws,'ap_room_start',clients[0].credentials),code=start.room.roomCode;
  for(const [i,c] of clients.entries()){c.page=await pageFor({name:c.seat+' player',playerId:c.credentials.playerId,saved:{[code]:{session:c.credentials,room:start.room,at:Date.now()}},width:i%2?320:390});await c.page.goto(base+'/arctic-play/app/?room='+code);await c.page.locator('.match-header').waitFor();await assertView(c.page,game.id,c.seat,start.room.gameState);}
  record(game.name+': each online seat sees its own opening army at the bottom on 320/390px portrait phones');
  const pages=clients.map(c=>c.page),last=clients.at(-1);await last.page.getByRole('button',{name:'Zoom in',exact:true}).click();const zoomed=await last.page.getByTestId('game-board').getAttribute('style');
  const seen=new Set();
  for(let n=0;n<game.players*4+3&&seen.size<game.players;n++){
   let current=await room(pages[0],code),seat=current.gameState.turn,c=clients.find(c=>c.seat===seat);
   if(game.id==='dominion'){await c.page.getByRole('button',{name:'Roll both dice',exact:false}).click();await revision(pages,code,current.revision);current=await room(pages[0],code);if(current.gameState.turn!==seat)continue;}
   const action=playableMove(game.id,current.gameState);
   assert.ok(action);seen.add(seat);const expected=e.apply(game.id,current.gameState,action.id);await move(c.page,game.id,current.gameState,action);await revision(pages,code,current.revision);let after=await room(pages[0],code);assert.deepEqual(after.gameState,JSON.parse(JSON.stringify(expected)),'tap applies the canonical action');
   for(const player of clients)await assertView(player.page,game.id,player.seat,after.gameState);
   if(n===0){assert.equal(await last.page.getByTestId('game-board').getAttribute('style'),zoomed,'opponent moves preserve camera zoom');await last.page.getByRole('button',{name:'Fit',exact:true}).click();}
   if(game.id==='dominion'&&after.gameState.turn===seat){await c.page.getByRole('button',{name:'End turn',exact:true}).click();await revision(pages,code,after.revision);}
  }
  assert.equal(seen.size,game.players);
  record(game.name+': every seat makes a real rotated-board move; all clients agree on canonical positions and keep their own camera');
  await last.page.getByRole('button',{name:'Fit',exact:true}).click();await last.page.screenshot({path:path.join(out,game.id+'-online-'+last.seat+'.png')});
  const token=last.credentials.seatToken;await last.page.reload();await last.page.locator('.match-header').waitFor();const rejoined=await room(last.page,code);await assertView(last.page,game.id,last.seat,rejoined.gameState);assert.equal(await last.page.evaluate(code=>JSON.parse(localStorage.getItem('arctic-play.v1.rooms'))[code].session.seatToken,code),token);
  record(game.name+': reload and authenticated rejoin preserve the same army view');
  for(const c of clients){await c.page.context().close();c.ws.close();}
  const practice={id:game.id,matchId:randomUUID(),state:e.create(game.id),mode:'hotseat',humans:game.seats,history:[],guide:false},p=await pageFor({practice,width:320});await openSaved(p,game);let state=practice.state;
  for(let n=0;n<game.players;n++){
   const seat=state.turn;await assertView(p,game.id,seat,state);await p.getByRole('button',{name:'Zoom in',exact:true}).click();
   if(game.id==='dominion'){await p.getByRole('button',{name:'Roll both dice',exact:false}).click();await p.waitForFunction(({id,seat})=>{const s=JSON.parse(localStorage.getItem('arctic-play.v1.practice.'+id)).state;return s.dice.rolled||s.turn!==seat;},{id:game.id,seat});state=await p.evaluate(id=>JSON.parse(localStorage.getItem('arctic-play.v1.practice.'+id)).state,game.id);if(state.turn!==seat){await assertView(p,game.id,state.turn,state);assert.match(await p.getByTestId('game-board').getAttribute('style'),/scale\(1\)/);continue;}await p.getByRole('button',{name:'Fit',exact:true}).click();}
   const units=e.pieces(game.id,state),action=playableMove(game.id,state);await move(p,game.id,state,action);state=e.apply(game.id,state,action.id);
   await p.waitForFunction(({id,cell,piece})=>document.querySelector(`[data-cell="${cell}"]`)?.dataset.piece===piece,{id:game.id,cell:action.target,piece:units.find(u=>u.source===action.source).id});
   if(game.id==='dominion'&&state.turn===seat){await p.getByRole('button',{name:'Zoom in',exact:true}).click();await p.getByRole('button',{name:'End turn',exact:true}).click();state=e.apply(game.id,state,e.actions(game.id,state).find(a=>a.kind==='end').id);}
   await p.waitForFunction(seat=>document.querySelector('[data-testid="game-board"]')?.dataset.perspective===seat,state.turn);await assertView(p,game.id,state.turn,state);assert.match(await p.getByTestId('game-board').getAttribute('style'),/scale\(1\)/,'handoff resets zoom');assert.match(await p.locator('.board-perspective').innerText(),new RegExp('Pass the phone to '+e.seatName(game.id,state.turn)));
  }
  record(game.name+': pass-and-play follows every turn, resets zoom, retains legal taps and clearly names the next player');await p.context().close();
  const bot=await pageFor({practice:{...practice,mode:'bots',humans:[game.seats.at(-1)]},width:390});await openSaved(bot,game);await assertView(bot,game.id,game.seats.at(-1),practice.state);record(game.name+': bot practice keeps the selected human army at the bottom while an opponent is thinking');await bot.context().close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify({version:'4.5.0',checkedAt:new Date().toISOString(),checks,errors,engine:'Chromium portrait phone emulation',physicalDevicesTested:false},null,2));
}catch(error){for(const c of contexts)for(const p of c.pages())await p.screenshot({path:path.join(out,'failure-'+(++serial)+'.png')}).catch(()=>{});throw error;}finally{for(const ws of sockets)ws.terminate();for(const c of contexts)await c.close().catch(()=>{});await browser.close();child.kill();}
