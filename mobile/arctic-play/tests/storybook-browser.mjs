import {createRequire} from 'node:module';import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE);const{chromium}=require('playwright');
const root=path.resolve(process.env.STORYBOOK_REVIEW_ROOT||'storybook-review'),evidence=path.join(root,'evidence');fs.mkdirSync(evidence,{recursive:true});
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(req.url.split('?')[0]).replace(/^\//,''));let f=p;if(fs.existsSync(p)&&fs.statSync(p).isDirectory())f=path.join(p,'index.html');try{res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.webp')?'image/webp':f.endsWith('.png')?'image/png':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.jpg')?'image/jpeg':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(8766,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});const checks=[],errors=[],homeControls=[];let complete=false,failure=null;
const{PNG}=require('pngjs');
function pixelDifference(before,after){
 const b=PNG.sync.read(before),a=PNG.sync.read(after);assert.equal(b.width,a.width);assert.equal(b.height,a.height);
 let changedChannels=0,maxChannelDelta=0,changedPixels=0,outlierPixels=0,minX=b.width,minY=b.height,maxX=-1,maxY=-1;const peakHistogram={};
 for(let k=0;k<b.data.length;k+=4){let peak=0;for(let c=0;c<3;c++){const delta=Math.abs(b.data[k+c]-a.data[k+c]);if(delta)changedChannels++;peak=Math.max(peak,delta);}if(peak){changedPixels++;peakHistogram[peak]=(peakHistogram[peak]||0)+1;const p=k/4,x=p%b.width,y=Math.floor(p/b.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}if(peak>2)outlierPixels++;maxChannelDelta=Math.max(maxChannelDelta,peak);}
 return{maxChannelDelta,changedChannels,changedPixels,outlierPixels,changedBounds:changedPixels?{minX,minY,maxX,maxY}:null,peakHistogram,pixelLimit:Math.ceil(b.width*b.height*0.0002)};
}
function recordEvidence(){fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify({checks,homeControls,errors,complete,failure,browserVersion:browser.version(),realDevice:false,liveAuth:false},null,2));}
async function captureHome(page,filename){
 await page.locator('.home-chaturanga').waitFor();await page.waitForLoadState('networkidle');await page.waitForTimeout(1200);
 await page.evaluate(async()=>{
  await document.fonts.ready;
  const visible=[...document.images].filter(image=>{const rect=image.getBoundingClientRect();return rect.width>0&&rect.height>0&&rect.top<innerHeight&&rect.bottom>0;});
  await Promise.all(visible.map(async image=>{await image.decode();if(!image.complete||!image.naturalWidth)throw Error('Visible Home image did not decode: '+image.getAttribute('src'));}));
 });
 await page.mouse.move(0,0);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=await page.evaluate(()=>{const image=document.querySelector('.avatar-btn img'),rect=image?.getBoundingClientRect(),style=image&&getComputedStyle(image);return{theme:document.documentElement.dataset.theme,tab:document.querySelector('.app')?.dataset.tab,fontStatus:document.fonts.status,devicePixelRatio,avatar:image?{src:image.getAttribute('src'),complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,bounds:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},imageRendering:style.imageRendering,transform:style.transform}:null};});
 await page.screenshot({animations:'disabled',path:path.join(evidence,filename)});return state;
}
try{for(const size of [[360,800],[393,852],[393,960]])for(const theme of ['dark','light']){
for(const version of ['before','after']){
// Each version starts from the same fresh account/theme/context. A previous
// catalogue visit must not seed the next Home's storage, pointer or image cache.
const page=await browser.newPage({viewport:{width:size[0],height:size[1]},reducedMotion:'reduce',serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
// This is a local rendering fixture, never a production session or socket.
await page.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:8766'?route.continue():route.abort('blockedbyclient'));
await page.addInitScript(()=>{window.WebSocket=undefined;});
await page.addInitScript(()=>{const id='11111111-1111-4111-8111-111111111111';const passport={id:'fixture',number:'QA',playerName:'Saved Player',wallet:'0x1234567890123456789012345678901234567890',deliveries:[]};localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'review',name:'Explorer',avatar:'red'}));localStorage.setItem('arctic-play.v1.cloud-session',JSON.stringify({accountId:id,session:id+'.'+'q'.repeat(43)}));localStorage.setItem('arctic-play.v1.antarctic-visa.v1.'+id,JSON.stringify(passport));window.Android={appReady(){},setDarkTheme(){}};const old=fetch;window.fetch=async(url,options)=>{if(String(url).includes('onrender.com')){let data={};if(String(url).endsWith('/capabilities'))data={version:2,cloud:true,accountPlay:true};if(String(url).endsWith('/passport'))data={passport,identity:{accountId:id}};if(String(url).endsWith('/play-access'))data={accountId:id,online:true,leaseSeconds:60};if(String(url).endsWith('/progress'))data={progress:{}};if(String(url).endsWith('/account'))data={accountId:id,entitlements:{}};return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});}return old(url,options);};});
await page.addInitScript(theme=>localStorage.setItem('arctic-play.v1.theme',JSON.stringify(theme)),theme);
await page.goto('http://127.0.0.1:8766/'+version+'/');
const homeFile=`${version}-home-${size.join('x')}-${theme}.png`,controlFile=`${version}-home-control-${size.join('x')}-${theme}.png`;
const initialState=await captureHome(page,homeFile);
// Preserve a same-version reload control as diagnostics. Never select a better
// frame, average pixels, mask the avatar or loosen the cross-version gate.
await page.reload();const controlState=await captureHome(page,controlFile);
homeControls.push({size,theme,version,initialState,controlState,...pixelDifference(fs.readFileSync(path.join(evidence,homeFile)),fs.readFileSync(path.join(evidence,controlFile)))});recordEvidence();
await page.locator('.bottom-nav button').filter({hasText:/^Games$/}).click();await page.locator(version==='before'?'.exp-hero':'.sb-hero').waitFor();await page.locator('img').evaluateAll(xs=>Promise.all(xs.filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).map(i=>Promise.race([i.decode().catch(()=>{}),new Promise(r=>setTimeout(r,5000))]))));await page.screenshot({animations:'disabled',path:`${evidence}/${version}-adventure-${size.join('x')}-${theme}.png`});
if(version==='before'){await page.locator('.exp-mode-bar button').filter({hasText:/All games/i}).click();await page.locator('.game-discovery').waitFor();await page.locator('img').evaluateAll(xs=>Promise.all(xs.filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).map(i=>Promise.race([i.decode().catch(()=>{}),new Promise(r=>setTimeout(r,5000))]))));await page.screenshot({animations:'disabled',path:`${evidence}/before-catalogue-${size.join('x')}-${theme}.png`});}
if(version==='after'){
 for(let i=0;i<9;i++){
  assert.equal(await page.locator('.sb-adventure-body').getAttribute('data-expedition-id'),['dominion','xiangqi','shogi','sanguo','sanyou','sannin','yanyi','co-tu-lenh','shanshui'][i]);
  await page.getByRole('button',{name:'▶ Enter the Story',exact:true}).click();await page.locator('.heritage-introduction').waitFor();await page.getByRole('button',{name:'← Back to games',exact:true}).click();await page.locator('.sb-hero').waitFor();if(i<8)await page.getByRole('button',{name:'Next game',exact:true}).click();
 }
 await page.getByRole('button',{name:'Chapter 1: Chaturanga',exact:true}).click();
 const layout=await page.evaluate(()=>{const el=document.querySelector('.lobby-content');const a=document.querySelector('.sb-actions').getBoundingClientRect();const n=document.querySelector('.bottom-nav').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,scroll:el.scrollHeight>el.clientHeight+2,actionsVisible:a.bottom<=n.top};});assert.equal(layout.overflow,false);assert.equal(layout.scroll,false,JSON.stringify(layout));assert.ok(layout.actionsVisible);checks.push({size,theme,adventure:layout});
 await page.getByRole('button',{name:'♧ All Games',exact:true}).click();await page.locator('img').evaluateAll(xs=>Promise.all(xs.filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).map(i=>Promise.race([i.decode().catch(()=>{}),new Promise(r=>setTimeout(r,5000))]))));await page.screenshot({animations:'disabled',path:`${evidence}/after-catalogue-${size.join('x')}-${theme}.png`});const seen=[];
 for(let i=0;i<3;i++){seen.push(...await page.locator('.sb-card').evaluateAll(xs=>xs.map(x=>x.dataset.gameId)));assert.equal(await page.locator('.sb-card').evaluateAll(xs=>xs.every(card=>[...card.querySelectorAll('.sb-card-actions button')].every(b=>b.getBoundingClientRect().bottom<=card.getBoundingClientRect().bottom+1))),true,'Card actions clipped');if(i<2)await page.getByRole('button',{name:'Next page',exact:true}).click();}assert.equal(new Set(seen).size,9);
 await page.getByRole('searchbox',{name:'Search games',exact:true}).fill('Vietnam');assert.equal(await page.locator('.sb-card').count(),1);assert.equal(await page.locator('.sb-card').getAttribute('data-game-id'),'co-tu-lenh');
 await page.getByRole('searchbox',{name:'Search games',exact:true}).fill('no-such-game');await page.getByRole('button',{name:'Show all games',exact:true}).click();assert.equal(await page.locator('.sb-card').count(),4);
 await page.getByRole('button',{name:'3 players',exact:true}).click();assert.equal(await page.locator('.sb-card').count(),4);await page.getByRole('button',{name:'All',exact:true}).click();
 await page.getByRole('button',{name:'Favorite Chaturanga',exact:true}).click();await page.getByRole('button',{name:'Favorites',exact:true}).click();assert.equal(await page.locator('.sb-card').count(),1);await page.reload();await page.locator('.bottom-nav button').filter({hasText:/^Games$/}).click();await page.locator('.sb-card').first().waitFor();assert.ok(await page.getByRole('button',{name:'Favorite Chaturanga',exact:true}).getAttribute('aria-pressed')==='true');
 checks.push({size,theme,nineStories:true,nineGamesReachable:true,searchAndFilters:true,favoritesPersist:true});
 await page.evaluate(()=>document.documentElement.style.fontSize='24px');await page.getByRole('button',{name:'✧ Adventure',exact:true}).click();await page.locator('.sb-large-text').waitFor();await page.getByRole('button',{name:'Setup Chaturanga',exact:true}).scrollIntoViewIfNeeded();assert.ok(await page.getByRole('button',{name:'Setup Chaturanga',exact:true}).isVisible());await page.screenshot({animations:'disabled',path:`${evidence}/after-large-text-${size.join('x')}-${theme}.png`});checks.push({size,theme,largeTextActionsReachable:true});
}
await page.close();
}
const difference=pixelDifference(fs.readFileSync(`${evidence}/before-home-${size.join('x')}-${theme}.png`),fs.readFileSync(`${evidence}/after-home-${size.join('x')}-${theme}.png`));const preserved=difference.maxChannelDelta<=8&&difference.outlierPixels<=8&&difference.changedPixels<=difference.pixelLimit;
checks.push({size,theme,homePreserved:preserved,...difference});recordEvidence();assert.ok(preserved,'Home changed beyond sparse border rasterization tolerance: '+JSON.stringify(difference));}
assert.deepEqual(errors,[]);complete=true;
}catch(error){failure=error.message;throw error;}finally{recordEvidence();await browser.close();server.close();}
