import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {HALL_ORDER,HALLS,GATHERING_KEY,REVEAL} from '../src/gathering.js';
const here=path.dirname(fileURLToPath(import.meta.url)),mobile=path.resolve(here,'..');
const require=createRequire(import.meta.url),runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=runtime?require(path.join(runtime,'playwright')):require('../../../frontend/node_modules/playwright');
const adventure=require('../build/adventures.cjs'),engine=require('../build/games.cjs'),minimal=require('../build/minimalLearning.cjs');
const url=pathToFileURL(path.join(mobile,'android/app/src/main/assets/index.html')).href;
const output=path.resolve(process.env.GATHERING_QA_DIR||path.join(mobile,'verification/gathering'));await fs.mkdir(output,{recursive:true});
const checks=[],errors=[],performanceSamples=[],scope=process.env.GATHERING_QA_SCOPE||'all';
const browsers=[];
const browserOptions={headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath(),args:['--no-sandbox','--no-zygote','--single-process','--disable-gpu','--allow-file-access-from-files']};
const record=name=>{checks.push(name);console.log('PASS',name);};
async function setup(width=390,height=844,theme='dark'){
  const browser=await chromium.launch(browserOptions);browsers.push(browser);
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await context.addInitScript(({theme})=>{
    if(location.protocol!=='file:')return;
    if(!localStorage.getItem('arctic-play.v1.theme'))localStorage.setItem('arctic-play.v1.theme',JSON.stringify(theme));
    window.__shares=[];window.__sounds=0;
    const Audio=window.AudioContext;if(Audio)window.AudioContext=class extends Audio{constructor(...args){super(...args);window.__sounds++;}};
    window.Android={setDarkTheme(){},appReady(){},shareText:(title,text)=>window.__shares.push({title,text}),sharePostcard:(dataUrl,text)=>{window.__shares.push({dataUrl,text});return true;}};
  },{theme});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);await page.locator('.harbor-home').waitFor();return{context,page};
}
async function stable(page){await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity&&a.effect?.getTiming().duration<700).map(a=>a.finished.catch(()=>{})));await Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).map(i=>i.decode().catch(()=>{})));});}
async function noOverflow(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),await page.title());}
async function nav(page,label){await page.locator('.bottom-nav').getByRole('button',{name:label,exact:true}).click();await stable(page);}
async function closeSheet(page){for(let n=0;n<4&&await page.locator('.sheet').count();n++){await page.locator('.sheet>header').getByRole('button',{name:'Close',exact:true}).click();await stable(page);}await page.locator('.sheet').waitFor({state:'detached'});}
async function shot(page,name){await stable(page);await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});}
async function lanterns(page){return page.evaluate(key=>{const p=JSON.parse(localStorage.getItem('arctic-play.v1.'+key)||'{}');return Object.values(p.halls||{}).filter(h=>h.learnedAt).length;},GATHERING_KEY);}
try{
 if(scope!=='story')for(const theme of ['dark','light'])for(const [width,height] of [[320,640],[390,844],[834,1112],[800,360]]){
  const {context,page}=await setup(width,height,theme);await stable(page);await noOverflow(page);
  assert.equal(await page.locator('.harbor-panorama img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
  if(height>500){const bottom=await page.locator('.home-play-actions>.primary').evaluate(b=>b.getBoundingClientRect().bottom);assert.ok(bottom<height-60,`${width}: primary Home action visible above navigation (${bottom})`);}
  performanceSamples.push({theme,width,height,...await page.evaluate(()=>({navigationMs:performance.getEntriesByType('navigation')[0]?.duration,firstContentfulPaintMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,jsHeapBytes:performance.memory?.usedJSHeapSize}))});
  await shot(page,`home-${theme}-${width}`);record(`${theme} ${width}×${height}: Harbor artwork, main action and layout`);
  await nav(page,'Games');assert.equal(await page.locator('.hall-card').count(),7);
  for(const card of await page.locator('.hall-card').all()){await card.scrollIntoViewIfNeeded();await card.locator('.cover-hero').evaluate(i=>i.decode());assert.equal(await card.locator('.cover-hero').evaluate(i=>i.naturalWidth>0),true);}
  await noOverflow(page);await page.locator('.hall-card').first().scrollIntoViewIfNeeded();await shot(page,`halls-${theme}-${width}`);
  const primary=page.locator('.hall-play-now').first();assert.ok((await primary.boundingBox()).height>=44);await primary.click();await page.locator('.match-header').waitFor();await noOverflow(page);assert.equal(await page.locator('[data-cell]').count(),81);record(`${theme} ${width}×${height}: seven decoded hall cards and direct play`);
  await page.getByRole('button',{name:'Back to games',exact:true}).click();await nav(page,'Friends');await noOverflow(page);await page.getByRole('button',{name:'Create a hall invitation',exact:true}).click();assert.equal(await page.locator('.sheet .invite-piece').count(),7);await noOverflow(page);await closeSheet(page);await nav(page,'Chats');await noOverflow(page);await nav(page,'Profile');await noOverflow(page);assert.equal(await page.locator('.passport-stamp').count(),7);record(`${theme} ${width}×${height}: invitations, Campfires and Passport layout`);
  await context.close();await browsers.at(-1).close().catch(()=>{});
 }
 if(scope!=='layout'){
 const {context,page}=await setup();
 await nav(page,'Games');
 for(const id of HALL_ORDER){await page.locator(`[data-hall="${id}"] .hall-play-now`).click();await page.locator('.match-header').waitFor();assert.equal(await page.locator('.match-header h1').innerText(),engine.game(id).name);assert.equal(await page.locator('[data-cell]').count(),engine.board(id).cells.length);await page.getByRole('button',{name:'Back to games',exact:true}).click();await nav(page,'Games');}
 record('All seven direct-play buttons open the correct board and engine');
 await nav(page,'Home');
 await page.getByRole('button',{name:/25-second invitation/}).click();await stable(page);assert.equal(await page.getByRole('button',{name:'Pause',exact:true}).count(),0,'reduced motion does not start the timed vignette');
 await page.getByText('Read the complete narration',{exact:true}).click();assert.match(await page.locator('.opening-story').innerText(),/Some are centuries old/);await page.getByRole('button',{name:'Opening scene 4',exact:true}).click();await shot(page,'opening-cast');await page.getByRole('button',{name:'Skip intro',exact:true}).click();assert.equal(await page.evaluate(()=>window.__sounds),0);record('Optional opening: complete narration, manual scenes, Skip, reduced motion and no autoplay audio');
 await nav(page,'Games');
 for(const id of HALL_ORDER){await page.locator(`[data-hall="${id}"] .hall-explore`).click();await stable(page);assert.match(await page.locator('.hall-name').innerText(),new RegExp(HALLS[id].name));await noOverflow(page);await closeSheet(page);}
 assert.equal(await lanterns(page),0);record('Reading all seven stories records visits but earns no lantern');
 for(const id of HALL_ORDER){
  await page.locator(`[data-hall="${id}"] .hall-explore`).click();await page.locator('.hall-challenge').first().click();
  const mission=HALLS[id].challenges[0].mission,variant=minimal.preferredSetup(id,mission);
  await page.locator('[data-testid="game-adventure"][data-ready="true"]').waitFor();
  if(id==='xiangqi'){
   await page.getByRole('button',{name:'Need help?',exact:true}).click();await page.getByRole('button',{name:'Watch once',exact:true}).click();await page.locator('[data-watching="true"][data-complete="true"]').waitFor();assert.equal(await lanterns(page),0);
   await page.getByRole('button',{name:'Now my turn',exact:true}).click();await page.locator('[data-ready="true"][data-watching="false"]').waitFor();record('Watching a canonical Cannon demonstration does not award a story lantern');
  }
  let path=[],p=adventure.adventurePosition(id,mission,variant);
  while(!p.complete){const a=p.legal[0];if(p.focus.startsWith('hand:'))await page.locator('.lesson-hand').click();else{const unit=engine.pieces(id,p.state).find(u=>u.source===a.source);await page.locator(`.story-adventure [data-cell="${unit.cell}"]`).press('Enter');}
   await page.locator(`.story-adventure [data-cell="${a.target}"]`).press('Enter');path.push(a.id);p=adventure.adventurePosition(id,mission,variant,path);await page.locator(`[data-stage="${p.stage}"]`).waitFor();}
  await page.locator('[data-complete="true"][data-watching="false"]').waitFor();assert.equal(await lanterns(page),HALL_ORDER.indexOf(id)+1);await noOverflow(page);await shot(page,`challenge-${id}-complete`);record(`${id}: real legal challenge earns its persistent lantern`);
  if(id==='shogi'){
   await page.getByTestId('game-adventure').getByRole('button',{name:'Back to hall',exact:true}).click();await page.getByRole('button',{name:'Preview your postcard',exact:true}).click();await page.getByRole('button',{name:'Share this postcard',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.postcard-view .primary')?.disabled);await shot(page,'shogi-postcard');await page.getByRole('button',{name:'Share this postcard',exact:true}).click();assert.ok(await page.evaluate(()=>window.__shares.some(s=>s.dataUrl?.startsWith('data:image/png;base64,')&&s.text.includes('Shogi'))));await closeSheet(page);
  }else{await page.getByTestId('game-adventure').getByRole('button',{name:'Back to hall',exact:true}).click();await closeSheet(page);}
 }
 await page.reload();await page.locator('.harbor-home').waitFor();assert.equal(await lanterns(page),7);await page.locator('.home-passport-link').click();await page.getByRole('button',{name:'Gather at the table',exact:true}).click();
 for(let i=0;i<REVEAL.length;i++)await page.getByRole('button',{name:i===REVEAL.length-1?'Light your lantern':'Continue',exact:true}).click();
 assert.ok(await page.evaluate(key=>JSON.parse(localStorage.getItem('arctic-play.v1.'+key)).revealedAt,GATHERING_KEY));await shot(page,'eighth-lantern-reveal');record('All seven lanterns survive reopening; the complete Eighth Lantern reveal persists');
 await page.getByRole('button',{name:'Preview your keepsake',exact:true}).click();console.log('STEP Gathering Guest postcard opened');await page.waitForFunction(()=>document.querySelector('.postcard-view .primary')?.disabled===false,null,{timeout:8000});console.log('STEP Gathering Guest postcard ready');await page.getByRole('button',{name:'Share this postcard',exact:true}).click();assert.ok(await page.evaluate(()=>window.__shares.some(s=>s.dataUrl?.length>1000&&s.text.includes('Gathering Guest'))));await closeSheet(page);record('Hall and Gathering Guest postcards render and reach the native sharing bridge');
 await page.locator('.home-camp-entry').click();await page.getByRole('button',{name:'Make Camp yours',exact:true}).click();await page.getByLabel('left Camp decoration',{exact:true}).selectOption('guest-lantern');await page.getByRole('button',{name:'Save my Camp',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('arctic-play.v1.collection-appearance')).decorations.left),'guest-lantern');await closeSheet(page);record('Earned Eighth Lantern decor saves in Camp without a purchase');
 await nav(page,'Profile');await page.locator('.profile-options>button').filter({hasText:'The Eternal Gathering'}).click();await page.getByRole('switch',{name:/Antarctic stories/}).click();await closeSheet(page);await nav(page,'Home');assert.equal(await page.locator('.harbor-story-links').count(),0);await nav(page,'Games');assert.equal(await page.locator('.game-card').count(),7);assert.equal(await page.locator('.hall-explore').count(),0);assert.equal(await lanterns(page),7);record('Story Off persists without hiding games, rules or earned progress');
 await page.locator('[aria-label="Play Shogi"]').click();await page.getByRole('button',{name:'How to play',exact:false}).first().click();await page.locator('.how-to-play').waitFor();await noOverflow(page);await page.evaluate(()=>window.arcticBack());await page.locator('.bottom-nav').waitFor();record('Existing teaching and back navigation remain available with stories off');
 await context.close();await browsers.at(-1).close().catch(()=>{});}
 assert.deepEqual(errors,[]);record('No browser runtime errors');
 const report={checks,passed:checks.length,errors,performanceSamples,scope:'Desktop Chromium browser with reduced-motion emulation, file assets and native-share bridge stub. Not a physical Android, TalkBack, live-room or cross-device synchronization test.'};
 await fs.writeFile(path.join(output,`browser-${scope}-report.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,report:path.join(output,`browser-${scope}-report.json`)},null,2));
}catch(error){console.error('BROWSER CHECK FAILED:',error.message);throw error;}finally{for(const browser of browsers)await browser.close().catch(()=>{});}
