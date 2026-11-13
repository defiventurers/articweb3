// Whole compiled app navigation check. Images, auth and network are fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {verifiedAccount} from './account-fixture.mjs';
const mobile=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(mobile+'/build-deps/package.json'),{JSDOM,VirtualConsole}=require('jsdom');
const appFile=process.argv[2];if(!appFile)throw Error('Supply patched actual app.js');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.WebSocket=undefined;w.Android={setDarkTheme(){},appReady(){}};
  w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLElement.prototype.scrollTo=function(){};
  w.Image=class{constructor(){this.complete=true;this.naturalWidth=1200;this.naturalHeight=800;}set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}decode(){return Promise.resolve();}};
  w.Worker=class{postMessage(){}terminate(){}};
  w.localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'heritage-runtime',name:'Explorer',avatar:'red'}));
}});
const w=dom.window,d=w.document;verifiedAccount(w);w.eval(fs.readFileSync(appFile,'utf8'));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(predicate,label){for(let i=0;i<700;i++){if(predicate())return;await delay(8);}throw Error('Timed out: '+label);}
const button=text=>[...d.querySelectorAll('button')].find(item=>item.textContent.trim()===text);
try{
  await wait(()=>d.querySelector('.home-chaturanga'),'approved Home');
  const home=d.querySelector('.home-chaturanga img').getAttribute('src');
  [...d.querySelectorAll('.bottom-nav button')].find(item=>item.textContent.trim()==='Games').click();
  await wait(()=>d.querySelector('.exp-hero'),'approved expedition');
  const seen=[];
  for(let i=0;i<9;i++){
    const chapter=d.querySelector('.exp-chapter'),id=chapter.dataset.expeditionId;seen.push(id);
    d.querySelector('.exp-hero').click();await wait(()=>d.querySelector('.heritage-introduction'),id+' introduction');
    assert.match(d.querySelector('.heritage-introduction header').textContent,/1 \/ 3/);
    button('Continue →').click();await wait(()=>/2 \/ 3/.test(d.querySelector('.heritage-introduction header').textContent),id+' history');
    button('Continue →').click();await wait(()=>button('Proceed to game →'),id+' edition');
    button('← Back to games').click();await wait(()=>d.querySelector('.exp-conquest'),id+' crown preserved');
    if(i<8){d.querySelector('[aria-label="Next game"]').click();await wait(()=>d.querySelector('.exp-chapter')?.dataset.expeditionId!==id,'next chapter');}
  }
  assert.deepEqual(seen,['dominion','xiangqi','shogi','sanguo','sanyou','sannin','yanyi','co-tu-lenh','shanshui']);
  button('Snow garden hall').click();await wait(()=>d.querySelector('.exp-chapter')?.dataset.expeditionId==='shogi','Japanese hall');
  assert.match(d.querySelector('.exp-chapter').getAttribute('aria-label'),/of 2/);
  button('All halls').click();await wait(()=>d.querySelector('.exp-chapter')?.dataset.expeditionId==='dominion','all halls');
  [...d.querySelectorAll('.bottom-nav button')].find(item=>item.textContent.trim()==='Home').click();
  await wait(()=>d.querySelector('.home-chaturanga'),'return to approved Home');assert.equal(d.querySelector('.home-chaturanga img').getAttribute('src'),home);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:4,checks:['Full app opens approved Home and expedition','All nine story flows open and advance three screens before returning to original crowns','Culture hall filtering preserves the nine-game route','Original Home art and bottom navigation remain available'],deviceTested:false,imagesDecoded:false,liveLoginTested:false},null,2));
}finally{dom.window.close();}
