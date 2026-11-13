// Hosted owner-private by Sites. Its gateway authenticates browser/service access.
// This shared owner view relies on that platform boundary; preserve private access.
const BACKEND='https://articweb3.onrender.com/arctic-play/v3';
const HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(request.method==='GET'&&['/','/app.js','/style.css'].includes(url.pathname)){
  const resources={'/':[HTML,'text/html; charset=utf-8'],'/app.js':[APP,'text/javascript; charset=utf-8'],'/style.css':[CSS,'text/css; charset=utf-8']},[body,type]=resources[url.pathname];
  return new Response(body,{headers:{...HEADERS,'Content-Type':type}});
 }
 const json=(value,status=200)=>Response.json(value,{status,headers:HEADERS});
 const metrics=url.pathname==='/api/metrics'&&request.method==='GET',verify=url.pathname==='/api/verify-passport'&&request.method==='POST';
 if(!metrics&&!verify)return json({error:'Not found.'},404);
 if(!env.LAUNCH_SERVICE_KEY)return json({error:'The private dashboard connection is awaiting setup.'},503);
 try{
  const options={method:metrics?'GET':'POST',headers:{Authorization:'Bearer '+env.LAUNCH_SERVICE_KEY},redirect:'error',signal:AbortSignal.timeout(55000)};let target;
  if(metrics){const period=url.searchParams.get('period')||'current';if(!['current','prelaunch','launch','24h','7d','all'].includes(period))return json({error:'Choose a supported reporting period.'},400);target=BACKEND+'/launch/owner/v2?period='+period;}
  else{const raw=await request.text();if(raw.length>8192)return json({error:'Choose the passport acceptance JSON.'},413);const source=JSON.parse(raw),body=Object.fromEntries(['chainId','contract','wallet','tokenId','transactionHash','blockNumber','blockHash'].filter(k=>source[k]!==undefined).map(k=>[k,source[k]]));options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);target=BACKEND+'/launch/owner/verify-passport';}
  const response=await fetch(target,options);if(!response.ok)return json({error:response.status===401?'The private dashboard connection needs configuration.':'The launch service is waking or unavailable. Please retry shortly.'},response.status===400?400:503);
  return json(await response.json());
 }catch{return json({error:'Live records could not be refreshed. Please retry shortly.'},503);}
}};
