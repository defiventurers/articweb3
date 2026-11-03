// Current account authentication and real browser/WebSocket room regression.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../../../server/package.json',import.meta.url));
const {WebSocketServer}=require('ws'),{createArcticPlayService}=require('./arcticPlayService.js'),{createCompanyStore}=require('./companyStore.js');
const {chromium}=createRequire(new URL('../../../frontend/package.json',import.meta.url))('playwright-core');
const engine=createRequire(import.meta.url)('../build/shanshui.cjs');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'shanshui-browser-')),store=createCompanyStore({file:path.join(dir,'state.json'),development:true}),emails=[];
const service=createArcticPlayService({rooms:new Map(),send:(ws,packet)=>ws.send(JSON.stringify(packet)),ok:(ws,requestId,type,payload)=>ws.send(JSON.stringify({requestId,type,payload})),fail:(ws,requestId,message)=>ws.send(JSON.stringify({requestId,type:'error',payload:{message}})),companyOptions:{store,authOptions:{sendCode:async(email,code)=>emails.push({email,code})}}});
const directory=fileURLToPath(new URL('../android/app/src/main/assets/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{if(req.url.startsWith('/arctic-play/')){if(await service.handleHttp(req,res))return;}const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.join(directory,name==='/'?'index.html':name);if(!file.startsWith(directory)){res.writeHead(403);return res.end();}try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
const wss=new WebSocketServer({server});wss.on('connection',ws=>{ws.on('message',async bytes=>{const p=JSON.parse(bytes);await service.dispatch(ws,p.requestId,p.type,p.payload);});ws.on('close',()=>service.disconnected(ws));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const root=`http://127.0.0.1:${server.address().port}`;
async function api(route,data,session){const res=await fetch(root+'/arctic-play/v3'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session}:{})},body:data?JSON.stringify(data):undefined});return res.json();}
async function login(i){const email=`browser-${i}@example.test`,a=await api('/auth/email/start',{email}),user=await api('/auth/email/verify',{attempt:a.attempt,code:emails.at(-1).code});await api('/communication-preferences',{enabled:false},user.session);return user;}
const browser=await chromium.launch({executablePath:process.env.SHANSHUI_CHROMIUM_EXECUTABLE||undefined,headless:true,args:process.env.SHANSHUI_CHROMIUM_EXECUTABLE?['--no-sandbox','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled']:[]});
const errors=[],pages=[];
try{
 const users=[await login(1),await login(2)];
 async function phone(user,i){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(({user,i,root})=>{
   if(location.protocol==='about:')return;
   const passport={id:'qa-passport-'+i,playerName:'Phone '+i,wallet:'0x1234567890123456789012345678901234567890',deliveries:[]};
   localStorage.setItem('arctic-play.v1.cloud-session',JSON.stringify(user));
   localStorage.setItem('arctic-play.v1.profile',JSON.stringify({id:'22222222-2222-4222-8222-'+String(i).padStart(12,'0'),name:'Phone '+i,avatar:'blue'}));
   localStorage.setItem('arctic-play.v1.antarctic-visa.v1.'+user.accountId,JSON.stringify(passport));
   const Native=window.WebSocket;window.WebSocket=class extends Native{constructor(url,...args){super(url==='wss://articweb3.onrender.com'?root.replace('http:','ws:'):url,...args);}};
  },{user,i,root});
  const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://articweb3.onrender.com/**',async route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/passport'))return route.fulfill({json:{identity:{accountId:user.accountId},passport:{id:'qa-passport-'+i,playerName:'Phone '+i,wallet:'0x1234567890123456789012345678901234567890',deliveries:[]}}});const res=await route.fetch({url:root+url.pathname+url.search});await route.fulfill({response:res});});
  page.setDefaultTimeout(10000);await page.goto(root);await page.getByRole('button',{name:'Games',exact:true}).click();await page.getByRole('button',{name:'Play Shanshui Xiangqi',exact:true}).click();await page.getByRole('button',{name:/Private online table/}).click();return {page,context};
 }
 const first=await phone(users[0],1),second=await phone(users[1],2),host=first.page,guest=second.page;
 await host.getByRole('button',{name:'Create private table',exact:true}).click();await host.getByRole('heading',{name:/Room [A-Z2-9]{6}/}).waitFor();const code=(await host.getByRole('heading',{name:/Room [A-Z2-9]{6}/}).textContent()).slice(-6);
 await guest.getByLabel('Shanshui room code',{exact:true}).fill(code);await guest.getByRole('button',{name:'Join private table',exact:true}).click();await guest.getByRole('heading',{name:'Room '+code,exact:true}).waitFor();
 for(const page of [host,guest])await page.getByRole('button',{name:'Ready to play',exact:true}).click();await host.getByRole('button',{name:'Start game',exact:true}).click();await guest.locator('[data-shanshui-point]').first().waitFor();
 const start=engine.create('shanshui'),action=engine.actions('shanshui',start)[0],p=start.pieces.find(p=>'piece:'+p.id===action.source);await host.locator(`[data-shanshui-point="${p.row},${p.col}"]`).click();await host.locator(`[data-shanshui-point="${action.target}"]`).click();for(const page of [host,guest])await page.getByRole('heading',{name:'Blue to move',exact:true}).waitFor();
 await guest.getByLabel('Shanshui table message',{exact:true}).fill('Ready for the river');await guest.getByRole('button',{name:'Send',exact:true}).click();await host.getByText('Ready for the river',{exact:false}).waitFor();
 await guest.reload();await guest.getByRole('button',{name:'Games',exact:true}).click();await guest.getByRole('button',{name:'Play Shanshui Xiangqi',exact:true}).click();await guest.getByRole('button',{name:/Private online table/}).click();await guest.getByRole('button',{name:'Resume table '+code,exact:true}).click();await guest.getByRole('heading',{name:'Blue to move',exact:true}).waitFor();
 await guest.getByRole('button',{name:'Leave table',exact:true}).click();await guest.getByRole('button',{name:'Confirm leave',exact:true}).click();await guest.getByRole('heading',{name:'Invite your allies',exact:true}).waitFor();await host.getByText(/Blue \+ Green.*Bot/).waitFor();
 await guest.getByRole('button',{name:'Four players · 2v2 adaptation',exact:true}).click();await guest.getByRole('button',{name:'Create private table',exact:true}).click();await guest.getByRole('heading',{name:/Room [A-Z2-9]{6}/}).waitFor();assert.equal(await guest.locator('.shanshui-online-seats p').count(),4);
 await guest.getByRole('button',{name:'Ready to play',exact:true}).click();await guest.getByRole('button',{name:'Fill empty seats with bots & start',exact:true}).click();await guest.locator('[data-shanshui-point]').first().waitFor();assert.equal(await guest.locator('[data-shanshui-point]').count(),169);
 assert.deepEqual(errors,[]);console.log('PASS: two signed-in phone browsers, create/join/ready/start, server move broadcast, chat, reload/rejoin, bot replacement, and four-seat room start.');
}catch(error){for(const page of pages)console.error('Phone diagnostics',await page.locator('main').innerText().catch(()=>''));throw error;}
finally{await browser.close();for(const ws of wss.clients)ws.terminate();await new Promise(r=>wss.close(r));service.close();server.closeAllConnections();await new Promise(r=>server.close(r));await store.close();await fs.rm(dir,{recursive:true,force:true});}
