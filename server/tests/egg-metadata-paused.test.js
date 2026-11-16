const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createCompanyService}=require('../companyService');
test('Egg metadata remains readable during launch pause; registration stays blocked while Para sign-in is available',async t=>{
 const prior=process.env.AK_LAUNCH_RESET_PAUSED;process.env.AK_LAUNCH_RESET_PAUSED='true';
 const store={async get(){return null;},async init(){},async close(){},async transact(){throw Error('No account writes allowed');}};
 const service=createCompanyService({store,passportOptions:{store:{configured:false,async close(){}},deliveryRuntime:{status:()=>({eggReady:false,kinds:['visa']})}}});
 const server=http.createServer(service.handleHttp);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await service.close();if(prior===undefined)delete process.env.AK_LAUNCH_RESET_PAUSED;else process.env.AK_LAUNCH_RESET_PAUSED=prior;});
 const base='http://127.0.0.1:'+server.address().port+'/arctic-play/v3';
 for(const edition of [1,33]){
  const r=await fetch(base+'/passport/egg-metadata/46630/'+edition+'.json');assert.equal(r.status,200);const m=await r.json();assert.equal(m.attributes.find(a=>a.trait_type==='Founding Edition').value,edition);assert.equal(m.properties.chainId,46630);
 }
 assert.equal((await fetch(base+'/passport/egg-metadata/46630/34.json')).status,404);
 assert.equal((await fetch(base+'/passport/egg-metadata/46630/1.json',{method:'POST'})).status,503);
 for(const route of ['/passport','/accounts','/auth/email/start','/auth/google/start']){
  const r=await fetch(base+route,{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}});assert.equal(r.status,503);assert.equal((await r.json()).code,'LAUNCH_RESET_PAUSED');
 }
 assert.equal((await fetch(base+'/passport/delivery/config')).status,200);
 const config=await fetch(base+'/auth/para/config',{headers:{Origin:'https://antarcticgaming.co'}});assert.equal(config.status,200);assert.equal(config.headers.get('access-control-allow-origin'),'https://antarcticgaming.co');
 assert.equal((await fetch(base+'/passport')).status,401);
 assert.equal((await fetch(base+'/auth/para/config',{headers:{Origin:'https://antarcticgaming.co.evil.example'}})).status,403);
 assert.equal((await fetch(base+'/passport/delivery/config',{method:'POST'})).status,503);
});
