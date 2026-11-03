// Visual release verification against the exact browser/APK asset bundle.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
import {HALL_ART} from '../src/celebration.js';
import {GAME_HISTORY} from '../src/gameHistory.js';
const mobile=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));
const output=path.resolve(process.env.QA_OUTPUT||path.join(mobile,'verification/release-4.4'));
await fs.mkdir(output,{recursive:true});
const assets=path.join(mobile,'android/app/src/main/assets');
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 try{
  const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!route.startsWith('/arctic-play/app/')){res.writeHead(404).end();return;}
  const relative=route.slice('/arctic-play/app/'.length)||'index.html';
  const target=path.resolve(assets,relative);
  if(!target.startsWith(assets+path.sep))throw Error('Invalid asset path');
  const data=await fs.readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/arctic-play/app/';
const checks=[],errors=[],failures=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,args:['--no-sandbox']});
const record=text=>{checks.push(text);console.log('PASS',text);};
try{
 for(const theme of ['dark','light'])for(const [width,height] of [[320,740],[390,844],[690,1400],[800,400]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await context.addInitScript(({theme})=>{
   localStorage.setItem('arctic-play.v1.theme',JSON.stringify(theme));
   localStorage.setItem('arctic-play.v1.mascot-companions',JSON.stringify({mode:'off',motion:false}));
   window.Android={setDarkTheme(){},appReady(){}};
  },{theme});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>route.abort());
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failures.push(r.url());});
  await page.goto(base);await page.addStyleTag({content:'html,body,*{scroll-behavior:auto!important}'});await page.locator('.bottom-nav').getByRole('button',{name:'Games',exact:true}).click();
  for(const name of ['Night mode','App updates']){const b=await page.getByRole(name==='Night mode'?'switch':'button',{name,exact:true}).boundingBox();assert.ok(b&&b.width>=44&&b.x>=0&&b.x+b.width<=width,'header controls fit and have phone tap targets');}
  for(const id of Object.keys(HALL_ART)){
   const card=page.locator(`.hall-card[data-hall="${id}"]`);await card.scrollIntoViewIfNeeded();
   const img=card.locator('.tabletop-cover img');await img.evaluate(i=>i.decode());
   const data=await img.evaluate(i=>{const box=i.getBoundingClientRect(),s=getComputedStyle(i);return {src:i.getAttribute('src'),w:i.naturalWidth,h:i.naturalHeight,box:box.width/box.height,fit:s.objectFit};});
   assert.equal(data.src,HALL_ART[id].card);assert.equal(data.w,1200);assert.equal(data.h,800);assert.ok(Math.abs(data.box-1.5)<.02);assert.equal(data.fit,'contain');
   assert.equal(await card.locator('img').count(),1,'No flat board overlay');
   assert.equal((await card.locator('.game-translation').innerText()).trim(),'('+GAME_HISTORY[id].english+')');assert.equal(await card.locator('.game-period').innerText(),GAME_HISTORY[id].period);
   if(theme==='dark'&&width===390){await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await card.screenshot({path:path.join(output,id+'-card.png')});}
  }
  if(theme==='dark'&&width===390){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'games-header.png')});}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  record(`${theme} ${width}x${height}: all seven full-frame 3D table cards decode without overlays or horizontal overflow`);
  if(width===390){
   for(const id of Object.keys(HALL_ART)){
    const card=page.locator(`.hall-card[data-hall="${id}"]`);await card.locator('.hall-explore').click();
    const img=page.locator('.hall-story-scene');await img.evaluate(i=>i.decode());assert.equal(await img.getAttribute('src'),HALL_ART[id].image);
    assert.equal(await page.locator('.hall-door-art img').count(),1);assert.equal(await page.locator('.hall-native-board').count(),0);
    if(theme==='dark'&&id==='dominion')await page.screenshot({path:path.join(output,'dominion-hall.png')});
    await page.locator('.sheet>header').getByRole('button',{name:'Close',exact:true}).click();
   }
   record(`${theme}: all seven hall pages use their matching complete 3D table scene`);
  }
  // A disabled story must not restore the old flat card illustration.
  await page.evaluate(()=>localStorage.setItem('gathering-settings.v1',JSON.stringify({enabled:false,sound:false})));
  await page.reload();await page.locator('.bottom-nav').getByRole('button',{name:'Games',exact:true}).click();
  assert.equal(await page.locator('.tabletop-cover').count(),7);
  for(const id of Object.keys(HALL_ART))assert.equal(await page.locator(`[data-hall="${id}"] .cover-hero`).getAttribute('src'),HALL_ART[id].card);
  if(width===390)record(`${theme}: stories off retains the seven sculpted table cards`);
  await context.close();
 }
 // Real-browser layout of the non-dismissible native update gate.
 const build=JSON.parse(await fs.readFile(path.join(mobile,'release-config.json'),'utf8'));
 const future={schemaVersion:1,packageName:build.packageName,versionName:'9.0.0',versionCode:build.versionCode+1,downloadUrl:'https://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/ArcticPlay-v9.0.0.apk',sizeBytes:9000000,sha256:'a'.repeat(64),publishedAt:'2026-10-22T16:00:00Z',releaseNotes:['New tables and games.']};
 for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width:320,height:740}});
  await context.addInitScript(({build,theme})=>{localStorage.setItem('arctic-play.v1.theme',JSON.stringify(theme));window.downloads=[];window.Android={setDarkTheme(){},appReady(){},getAppInfo:()=>JSON.stringify(build),downloadUpdate:url=>{window.downloads.push(url);return true;}};},{build,theme});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.request().url().startsWith('https://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/latest.json')?r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(future)}):r.abort());
  await page.goto(base);await page.getByRole('alertdialog').waitFor();await page.keyboard.press('Escape');await page.evaluate(()=>window.arcticBack());assert.equal(await page.locator('.bottom-nav').count(),0);
  await page.getByRole('button',{name:'Download update',exact:true}).click();assert.deepEqual(await page.evaluate(()=>window.downloads),[future.downloadUrl]);assert.ok(await page.getByRole('alertdialog').isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,'required-update-'+theme+'.png')});record(`${theme} 320px: required update fits; Back, Escape and downloading cannot dismiss it`);await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 await fs.writeFile(path.join(output,'browser-report.json'),JSON.stringify({version:'4.4.0',checks,errors,failedLocalAssets:failures,scope:'Desktop Chromium with phone and landscape viewports; no physical-device installation.'},null,2)+'\n');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
