/* Browser-only install controls. Loading, accounts, boards and native updates stay owned by the app. */
(() => {
  if (window.Android || !document.querySelector('#root')) return;
  const script = document.currentScript;
  const version = script?.dataset.version || '';
  const apkUrl = script?.dataset.apkUrl || '';
  const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  let deferredPrompt = null, registration = null, button = null, previousFocus = null;
  const dialog = document.createElement('dialog');
  dialog.className = 'ak-pwa-dialog';
  dialog.setAttribute('aria-labelledby', 'ak-pwa-title');
  dialog.innerHTML = '<form method="dialog"><button class="ak-pwa-close" aria-label="Close app options">×</button></form><h2 id="ak-pwa-title">Keep Lantern Harbor close</h2><p>Install Antarctic Kingdoms for a full-screen home-screen shortcut.</p><button type="button" class="ak-pwa-install">Install app</button><p class="ak-pwa-guide"></p><p class="ak-pwa-status" role="status"></p><button type="button" class="ak-pwa-refresh">Refresh browser game</button><p class="ak-pwa-release"></p>';
  const install = dialog.querySelector('.ak-pwa-install');
  const guide = dialog.querySelector('.ak-pwa-guide');
  const status = dialog.querySelector('.ak-pwa-status');
  const refresh = dialog.querySelector('.ak-pwa-refresh');
  dialog.querySelector('.ak-pwa-release').textContent = version ? `Browser edition ${version}` : 'Browser edition';
  if (apkUrl) {
    const url = new URL(apkUrl);
    if (url.protocol === 'https:') {
      const link = document.createElement('a');
      link.className = 'ak-pwa-apk'; link.href = url.href; link.rel = 'noopener';
      link.textContent = 'Download the Android APK'; dialog.append(link);
    }
  }
  document.body.append(dialog);
  function describe() {
    install.hidden = !deferredPrompt || standalone();
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    guide.textContent = standalone() ? 'You are already using the installed web app.' : deferredPrompt ? 'Your browser will ask you to confirm installation.' : ios ? 'In Safari, open Share, choose Add to Home Screen, then Add. If you opened this link inside another app, open it in Safari first.' : 'Open your browser menu and choose Install app or Add to Home screen if offered. Installation options depend on your browser; you can keep playing here.';
    const waiting = registration?.waiting;
    status.textContent = waiting ? 'An update is ready. Save your game, close every Antarctic Kingdoms tab or app window, then reopen it to finish updating.' : 'Your saved browser games stay in this browser. Internet access is still needed for sign-in and online play.';
    refresh.hidden = !!waiting;
  }
  function open() {
    if (dialog.open) return;
    previousFocus = document.activeElement;
    describe();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else { dialog.setAttribute('open', ''); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.querySelector('.ak-pwa-close').focus(); }
  }
  function close() { if (typeof dialog.close === 'function') dialog.close(); else { dialog.removeAttribute('open'); previousFocus?.focus?.(); } }
  dialog.addEventListener('close', () => previousFocus?.focus?.());
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button,a[href]')].filter(node => !node.hidden && !node.disabled);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  install.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt; deferredPrompt = null;
    try { await prompt.prompt(); await prompt.userChoice; } catch { /* Browser install refusal is not an app failure. */ }
    describe();
  });
  refresh.addEventListener('click', () => { if (window.confirm('Refresh Antarctic Kingdoms? Save your current game first.')) window.location.reload(); });
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event; describe(); attach(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; describe(); if (button) button.setAttribute('aria-label', 'Installed app options'); });
  function attach() {
    if (!window.document) return;
    const startup = document.getElementById('startup-panel');
    if (startup && startup.dataset.startupState !== 'ready') return;
    const host = document.querySelector('.lobby-header .header-controls') || document.querySelector('.harbor-entry');
    if (!host) { button?.remove(); return; }
    if (!button) {
      button = document.createElement('button'); button.type = 'button'; button.className = 'icon-btn ak-pwa-open';
      button.setAttribute('aria-label', standalone() ? 'Installed app options' : 'Install Antarctic Kingdoms');
      button.title = standalone() ? 'App options' : 'Install app';
      button.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/></svg>';
      button.addEventListener('click', open);
    }
    button.classList.toggle('ak-pwa-entry', host.matches('.harbor-entry'));
    if (button.parentNode !== host) host.append(button);
  }
  const observer = new MutationObserver(attach); observer.observe(document.body, {childList:true,subtree:true,attributes:true,attributeFilter:['data-startup-state']}); attach();
  window.addEventListener('pagehide', () => observer.disconnect(), {once:true});
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('game-assets-sw.js', {scope:'./',updateViaCache:'none'}).then(value => {
      registration = value; describe();
      value.addEventListener('updatefound', () => value.installing?.addEventListener('statechange', describe));
      value.update().catch(() => {});
    }).catch(() => {});
  }
})();
