import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(mobile,'../../frontend/package.json'));
const {chromium}=require('@playwright/test'),engine=createRequire(import.meta.url)(path.join(mobile,'build/games.cjs')),learning=createRequire(import.meta.url)(path.join(mobile,'build/learning.cjs'));
const assets=path.join(mobile,'android/app/src/main/assets'),output=path.join(mobile,'build/learning-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{
  try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html',file=path.resolve(assets,relative);if(!file.startsWith(assets+path.sep))throw new Error('Invalid path');const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':'image/webp');res.end(bytes);}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page;
const results=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  for(const [width,height] of [[320,640],[360,800],[412,915],[800,360]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),errors=[];
    await context.addInitScript(()=>{localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'learning-check',name:'Explorer',avatar:'blue'}));window.Android={setDarkTheme(){},appReady(){}};});
    page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const label=`${width}x${height}`,report={viewport:label,lessons:0,pieceExamples:0,freeBoards:0,errors};
    const capture=async name=>{await page.screenshot({path:path.join(output,`${label}-${name}.png`),animations:'disabled'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} ${name}: horizontal overflow`);};
    const nav=async tab=>{await page.locator('.academy-tabs button').nth(tab).click();};
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByRole('button',{name:'Play Shogi',exact:true}).click();await page.locator('.learn-mode-row').click();
    await page.locator('#learning-game').waitFor();assert.equal(await page.locator('.suggested-piece').count(),0,'the welcome board has no phantom suggestions');await capture('welcome');
    for(const {id} of engine.GAME_LIST){
      await page.locator('#learning-game').selectOption(id);
      await page.waitForFunction(()=>document.querySelector('.academy-tabs [aria-current=page]')?.textContent.includes('Little lessons'));
      assert.equal(await page.locator('progress').getAttribute('value'),'0','reading does not complete a challenge');
      for(const [index,kind] of learning.CHALLENGES.entries()){
        await page.locator('.lesson-steps button').nth(index+1).click();
        await page.locator('.lesson-tap-hint').waitFor();
        const sample=learning.lessonPosition(id,kind),action=sample.legal[0],unit=engine.pieces(id,sample.state).find(p=>p.source===action.source);
        if(action.kind==='drop')await page.locator('.lesson-hand').click();else await page.locator(`[data-cell="${unit.cell}"]`).click();
        await page.locator(`[data-cell="${action.target}"]`).click();
        await page.locator('.teaching-host.success').waitFor();
        assert.equal(await page.locator('progress').getAttribute('value'),String(index+1));
        const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.how-to-play.v1')));assert.ok(stored[id][kind]>0);
        assert.equal(await page.locator('.lesson-error').count(),0);report.lessons++;
        if(kind==='special'&&['shogi','yanyi','dominion','xiangqi'].includes(id))await capture(`${id}-special`);
      }
      await page.locator('.lesson-steps button').nth(4).click();await page.locator('.ready-checklist').waitFor();
      assert.equal(await page.locator('.ready-checklist .tried').count(),3);assert.equal(await page.locator('.teaching-host [class*=host-abster]').count(),1);
      if(id==='shogi')await capture('ready');
      await nav(1);await page.locator('.piece-description').waitFor();
      for(const [index,[role]] of learning.PIECE_GUIDES[id].entries()){
        await page.locator('.piece-roster button').nth(index).click();await page.locator('.lesson-tap-hint').waitFor();
        const sample=learning.piecePosition(id,role);
        if(sample.legal.length){const a=sample.legal[0],unit=engine.pieces(id,sample.state).find(p=>p.source===a.source);await page.locator(`[data-cell="${unit.cell}"]`).click();await page.locator(`[data-cell="${a.target}"]`).click();await page.locator('.teaching-host.success').waitFor();}
        else assert.match(await page.locator('.lesson-tap-hint').innerText(),/no moves/);
        report.pieceExamples++;
      }
      await capture(`${id}-pieces`);
      await nav(2);await page.locator('.free-board-section').waitFor();
      assert.equal(await page.locator('.suggested-piece').count(),0,'free play never suggests that an arbitrary move is legal');
      assert.match(await page.locator('.free-board-badge').innerText(),/NORMAL MOVE RULES ARE OFF/);
      const units=learning.initialFreeBoard(id),first=units[0],last=units.at(-1);
      await page.getByLabel('Select a free-board piece',{exact:true}).selectOption(first.source);
      await page.getByLabel('Choose a free-board destination',{exact:true}).selectOption(last.cell);
      await page.waitForFunction(({id,pieceId,cell})=>JSON.parse(localStorage.getItem(`arctic-play.v1.free-board.v1.${id}`)).find(p=>p.id===pieceId).cell===cell,{id,pieceId:first.id,cell:last.cell});
      await page.getByRole('button',{name:'Undo',exact:true}).click();
      const reset=await page.evaluate(id=>JSON.parse(localStorage.getItem(`arctic-play.v1.free-board.v1.${id}`)),id);assert.equal(reset.find(p=>p.id===first.id).cell,first.cell);
      await page.getByLabel('Select a free-board piece',{exact:true}).selectOption(first.source);await page.getByRole('button',{name:'Remove',exact:true}).click();
      assert.equal(await page.locator('[data-cell] image').count(),units.length-1);
      await page.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await page.locator('[data-cell] image').count(),units.length);
      if(id==='yanyi')await capture('free-board');
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.how-to-play.v1')));assert.equal(Object.keys(saved[id]).length,3);
      report.freeBoards++;
      await nav(0);
    }
    // Opening teaching from a real practice game must preserve that game.
    await page.getByRole('button',{name:'Back from How to Play'}).click();
    await page.getByRole('button',{name:'Play Shogi',exact:true}).click();await page.locator('.mode-row').filter({hasText:'Pass the phone between players'}).click();
    await page.waitForFunction(()=>document.querySelector('.selection-hint')?.textContent==='Tap a piece to see its legal moves.');
    const prior=await page.evaluate(()=>localStorage.getItem('arctic-play.v1.practice.shogi'));
    await page.getByRole('button',{name:'Match options'}).click();await page.locator('.mode-row').filter({hasText:'Lessons, pieces and a separate free board'}).click();
    await nav(2);await page.getByLabel('Select a free-board piece',{exact:true}).selectOption('piece:blue-lance-0');await page.getByLabel('Choose a free-board destination',{exact:true}).selectOption('80');
    await page.getByRole('button',{name:'Back from How to Play'}).click();await page.locator('.match-header').waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('arctic-play.v1.practice.shogi')),prior);
    report.savedPracticePreserved=true;
    await page.getByRole('button',{name:'Back to games',exact:true}).click();await page.getByRole('button',{name:'Profile',exact:true}).click();
    await page.getByRole('button').filter({hasText:'Mascot companions'}).click();await page.getByRole('radio',{name:/^Off/}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'Games',exact:true}).click();await page.locator('.learning-invitation').click();await page.locator('.lesson-steps button').nth(1).click();await page.locator('.lesson-tap-hint').waitFor();
    assert.equal(await page.locator('.teaching-host .mascot-portrait').count(),0);assert.ok((await page.locator('.teaching-host').innerText()).length>20);
    await capture('mascots-off');report.offPreservesTeaching=true;
    await page.reload();await page.locator('.learning-invitation').click();assert.equal(await page.locator('progress').getAttribute('value'),'3','progress survives reopening');
    await nav(2);await page.getByLabel('Select a free-board piece',{exact:true}).selectOption('piece:blue-lance-0');
    assert.equal(await page.locator('[data-cell="80"]').getAttribute('aria-label').then(s=>s.includes('Lance')),true,'free arrangement survives reopening');
    assert.deepEqual(errors,[]);results.push(report);console.log(JSON.stringify(report));await context.close();
  }
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
}catch(error){await page?.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
