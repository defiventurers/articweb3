import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve('mobile/arctic-play/android/app/src/main/assets');
const server=http.createServer((req,res)=>{
 const relative=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.join(root,relative==='/'?'index.html':relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file).then(b=>{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(file)]||'text/html');res.end(b);}).catch(()=>{res.writeHead(404);res.end();});
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.AK_CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),checks=[],errors=[],audit=[];
const shot=async(p,name)=>{if(process.env.AK_QA_DIR){await fs.mkdir(process.env.AK_QA_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.AK_QA_DIR,name+'.png')});}};
const noOverflow=async p=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No sideways scrolling');
const material=async locator=>{const s=await locator.evaluate(e=>{const s=getComputedStyle(e);return{image:s.backgroundImage,radius:parseFloat(s.borderRadius)};});assert(s.image.includes('/ice/'),'Controls use the same ice scenery');assert(s.radius>=10,'Soft touch-control silhouette');};
const collect=async(p,screen)=>audit.push(...await p.locator('button:visible').evaluateAll((elements,screen)=>elements.map(e=>({screen,label:(e.getAttribute('aria-label')||e.textContent).trim().slice(0,80),class:e.className,ice:getComputedStyle(e).backgroundImage.includes('/ice/')})),screen));
try{
 for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});
  await context.addInitScript(t=>localStorage.setItem('arctic-play.v1.theme',JSON.stringify(t)),theme);
  await context.route('https://articweb3.onrender.com/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"cloud":false,"commerce":false}'}));
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);
  const home=p.locator('.home-landing'),art=home.locator('.home-world-art'),find=p.getByRole('button',{name:'Find a game',exact:true});
  await art.evaluate(e=>e.decode());assert((await art.getAttribute('src')).includes('archive-v1'));
  assert.equal(await home.evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');assert.equal(await home.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  await material(find);await material(p.getByRole('button',{name:'Join friends',exact:true}));await collect(p,theme+':Home');
  for(const [width,height]of [[320,640],[375,812],[430,932],[834,1000]]){
   await p.setViewportSize({width,height});await noOverflow(p);const b=await find.boundingBox(),nav=await p.locator('.bottom-nav').boundingBox();assert(b.y+b.height<nav.y,'The main action is visible above navigation');
  }
  checks.push(`${theme}: borderless transparent cast, matched ice actions and main action visible at 320/375/430/834px`);
  await p.setViewportSize({width:375,height:812});await shot(p,`home-${theme}`);
  await find.focus();await p.keyboard.press('Enter');await p.getByRole('button',{name:'Play Xiangqi',exact:true}).waitFor();assert.equal(await p.locator('.game-card').count(),7);await noOverflow(p);await collect(p,theme+':Games');checks.push(`${theme}: main discovery action works with keyboard and opens all seven games`);
  await p.getByRole('button',{name:'Profile',exact:true}).click();await collect(p,theme+':Profile');await material(p.getByRole('switch',{name:'Dark mode',exact:true}));await shot(p,`profile-${theme}`);
  await p.getByRole('button',{name:/^Join a room/}).click();const join=p.getByRole('button',{name:'Join table',exact:true});assert(await join.isDisabled());await material(join);await p.getByRole('textbox',{name:'Room code',exact:true}).fill('ABC234');assert(await join.isEnabled());await material(p.getByRole('button',{name:'Close',exact:true}));await p.getByRole('button',{name:'Close',exact:true}).click();checks.push(`${theme}: Profile and dialog controls retain enabled, disabled and theme semantics`);
  await p.getByRole('button',{name:'Home',exact:true}).click();await p.getByRole('button',{name:/^Your Camp/}).click();await collect(p,theme+':Camp');await shot(p,`camp-${theme}`);await p.getByRole('button',{name:'Close',exact:true}).click();
  await p.getByRole('button',{name:'Games',exact:true}).click();await p.getByRole('button',{name:'Play Xiangqi',exact:true}).click();await collect(p,theme+':Game entry');await material(p.getByRole('button',{name:/^How to play/}));await p.getByRole('button',{name:/^How to play/}).click();await p.getByTestId('game-board').waitFor();await p.getByRole('button',{name:'Learning options',exact:true}).click();await collect(p,theme+':Learning options');await material(p.getByRole('button',{name:'Close',exact:true}));for(const width of [320,375,834]){await p.setViewportSize({width,height:900});await noOverflow(p);}checks.push(`${theme}: Camp, game entry and learning menus use the shared material without overflow`);
  await context.close();
 }
 assert.deepEqual(errors,[]);checks.push('No browser runtime errors in either appearance');
 const result={passed:checks,buttonAudit:audit};console.log(JSON.stringify(result,null,2));if(process.env.AK_RESULTS)await fs.writeFile(process.env.AK_RESULTS,JSON.stringify(result,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
