const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {createHash}=require('node:crypto');
const {createRequestSecurity,clientIp,validateJson,originAllowed,verifySocket,installHttpSecurity}=require('../requestSecurity');
const {databaseOptions}=require('../databaseSecurity'),{operatorAuthorized}=require('../operatorAuth');
const req=(url='/arctic-play/v3/passport',headers={})=>({url,method:'GET',headers,socket:{remoteAddress:'127.0.0.1'}});
test('forwarded IPs are trusted only on Render; spoofed left-hand values do not change the rate identity',()=>{
 const r=req('/',{'x-forwarded-for':'198.51.100.1, 203.0.113.7'});assert.equal(clientIp(r,{}),'127.0.0.1');assert.equal(clientIp(r,{RENDER:'true'}),'203.0.113.7');r.headers['x-forwarded-for']='192.0.2.99, 203.0.113.7';assert.equal(clientIp(r,{RENDER:'true'}),'203.0.113.7');
});
test('fabricated bearer rotation cannot bypass the shared per-IP authentication budget',()=>{
 const s=createRequestSecurity({env:{},logger(){}});for(let i=0;i<60;i++){const r=req('/arctic-play/v3/auth/exchange',{authorization:'Bearer fabricated-'+i});r.method='POST';s.guard(r,new URL(r.url,'https://example.test'));}
 const r=req('/arctic-play/v3/auth/exchange',{authorization:'Bearer a-new-fabricated-credential'});r.method='POST';assert.throws(()=>s.guard(r,new URL(r.url,'https://example.test')),e=>e.status===429&&e.retryAfter>0);
});
test('oversized, compressed, non-JSON, unsafe prototype and deeply nested inputs are rejected',()=>{
 const s=createRequestSecurity({logger(){}});for(const [headers,status]of [[{'content-length':'150001'},413],[{'content-encoding':'gzip'},415],[{'content-length':'4','content-type':'text/plain'},415]]){const r=req(undefined,headers);assert.throws(()=>s.guard(r,new URL(r.url,'https://example.test')),e=>e.status===status);}
 assert.throws(()=>validateJson(JSON.parse('{"settings":{"__proto__":{"admin":true}}}')),/Unsafe/);
 let nested={};for(let i=0;i<22;i++)nested={child:nested};assert.throws(()=>validateJson(nested),/complex/);assert.equal({}.admin,undefined);
});
test('cross-site API and socket requests are denied while public metadata and native clients remain supported',()=>{
 assert.equal(originAllowed('https://evil.example'),false);assert.equal(originAllowed(undefined),true);assert.equal(originAllowed('http://localhost:5173',{RENDER:'true'}),false);
 const s=createRequestSecurity({logger(){}}),r=req(undefined,{origin:'https://evil.example'});assert.throws(()=>s.guard(r,new URL(r.url,'https://example.test')),e=>e.status===403);
 const pub=req('/arctic-play/v3/passport/egg-metadata/46630/1.json',{origin:'https://explorer.testnet.chain.robinhood.com'});assert.doesNotThrow(()=>s.guard(pub,new URL(pub.url,'https://example.test')));
 let allowed,status;verifySocket({origin:'https://evil.example',req:req()},(a,c)=>{allowed=a;status=c;});assert.equal(allowed,false);assert.equal(status,403);
});
test('external database TLS cannot be weakened by SSL URL parameters',()=>{
 const config=databaseOptions('postgresql://test:fixture-only@db.example.test/ak?sslmode=no-verify',{});assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(new URL(config.connectionString).searchParams.has('sslmode'),false);
 assert.equal(databaseOptions('postgresql://test:fixture-only@localhost/ak',{}).ssl,false);assert.equal(databaseOptions('postgresql://test:fixture-only@db.example.test/ak?sslmode=disable',{}).ssl.rejectUnauthorized,true);
 assert.throws(()=>databaseOptions('postgresql://test:fixture-only@db.example.test/ak?sslrootcert=/etc/secret',{}),/server-managed/);
});
test('operator keys are accepted only in Authorization headers and logs exclude raw identifying or credential data',()=>{
 const key='fixture-operator-key-'.repeat(3);assert.equal(operatorAuthorized(req('/ops?key='+key),key),false);assert.equal(operatorAuthorized(req('/ops',{authorization:'Bearer '+key}),key),true);
 const logs=[],s=createRequestSecurity({logger:e=>logs.push(e)}),r=req('/auth?email=private@example.test',{authorization:'Bearer '+key});s.audit(r,'/auth',401,'authentication_denied');const text=JSON.stringify(logs);assert.doesNotMatch(text,/private@example|fixture-operator|127\.0\.0\.1/);assert.equal(logs[0].status,401);
});
async function fixture(t){let clock=Date.now();const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ak-security-'));const {createCompanyStore}=require('../companyStore'),{createCompanyService}=require('../companyService');const store=createCompanyStore({file:path.join(dir,'store.json'),development:true});const svc=createCompanyService({store,now:()=>clock,allowLegacyEnrollment:true});const server=http.createServer(svc.handleHttp);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));await svc.close();await fs.rm(dir,{recursive:true,force:true});});
 async function call(p,method='GET',data,token){const response=await fetch('http://127.0.0.1:'+server.address().port+'/arctic-play/v3'+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined});return{status:response.status,...await response.json()};}
 return{call,store,advance:ms=>clock+=ms};
}
test('expired idle sessions require sign-in and recovery tokens remain usable',async t=>{const f=await fixture(t),a=await f.call('/accounts','POST',{});f.advance(86400001);assert.equal((await f.call('/account','GET',undefined,a.session)).status,401);assert.equal((await f.call('/recover','POST',{code:a.recoveryCode})).status,200);});
test('absolute session lifetime is seven days even with continuous activity',async t=>{const f=await fixture(t),a=await f.call('/accounts','POST',{});for(let i=0;i<14;i++){assert.equal((await f.call('/account','GET',undefined,a.session)).status,200);f.advance(12*3600000);}assert.equal((await f.call('/account','GET',undefined,a.session)).status,401);});
test('one account cannot delete another account or select its private progress via identifiers',async t=>{
 const f=await fixture(t),a=await f.call('/accounts','POST',{}),b=await f.call('/accounts','POST',{});assert.equal((await f.call('/account','DELETE',{code:b.recoveryCode},a.session)).status,403);assert.equal((await f.call('/account','DELETE',{code:b.recoveryCode})).status,401);
 await f.call('/progress','POST',{progress:{'archive-journal':{shogi:42}}},b.session);const mine=await f.call('/progress?accountId='+b.accountId,'GET',undefined,a.session);assert.equal(mine.progress['archive-journal']?.shogi,undefined);assert.equal((await f.call('/account','GET',undefined,b.session)).status,200);
});
test('global HTTP ingress adds security headers, denies insecure/malformed traffic and bounds request timeouts',async t=>{
 installHttpSecurity();const server=http.createServer((_req,res)=>{res.writeHead(200);res.end('safe');});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const url='http://127.0.0.1:'+server.address().port;
 const ok=await fetch(url);assert.equal(ok.headers.get('x-frame-options'),'DENY');assert.equal(ok.headers.get('referrer-policy'),'no-referrer');assert.match(ok.headers.get('strict-transport-security'),/max-age/);assert.equal(server.requestTimeout,30000);assert.equal(server.headersTimeout,15000);
 const denied=await fetch(url,{headers:{Origin:'https://evil.example'}});assert.equal(denied.status,403);
});
test('public diagnostics omit connection credentials and raw infrastructure errors',()=>{
 const {safeDiagnostics}=require('../requestSecurity');const safe=safeDiagnostics({ok:true,rpcUrl:'https://rpc.example/secret',store:{databaseReady:false,databaseError:'postgresql://user:private@db/ak'},lastError:'provider credential detail'});assert.deepEqual(safe,{ok:true,store:{databaseReady:false,databaseError:'Service check pending.'},lastError:'Service check pending.'});
});
