import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FESTIVAL_STICKERS} from '../src/celebration.js';
import {HALL_ORDER} from '../src/gathering.js';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=runtime?require(path.join(runtime,'playwright')):require('../../../frontend/node_modules/playwright');
const sharp=createRequire(path.join(mobile,'../../frontend/package.json'))('sharp');
const output=path.join(mobile,'verification/celebration');await fs.mkdir(output,{recursive:true});
const checks=[],errors=[],browsers=[];const record=s=>{checks.push(s);console.log('PASS',s);};
async function setup(width=390,height=844,theme='dark',off=false){
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath(),args:['--no-sandbox','--no-zygote','--single-process','--disable-gpu','--allow-file-access-from-files']});browsers.push(browser);
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
 await context.addInitScript(({theme,off})=>{localStorage.setItem('arctic-play.v1.theme',JSON.stringify(theme));if(off)localStorage.setItem('arctic-play.v1.mascot-companions',JSON.stringify({mode:'off',guide:'auto',motion:false}));window.__shares=[];window.__failShare=false;window.Android={setDarkTheme(){},appReady(){},sharePostcard:(dataUrl,text)=>{if(window.__failShare)return false;window.__shares.push({dataUrl,text});return true;}};},{theme,off});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(mobile,'android/app/src/main/assets/index.html')).href);await page.locator('.harbor-home').waitFor();return{page,browser};
}
const nav=(page,name)=>page.locator('.bottom-nav').getByRole('button',{name,exact:true}).click();
async function overflow(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('.sheet').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)));}
async function decode(locator){await locator.evaluateAll(async nodes=>Promise.all(nodes.map(async i=>{await i.decode();if(!i.naturalWidth)throw Error('Empty image: '+i.src);})) );}
const close=page=>page.locator('.sheet>header').getByRole('button',{name:'Close',exact:true}).click();
async function album(page){await nav(page,'Profile');await page.locator('.profile-options>button').filter({hasText:'Festival stickers'}).click();await page.locator('.festival-sticker-album').waitFor();}
try{
 for(const theme of ['dark','light'])for(const [width,height]of[[320,640],[390,844],[800,360]]){
  const{page,browser}=await setup(width,height,theme);await decode(page.locator('.harbor-panorama img'));assert.equal(await page.locator('.home-motto').innerText(),'Remarkable games. An endless celebration.');await overflow(page);
  await nav(page,'Games');for(const id of HALL_ORDER){const card=page.locator(`.hall-card[data-hall="${id}"]`);await card.scrollIntoViewIfNeeded();await decode(card.locator('.cover-art img'));}await overflow(page);
  record(`${theme} ${width}×${height}: celebration Home, seven illustrated cards and genuine boards decode`);
  await album(page);assert.equal(await page.locator('.festival-sticker-grid button').count(),12);
  for(const s of FESTIVAL_STICKERS){await page.getByRole('button',{name:`Preview ${s.host[0].toUpperCase()+s.host.slice(1)}: ${s.label}`,exact:true}).click();await page.waitForFunction(()=>document.querySelector('.sticker-preview img')?.complete);await decode(page.locator('.sticker-preview img'));await overflow(page);}
  for(const name of ['Polly','Retsba','Pengu','Abster']){await page.getByRole('group',{name:'Sticker host'}).getByRole('button',{name,exact:true}).click();assert.equal(await page.locator('.festival-sticker-grid button').count(),3);}
  await page.getByRole('group',{name:'Sticker host'}).getByRole('button',{name:'All',exact:true}).click();await page.screenshot({path:path.join(output,`stickers-${theme}-${width}.png`),fullPage:false});await overflow(page);
  record(`${theme} ${width}×${height}: twelve free sticker previews, host filters and contained layout`);
  await close(page);await nav(page,'Friends');await decode(page.locator('.festival-friends-banner'));await overflow(page);await nav(page,'Chats');await decode(page.locator('.festival-friends-banner'));await overflow(page);await browser.close();
 }
 const{page,browser}=await setup();await album(page);await page.getByRole('button',{name:'Share this sticker',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.festival-sticker-album>.primary').disabled);
 await page.evaluate(()=>window.__failShare=true);await page.getByRole('button',{name:'Share this sticker',exact:true}).click();await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/could not be prepared/);await page.evaluate(()=>window.__failShare=false);await page.getByRole('button',{name:'Share this sticker',exact:true}).click();
 const url=await page.evaluate(()=>window.__shares[0].dataUrl);const{data,info}=await sharp(Buffer.from(url.split(',')[1],'base64')).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,1024);assert.equal(info.height,1024);for(const[x,y]of[[0,0],[1023,0],[0,1023],[1023,1023]])assert.equal(data[(y*1024+x)*4+3],0);record('Sticker sharing exports a real transparent PNG and recovers after a failed native share');
 await close(page);await nav(page,'Games');
 for(const id of HALL_ORDER){await page.locator(`.hall-card[data-hall="${id}"] .hall-explore`).click();await decode(page.locator('.hall-door-art img'));await overflow(page);await close(page);}record('All seven hall pages render their own story scene and native board preview');
 await page.locator('.hall-play-now').first().click();await page.locator('.match-header').waitFor();await page.getByRole('button',{name:'Open table chat',exact:true}).click();await page.getByText('Festival stickers · 12 free',{exact:true}).click();assert.equal(await page.locator('.festival-sticker-picker button').count(),12);await page.getByRole('button',{name:'Send Retsba: Good game!',exact:true}).click();await page.locator('.festival-reaction img').waitFor();await decode(page.locator('.festival-reaction img'));assert.equal(await page.locator('.festival-reaction span').innerText(),'Good game!');await page.screenshot({path:path.join(output,'table-sticker.png'),fullPage:false});record('Table notes send and display a free illustrated reaction using the existing readable-text flow');
 await close(page);await page.getByRole('button',{name:'Back to games',exact:true}).click();await nav(page,'Profile');await page.locator('.profile-options>button').filter({hasText:'The Eternal Gathering'}).click();await page.getByRole('switch',{name:/Antarctic stories/}).click();await close(page);await album(page);assert.equal(await page.locator('.festival-sticker-grid button').count(),12);record('The free sticker album remains available with stories turned off');await browser.close();
 const off=await setup(320,640,'dark',true);await album(off.page);assert.equal(await off.page.locator('.festival-sticker-album img').count(),0);assert.equal(await off.page.locator('.festival-sticker-grid button').count(),12);await overflow(off.page);record('Mascot Off preserves readable labels and sharing controls without sticker portraits');await off.browser.close();
 assert.deepEqual(errors,[]);record('No browser runtime errors');await fs.writeFile(path.join(output,'browser-art-and-stickers.json'),JSON.stringify({passed:checks.length,checks,errors,scope:'Desktop Chromium, emulated viewport and native share bridge. No physical Android installation or live network rooms.'},null,2)+'\n');
}finally{for(const browser of browsers)await browser.close().catch(()=>{});}
