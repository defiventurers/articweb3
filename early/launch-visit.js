/* Best-effort anonymous ready-browser sessions; never account or game telemetry. */
(() => {
  if (window.Android || !window.isSecureContext || typeof window.fetch !== 'function' || typeof window.AbortController !== 'function') return;
  const random = window.crypto;
  if (!random || (typeof random.randomUUID !== 'function' && typeof random.getRandomValues !== 'function')) return;
  let endpoint;
  try {
    endpoint = new URL(document.currentScript?.dataset.metricsEndpoint || 'https://articweb3.onrender.com/arctic-play/v3/launch/visit');
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return;
  } catch { return; }
  const storageKey = 'antarctic.launch.visit.session.v1';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let sessionId;
  try {
    sessionId = window.sessionStorage.getItem(storageKey);
    if (!uuid.test(sessionId || '')) {
      if (typeof random.randomUUID === 'function') sessionId = random.randomUUID();
      else {
        const bytes = random.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
        const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
        sessionId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      }
      if (!uuid.test(sessionId)) return;
      window.sessionStorage.setItem(storageKey, sessionId);
      if (window.sessionStorage.getItem(storageKey) !== sessionId) return;
    }
  } catch { return; }
  let sent = false, observer;
  function sendWhenReady() {
    const startup = document.getElementById('startup-panel');
    if (sent || !startup || startup.dataset.startupState !== 'ready') return;
    sent = true; observer?.disconnect();
    const controller = new window.AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    // Do not persist a counted flag: a later page/day/cohort must reach the
    // server's own daily/cohort deduplication with the same tab session ID.
    Promise.resolve().then(() => window.fetch(endpoint.href, {
      method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
      redirect: 'error', cache: 'no-store', signal: controller.signal,
      headers: {'Content-Type': 'application/json'}, body: JSON.stringify({sessionId})
    })).catch(() => {}).finally(() => window.clearTimeout(timeout));
  }
  observer = new MutationObserver(sendWhenReady);
  observer.observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['data-startup-state']});
  window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
  sendWhenReady();
})();
