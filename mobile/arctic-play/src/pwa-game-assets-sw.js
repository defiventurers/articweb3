/* One atomic public browser release. Never cache accounts, OAuth, API calls or arbitrary URLs. */
const BUILD = __AK_WEB_BUILD__;
const scope = new URL(self.registration.scope);
const prefix = `ak-inc-v1-${encodeURIComponent(scope.pathname)}-`;
const shellCache = prefix + BUILD.id + '-shell';
const artCache = prefix + BUILD.id + '-art';
const files = new Map(BUILD.files.map(file => [new URL(file.url, scope).href, file]));
const shell = new Set(BUILD.shell.map(url => new URL(url, scope).href));
const pending = new Map();
async function checked(url) {
  const response = await fetch(url, {cache:'no-store',credentials:'same-origin',redirect:'error'});
  if (!response.ok || response.type === 'opaque') throw Error('Public release file unavailable');
  const data = await response.clone().arrayBuffer();
  const hex = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(n => n.toString(16).padStart(2,'0')).join('');
  if (hex !== files.get(url)?.sha256) throw Error('Public release file changed during update');
  return response;
}
function publicUrl(value) {
  try { const url = new URL(value, scope); return !url.search && !url.hash && files.has(url.href) ? url.href : null; } catch { return null; }
}
async function obtain(url) {
  if (pending.has(url)) return (await pending.get(url)).clone();
  const request = (async () => {
    const cache = await caches.open(shell.has(url) ? shellCache : artCache);
    const saved = await cache.match(url); if (saved) return saved;
    const response = await checked(url); await cache.put(url, response.clone()); return response;
  })();
  pending.set(url, request);
  try { return (await request).clone(); } finally { pending.delete(url); }
}
self.addEventListener('install', event => event.waitUntil((async () => {
  try {
    const cache = await caches.open(shellCache);
    for (const url of shell) await cache.put(url, await checked(url));
  } catch (error) { await caches.delete(shellCache); throw error; }
  // No skipWaiting: an open match keeps its complete previous release until all tabs close.
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith(prefix) && name !== shellCache && name !== artCache) await caches.delete(name);
  // No clients.claim: do not replace code beneath an open board or sign-in flow.
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.headers.has('range')) return;
  const requested = new URL(event.request.url);
  if (event.request.mode === 'navigate' && requested.origin === scope.origin && [scope.pathname,scope.pathname+'index.html'].includes(requested.pathname)) {
    event.respondWith(obtain(new URL('index.html', scope).href)); return;
  }
  const url = publicUrl(event.request.url); if (url) event.respondWith(obtain(url));
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'WARM_GAME_ASSETS' || !Array.isArray(event.data.urls)) return;
  const urls = [...new Set(event.data.urls.map(publicUrl).filter(Boolean))];
  event.waitUntil((async () => {
    let cursor = 0;
    await Promise.all(Array.from({length:3}, async () => { while (cursor < urls.length) { const url = urls[cursor++]; try { await obtain(url); } catch {} } }));
  })());
});
