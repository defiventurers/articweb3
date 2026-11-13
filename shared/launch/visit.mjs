// First-party, anonymous browser-session observations. No wallet or identity.
export async function recordLaunchVisit({scope=globalThis,at=Date.now(),request}={}){
 try{
  const host=scope.location?.hostname?.toLowerCase();
  if(scope.Android||scope.navigator?.doNotTrack==='1'||scope.navigator?.globalPrivacyControl===true||scope.navigator?.webdriver===true||/HeadlessChrome|Playwright|Puppeteer/i.test(scope.navigator?.userAgent||'')||scope.location?.protocol==='file:'||host==='localhost'||host?.endsWith('.localhost')||host==='127.0.0.1'||host==='[::1]'||host==='::1')return false;
  const storage=scope.sessionStorage,day=new Date(at).toISOString().slice(0,10);
  if(storage.getItem('ak-visit-counted')===day)return false;
  let id=storage.getItem('ak-visit-id');if(!id){id=scope.crypto.randomUUID();storage.setItem('ak-visit-id',id);}
  const send=request|| (async sessionId=>{const r=await scope.fetch('https://articweb3.onrender.com/arctic-play/v3/launch/visit',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId}),signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Visit observation unavailable.');});
  await send(id);storage.setItem('ak-visit-counted',day);return true;
 }catch{return false;}
}
