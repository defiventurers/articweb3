const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{createRequire}=require('node:module');
const {JSDOM}=createRequire(path.resolve(__dirname,'../../mobile/arctic-play/build-deps/package.json'))('jsdom');
const {serveGameWallet}=require('../gameWalletWeb');
test('delivery check serves uncached same-origin assets and rejects traversal and writes',async t=>{
 const server=http.createServer((req,res)=>{if(!serveGameWallet(req,res,new URL(req.url,'https://example.test'))){res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port+'/arctic-play/passport-check/';
 for(const file of ['','app.js','style.css']){const r=await fetch(base+file);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);}
 assert.equal((await fetch(base,{method:'POST'})).status,405);
 assert.equal((await fetch(base+'..%2fpackage.json')).status,404);
});
test('player check asks consent before registration and exports only confirmed acceptance',async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../passport-check/index.html'),'utf8').replace(/<script[^>]*><\/script>/,''),code=fs.readFileSync(path.join(__dirname,'../passport-check/app.js'),'utf8');
 for(const stage of ['new','pending','confirmed']){
  const dom=new JSDOM(html,{url:'https://articweb3.onrender.com/arctic-play/passport-check/',runScripts:'outside-only'}),w=dom.window;let writes=0;
  w.sessionStorage.setItem('ak.passport-check.session','test-only');
  const wallet={provider:'para',address:'0x'+'1'.repeat(40),chainId:46630};
  w.fetch=async(url,options)=>{let value;if(url.endsWith('/delivery/config'))value={ready:true,status:'ready'};else if(url.endsWith('/acceptance'))value={confirmed:stage==='confirmed',wallet:wallet.address,chainId:46630};else{if(options.method==='POST')writes++;value={identity:{wallet},passport:stage==='new'?null:{wallet:wallet.address,deliveries:[{kind:'visa',status:stage==='confirmed'?'confirmed':'submitted'}]}};}return{ok:true,json:async()=>value};};
  try{w.eval(code);await new Promise(r=>setTimeout(r,25));const $=id=>w.document.getElementById(id);assert.equal($('download').hidden,stage!=='confirmed');if(stage==='new'){assert.equal($('review').hidden,false);$('issue').click();await new Promise(r=>setTimeout(r,10));assert.equal(writes,0);assert.match($('status').textContent,/Confirm the delivery wallet/);$('consent').checked=true;$('issue').click();await new Promise(r=>setTimeout(r,10));assert.equal(writes,1);}}finally{w.close();}
 }
});
