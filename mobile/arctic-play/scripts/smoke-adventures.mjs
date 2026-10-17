import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.resolve(mobile,'../../frontend/package.json'));
const {chromium}=require('@playwright/test'),e=createRequire(import.meta.url)(path.join(mobile,'build/games.cjs')),a=createRequire(import.meta.url)(path.join(mobile,'build/adventures.cjs'));
const assets=path.join(mobile,'android/app/src/main/assets'),output=path.join(mobile,'build/adventure-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html',file=path.resolve(assets,relative);if(!file.startsWith(assets+path.sep))throw Error('Invalid path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':'image/webp');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,page;const reports=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  for(const [width,height] of [[320,640],[360,800],[412,915],[800,360]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),errors=[];
    const practice=e.create('shogi');
    await context.addInitScript(practice=>{window.Android={setDarkTheme(){},appReady(){}};if(!localStorage.getItem('arctic-play.v1.profile'))localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'adventure-check',name:'Explorer',avatar:'blue'}));if(!localStorage.getItem('arctic-play.v1.practice.shogi'))localStorage.setItem('arctic-play.v1.practice.shogi',JSON.stringify({state:practice,history:[],mode:'local',humans:['red','blue']}));},practice);
    page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));const label=`${width}x${height}`,report={viewport:label,discoveries:0,comparisonSetups:0,watchDoesNotEarnStamps:true,ruleLabs:0,errors};
    const stored=()=>page.evaluate(()=>localStorage.getItem('arctic-play.v1.little-adventures.v1'));
    const ready=async(root,key,variant)=>{await root.locator('.discovery-board').waitFor();await page.waitForFunction(({node,key,variant})=>node?.dataset.ready==='true'&&node.dataset.mission===key&&(!variant||node.dataset.variant===variant),{node:await root.elementHandle(),key,variant});};
    const capture=async(name,locator)=>{if(locator)await locator.scrollIntoViewIfNeeded();await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode().catch(()=>{}))));await page.screenshot({path:path.join(output,`${label}-${name}.png`),animations:'disabled'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label}/${name}: no horizontal overflow`);};
    await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('.game-card').last().waitFor();const savedPractice=await page.evaluate(()=>localStorage.getItem('arctic-play.v1.practice.shogi'));
    await page.locator('.learning-invitation').click();assert.equal(await page.locator('.academy-tabs [aria-current=page]').innerText(),'My adventure');await capture('welcome');
    for(const {id} of e.GAME_LIST){
      await page.locator('#learning-game').selectOption(id);const root=page.locator('.game-adventure');let first=true;
      for(const [i,m] of a.ADVENTURES[id].missions.entries()){
        await root.locator('.discovery-map button').nth(i).click();await ready(root,m.key);
        assert.equal(await root.locator('.discovery-heading h3').innerText(),m.title);const before=await stored();
        // A portrait tip and each comparison are learner-directed, never progress.
        await root.locator('.mentor-touch').click();await root.locator('.mentor-response').waitFor();assert.equal(await stored(),before);
        for(const [variant] of m.variants||[['default']]){
          if(m.variants)await root.locator('.discovery-variants button').nth(m.variants.findIndex(v=>v[0]===variant)).click();await ready(root,m.key,variant);
          const p=a.adventurePosition(id,m.key,variant);assert.equal(await stored(),before,'a setup switch cannot award a stamp');report.comparisonSetups++;
          if(!p.legal.length){assert.equal(await root.getByRole('button',{name:'Watch once',exact:true}).count(),0);assert.match(await root.locator('.discovery-cue').innerText(),/unavailable/);const focusCell=e.pieces(id,p.state).find(piece=>piece.source===p.focus)?.cell,marker=p.notice?.find(n=>n.cell!==focusCell);if(marker){await root.locator(`[data-cell="${marker.cell}"]`).click();await root.locator('.discovery-feedback').waitFor();assert.equal(await stored(),before);}}
        }
        const variant=(m.variants||[['default']]).find(([v])=>a.adventurePosition(id,m.key,v).legal.length)[0];
        if(m.variants)await root.locator('.discovery-variants button').nth(m.variants.findIndex(v=>v[0]===variant)).click();await ready(root,m.key,variant);
        if(first){
          await root.getByRole('button',{name:'Watch once',exact:true}).click();await root.locator('.discovery-demo').waitFor();
          if(m.key==='two-dice'){await root.getByRole('button',{name:'Next demo move'}).click();await page.waitForFunction(()=>document.querySelector('.game-adventure').dataset.complete==='true');}
          assert.equal(await stored(),before,'watching never earns a stamp');await capture(`${id}-demo`,root.locator('.discovery-demo'));
          await root.getByRole('button',{name:'Now my turn',exact:true}).click();await ready(root,m.key,variant);assert.equal(await root.getAttribute('data-stage'),'0');first=false;
        }
        let p=a.adventurePosition(id,m.key,variant);const ids=[];
        while(!p.complete){
          const action=p.legal[0],piece=e.pieces(id,p.state).find(p=>p.source===action.source);
          if(action.kind==='drop')await root.locator('.lesson-hand').click();else if(id==='shogi'&&i===0){await root.locator(`[data-cell="${piece.cell}"]`).focus();await page.keyboard.press('Enter');}else await root.locator(`[data-cell="${piece.cell}"]`).click();
          if(id==='shogi'&&i===0){await root.locator(`[data-cell="${action.target}"]`).focus();await page.keyboard.press('Enter');}else await root.locator(`[data-cell="${action.target}"]`).click();
          ids.push(action.id);p=a.adventurePosition(id,m.key,variant,ids);
          await page.waitForFunction(stage=>Number(document.querySelector('.game-adventure').dataset.stage)===stage,p.stage);
          if(!p.complete)assert.equal(await stored(),before,'a half-finished dice turn earns no stamp');
        }
        await root.locator('.discovery-result').waitFor();const progress=JSON.parse(await stored());assert.ok(progress[id][m.key]>0);assert.equal(Object.keys(progress[id]).length,i+1);report.discoveries++;
        assert.equal(await root.locator('.lesson-error').count(),0);await capture(`${id}-${m.key}`,root.locator('.discovery-result'));
      }
      await root.locator('.adventure-keepsake').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('arctic-play.v1.practice.shogi')),savedPractice);
    }
    await page.getByRole('button',{name:'Back from How to Play'}).click();
    for(const {id,name} of e.GAME_LIST){
      await page.getByRole('button',{name:`Play ${name}`,exact:true}).click();await page.getByRole('button',{name:'Read the rules',exact:true}).click();const rule=page.locator('.friendly-rulebook');
      assert.equal(await rule.locator('.pocket-discoveries button').count(),4);const m=a.ADVENTURES[id].missions[1];await rule.locator('.pocket-discoveries button').nth(1).click();const root=rule.locator('.game-adventure');await ready(root,m.key);assert.equal(await rule.locator('.rule-tabs [aria-pressed=true]').innerText(),'Try a rule');assert.equal(await root.locator('.discovery-heading h3').innerText(),m.title);
      await capture(`${id}-rule-lab`,root.locator('.discovery-heading'));await rule.getByRole('button',{name:'Full rules',exact:true}).click();assert.equal(await rule.locator('.rule-chapters>details').count(),e.RULES[id].length);await rule.getByRole('button',{name:'Try a rule',exact:true}).click();await rule.locator('.discovery-map button').nth(2).click();await ready(rule.locator('.game-adventure'),a.ADVENTURES[id].missions[2].key);await rule.getByRole('button',{name:'Open my full adventure'}).click();await ready(page.locator('.how-to-play>.academy-content>.game-adventure'),a.ADVENTURES[id].missions[2].key);await page.getByRole('button',{name:'Back from How to Play'}).click();report.ruleLabs++;
    }
    await page.reload();await page.locator('.learning-invitation').click();await ready(page.locator('.game-adventure'),a.ADVENTURES.shogi.missions[0].key);assert.match(await page.locator('.adventure-progress').innerText(),/4 of 4/);report.savedStampsPersist=true;
    // A rule lab and the main adventure can be open together; both counters
    // must update after a real move, without waiting for a screen reload.
    await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('arctic-play.v1.little-adventures.v1'));delete data.shogi['king-shelter'];localStorage.setItem('arctic-play.v1.little-adventures.v1',JSON.stringify(data));window.dispatchEvent(new Event('arctic-adventure-progress'));});
    const main=page.locator('.how-to-play>.academy-content>.game-adventure');await page.waitForFunction(()=>document.querySelector('.academy-content>.game-adventure .adventure-progress').textContent.includes('3 of 4'));
    await page.locator('.school-pocket-rules>summary').click();const nested=page.locator('.school-pocket-rules .friendly-rulebook');await nested.getByRole('button',{name:'Try a rule',exact:true}).click();const lab=nested.locator('.game-adventure');await ready(lab,'king-shelter');const p=a.adventurePosition('shogi','king-shelter'),action=p.legal[0],unit=e.pieces('shogi',p.state).find(p=>p.source===action.source);await lab.locator(`[data-cell="${unit.cell}"]`).click();await lab.locator(`[data-cell="${action.target}"]`).click();await lab.locator('.discovery-result').waitFor();assert.match(await main.locator('.adventure-progress').innerText(),/4 of 4/);assert.match(await lab.locator('.adventure-progress').innerText(),/4 of 4/);report.simultaneousRuleProgress=true;report.currentSceneDeepLinks=true;
    await page.getByRole('button',{name:'Back from How to Play'}).click();await page.getByRole('button',{name:'Play Shogi',exact:true}).click();await page.locator('.mode-row').filter({hasText:'Pass the phone between players'}).click();await page.locator('.match-header').waitFor();const realPractice=await page.evaluate(()=>localStorage.getItem('arctic-play.v1.practice.shogi'));
    await page.getByRole('button',{name:'Match options'}).click();await page.locator('.mode-row').filter({hasText:'Lessons, pieces and a separate free board'}).click();await ready(page.locator('.game-adventure'),a.ADVENTURES.shogi.missions[0].key);await page.locator('.game-adventure').getByRole('button',{name:'Watch once',exact:true}).click();await page.locator('.discovery-demo').waitFor();await page.getByRole('button',{name:'Back from How to Play'}).click();await page.locator('.match-header').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('arctic-play.v1.practice.shogi')),realPractice);report.realPracticePreserved=true;
    await page.getByRole('button',{name:'Back to games',exact:true}).click();await page.getByRole('button',{name:'Profile',exact:true}).click();await page.getByRole('switch',{name:'Dark mode',exact:true}).click();await page.getByRole('button',{name:'Games',exact:true}).click();await page.locator('.learning-invitation').click();await ready(page.locator('.game-adventure'),'pawn-catch');await capture('light-adventure',page.locator('.discovery-heading'));report.lightMode=true;
    await page.getByRole('button',{name:'Back from How to Play'}).click();await page.getByRole('button',{name:'Profile',exact:true}).click();await page.locator('.profile-options button').filter({hasText:'Mascot companions'}).click();await page.getByRole('radio',{name:/^Off/}).click();await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Games',exact:true}).click();await page.locator('.learning-invitation').click();await ready(page.locator('.game-adventure'),'pawn-catch');assert.equal(await page.locator('.game-adventure .mascot-portrait').count(),0);await page.locator('.game-adventure').getByRole('button',{name:'A little nudge',exact:true}).click();await page.locator('.discovery-feedback').waitFor();await capture('mascots-off',page.locator('.discovery-heading'));report.offKeepsTeaching=true;
    assert.deepEqual(errors,[]);reports.push(report);console.log(JSON.stringify(report));await context.close();
  }
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(reports,null,2)+'\n');
}catch(error){await page?.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
