import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(mobile,'../../frontend/package.json'));
const {chromium}=require('@playwright/test'),engine=createRequire(import.meta.url)(path.join(mobile,'build/games.cjs'));
const assets=path.join(mobile,'android/app/src/main/assets'),output=path.join(mobile,'build/phone-qa');await fs.mkdir(output,{recursive:true});
const build=JSON.parse(await fs.readFile(path.join(mobile,'release-config.json'),'utf8'));
const server=http.createServer(async(req,res)=>{
  try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';const file=path.resolve(assets,relative);if(!file.startsWith(assets+path.sep))throw new Error('Invalid path');const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':'image/webp');res.end(bytes);}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const results=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  for(const [width,height] of [[320,640],[360,800],[412,915],[800,360]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await context.addInitScript(build=>{
      localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'phone-check',name:'Explorer',avatar:'blue'}));
      window.downloads=[];window.Android={setDarkTheme(){},appReady(){},getAppInfo:()=>JSON.stringify(build),downloadUpdate:url=>{window.downloads.push(url);return true;}};
    },build);
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    const label=`${width}x${height}`;
    const capture=async name=>{if(name==='profile-light')await page.waitForFunction(()=>!document.querySelector('.toast'));await page.screenshot({path:path.join(output,`${label}-${name}.png`),animations:'disabled'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} ${name}: horizontal overflow`);};
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('.game-card').last().waitFor();assert.equal(await page.locator('.game-card').count(),7);
    await page.locator('.kingdom-emblem').evaluate(image=>image.decode());await capture('games');
    const greetings=new Set();
    for(const name of ['Polly','Retsba','Pengu','Abster']){
      await page.getByRole('button',{name:`Travel with ${name}`,exact:true}).click();
      await page.waitForFunction(host=>document.querySelector('.companion-lobby')?.dataset.host===host,name.toLowerCase());
      const hello=page.getByRole('button',{name:`Say hello to ${name}`,exact:true});
      await hello.click();await page.waitForFunction(()=>document.querySelector('.companion-lobby')?.dataset.moment==='tap');
      const first=await page.locator('.companion-lobby [role="status"]').innerText();await hello.click();
      await page.waitForFunction(previous=>document.querySelector('.companion-lobby [role="status"]').textContent!==previous,first);
      greetings.add(first);
    }
    assert.equal(greetings.size,4);
    await page.reload();await page.locator('.game-card').last().waitFor();assert.equal(await page.locator('.companion-lobby').getAttribute('data-host'),'abster');
    assert.equal(await page.locator('.companion-lobby .mascot-portrait').evaluate(el=>getComputedStyle(el).animationName),'none','device reduced motion must win');
    await capture('companion');

    await page.getByRole('button',{name:'4 players',exact:true}).click();assert.equal(await page.locator('.game-card').count(),1);await page.getByRole('button',{name:'All',exact:true}).click();
    await page.getByRole('button',{name:'Discover',exact:true}).click();await page.locator('.archive-journal').waitFor();await capture('discover');
    await page.locator('.guide-collection').scrollIntoViewIfNeeded();await page.locator('.guide-collection').screenshot({path:path.join(output,`${label}-guides.png`),animations:'disabled'});
    assert.equal(await page.locator('.guide-card').count(),4);
    await page.locator('.journal-row').first().click();await page.getByRole('button',{name:'Try your first move',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.');
    const state=engine.create('shogi'),action=engine.actions('shogi',state)[0],unit=engine.pieces('shogi',state).find(p=>p.source===action.source);
    await page.locator(`[data-cell="${unit.cell}"]`).click();await page.locator('.destinations button').first().waitFor();await page.locator(`[data-cell="${action.target}"]`).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('arctic-play.v1.archive-journal')||'{}').shogi>0);await capture('shogi');
    await page.waitForFunction(()=>document.querySelector('.companion-match')?.dataset.moment==='discovery');
    assert.equal(await page.locator('.companion-match').getAttribute('data-host'),'abster');
    await page.getByRole('button',{name:'Match options',exact:true}).click();await page.locator('.mode-row').filter({hasText:'Undo your last turn'}).click();
    await page.waitForFunction(()=>document.querySelector('.companion-match')?.dataset.moment==='undo');
    await page.getByRole('button',{name:'Companion settings',exact:true}).click();
    await page.getByRole('switch',{name:'Automatic reactions',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.companion-match')?.dataset.moment==='quiet');
    await page.getByRole('button',{name:'Say hello to Abster',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.companion-match')?.dataset.moment==='tap');
    await page.getByRole('button',{name:'Companion settings',exact:true}).click();await page.getByRole('switch',{name:'Automatic reactions',exact:true}).click();
    await page.getByRole('switch',{name:'Companion beside the board',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
    assert.equal(await page.locator('.companion-match').count(),0);

    await page.getByRole('button',{name:'Back to games',exact:true}).click();assert.equal(await page.locator('progress').getAttribute('value'),'1');
    await page.getByRole('button',{name:'Games',exact:true}).click();await page.getByRole('button',{name:'Play Arctic Dominion',exact:true}).click();
    await page.locator('.heritage-label').click();await page.locator('.heritage-details').waitFor();assert.match(await page.locator('.heritage-details').innerText(),/modern Chaturanga-inspired/);await capture('edition');
    await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Profile',exact:true}).click();
    await page.getByRole('switch',{name:'Dark mode',exact:true}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');await capture('profile-light');
    await page.route('https://raw.githubusercontent.com/**',route=>route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({schemaVersion:1,packageName:build.packageName,versionName:'2.2.0',versionCode:build.versionCode+1,downloadUrl:'https://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/ArcticPlay-v2.2.0.apk',sizeBytes:9000000,sha256:'a'.repeat(64),publishedAt:'2026-10-16T14:00:00Z',releaseNotes:['A future update fixture.']})}));
    await page.locator('.profile-options button').filter({hasText:'App updates'}).click();await page.getByRole('button',{name:'Download update',exact:true}).waitFor();await capture('updates');
    await page.getByRole('button',{name:'Download update',exact:true}).click();assert.equal(await page.evaluate(()=>window.downloads.length),1);
    assert.deepEqual(errors,[]);results.push({viewport:label,games:7,guides:4,guidedMoveRecorded:true,distinctTapResponses:4,companionChoiceRestored:true,reducedMotion:true,undoReaction:true,quietManualTap:true,inGameHide:true,editionLabels:true,lightMode:true,updateHandoff:true,horizontalOverflow:false,pageErrors:errors});
    await context.close();
  }
  const final=engine.create('dominion');final.board=Array.from({length:8},()=>Array(8).fill(null));
  final.board[7][4]={id:'green-royal',team:'green',type:'king',isRoyal:true};final.board[4][0]={id:'red-royal',team:'red',type:'king',isRoyal:true};final.board[4][3]={id:'mammoth',team:'green',type:'elephant',isRoyal:false};
  final.currentPlayerIndex=0;final.turn='green';final.dice={rolled:true,values:[2,2],used:[false,false]};
  for(const [id,position,expected] of [['xiangqi',engine.create('xiangqi'),'capture'],['dominion',final,'finish']]){
    const before=engine.pieces(id,position);
    const action=engine.actions(id,position).find(a=>{const after=engine.apply(id,position,a.id);return expected==='finish'?!!engine.result(after):engine.pieces(id,after).length<before.length;});
    assert.ok(action);const unit=before.find(p=>p.source===action.source);
    const ctx=await browser.newContext({viewport:{width:412,height:915},reducedMotion:'reduce'});
    await ctx.addInitScript(({id,position,humans})=>localStorage.setItem(`arctic-play.v1.practice.${id}`,JSON.stringify({id,state:position,humans,history:[],mode:'hotseat',guide:false})),{id,position,humans:engine.game(id).seats});
    const page=await ctx.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByRole('button',{name:`Play ${engine.game(id).name}`,exact:true}).click();await page.getByRole('button',{name:'Continue saved practice',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.');
    await page.locator(`[data-cell="${unit.cell}"]`).click();await page.locator('.destinations button').first().waitFor();await page.locator(`[data-cell="${action.target}"]`).click();
    if(expected==='finish'&&await page.getByRole('dialog').count())await page.getByRole('button',{name:/Use die 1/}).click();
    await page.waitForFunction(event=>document.querySelector('.companion-match')?.dataset.moment===event,expected);
    if(expected==='finish')assert.match(await page.locator('.result-card').innerText(),/Green wins/);
    assert.deepEqual(errors,[]);results.push({game:id,acceptedMoveReaction:expected,pageErrors:errors});
    await ctx.close();
  }
  const animated=await browser.newContext({viewport:{width:412,height:915},reducedMotion:'no-preference'});
  const animatedPage=await animated.newPage();await animatedPage.goto(`http://127.0.0.1:${server.address().port}/`);
  await animatedPage.getByRole('button',{name:'Discover',exact:true}).click();await animatedPage.locator('.guide-grid').scrollIntoViewIfNeeded();
  await animatedPage.waitForFunction(()=>document.querySelector('.living-guide .mascot-figure')?.dataset.animate==='yes');
  assert.notEqual(await animatedPage.locator('.living-guide .mascot-portrait').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  await animatedPage.locator('.guide-collection').screenshot({path:path.join(output,'mascot-lounge.png'),animations:'disabled'});
  const blink=await animatedPage.addStyleTag({content:'.mascot-eyelids{opacity:1!important;animation:none!important}'});
  await animatedPage.locator('.guide-grid').screenshot({path:path.join(output,'mascot-blink-frame.png'),animations:'disabled'});await blink.evaluate(el=>el.remove());
  await animatedPage.getByRole('button',{name:'Companion settings',exact:true}).click();await animatedPage.getByRole('switch',{name:'Mascot motion',exact:true}).click();await animatedPage.getByRole('button',{name:'Close',exact:true}).click();
  assert.equal(await animatedPage.locator('.living-guide .mascot-portrait').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await animatedPage.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.companion-preferences')).motion),false);
  results.push({normalMotion:true,motionOff:true,blinkFrameCaptured:true});await animated.close();
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
