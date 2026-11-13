/* Refresh only public /early/ files. Never touch player storage or other apps. */
(() => {
 const scope=new URL('/early/',location.origin),prefix='ak-inc-v1-'+encodeURIComponent(scope.pathname)+'-';
 const status=document.getElementById('status'),button=document.getElementById('repair');
 const publicFiles=new Set(['index.html','app.js','app.css','startup.js','theme-init.js','game-assets.json','game-assets-sw.js','pwa-tools.js','pwa-tools.css','manifest.webmanifest','app-version.json']);
 const isPublic=request=>{const u=new URL(typeof request==='string'?request:request.url);if(u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return false;const relative=u.pathname.slice(scope.pathname.length);return relative.startsWith('art/')||publicFiles.has(relative);};
 button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
   status.textContent='Refreshing public game files…';
   if(navigator.serviceWorker)for(const r of await navigator.serviceWorker.getRegistrations())if(r.scope===scope.href)await r.unregister();
   if(globalThis.caches)for(const name of await caches.keys()){
    if(name.startsWith(prefix)){await caches.delete(name);continue;}
    if(!name.startsWith('ak-shell-')&&!name.startsWith('ak-public-game-art-'))continue;
    const cache=await caches.open(name);for(const request of await cache.keys())if(isPublic(request))await cache.delete(request);
   }
   const manifest=await fetch(new URL('game-assets.json',scope),{cache:'reload',credentials:'omit'});if(!manifest.ok)throw Error('The game files could not be reached. Check your connection and retry.');
   const data=await manifest.json(),paths=data.assets.map(a=>a.url).filter(p=>/^art\/(dominion\/|chaturanga-final-four\/pawns\/)/.test(p));paths.push('art/launch-v1/chaturanga-match/approved-151658.jpg');
   let done=0,cursor=0;
   await Promise.all(Array.from({length:3},async()=>{while(cursor<paths.length){const path=paths[cursor++],url=new URL(path,scope);if(!isPublic(url.href))throw Error('Unexpected artwork path.');const response=await fetch(url,{cache:'reload',credentials:'omit'});if(!response.ok||!response.headers.get('Content-Type')?.startsWith('image/'))throw Error('Artwork unavailable: '+path.split('/').pop());const objectURL=URL.createObjectURL(await response.blob());try{await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth>0?resolve():reject(Error('Image has no pixels.'));image.onerror=()=>reject(Error('Artwork could not decode: '+path.split('/').pop()));image.src=objectURL;});}finally{URL.revokeObjectURL(objectURL);}status.textContent='Artwork checked: '+(++done)+' of '+paths.length;}}));
   status.textContent='Artwork ready. Opening your game…';location.replace(new URL('?art-repaired=2',scope).href);
  }catch(e){status.textContent=e.message||'Could not refresh. Check your connection and retry.';button.disabled=false;}
 });
})();
