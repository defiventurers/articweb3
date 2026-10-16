import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(mobile,'../../frontend/package.json'));
const {chromium}=require('@playwright/test');
const assets=path.join(mobile,'android/app/src/main/assets'),output=path.join(mobile,'build/companion-qa');await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{
  try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';const file=path.resolve(assets,relative);if(!file.startsWith(assets+path.sep))throw new Error('Invalid path');const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':'image/webp');res.end(bytes);}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const results=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  for(const [width,height] of [[320,640],[360,800],[412,915],[800,360]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await context.addInitScript(()=>{localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'companion-phone',name:'Snow Friend',avatar:'blue'}));window.Android={setDarkTheme(){},appReady(){}};});
    const label=`${width}x${height}`,capture=async name=>{await page.screenshot({path:path.join(output,`${label}-${name}.png`),animations:'disabled'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} ${name}: horizontal overflow`);};
    await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('.companion-dock').waitFor();await capture('games');
    assert.notEqual(await page.locator('.companion-dock .mascot-portrait img').evaluate(node=>getComputedStyle(node).animationName),'none');
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.companion-dock .mascot-portrait img').evaluate(node=>getComputedStyle(node).animationName),'none');
    await page.locator('.companion-main').click();assert.equal(await page.locator('.camp-roster button').count(),4);
    for(const name of ['Polly','Retsba','Pengu','Abster']){
      await page.locator('.camp-roster').getByRole('button',{name:`Meet ${name}`,exact:true}).click();await page.getByRole('button',{name:'Say hello',exact:true}).click();assert.equal(await page.locator('.camp-identity h3').innerText(),name);await page.getByRole('button',{name:'High five!',exact:true}).click();await page.locator('.camp-stage .mood-celebrate').waitFor();
    }
    await page.locator('.camp-roster').getByRole('button',{name:'Meet Retsba',exact:true}).click();await page.getByRole('button',{name:'Keep Retsba beside me',exact:true}).click();
    await page.locator('.camp-stage').scrollIntoViewIfNeeded();await capture('camp');
    await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Talk with Retsba',exact:true}).waitFor();
    await page.getByRole('button',{name:'Mascot settings',exact:true}).click();await page.getByRole('radio',{name:/Quiet/}).click();await page.getByRole('switch',{name:'Mascot motion',exact:true}).click();await capture('settings');
    await page.getByRole('button',{name:'Close',exact:true}).click();assert.match(await page.locator('.companion-line').innerText(),/Quiet company/);
    await page.getByRole('button',{name:'Play Shogi',exact:true}).click();await page.getByRole('button',{name:/On this phone/ }).click();await page.locator('.selection-hint').filter({hasText:'Tap a piece'}).waitFor();
    await page.locator('.companion-dock').scrollIntoViewIfNeeded();await capture('match');assert.equal(await page.locator('.match-board-wrap .companion-dock').count(),0);
    const saved=await page.evaluate(()=>localStorage.getItem('arctic-play.v1.practice.shogi'));
    await page.getByRole('button',{name:'Talk with Retsba',exact:true}).click();await page.getByRole('button',{name:'Take a breath',exact:true}).click();await page.locator('.camp-stage .mood-calm').waitFor();await page.getByRole('button',{name:'Close',exact:true}).click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('arctic-play.v1.practice.shogi')),saved);assert.equal(await page.locator('[data-cell]').count(),81);
    await page.getByRole('button',{name:'Mascot settings',exact:true}).click();await page.getByRole('radio',{name:/^Off/}).click();await page.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await page.locator('.companion-dock').count(),0);
    await page.reload();await page.locator('.games-grid').waitFor();assert.equal(await page.locator('.companion-dock').count(),0);
    await page.getByRole('button',{name:'Profile',exact:true}).click();await page.locator('.profile-options button').filter({hasText:'Mascot companions'}).click();assert.equal(await page.getByRole('radio',{name:/^Off/}).getAttribute('aria-checked'),'true');
    await page.getByRole('radio',{name:/Lively/}).click();await page.getByRole('button',{name:'Close',exact:true}).click();await page.locator('.companion-dock').waitFor();
    assert.deepEqual(errors,[]);results.push({viewport:label,allFourInteractive:true,preferredGuide:true,quietMode:true,offPersists:true,motionToggle:true,reducedMotion:true,boardPreserved:true,horizontalOverflow:false,pageErrors:errors});await context.close();
  }
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
