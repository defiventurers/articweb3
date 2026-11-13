import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {verifiedAccount} from './account-fixture.mjs';
import {createLongDiceGame,LONG_DICE_PROFILE,longDiceActions} from '../src/chaturangaLongDice.js';
const mobile=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(mobile+'/build-deps/package.json'),{JSDOM,VirtualConsole}=require('jsdom');
const [appFile,botFile,learnFile]=process.argv.slice(2);if(!appFile||!botFile||!learnFile)throw Error('Supply app, bot and learn runtimes');
const app=fs.readFileSync(appFile,'utf8'),workers={'bot.js':fs.readFileSync(botFile,'utf8'),'learn.js':fs.readFileSync(learnFile,'utf8')},checks=[],errors=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));async function wait(fn,label='UI'){for(let i=0;i<800;i++){if(fn())return;await sleep(8)}throw Error('Timed out: '+label)}
function open({saved,help=true,theme='dark'}={}){
 const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole,beforeParse(w){
  w.WebSocket=undefined;w.Android={setDarkTheme(){},appReady(){}};w.HTMLElement.prototype.scrollIntoView=function(){};
  w.localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'chaturanga-fixture',name:'Explorer',avatar:'red'}));w.localStorage.setItem('arctic-play.v1.theme',JSON.stringify(theme));
  w.localStorage.setItem('arctic-play.v1.chaturanga-roll-help.v1',JSON.stringify(help));
  if(saved){w.localStorage.setItem('arctic-play.v1.practice.dominion',JSON.stringify({id:'dominion',matchId:'chaturanga-fixture',state:saved,mode:'hotseat',humans:['green','red','blue','yellow'],history:[],actionLog:[]}));w.localStorage.setItem('arctic-play.v1.last-table',JSON.stringify({id:'dominion'}));}
  w.Image=class{constructor(){this.complete=true;this.naturalWidth=1000;this.naturalHeight=1000;}set src(v){this._src=v;queueMicrotask(()=>this.onload?.());}get src(){return this._src}decode(){return Promise.resolve()}};
  w.Worker=class{constructor(url){const source=workers[String(url)];if(!source)return;let draws=0;const self=this;
   this.context=vm.createContext({crypto:{getRandomValues(bytes){bytes[0]=[3,1][draws++%2];return bytes}},setTimeout,clearTimeout,TextEncoder,TextDecoder,URL,AbortController,atob,btoa,console});this.context.self=this.context;
   this.context.postMessage=data=>queueMicrotask(()=>{if(!this.dead)this.onmessage?.({data:JSON.parse(JSON.stringify(data))})});vm.runInContext(source,this.context);
  }postMessage(data){if(this.context)queueMicrotask(()=>{if(!this.dead)this.context.onmessage({data:JSON.parse(JSON.stringify(data))})})}terminate(){this.dead=true}};
 }});
 dom.window.document.documentElement.dataset.theme=theme;verifiedAccount(dom.window);dom.window.eval(app);return{dom,w:dom.window,d:dom.window.document};
}
const buttons=d=>[...d.querySelectorAll('button')],text=(d,t)=>buttons(d).find(b=>b.textContent.trim()===t),position=w=>JSON.parse(w.localStorage.getItem('arctic-play.v1.practice.dominion')).state;
const a=open();try{
 await wait(()=>a.d.querySelector('.home-chaturanga'),'heritage Home');assert.equal(a.d.querySelector('.home-chaturanga img').getAttribute('src'),'art/chaturanga-heritage-v1/cover.webp');
 a.d.querySelector('.home-chaturanga').click();await wait(()=>a.d.querySelector('.cg-panel[data-game=dominion]'));
 buttons(a.d).find(b=>b.textContent.includes('On this phone')).click();await wait(()=>a.d.querySelector('[data-screen=match]'));
 await wait(()=>a.d.querySelector('[role=dialog][aria-label="Your turn"]'));
 assert.equal(buttons(a.d).some(b=>/Roll one die/i.test(b.textContent)),false);assert.ok(a.d.querySelector('.ch-board-space'));
 assert.equal(position(a.w).rulesProfile,LONG_DICE_PROFILE);checks.push('Home opens the themed Chaturanga setup; new shared-phone matches select the versioned rules and adaptive board space');
 await wait(()=>!a.d.querySelector('[role=dialog] [aria-label="Roll both long dice"]').disabled);a.d.querySelector('[role=dialog] [aria-label="Roll both long dice"]').click();await wait(()=>a.d.querySelector('.ch-roll-guide'),'post-roll guide');
 assert.deepEqual(position(a.w).dice.values,[5,3]);assert.ok(a.d.querySelector('.ch-roll-guide').textContent.includes('Knight'));assert.ok(a.d.querySelector('.ch-roll-guide').textContent.includes('Pawn'));
 const pawn=buttons(a.d).find(b=>b.classList.contains('ch-guide-piece')&&b.textContent.startsWith('Pawn'));assert.ok(!pawn.disabled);pawn.click();await wait(()=>!a.d.querySelector('.ch-roll-guide'));
 const selected=a.d.querySelector('[data-cell][aria-pressed=true]');assert.ok(selected);const saved=position(a.w),source='piece:'+selected.dataset.piece;
 const move=longDiceActions(saved).find(m=>m.source===source&&m.kind==='move');assert.ok(move);a.d.querySelector(`[data-cell="${move.target}"]`).dispatchEvent(new a.w.MouseEvent('click',{bubbles:true}));
 await wait(()=>position(a.w).dice.used[0]);assert.equal(position(a.w).turn,'green');assert.equal(a.d.querySelector('.ch-roll-guide'),null);checks.push('Clicking the left die rolls both; guide shows the real activations and highlights a legal piece; its board move spends exactly one die');
 const toggle=a.d.querySelector('.ch-heritage-dice .ch-roll-help-toggle input');toggle.click();assert.equal(a.w.localStorage.getItem('arctic-play.v1.chaturanga-roll-help.v1'),'false');
 await wait(()=>text(a.d,'Pass die 2')?.disabled===false);text(a.d,'Pass die 2').click();await wait(()=>a.d.querySelector('[role=dialog][aria-label="Your turn"]'));
 await wait(()=>text(a.d,'Roll both dice')?.disabled===false);text(a.d,'Roll both dice').click();await wait(()=>position(a.w).turn==='red'&&position(a.w).dice.rolled&&a.d.querySelector('.ch-heritage-dice .dice-end-turn')&&!a.d.querySelector('.ch-heritage-dice .dice-end-turn').disabled);
 assert.equal(a.d.querySelector('.ch-roll-guide'),null);a.d.querySelector('.ch-heritage-dice .ch-roll-help-toggle input').click();await wait(()=>a.d.querySelector('.ch-roll-guide'));
 text(a.d,'Continue to the board').click();await wait(()=>!a.d.querySelector('.ch-roll-guide'));checks.push('Assistance can be disabled persistently and restored from the dice tray');
 await wait(()=>text(a.d,'Pass remaining')?.disabled===false);text(a.d,'Pass remaining').click();await wait(()=>position(a.w).turn==='blue'&&!position(a.w).dice.rolled);
 await wait(()=>text(a.d,'Pass turn')?.disabled===false);text(a.d,'Pass turn').click();await wait(()=>text(a.d,'Yes, pass turn')?.disabled===false);text(a.d,'Yes, pass turn').click();await wait(()=>position(a.w).turn==='yellow');checks.push('Passing one die, remaining dice and an unrolled turn all use the intended controls and confirmation');
}catch(e){fs.writeFileSync(path.resolve('chaturanga-ui-failure.html'),a.d.body.innerHTML);throw e}finally{a.dom.window.close()}
const frozen=createLongDiceGame({teamMode:'2v2'});for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(frozen.board[r][c]?.team==='green'&&frozen.board[r][c].isRoyal)frozen.board[r][c]=null;
frozen.royalCaptures.green=1;frozen.frozenTeams=['green'];frozen.revivalAvailable=['green'];
const b=open({saved:frozen,theme:'light'});try{
 await wait(()=>b.d.querySelector('.home-chaturanga'));b.d.querySelector('.home-chaturanga').click();await wait(()=>b.d.querySelector('.ch-king-return'));
 assert.equal(b.d.querySelector('[role=dialog][aria-label="Your turn"]'),null);await wait(()=>text(b.d,'Place returning King')?.disabled===false);text(b.d,'Place returning King').click();await wait(()=>b.d.querySelector('[data-cell="3,3"]')?.getAttribute('tabindex')==='0');
 b.d.querySelector('[data-cell="3,3"]').dispatchEvent(new b.w.MouseEvent('click',{bubbles:true}));await wait(()=>position(b.w).revivalPassRequired);
 assert.equal(position(b.w).board[3][3].team,'green');await wait(()=>text(b.d,'Pass second move')&&text(b.d,'Pass second move')?.disabled===false);text(b.d,'Pass second move').click();await wait(()=>position(b.w).turn==='red');
 checks.push('Light-theme king-return flow selects any empty square and requires the second-move pass without an erroneous roll prompt');
}catch(e){fs.writeFileSync(path.resolve('chaturanga-ui-failure.html'),b.d.body.innerHTML);throw e}finally{b.dom.window.close()}
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,checks},null,2));
