// CI visual evidence. Uses the real compiled React match DOM and stylesheet.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {verifiedAccount} from './account-fixture.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const makeRequire=createRequire(path.join(here,'../build-deps/package.json'));
const {JSDOM,VirtualConsole}=makeRequire('jsdom');
const engine=createRequire(import.meta.url)('../build/games.cjs');
const source=fs.readFileSync(path.join(here,'../android/app/src/main/assets/app.js'),'utf8');
const logs=[];
const virtual=new VirtualConsole();
virtual.on('jsdomError',e=>logs.push(e.stack||e.message));
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{
  url:'https://appassets.androidplatform.net/assets/index.html',
  runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:virtual,
  beforeParse(w){
    w.crypto.randomUUID=randomUUID;
    w.WebSocket=undefined;
    w.Android={setDarkTheme(){},appReady(){},shareApp(){},backgroundApp(){}};
    w.HTMLElement.prototype.scrollIntoView=function(){};
    w.Worker=class{
      postMessage(data){
        setTimeout(()=>{
          try{
            const result=data.task==='legal'
              ?{requestId:data.requestId,legal:engine.actions(data.id,data.state),checked:engine.inCheck(data.id,data.state)}
              :data.task==='apply'
                ?{requestId:data.requestId,state:engine.apply(data.id,data.state,data.actionId)}
                :{sequence:data.sequence,action:engine.chooseBot(data.id,data.state)};
            this.onmessage?.({data:result});
          }catch(error){this.onmessage?.({data:{requestId:data.requestId,error:error.message}});}
        },0);
      }
      terminate(){}
    };
  }
});
verifiedAccount(dom.window);dom.window.ArcticStartup={ready(){},fail:e=>logs.push(e?.message||String(e))};
dom.window.eval(source);
const doc=dom.window.document;
const pause=()=>new Promise(r=>setTimeout(r,40));
async function until(predicate,label){for(let i=0;i<500;i++){if(predicate())return;await pause();}throw Error('Visual fixture timeout: '+label+' '+logs.join(' | ').slice(0,800));}
await until(()=>doc.querySelector('.home-landing'),'home screen');
const launch=doc.querySelector('[aria-label="Enter Chaturanga"]');
if(!launch)throw Error('Missing Chaturanga launch button');
launch.click();
await until(()=>doc.querySelector('.cg-panel'),'Chaturanga setup');
const onPhone=[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()==='On this phonePass the phone between players');
if(!onPhone)throw Error('Missing local match mode');
onPhone.click();
await until(()=>doc.querySelector('.app.ch-v2[data-screen="match"]'),'Chaturanga match');
await until(()=>doc.querySelector('.app.ch-v2 .game-board'),'Chaturanga SVG board');
const app=doc.querySelector('.app.ch-v2').cloneNode(true);
// The actual match starts with a legal dice-roll dialog. Remove it only from
// this STATIC visual snapshot to inspect the board and typography behind it.
app.querySelectorAll('.overlay[role="presentation"]').forEach(element=>element.remove());
if(doc.querySelectorAll('.app.ch-v2 .game-board [data-cell]').length!==64)throw Error('Expected 64 live board cells');
const out=path.join(root,'server/arcticPlayWeb/chaturanga-review.html');
fs.writeFileSync(out,'<!doctype html><html data-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><link rel="stylesheet" href="fair-play.css"><style>.app.ch-v2 .game-board{visibility:visible!important}.app.ch-v2 .board-art-loading{display:none!important}</style></head><body><div id="root">'+app.outerHTML+'</div></body></html>');
console.log('Created actual compiled Chaturanga battle fixture:',out,'status=',doc.querySelector('.match-header small')?.textContent,'players=',[...doc.querySelectorAll('.player-pill strong')].map(x=>x.textContent).join('/'));
dom.window.close();
