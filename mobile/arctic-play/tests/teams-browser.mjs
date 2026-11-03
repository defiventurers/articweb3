import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const playwright=require(process.env.QA_PLAYWRIGHT||path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));
const port=process.env.QA_PORT||'10124';
const base=process.env.QA_BASE||'http://127.0.0.1:'+port;
let child;
if(!process.env.QA_BASE){
 const cwd=fileURLToPath(new URL('../../../server/',import.meta.url));
 child=spawn(process.execPath,['-r','./allGamesBackendBootstrap.js','-e','require("./allGamesBackendBootstrap.js").loadAllGamesBackend()'],{cwd,env:{...process.env,PORT:port,DATABASE_URL:'',HIGH_STAKES_ENABLED:'false'},stdio:['ignore','ignore','pipe']});
 let startup='';child.stderr.on('data',data=>startup+=data);process.on('exit',()=>child?.kill());
 let healthy=false;for(let n=0;n<100;n++){try{healthy=(await fetch(base+'/arctic-play/health')).ok;if(healthy)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 if(!healthy)throw Error('Local backend did not start: '+startup);
}

const out=path.resolve(process.env.QA_OUTPUT||'verification-teams');await fs.mkdir(out,{recursive:true});
const engines=require('../build/games.cjs');
const browsers=[],contexts=[],checks=[],errors=[];
const record=label=>{checks.push(label);console.log('PASS',label);};
const chromium=await playwright.chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,args:['--no-sandbox']});browsers.push(chromium);
let safari;
if(process.env.QA_WEBKIT){safari=await playwright.webkit.launch({headless:true,executablePath:process.env.WEBKIT_PATH});browsers.push(safari);}else safari=chromium;
async function pageFor(browser,name,width=390,height=844,native=false){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:1});contexts.push(context);
 await context.addInitScript(({base,name,native})=>{
  if(location.protocol==='http:'){
   const originalFetch=window.fetch.bind(window);window.fetch=(input,options)=>originalFetch(typeof input==='string'&&input.startsWith('https://articweb3.onrender.com/')?base+input.slice('https://articweb3.onrender.com'.length):input,options);
   const Original=window.WebSocket;window.WebSocket=class extends Original {constructor(url,...rest){super(url==='wss://articweb3.onrender.com'?base.replace('http:','ws:'):url,...rest);}};
  }
  if(!localStorage.getItem('arctic-play.v1.profile'))localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:crypto.randomUUID(),name,avatar:'red'}));
  localStorage.setItem('arctic-play.v1.mascot-companions',JSON.stringify({mode:'off',motion:false}));
  if(native)window.Android={appReady(){},setDarkTheme(){},shareText:(title,text)=>{window.sharedText=text;},backgroundApp(){}};
 },{base,name,native});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(name+': '+error.message));
 return page;
}
async function openGame(page){await page.goto(base+'/arctic-play/app/');await page.getByRole('navigation',{name:'Main navigation'}).getByText('Games',{exact:true}).click();await page.getByRole('button',{name:'Play Chaturanga',exact:true}).click();}
async function waitRoom(page){await page.locator('.room-code').waitFor();return(await page.locator('.room-code').innerText()).trim();}
async function noOverflow(page,label){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false,label);}
try{
 const host=await pageFor(chromium,'Android Host',390,844,true);await openGame(host);
 await host.getByRole('button',{name:'Play with friends',exact:false}).click();
 const setup=host.getByRole('dialog',{name:'Create Chaturanga table'});await setup.waitFor();
 await setup.getByRole('button',{name:'Green + Pink',exact:true}).click();await setup.getByRole('button',{name:'Pink',exact:true}).click();
 await noOverflow(host,'setup 390px');await host.screenshot({path:path.join(out,'team-choice.png')});
 await setup.getByRole('button',{name:'Create room',exact:true}).click();const code=await waitRoom(host);
 assert.match(code,/^[A-Z2-9]{6}$/);assert.match(await host.locator('.team-banner').innerText(),/Your team: Green \+ Pink\. Your kingdom: Pink/);record('Creator chooses Green + Pink and reserves Pink before creating the 2v2 room');
 await host.getByRole('button',{name:'Invite friends',exact:true}).click();const invitation=await host.evaluate(()=>window.sharedText);assert.ok(invitation.includes('/arctic-play/join?room='+code));assert.ok(invitation.includes('Safari'));record('Native sharing includes a browser invitation and its actual room code');
 const landing=await pageFor(safari,'Safari Friend',390,844);await landing.goto(base+'/arctic-play/join?room='+code);await landing.getByRole('link',{name:'Play in browser',exact:false}).click();await landing.getByRole('dialog',{name:'Join a room'}).waitFor();
 assert.equal(await landing.locator('#room-code').getAttribute('data-code'),code);await landing.locator('#join-name').fill('iPhone Friend');await landing.getByRole('button',{name:'Join table',exact:false}).click();await waitRoom(landing);
 await landing.getByRole('button',{name:'Green · Green + Pink',exact:true}).click();
 assert.match(await landing.locator('.team-banner').innerText(),/Your kingdom: Green/);record(`${process.env.QA_WEBKIT?'WebKit':'Browser'} invitation opens the same room, takes a name and chooses the ally kingdom`);
 const players=[landing];
 for(const name of ['Red Friend','Blue Friend']){
  const page=await pageFor(chromium,name,320,740);await page.goto(base+'/arctic-play/app/?room='+code);await page.getByRole('dialog',{name:'Join a room'}).waitFor();await noOverflow(page,'join form fits 320px');await page.getByRole('button',{name:'Join table',exact:false}).click();await waitRoom(page);players.push(page);
 }
 await host.getByRole('button',{name:'I’m ready',exact:true}).click();for(const p of players)await p.getByRole('button',{name:'I’m ready',exact:true}).click();
 await host.getByRole('button',{name:'Start game',exact:true}).click();for(const p of [host,...players])await p.locator('.match-header').waitFor();record('One Android-style client and three browser players start the same four-seat team match');
 const green=landing;await green.getByRole('button',{name:'Roll both dice',exact:false}).click();
 const end=green.getByRole('button',{name:'End turn',exact:true});await end.waitFor();await end.click();
 await players[1].getByRole('button',{name:'Roll both dice',exact:false}).waitFor();record('Safari seat can roll and voluntarily end its turn; next browser receives the authoritative turn');
 const before=await green.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.rooms')));await green.reload();
 // Saved Safari invitations reopen their authenticated seat automatically.
 await green.locator('.match-header').waitFor();
 const after=await green.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.rooms')));assert.equal(after[code].session.seatToken,before[code].session.seatToken);record('Safari reload and rejoin keep the same authenticated kingdom and team');
 for(const p of [host,green,...players.slice(1)]){await noOverflow(p,'team match fits phone');assert.ok(await p.locator('.match-team-banner').isVisible());const board=await p.getByTestId('game-board').boundingBox();assert.ok(board&&board.width>=200&&board.height>=200&&board.y+board.height<=p.viewportSize().height-30,'complete board is visible above chat');const dice=await p.locator('.dice-tray').boundingBox();assert.ok(dice&&dice.height<170,'dice stay compact');}
 await green.screenshot({path:path.join(out,'safari-team-match.png')});record('Team identity is visible and layouts fit 320px and 390px phones');
 const practice=await pageFor(safari,'Offline practice',320,740);await openGame(practice);await practice.getByRole('button',{name:'Four-way',exact:true}).click();await practice.getByText('More options',{exact:false}).first().click();await practice.getByRole('button',{name:'On this phone',exact:false}).click();await practice.locator('.match-header').waitFor();assert.equal(await practice.locator('.match-team-banner').count(),0);await practice.getByRole('button',{name:'Roll both dice',exact:false}).click();record('Original four-way practice remains playable in the browser');
 assert.deepEqual(errors,[],'no browser runtime errors');
 await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify({checkedAt:new Date().toISOString(),checks,errors,webkit:!!process.env.QA_WEBKIT},null,2));
}catch(error){for(let i=0;i<contexts.length;i++)for(const p of contexts[i].pages())await p.screenshot({path:path.join(out,'failure-'+i+'.png')}).catch(()=>{});throw error;}finally{for(const c of contexts)await c.close();for(const b of browsers)await b.close();child?.kill();}
