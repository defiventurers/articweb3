/* Replaces the legacy v5.10.2 cache-first early PWA on the Passport-only launch.
   Network-only by default; no OAuth, account details or private data are cached. */
const scope=new URL(self.registration.scope);
const prefix='ak-inc-v1-'+encodeURIComponent(scope.pathname)+'-';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(prefix))await caches.delete(name);
 await self.clients.claim();
})()));
