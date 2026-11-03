// Mixed Android-style Chromium and iPhone-style WebKit clients, real rooms.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),e=require('../build/games.cjs'),v=require('../build/boardView.cjs');
const playwright=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));
const out=path.resolve(process.env.QA_OUTPUT||'verification/release-4.6/safari');await fs.mkdir(out,{recursive:true});
const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['-r','./allGamesBackendBootstrap.js','-e','require("./allGamesBackendBootstrap.js").loadAllGamesBackend()'],{cwd:fileURLToPath(new URL('../../../server/',import.meta.url)),env:{...process.env,PORT:String(port),DATABASE_URL:'',HIGH_STAKES_ENABLED:'false'},stdio:['ignore','ignore','pipe']});let startup='';child.stderr.on('data',s=>startup+=s);process.on('exit',()=>child.kill());
for(let i=0;;i++){try{if((await fetch(base+'/arctic-play/health')).ok)break;}catch{}if(i===120)throw Error(startup);await new Promise(r=>setTimeout(r,100));}
const chrome=await playwright.chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,args:['--no-sandbox']});
const safari=await playwright.webkit.launch({headless:true,executablePath:process.env.WEBKIT_PATH});
const contexts=[],checks=[],errors=[];const record=text=>{checks.push(text);console.log('PASS',text);};
async function pageFor(name,native=false,width=390){
 const browser=native?chrome:safari,context=await browser.newContext({...(native?{}:playwright.devices['iPhone 13']),viewport:{width,height:width===320?740:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});contexts.push(context);
 await context.addInitScript(({base,name,native})=>{
  const fetch=window.fetch.bind(window);window.fetch=(input,options)=>fetch(typeof input==='string'&&input.startsWith('https://articweb3.onrender.com/')?base+input.slice('https://articweb3.onrender.com'.length):input,options);
  const Socket=window.WebSocket;window.__roomSockets=[];window.WebSocket=class extends Socket{constructor(url,...rest){super(url==='wss://articweb3.onrender.com'?base.replace('http:','ws:'):url,...rest);window.__roomSockets.push(this);}};
  if(!localStorage.getItem('arctic-play.v1.profile'))localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:crypto.randomUUID(),name,avatar:'blue'}));
  localStorage.setItem('arctic-play.v1.mascot-companions',JSON.stringify({mode:'off',motion:false}));
  if(native)window.Android={setDarkTheme(){},appReady(){},backgroundApp(){},shareText(title,text){window.sharedText=text;}};
 },{base,name,native});
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(name+': '+error.message));return page;
}
async function saved(page,code){return page.evaluate(code=>JSON.parse(localStorage.getItem('arctic-play.v1.rooms'))[code],code);}
async function revision(pages,code,previous){for(const p of pages)await p.waitForFunction(({code,previous})=>JSON.parse(localStorage.getItem('arctic-play.v1.rooms'))?.[code]?.room.revision>previous,{code,previous});}
async function tapCell(page,cell){const svg=page.getByTestId('game-board');await svg.scrollIntoViewIfNeeded();const point=await svg.locator(`[data-cell="${cell}"]`).evaluate(g=>{const c=g.querySelector('circle'),p=g.ownerSVGElement.createSVGPoint();p.x=c.cx.baseVal.value;p.y=c.cy.baseVal.value;const t=p.matrixTransform(g.getScreenCTM());return{x:t.x,y:t.y};});await page.touchscreen.tap(point.x,point.y);}
function actionFor(id,state){const units=e.pieces(id,state),view=v.boardGeometry(id,state.turn),cells=new Map(view.cells.map(c=>[c.id,c])),[x,,width]=view.viewBox.split(' ').map(Number);return e.actions(id,state).filter(a=>a.target&&units.some(p=>p.source===a.source)).sort((a,b)=>{const score=a=>{const p=units.find(p=>p.source===a.source);return (/pawn|soldier|scout|snow guard/i.test(p.label)?0:100000)+Math.abs(cells.get(p.cell).x-x-width/2);};return score(a)-score(b);})[0];}
async function move(page,id,state,action){const unit=e.pieces(id,state).find(p=>p.source===action.source);await page.waitForFunction(()=>!document.querySelector('.selection-hint')?.textContent.includes('Checking'));await tapCell(page,unit.cell);await page.locator(`[data-piece="${unit.id}"][aria-pressed=true]`).waitFor();await tapCell(page,action.target);if(e.actions(id,state).filter(a=>a.source===action.source&&a.target===action.target).length>1)await page.getByRole('button',{name:id==='dominion'?`Use die ${action.raw.dieIndex+1} (${state.dice.values[action.raw.dieIndex]})`:action.promote?'Promote':'Keep unpromoted',exact:true}).click();}
async function view(page,id,seat,state){
 const svg=page.getByTestId('game-board');assert.equal(await svg.getAttribute('data-perspective'),seat);const geometry=v.boardGeometry(id,seat);
 const cells=await svg.locator('[data-cell]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.cell,piece:n.dataset.piece,x:n.querySelector('circle').cx.baseVal.value,y:n.querySelector('circle').cy.baseVal.value})));
 for(const cell of geometry.cells){const shown=cells.find(c=>c.id===cell.id);assert.ok(Math.abs(shown.x-cell.x)<.001&&Math.abs(shown.y-cell.y)<.001);}
 for(const p of e.pieces(id,state))assert.equal(cells.find(c=>c.id===p.cell)?.piece,p.id);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.waitForFunction(()=>[...document.querySelectorAll('.player-pill img')].every(img=>img.complete&&img.naturalWidth));
}
try{
 for(const game of e.GAME_LIST){
  const host=await pageFor('Android Host',true);await host.goto(base+'/arctic-play/app/');await host.getByRole('navigation',{name:'Main navigation'}).getByText('Games',{exact:true}).click();await host.getByRole('button',{name:'Play '+game.name,exact:true}).click();await host.getByRole('button',{name:'Play with friends',exact:false}).click();
  if(game.id==='dominion'){const setup=host.getByRole('dialog',{name:'Create Chaturanga table'});await setup.getByRole('button',{name:'Green + Pink',exact:true}).click();await setup.getByRole('button',{name:'Pink',exact:true}).click();await setup.getByRole('button',{name:'Create room',exact:true}).click();}
  await host.locator('.room-code').waitFor();const code=(await host.locator('.room-code').innerText()).trim();
  await host.getByRole('button',{name:'Invite iPhone / browser player',exact:true}).click();await host.waitForFunction(()=>typeof window.sharedText==='string');const shared=await host.evaluate(()=>window.sharedText);const link=shared.match(/https:\/\/articweb3\.onrender\.com\/arctic-play\/app\/\?room=[A-Z2-9]{6}/)?.[0];assert.ok(link);assert.ok(shared.includes('No download needed'));assert.ok(!shared.includes('seatToken'));
  record(game.name+': Android host shares a direct Safari game invitation with the actual room code');
  const pages=[host],guests=[];
  for(let n=1;n<game.players;n++){
   const guest=await pageFor('iPhone Friend '+n,false,n===1?320:390);guests.push(guest);pages.push(guest);
   if(n===1){await guest.goto(base+'/arctic-play/join?room='+code);const links=guest.getByRole('link');assert.match(await links.first().innerText(),/Play in browser/);assert.equal(await links.first().getAttribute('href'),'/arctic-play/app/?room='+code);assert.ok((await guest.locator('main').innerText()).includes('No download or account needed'));}
   await guest.goto(link.replace('https://articweb3.onrender.com',base));await guest.getByRole('dialog',{name:'Join a room'}).waitFor();assert.equal(await guest.locator('#room-code').getAttribute('data-code'),code);await guest.locator('#join-name').fill('iPhone Friend '+n);await guest.getByRole('button',{name:'Join table',exact:false}).click();await guest.locator('.room-code').waitFor();assert.equal(await guest.getByRole('alertdialog').count(),0);assert.equal(await guest.evaluate(()=>!!window.Android),false);
  }
  record(game.name+': WebKit iPhone guests enter their names and join the same room without an APK or account');
  for(const p of pages)await p.getByRole('button',{name:'I’m ready',exact:true}).click();await host.getByRole('button',{name:'Start game',exact:true}).click();for(const p of pages)await p.locator('.match-header').waitFor();
  const playerMap=new Map();for(const p of pages){const s=await saved(p,code),profile=await p.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.profile')));const seat=s.room.players.find(p=>p.id===profile.id).seat;playerMap.set(seat,p);await view(p,game.id,seat,s.room.gameState);}
  const moved=new Set();for(let n=0;n<game.players*4+3&&moved.size<game.players;n++){
   let current=(await saved(host,code)).room;const seat=current.gameState.turn,page=playerMap.get(seat);
   if(game.id==='dominion'){await page.getByRole('button',{name:'Roll both dice',exact:false}).click();await revision(pages,code,current.revision);current=(await saved(host,code)).room;if(current.gameState.turn!==seat)continue;}
   const action=actionFor(game.id,current.gameState);assert.ok(action);const expected=JSON.parse(JSON.stringify(e.apply(game.id,current.gameState,action.id)));await move(page,game.id,current.gameState,action);await revision(pages,code,current.revision);let after=(await saved(host,code)).room;assert.deepEqual(after.gameState,expected);moved.add(seat);
   for(const [side,p]of playerMap)await view(p,game.id,side,after.gameState);
   if(game.id==='dominion'&&after.gameState.turn===seat){await page.getByRole('button',{name:'End turn',exact:true}).click();await revision(pages,code,after.revision);}
  }assert.equal(moved.size,game.players);record(game.name+': Android and WebKit players make accepted board moves, share one state and see their own army at the bottom');
  const guest=guests[0];await guest.getByRole('button',{name:'Open table chat',exact:true}).click();const chat=guest.getByRole('dialog',{name:'Campfire · Private table chat'});await chat.getByRole('textbox',{name:'Chat message',exact:true}).fill('Hello from Safari');await chat.getByRole('button',{name:'Send message',exact:true}).click();await host.waitForFunction(code=>JSON.parse(localStorage.getItem('arctic-play.v1.rooms'))?.[code]?.room.chat.at(-1)?.text==='Hello from Safari',code);await chat.getByRole('button',{name:'Close',exact:true}).click();
  record(game.name+': Safari chat reaches the Android player at the same table');
  const before=await saved(guest,code),profile=await guest.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.profile'))),seat=before.room.players.find(p=>p.id===profile.id).seat;
  await guest.reload();await guest.locator('.match-header').waitFor();assert.equal(await guest.getByRole('dialog',{name:'Join a room'}).count(),0);assert.equal((await saved(guest,code)).session.seatToken,before.session.seatToken);await view(guest,game.id,seat,(await saved(guest,code)).room.gameState);
  record(game.name+': Safari reload automatically reopens the authenticated saved seat');
  let count=await guest.evaluate(()=>window.__roomSockets.length);await guest.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await guest.waitForFunction(count=>window.__roomSockets.length>count&&window.__roomSockets.at(-1).readyState===1,count);await guest.waitForFunction(()=>document.querySelector('.match-header small')?.textContent.includes('Connected'));
  count=await guest.evaluate(()=>window.__roomSockets.length);await guest.evaluate(()=>window.__roomSockets.at(-1).close());await guest.waitForFunction(count=>window.__roomSockets.length>count&&window.__roomSockets.at(-1).readyState===1,count);await guest.waitForFunction(()=>document.querySelector('.match-header small')?.textContent.includes('Connected'));
  const after=await saved(guest,code);assert.equal(after.session.seatToken,before.session.seatToken);assert.equal(after.room.players.length,game.players);await view(guest,game.id,seat,after.room.gameState);
  record(game.name+': Safari tab restoration and a dropped socket reconnect to the same seat without duplicate players');
  await guest.screenshot({path:path.join(out,game.id+'-safari.png')});for(const p of pages)await p.context().close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify({version:'4.6.0',checkedAt:new Date().toISOString(),checks,errors,webkit:true,physicalIPhoneTested:false},null,2));
}catch(error){let n=0;for(const c of contexts)for(const p of c.pages())await p.screenshot({path:path.join(out,'failure-'+(++n)+'.png')}).catch(()=>{});throw error;}finally{for(const c of contexts)await c.close().catch(()=>{});await chrome.close();await safari.close();child.kill();}
