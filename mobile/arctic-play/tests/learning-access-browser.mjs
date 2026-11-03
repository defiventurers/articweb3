// Real touch-coordinate checks against the exact APK/browser bundle.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chronologicalGames,GAME_HISTORY} from '../src/gameHistory.js';
const mobile=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url);
const e=require('../build/games.cjs'),f=require('../build/firstJourney.cjs'),x=require('../build/courseActivities.cjs'),c=require('../build/curriculum.cjs'),solo=require('../build/soloPractice.cjs'),practice=require('../build/practiceBoard.cjs');
const {chromium}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));
const output=process.env.QA_OUTPUT||path.join(mobile,'verification/release-4.4');await fs.mkdir(output,{recursive:true});
const assets=path.join(mobile,'android/app/src/main/assets');
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 try{
  const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!route.startsWith('/arctic-play/app/')){res.writeHead(404).end();return;}
  const target=path.resolve(assets,route.slice('/arctic-play/app/'.length)||'index.html');
  if(!target.startsWith(assets+path.sep))throw Error('Invalid asset path');
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(await fs.readFile(target));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/arctic-play/app/';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,args:['--no-sandbox']});
const checks=[],errors=[],failures=[];
const record=text=>{checks.push(text);console.log('PASS',text);};
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
async function tapCell(page,cell){
 const board=page.getByTestId('game-board');await board.scrollIntoViewIfNeeded();
 const point=await board.locator(`[data-cell="${cell}"]`).evaluate(g=>{const circle=g.querySelector('circle'),p=g.ownerSVGElement.createSVGPoint();p.x=circle.cx.baseVal.value;p.y=circle.cy.baseVal.value;const t=p.matrixTransform(g.getScreenCTM());return{x:t.x,y:t.y};});
 await page.mouse.click(point.x,point.y);
}
async function completeStep(page,id,task,key){
 let path=[],position=task==='first'?f.firstPosition(id,key):x.coursePosition(id,key);
 const activity=page.locator(`.learning-activity[data-card="${key}"]`);await activity.locator(':scope[data-ready=true]').waitFor();
 if(position.activity.kind==='inspect'){
  const unit=e.pieces(id,position.state).find(u=>u.source===position.focus);
  if(unit){assert.equal(await activity.locator('.mascot-callout').innerText(),'Tap the '+unit.label+' to continue!');await activity.getByRole('button',{name:'Show me the '+unit.label+' ↓',exact:true}).click();assert.ok(await activity.locator('text=TAP').count()>0);await tapCell(page,unit.cell);}
  else await tapCell(page,position.activity.cells[0]);
  await activity.locator(':scope[data-complete=true][data-ready=true]').waitFor();return;
 }
 while(!position.complete){
  const action=position.legal[0],unit=e.pieces(id,position.state).find(p=>p.source===action.source);
  if(action.target===null)await activity.getByRole('button',{name:action.kind==='illuminate'?'Illuminate':'Try this action',exact:true}).click();
  else{
   if(unit){await tapCell(page,unit.cell);await activity.locator(`[data-piece="${unit.id}"][aria-pressed=true]`).waitFor();}
   else await activity.locator('.lesson-hand').click();
   await tapCell(page,action.target);
   if(position.legal.filter(a=>a.source===action.source&&a.target===action.target).length>1)await page.getByRole('button',{name:action.promote?'Promote':'Keep this movement',exact:true}).click();
  }
  path.push(action.id);position=task==='first'?f.firstPosition(id,key,path):x.coursePosition(id,key,path);
  await activity.locator(`:scope[data-stage="${position.stage||path.length}"][data-ready=true]`).waitFor();
 }
 assert.equal(await activity.getAttribute('data-complete'),'true');
}
async function choices(page){await page.getByRole('button',{name:'Learning choices',exact:true}).click();await page.locator('.learning-choice-home').waitFor();}
try{
 for(const theme of ['dark','light'])for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:width===320?740:844},reducedMotion:'reduce'});
  await context.addInitScript(({theme})=>{localStorage.setItem('arctic-play.v1.theme',JSON.stringify(theme));localStorage.setItem('arctic-play.v1.mascot-companions',JSON.stringify({mode:'quiet',motion:false}));window.Android={setDarkTheme(){},appReady(){}};},{theme});
  const page=await context.newPage();page.on('pageerror',err=>errors.push(err.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failures.push(r.url());});
  await page.route('https://**/*',r=>r.abort());await page.goto(base);await page.addStyleTag({content:'html,body,*{scroll-behavior:auto!important}'});
  await page.locator('.bottom-nav').getByRole('button',{name:'Games',exact:true}).click();
  assert.deepEqual(await page.locator('.hall-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.hall)),chronologicalGames(e.GAME_LIST).map(g=>g.id));
  for(const definition of e.GAME_LIST){
   const id=definition.id,card=page.locator(`[data-hall="${id}"].hall-card`);
   assert.match(await card.locator('.hall-play-now').innerText(),/Quick play\s*\(vs bot\)/);
   assert.equal(await card.getByRole('button',{name:'How to play '+definition.name,exact:true}).count(),1);
   assert.ok(await card.locator('.hall-how-to-play').evaluate(b=>b.previousElementSibling?.classList.contains('hall-card-actions')));
   await card.locator('.hall-how-to-play').click();const school=page.getByTestId('how-to-play');await school.waitFor();
   assert.equal(await school.locator('select:visible').count(),0);assert.equal(await school.locator('.learning-choice-buttons>button').count(),3);
   for(const name of ['Quick Rules','Full Rules','Learn piece movement']){const box=await school.getByRole('button',{name,exact:true}).boundingBox();assert.ok(box&&box.height>=90&&box.width>=260&&box.y+box.height<=page.viewportSize().height,'all three large options visible on the phone');}
   await school.locator('.learning-choice-buttons .mascot-portrait img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
   assert.equal(await school.locator('.learning-choice-buttons .mascot-portrait img').count(),3);
   if(id==='shogi'&&theme==='dark'&&width===390)await page.screenshot({path:path.join(output,'three-learning-choices.png')});
   await school.getByRole('button',{name:'Quick Rules',exact:true}).click();await school.locator('.learning-activity[data-ready=true]').waitFor();assert.ok((await school.locator('.course-rule').innerText()).includes(require('../build/learning.cjs').LESSONS[id].goal));await completeStep(page,id,'first',f.firstSteps(id)[0].key);assert.ok(await school.locator('.teaching-host .mascot-portrait img').count()>0);
   await choices(page);await school.getByRole('button',{name:'Full Rules',exact:true}).click();
   const bar=school.getByRole('progressbar',{name:'Full rules completed',exact:true});assert.equal(await bar.getAttribute('value'),'0');
   await completeStep(page,id,'course',c.courseCards(id)[0].key);assert.ok(+(await bar.getAttribute('value'))>0);
   const inspectIndex=c.courseCards(id).findIndex(card=>{const a=x.courseActivity(id,card.key);return a.kind==='inspect'&&a.role;});
   if(inspectIndex>=0){await school.getByRole('button',{name:'Browse rules',exact:true}).click();await page.locator('.learning-topic-list button').nth(inspectIndex).click();await completeStep(page,id,'course',c.courseCards(id)[inspectIndex].key);}
   const percent=await bar.getAttribute('value');assert.ok(+percent>0&&+percent<100);
   if(id==='shogi'&&theme==='dark'&&width===390)await page.screenshot({path:path.join(output,'full-rules-progress.png')});
   await school.getByRole('button',{name:'Back from How to Play',exact:true}).click();await card.locator('.hall-how-to-play').click();await school.getByRole('button',{name:'Full Rules',exact:true}).click();assert.equal(await bar.getAttribute('value'),percent,'full guide progress survives leaving and resuming');
   if(id==='shogi'&&theme==='dark'&&width===390){
    for(const[index,card]of c.courseCards(id).entries()){
     const done=await page.evaluate(({key})=>JSON.parse(localStorage.getItem('arctic-play.v1.complete-rule-guide.v1.shogi')||'{}').practiced?.[key],{key:card.key});if(done)continue;
     await school.getByRole('button',{name:'Browse rules',exact:true}).click();await page.locator('.learning-topic-list button').nth(index).click();await completeStep(page,id,'course',card.key);
    }
    assert.equal(await bar.getAttribute('value'),'100');await choices(page);assert.match(await school.locator('.learning-choice-buttons').innerText(),/100% complete/);await school.getByRole('button',{name:'Full Rules',exact:true}).click();record('Shogi: all 16 full-guide steps completed through real board interactions; health bar reaches 100% and persists');
   }
   await choices(page);await school.getByRole('button',{name:'Learn piece movement',exact:true}).click();
   const explorer=school.locator('.solo-board-section');await explorer.locator(':scope[data-ready=true]').waitFor();assert.equal(await explorer.locator('select:visible').count(),0);assert.equal(await explorer.locator('.movement-piece-choices button').count(),require('../build/learning.cjs').PIECE_GUIDES[id].length);
   const role=solo.FIRST_PIECE[id],one=solo.soloPosition(id,role),action=one.legal[0];await tapCell(page,action.target);await explorer.locator(':scope[data-moves="1"][data-ready=true]').waitFor();assert.ok(await explorer.locator('.teaching-host .mascot-portrait').count()>0);
   await school.getByRole('button',{name:'Back from How to Play',exact:true}).click();await card.locator('.hall-explore').click();await page.getByRole('button',{name:'Build a practice position',exact:true}).click();
   const builder=page.locator('.practice-builder');await builder.locator(':scope[data-ready=true]').waitFor();assert.equal(await builder.getAttribute('data-piece-count'),'0');assert.equal(await builder.locator('[data-piece]').count(),0);
   const stock=practice.practiceStock(id),first=stock.find(p=>p.owner==='red'&&p.role===role),second=stock.find(p=>p.owner==='blue'&&p.role===role)||stock.find(p=>p.id!==first.id&&p.owner==='red'&&p.role===role);let state=practice.emptyPractice(id);
   for(const[piece,index]of [[first,1],[second,2]]){
    await builder.getByRole('button',{name:'Add a piece',exact:true}).click();await page.locator('.practice-armies').getByRole('button',{name:e.seatName(id,piece.faction),exact:true}).click();await page.getByRole('button',{name:'Add '+e.seatName(id,piece.faction)+' '+piece.label,exact:true}).click();await tapCell(page,piece.cell);await builder.locator(`:scope[data-piece-count="${index}"][data-ready=true]`).waitFor();state=practice.placePracticePiece(id,state,piece.id,piece.cell).state;
   }
   await tapCell(page,first.cell);await builder.locator(`:scope[data-selected="${first.source}"][data-ready=true]`).waitFor();
   const legal=practice.practiceActions(id,state,first.source),move=legal.find(a=>!a.promote)||legal[0],outside=e.board(id).cells.find(c=>!legal.some(a=>a.target===c.id)&&!e.pieces(id,state).some(u=>u.cell===c.id));assert.ok(move&&outside);
   await tapCell(page,outside.id);await page.getByRole('alert').waitFor();assert.equal(await builder.locator(`[data-piece="${first.id}"]`).getAttribute('data-cell'),first.cell,'invalid move cannot teleport');
   await tapCell(page,move.target);if(legal.filter(a=>a.target===move.target).length>1)await page.getByRole('button',{name:move.promote?'Promote':'Keep unpromoted',exact:true}).click();await page.waitForFunction(({id,target})=>document.querySelector('.practice-builder [data-piece="'+id+'"]')?.dataset.cell===target,{id:first.id,target:move.target});
   await builder.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForFunction(({id,cell})=>document.querySelector('.practice-builder [data-piece="'+id+'"]')?.dataset.cell===cell,{id:first.id,cell:first.cell});
   await builder.getByRole('button',{name:'Clear board',exact:true}).click();await builder.locator(':scope[data-piece-count="0"][data-ready=true]').waitFor();await noOverflow(page);
   if(id==='shogi'&&theme==='dark'&&width===390)await page.screenshot({path:path.join(output,'empty-practice-board.png')});
   await school.getByRole('button',{name:'Back from How to Play',exact:true}).click();
   record(`${theme} ${width}px ${id}: three visible mascot routes; real quick/movement actions; saved full-rule progress and named inspect cue; empty board, two-piece placement, illegal-move rejection and undo`);
  }
  assert.equal(await page.getByRole('button',{name:/Quick start/i}).count(),0);await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 await fs.writeFile(path.join(output,'learning-browser-report.json'),JSON.stringify({version:JSON.parse(await fs.readFile(path.join(mobile,'release-config.json'),'utf8')).versionName,checks,errors,failedLocalAssets:failures,scope:'Desktop Chromium at 320px and 390px phone sizes, light and dark; physical Android and Safari installation not tested.'},null,2)+'\n');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
