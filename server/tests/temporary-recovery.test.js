const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {randomUUID,randomBytes,createHash}=require('node:crypto');
const {createCompanyService}=require('../companyService');
test('existing temporary recovery keeps its expiry, cannot rotate into permanence, and never receives an offline licence',async t=>{
 let clock=100000,issued=0;
 const id=randomUUID(),key=randomBytes(32).toString('base64url'),expiresAt=clock+1500;
 const data=new Map(),store={configured:true,init:async()=>{},get:async(kind,id)=>structuredClone(data.get(kind+':'+id)||null),transact:async(kind,id,fn)=>{const k=kind+':'+id,next=await fn(structuredClone(data.get(k)||null));if(next===null)data.delete(k);else data.set(k,next);return next;},close:async()=>{}};
 const service=createCompanyService({store,now:()=>clock,temporaryAccounts:[{id,hash:createHash('sha256').update(key).digest('hex'),expiresAt}],playAccessOptions:{signer:{ready:true,issue:()=>{issued++;return 'not-for-temporary-accounts';}}},passportOptions:{store:{configured:false,close:async()=>{}}}});
 const server=http.createServer(service.handleHttp);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await service.close();});
 const base='http://127.0.0.1:'+server.address().port+'/arctic-play/v3';
 async function call(path,body,token){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,...await r.json()};}
 const recovered=await call('/recover',{code:id+'.'+key});assert.equal(recovered.status,200);
 const saved=await store.get('account',id);assert.ok(saved.sessions[0].expires<=expiresAt);assert.equal(saved.temporaryExpiresAt,expiresAt);assert.equal(JSON.stringify(saved).includes(key),false);
 saved.entitlements={'offline-access-v1':{active:true,mode:'live'}};data.set('account:'+id,saved);
 const access=await call('/play-access',{installation:randomUUID()},recovered.session);assert.equal(access.status,200);assert.equal(access.leaseSeconds,1.5);assert.equal(access.offlineOwned,false);assert.equal(access.license,null);assert.equal(issued,0);
 assert.equal((await call('/rotate',{},recovered.session)).status,403);
 clock=expiresAt;
 assert.equal((await call('/account',null,recovered.session)).status,401);
 assert.equal((await call('/recover',{code:id+'.'+key})).status,401);
 assert.equal((await call('/play-access',{installation:randomUUID()},recovered.session)).status,401);
});
