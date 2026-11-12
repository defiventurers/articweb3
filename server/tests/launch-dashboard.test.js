const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const source=path.resolve(__dirname,'../../ops/launch-dashboard');
test('dashboard proxy keeps its key server-side, restricts routes and strips unrelated import fields',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'launch-worker-'));const old=global.fetch;
 try{
  execFileSync(process.execPath,[path.join(source,'build.mjs'),'--site-dir',dir]);const code=await fs.readFile(path.join(dir,'worker/index.js'),'utf8'),worker=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
  const env={LAUNCH_SERVICE_KEY:'fixture-server-secret'};let calls=0;
  global.fetch=async(url,options)=>{calls++;assert.equal(new URL(url).origin,'https://articweb3.onrender.com');assert.equal(options.headers.Authorization,'Bearer fixture-server-secret');assert.equal(options.redirect,'error');if(options.body){const value=JSON.parse(options.body);assert.equal(value.privateKey,undefined);assert.equal(value.passportId,undefined);}return Response.json({ok:true});};
  for(const url of ['/','/app.js','/style.css'])assert.equal((await(await worker.fetch(new Request('https://private.test'+url),env)).text()).includes('fixture-server-secret'),false);
  assert.equal((await worker.fetch(new Request('https://private.test/api/metrics?period=all'),env)).status,200);assert.equal(calls,1);
  assert.equal((await worker.fetch(new Request('https://private.test/api/metrics?period=bad'),env)).status,400);assert.equal(calls,1);
  const verify=await worker.fetch(new Request('https://private.test/api/verify-passport',{method:'POST',body:JSON.stringify({chainId:46630,privateKey:'never-send',passportId:'private',tokenId:'1'})}),env);assert.equal(verify.status,200);assert.equal(calls,2);
  global.fetch=async()=>new Response('upstream-private-details',{status:401});const denied=await worker.fetch(new Request('https://private.test/api/metrics'),env);assert.equal(denied.status,503);assert.equal((await denied.text()).includes('upstream-private-details'),false);
  assert.equal((await worker.fetch(new Request('https://private.test/api/metrics'),{})).status,503);
 }finally{global.fetch=old;await fs.rm(dir,{recursive:true,force:true});}
});
test('dashboard renders real API values, preserves stale data on errors and distinguishes unavailable values',async()=>{
 const {JSDOM}=createRequire(path.resolve(__dirname,'../../mobile/arctic-play/build-deps/package.json'))('jsdom'),{fixture}=await import('../../ops/launch-dashboard/fixture.mjs');
 const html=(await fs.readFile(path.join(source,'index.html'),'utf8')).replace(/<script[^>]*><\/script>/,''),code=await fs.readFile(path.join(source,'app.js'),'utf8');
 const dom=new JSDOM(html,{url:'https://private.test/',runScripts:'outside-only'});let fail=false,unavailable=false,future=false,exported;
 dom.window.Blob=Blob;dom.window.URL.createObjectURL=blob=>{exported=blob;return 'blob:fixture';};dom.window.URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=()=>{};
 dom.window.fetch=async()=>{if(fail)return{ok:false,json:async()=>({error:'Offline'})};const data=structuredClone(fixture);if(unavailable){data.totals.signups=null;data.deliveryHealth=null;}if(future){data.range.notStarted=true;data.range.since=data.range.until+86400000;}return{ok:true,json:async()=>data};};
 const until=async check=>{for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,5));}assert.fail('UI did not settle.');};
 try{dom.window.eval(code);const $=id=>dom.window.document.getElementById(id);await until(()=>$('signups').textContent==='12');assert.equal($('passports').textContent,'8');assert.equal($('mismatch-total').textContent,'0');assert.ok($('chart').querySelector('svg'));assert.equal($('export').disabled,false);
  assert.match(dom.window.document.querySelector('footer').textContent,/Prelaunch totals include QA sessions/);
  $('export').click();const csv=await exported.text();assert.equal(csv.split('\r\n').length,Object.keys(fixture.totals).length+1);assert.match(csv,/"signups","12"/);
  fail=true;$('refresh').click();await until(()=>$('connection').textContent==='Last saved view');assert.equal($('signups').textContent,'12');assert.match($('error').textContent,/Offline/);
  fail=false;unavailable=true;$('refresh').click();await until(()=>$('signups').textContent==='—');assert.equal($('error').hidden,true);assert.equal($('oldest').textContent,'Delivery storage unavailable.');
  unavailable=false;future=true;$('refresh').click();await until(()=>$('period-description').textContent==='Launch cohort opens 14 November 2026 · IST');assert.equal($('chart').textContent,'This reporting window has not started.');
 }finally{dom.window.close();}
});
