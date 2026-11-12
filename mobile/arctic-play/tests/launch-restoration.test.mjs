import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {verifiedAccount} from './account-fixture.mjs';
const require=createRequire(new URL('../build-deps/package.json',import.meta.url)),{JSDOM,VirtualConsole}=require('jsdom');
const source=fs.readFileSync(new URL('../android/app/src/main/assets/app.js',import.meta.url),'utf8');
const assets=new URL('../android/app/src/main/assets/',import.meta.url);
const stories=JSON.parse(fs.readFileSync(new URL('../src/heritageStories.json',import.meta.url)));
async function waitFor(fn){for(let i=0;i<500;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI did not settle');}
function open(view=''){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<div id="root"></div>',{url:'https://appassets.androidplatform.net/assets/index.html'+view,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.WebSocket=undefined;w.Android={appReady(){},setDarkTheme(){}};w.Worker=class{postMessage(){}terminate(){}};w.HTMLElement.prototype.scrollIntoView=function(){};}});
 verifiedAccount(dom.window);dom.window.eval(source);return {dom,doc:dom.window.document,errors};
}
const button=(d,name)=>[...d.querySelectorAll('button')].find(b=>b.textContent.trim()===name);
test('Restored five-tab shell retains home, nine stories, source links, Shop and device-local interests',async t=>{
 const {dom,doc,errors}=open();t.after(()=>dom.window.close());await waitFor(()=>doc.querySelector('.home-heritage'));
 assert.deepEqual([...doc.querySelectorAll('.bottom-nav small')].map(n=>n.textContent),['Home','Games','Shop','Chats','Passport']);
 assert.equal(doc.querySelector('.home-v2-hosts').getAttribute('src'),'art/home-v1/home-hosts-welcome.webp');
 assert.ok(doc.querySelector('.home-v2-shop'));
 button(doc,'Games').click();
 await waitFor(()=>doc.querySelectorAll('.games-grid .hall-card').length===7);
 assert.ok(doc.querySelector('.ctl-catalogue-entry'));
 assert.ok(doc.querySelector('.shanshui-catalogue-entry'));
 assert.equal(doc.querySelector('.ak-games-views'),null,'The Games tab must retain the v5.9.14 layout');
 button(doc,'Home').click();await waitFor(()=>doc.querySelector('.home-v2-story'));
 doc.querySelector('.home-v2-story').click();await waitFor(()=>button(doc,'Story Adventure · Nine games'));
 button(doc,'Story Adventure · Nine games').click();
 await waitFor(()=>doc.querySelector('[data-testid="story-adventure-gallery"]'));
 assert.equal(doc.querySelector('.ak-games-views button[aria-pressed="true"]').textContent,'Story Adventure');
 button(doc,'All Games').click();await waitFor(()=>doc.querySelectorAll('.all-game-tile').length===9);
 button(doc,'Halls').click();await waitFor(()=>doc.querySelector('.expedition-hero strong'));
 const seen=new Set();
 for(let i=0;i<9;i++){
  const name=doc.querySelector('.expedition-hero strong').textContent;assert.ok(!seen.has(name));seen.add(name);
  doc.querySelector('.expedition-hero').click();await waitFor(()=>doc.querySelector('.heritage-intro'));
  const story=Object.values(stories.games).find(g=>g.title===name);assert.equal(story.screens.length,3);
  for(let page=0;page<3;page++){
   assert.equal(doc.querySelector('.intro-story-copy h2').textContent,story.screens[page].title);
   for(const image of doc.querySelectorAll('.heritage-intro img'))assert.ok(fs.existsSync(new URL(image.getAttribute('src'),assets)),image.getAttribute('src'));
   assert.ok(button(doc,'Skip to game'));if(page<2)button(doc,'Continue').click();await waitFor(()=>doc.querySelector('.intro-story-copy h2').textContent===story.screens[Math.min(page+1,2)].title);
  }
  doc.querySelector('[aria-label="Close introduction"]').click();await waitFor(()=>doc.querySelector('.cultural-games'));
  // Catalogue remount returns to its first card; move to the next unseen entry.
  for(let n=0;n<=i&&i<8;n++){doc.querySelector('[aria-label="Next game"]').click();await new Promise(r=>setTimeout(r,15));}
 }
 assert.equal(seen.size,9);
 doc.querySelector('.overlay [aria-label="Close"]')?.click();
 button(doc,'Shop').click();await waitFor(()=>doc.querySelector('.physical-shop'));
 assert.equal(doc.querySelectorAll('.physical-preview').length,9);button(doc,'Save interest').click();await waitFor(()=>button(doc,'Saved designs · 1'));button(doc,'Saved designs · 1').click();await waitFor(()=>doc.querySelectorAll('.physical-preview').length===1);
 assert.equal(JSON.parse(dom.window.localStorage.getItem('arctic-play.v1.physical-interests')).length,1);assert.deepEqual(errors,[]);
});
test('Public dashboard contains no owner operations form; explicit operations route retains authentication',async t=>{
 for(const [view,expected] of [['launch-dashboard',false],['launch-operations',true]]){
  const {dom,doc}=open('?view='+view);try{await waitFor(()=>doc.querySelector('.launch-dashboard'));assert.equal(!!doc.querySelector('.owner-dashboard'),expected);}finally{dom.window.close();}
 }
});
