import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const require=createRequire(path.join(root,'frontend/package.json'));
const {chromium}=require('@playwright/test');
const output=path.join(root,'mobile/arctic-play/visual-review');
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const findings=[];
try{
 for(const [w,h] of [[320,640],[360,800],[393,852],[430,932],[768,1024]]){
   const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
   await page.goto('http://127.0.0.1:8765/chaturanga-review.html',{waitUntil:'load'});
   await page.locator('.app.ch-v2 .game-board [data-cell]').first().waitFor();
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(x=>x.decode().catch(()=>{})));});
   const a=await page.evaluate(()=>{
     const r=q=>{const e=document.querySelector(q);if(!e)return null;const x=e.getBoundingClientRect();return {x:x.x,y:x.y,width:x.width,height:x.height,bottom:x.bottom,right:x.right}};
     return {
       root:r('.app.ch-v2'),header:r('.app.ch-v2 .match-header'),players:r('.app.ch-v2 .players-strip'),
       boardSpace:r('.app.ch-v2 .ch-board-space'),board:r('.app.ch-v2 .game-board'),
       dice:r('.app.ch-v2 .ch-v2-dice-stage'),diceActions:r('.app.ch-v2 .ch-v2-dice-actions'),
       mode:r('.app.ch-v2 .match-team-banner'),subheading:r('.app.ch-v2 .match-header small'),
       labels:[...document.querySelectorAll('.app.ch-v2 .player-pill strong')].map(x=>({text:x.textContent,x:x.getBoundingClientRect().x,right:x.getBoundingClientRect().right,containerRight:x.closest('.player-pill').getBoundingClientRect().right})),
       width:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,innerHeight:window.innerHeight,
       background:getComputedStyle(document.querySelector('.app.ch-v2')).backgroundImage,
     };
   });
   const expect=(n,v,label)=>assert.ok(Math.abs(n-v)<=2.5,w+'px '+label+': measured '+n+' expected '+v);
   const u=a.root.width/865;
   expect(a.header.height,248*u,'header height');
   expect(a.players.y,248*u,'player strip start');
   expect(a.boardSpace.y,344*u,'board area start');
   expect(a.board.y,428*u,'board top');
   expect(a.board.x-a.root.x,73*u,'board left');
   expect(a.board.width,718*u,'board width');
   expect(a.dice.y,1236*u,'dice stage top');
   expect(a.dice.height,300*u,'dice stage height');
   assert.ok(a.diceActions.y>=1535*u,w+'px controls must follow approved art');
   assert.ok(a.width<=w+2,w+'px unexpected horizontal scrollbar: '+a.width);
   assert.ok(a.labels.length===4);
   assert.ok(a.labels.every(z=>z.right<=z.containerRight+1),w+'px player text overflows its capsule');
   assert.ok(/approved-v2.webp/.test(a.background),'Approved background missing');
   assert.ok(w>600||a.scrollHeight>h,w+'px small phones must scroll instead of clip');
   const file=path.join(output,'chaturanga-'+w+'x'+h+'.png');
   await page.screenshot({path:file,fullPage:true});
   findings.push({viewport:w+'x'+h,width:a.root.width,board:a.board,dice:a.dice,controlsTop:a.diceActions.y,scrollHeight:a.scrollHeight,labels:a.labels.map(z=>z.text),screenshot:path.basename(file)});
   await page.close();
 }
 fs.writeFileSync(path.join(output,'geometry.json'),JSON.stringify(findings,null,2));
 console.log(JSON.stringify({status:'passed',viewports:findings.map(x=>x.viewport),files:findings.map(x=>x.screenshot)},null,2));
}finally{await browser.close();}
