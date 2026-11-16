'use strict';
const {isIP}=require('node:net');
const {createHash,randomBytes,randomUUID}=require('node:crypto');
const checked=Symbol('securityChecked');
const WEB_ORIGINS=new Set(['https://antarcticgaming.co','https://www.antarcticgaming.co','https://arcticdominion.xyz','https://www.arcticdominion.xyz','https://articweb3.onrender.com','https://appassets.androidplatform.net']);
const fail=(message,status)=>Object.assign(Error(message),{status});
function originAllowed(origin,env=process.env){return !origin||WEB_ORIGINS.has(origin)||(!env.RENDER&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));}
function clientIp(req,env=process.env){
 // Render appends trusted forwarding information. Never trust a caller's leftmost XFF.
 // Outside that deployment, ignore forwarding headers entirely.
 const direct=req.socket?.remoteAddress||req._socket?.remoteAddress||'unknown';
 if(!env.RENDER)return direct;
 const raw=req.headers?.['x-forwarded-for'];
 if(typeof raw!=='string'||raw.length>2048)return direct;
 const addresses=raw.split(',').map(v=>v.trim());
 const rightmost=addresses.at(-1);return isIP(rightmost)?rightmost:direct;
}
function validateJson(value,depth=0,budget={nodes:0}){
 if(depth>20||++budget.nodes>12000)throw fail('Request structure is too complex.',400);
 if(typeof value==='string'&&value.length>30000)throw fail('A request field is too long.',400);
 if(typeof value==='number'&&!Number.isFinite(value))throw fail('Invalid number.',400);
 if(!value||typeof value!=='object')return;
 if(Array.isArray(value)){if(value.length>2500)throw fail('Too many items.',400);}
 else if(Object.keys(value).length>1000)throw fail('Too many fields.',400);
 for(const [key,item]of Object.entries(value)){
  if(['__proto__','prototype','constructor'].includes(key))throw fail('Unsafe request field.',400);
  validateJson(item,depth+1,budget);
 }
}
function createRequestSecurity({now=Date.now,env=process.env,logger=entry=>console.info(JSON.stringify(entry))}={}){
 const buckets=new Map(),logged=new Map(),salt=randomBytes(32).toString('hex');
 function consume(key,limit,windowMs){const t=now();let b=buckets.get(key);if(!b||t-b.at>=windowMs){
  if(buckets.size>=10000){for(const[k,v]of buckets)if(t-v.at>=v.windowMs)buckets.delete(k);if(buckets.size>=10000)throw fail('Traffic is busy. Please try again shortly.',429);}
  b={at:t,n:0,windowMs};buckets.set(key,b);
 }if(++b.n>limit)throw Object.assign(fail('Too many requests. Please try again later.',429),{retryAfter:Math.max(1,Math.ceil((b.at+windowMs-t)/1000))});}
 function audit(req,path,status,event){
  // No bodies, credentials, email, raw IP, query strings, tokens or provider errors.
  const ip=createHash('sha256').update(salt+':'+clientIp(req,env)).digest('hex').slice(0,16),key=ip+':'+event+':'+status,t=now();
  if(logged.has(key)&&t-logged.get(key)<15000)return;
  if(logged.size>=2000){for(const[k,v]of logged)if(t-v>=60000)logged.delete(k);if(logged.size>=2000)return;}
  logged.set(key,t);logger({event,at:new Date(t).toISOString(),requestId:req.securityRequestId||randomUUID(),method:req.method,route:path.replace(/\/[A-Za-z0-9_-]{24,}/g,'/:id').slice(0,150),status,client:ip});
 }
 function guard(req,url){
  if(req[checked])return;req.securityRequestId=randomUUID();
  if((req.url||'').length>4096)throw fail('Request URL is too long.',414);
  const ip=clientIp(req,env),path=url.pathname;
  if(!['GET','HEAD','POST','DELETE','OPTIONS'].includes(req.method))throw fail('Method not allowed.',405);
  const publicRead=req.method==='GET'&&/^\/arctic-play\/v3\/(launch\/(public|activity)$|passport\/(metadata|achievement-metadata|egg-metadata)\/|passport\/delivery\/config$)/.test(path);
  if(!publicRead&&req.headers?.origin&&!originAllowed(req.headers.origin,env))throw fail('Origin not allowed.',403);
  if(env.RENDER&&req.headers?.['x-forwarded-proto']&&req.headers['x-forwarded-proto'].split(',').at(-1).trim()!=='https')throw fail('Use HTTPS to connect.',400);
  consume('ip:'+ip,600,60000);
  if(path.startsWith('/arctic-play/v3/')){
   if(req.headers['content-encoding']&&!/^identity$/i.test(req.headers['content-encoding']))throw fail('Compressed request bodies are not supported.',415);
   const size=req.headers['content-length'];if(size!==undefined&&(!/^\d+$/.test(size)||Number(size)>150000))throw fail('That request is too large.',413);
   if(Number(size)>0&&!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw fail('Use application/json.',415);
   // IP budgets always apply, even when an attacker supplies a different fabricated bearer.
   if(/\/auth\/.*\/start$/.test(path))consume('auth-start:'+ip,path.includes('/email/')?6:20,600000);
   if(/\/(recover|auth\/exchange|auth\/.*\/(complete|verify|attempt))$/.test(path))consume('auth-check:'+ip,60,600000);
   if(path.endsWith('/recover'))consume('recover:'+ip,10,600000);
   if(req.method==='POST'&&/\/(accounts|passport)$/.test(path))consume('register:'+ip,10,600000);
   if(req.method==='POST'&&/\/(challenges|checkout|purchases\/restore)(\/|$)/.test(path))consume('expensive:'+ip,12,60000);
   const auth=req.headers.authorization;if(typeof auth==='string'&&auth.length<256)consume('credential:'+createHash('sha256').update(auth).digest('hex'),120,60000);
  }
  req[checked]=true;
 }
 return {guard,audit,consume};
}
const securityHeaders={
 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
 'Strict-Transport-Security':'max-age=31536000','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
};
const socketBudgets=createRequestSecurity(),connections=new Map();
function verifySocket(info,done){
 const ip=clientIp(info.req);try{
  if(!originAllowed(info.origin))throw fail('Origin not allowed.',403);
  socketBudgets.consume('socket:'+ip,30,60000);
  if((connections.get(ip)||0)>=20)throw fail('Too many connections.',429);
  done(true);
 }catch(e){socketBudgets.audit(info.req,'/websocket',e.status||429,'socket_denied');done(false,e.status||429,'Connection unavailable');}
}
function bindSocket(ws,req){const ip=clientIp(req);ws.clientIp=ip;connections.set(ip,(connections.get(ip)||0)+1);ws.once('close',()=>{const n=(connections.get(ip)||1)-1;if(n)connections.set(ip,n);else connections.delete(ip);});}
function safeDiagnostics(value,depth=0){
 if(depth>10)return '[omitted]';
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(v=>safeDiagnostics(v,depth+1));
 const out={};for(const[k,v]of Object.entries(value)){
  if(/(?:password|privateKey|apiKey|connectionString|databaseUrl|rpcUrl|authorization)/i.test(k))continue;
  out[k]=/(?:error|lastError|databaseError)$/i.test(k)&&v?'Service check pending.':safeDiagnostics(v,depth+1);
 }return out;
}
function installHttpSecurity(){
 const http=require('node:http');if(http.__akSecurityInstalled)return;http.__akSecurityInstalled=true;
 const security=createRequestSecurity(),original=http.createServer.bind(http);
 http.createServer=function(listener){const server=original((req,res)=>{
  for(const[k,v]of Object.entries(securityHeaders))res.setHeader(k,v);
  let url;try{url=new URL(req.url,'https://articweb3.onrender.com');security.guard(req,url);}catch(e){const status=e.status||400;security.audit(req,url?.pathname||'/invalid',status,'request_denied');res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...(status===429?{'Retry-After':String(e.retryAfter||60)}:{})});res.end(JSON.stringify({error:e.status?e.message:'Invalid request.'}));return;}
  res.on('finish',()=>{if(res.statusCode>=400)security.audit(req,url.pathname,res.statusCode,res.statusCode>=500?'api_error':'request_denied');else if(/\/auth\/(exchange|email\/verify)$/.test(url.pathname))security.audit(req,url.pathname,res.statusCode,'authentication_success');});
  Promise.resolve().then(()=>listener(req,res)).catch(()=>{security.audit(req,url.pathname,500,'api_error');if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json','Cache-Control':'no-store'});if(!res.writableEnded)res.end(JSON.stringify({error:'The service could not complete this request.'}));});
 });server.requestTimeout=30000;server.headersTimeout=15000;server.keepAliveTimeout=5000;server.maxHeadersCount=60;return server;};
}
module.exports={createRequestSecurity,clientIp,validateJson,originAllowed,securityHeaders,installHttpSecurity,verifySocket,bindSocket,safeDiagnostics};
