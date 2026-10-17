import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.resolve(mobile,'../../frontend/package.json'));
const {chromium}=require('@playwright/test'),engine=createRequire(import.meta.url)(path.join(mobile,'build/games.cjs')),learning=createRequire(import.meta.url)(path.join(mobile,'build/learning.cjs'));
const assets=path.join(mobile,'android/app/src/main/assets'),output=path.join(mobile,'build/pocket-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html',file=path.resolve(assets,relative);if(!file.startsWith(assets+path.sep))throw Error('Invalid path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':'image/webp');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,page;const reports=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  for(const [width,height] of [[320,640],[360,800],[412,915],[800,360]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),errors=[];
    await context.addInitScript(()=>{window.Android={setDarkTheme(){},appReady(){}};localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'pocket-check',name:'Explorer',avatar:'blue'}));});
    page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const label=`${width}x${height}`,capture=async(name,locator)=>{if(locator)await locator.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${label}-${name}.png`),animations:'disabled'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label}: ${name} overflow`);};
    await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('.game-card').last().waitFor();
    let checked=0;
    for(const g of engine.GAME_LIST){
      await page.getByRole('button',{name:`Play ${g.name}`,exact:true}).click();await page.getByRole('button',{name:'Read the rules',exact:true}).click();
      const rule=page.locator('.friendly-rulebook');await rule.waitFor();
      assert.equal(await rule.locator('.rule-tabs [aria-pressed=true]').innerText(),'Quick guide');
      assert.match(await rule.locator('.pocket-goal').innerText(),new RegExp(learning.LESSONS[g.id].goal.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
      assert.equal(await rule.locator('.turn-recipe li').count(),3);
      assert.match(await rule.locator('.pocket-hero img').getAttribute('src'),/hosts-cute-v3/);
      await capture(`${g.id}-quick`,rule.locator('.pocket-goal'));
      await rule.getByRole('button',{name:'Full rules',exact:true}).click();assert.equal(await rule.locator('.rule-chapters>details').count(),engine.RULES[g.id].length);
      const query=rule.getByRole('textbox',{name:'Find a rule'});await query.fill('capture');
      const expected=engine.RULES[g.id].filter(c=>[c.title,...c.paragraphs].join(' ').toLowerCase().includes('capture'));
      assert.equal(await rule.locator('.rule-chapters>details').count(),expected.length);
      for(const [i,c] of expected.entries())for(const paragraph of c.paragraphs)assert.ok((await rule.locator('.rule-chapters>details').nth(i).innerText()).includes(paragraph),'full paragraph retained');
      await capture(`${g.id}-search`,query);await query.fill('no-such-rule-987');await rule.locator('.rule-no-results').waitFor();
      await rule.getByRole('button',{name:'Show all chapters'}).click();assert.equal(await rule.locator('.rule-chapters>details').count(),engine.RULES[g.id].length);
      await rule.getByRole('button',{name:'Pieces',exact:true}).click();assert.equal(await rule.locator('.pocket-piece').count(),learning.PIECE_GUIDES[g.id].length);
      const [role,name]=learning.PIECE_GUIDES[g.id][2];await rule.getByRole('button',{name:`Try ${name}`,exact:true}).click();await page.locator('.lesson-tap-hint').waitFor();
      assert.equal(await page.locator('.piece-roster button[aria-pressed=true]').innerText(),name);assert.equal(await page.locator('.academy-tabs [aria-current=page]').innerText(),'Pieces');
      await page.getByRole('button',{name:'Back from How to Play'}).click();checked++;
    }
    await page.locator('.learning-invitation').click();await page.locator('.academy-tabs').getByRole('button',{name:'Warm-up',exact:true}).click();await page.locator('.teaching-host').waitFor();assert.equal(await page.locator('.school-friends img').count(),4);
    assert.ok(await page.locator('.lesson-steps button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})),'all five lesson steps fit');
    await page.getByRole('button',{name:'Flipper five with Polly',exact:true}).click();await page.locator('.mentor-response').filter({hasText:'Flippers up!'}).waitFor();
    await page.getByRole('button',{name:'A tiny tip',exact:true}).click();assert.equal(await page.locator('progress').getAttribute('value'),'0');assert.equal(await page.locator('.curious-flipper').count(),0);
    await capture('mascot-tips',page.locator('.teaching-host'));
    await page.locator('.lesson-steps button').nth(1).click();await page.locator('.lesson-tap-hint').waitFor();
    const practice=await page.evaluate(()=>localStorage.getItem('arctic-play.v1.practice.dominion'));
    await page.getByRole('button',{name:'Ask Pengu for a tiny tip',exact:true}).click();await page.locator('.mentor-response').waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('arctic-play.v1.practice.dominion')),practice);
    assert.equal(await page.locator('progress').getAttribute('value'),'0');await capture('lesson',page.locator('.teaching-host'));
    await page.getByRole('button',{name:'Back from How to Play'}).click();
    await page.locator('.companion-main').click();await page.getByRole('button',{name:'Learn together',exact:true}).click();await page.locator('.how-to-play').waitFor();await page.getByRole('button',{name:'Back from How to Play'}).click();
    await page.getByRole('button',{name:'Profile',exact:true}).click();await page.getByRole('switch',{name:'Dark mode',exact:true}).click();await page.getByRole('button',{name:'Games',exact:true}).click();
    await page.getByRole('button',{name:'Play Xiangqi',exact:true}).click();await page.getByRole('button',{name:'Read the rules',exact:true}).click();await capture('light-rules',page.locator('.friendly-rulebook'));
    await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Profile',exact:true}).click();await page.locator('.profile-options button').filter({hasText:'Mascot companions'}).click();await page.getByRole('radio',{name:/^Off/}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'Games',exact:true}).click();await page.getByRole('button',{name:'Play Xiangqi',exact:true}).click();await page.getByRole('button',{name:'Read the rules',exact:true}).click();assert.equal(await page.locator('.pocket-hero .mascot-portrait').count(),0);assert.equal(await page.locator('.turn-recipe li').count(),3);
    assert.deepEqual(errors,[]);const report={viewport:label,allSevenRulebooks:checked,searchAndFullText:true,pieceToLessonLinks:true,allFiveStepsVisible:true,manualMascotTips:true,noFalseCompletion:true,lightMode:true,offKeepsRules:true,pageErrors:errors};reports.push(report);console.log(JSON.stringify(report));await context.close();
  }
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(reports,null,2)+'\n');
}catch(e){await page?.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw e;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
