// Loaded separately before the application so a failed bundle still has a UI.
(function () {
  if (!Object.hasOwn) Object.hasOwn = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
  if (!Array.prototype.at) Object.defineProperty(Array.prototype, 'at', {configurable:true,writable:true,value:function (index) { var n = Math.trunc(Number(index)) || 0; if (n < 0) n += this.length; return this[n]; }});
  var panel = document.getElementById('startup-panel');
  var title = document.getElementById('startup-title');
  var message = document.getElementById('startup-message');
  var retry = document.getElementById('startup-retry');
  var ready = false;
  var failed = false;
  var timer;
  function fail(error) {
    failed = true;
    clearTimeout(timer);
    panel.hidden = false;
    panel.setAttribute('data-startup-state', 'failed');
    panel.setAttribute('role', 'alert');
    title.textContent = 'The app could not open.';
    message.textContent = 'Try opening it again. Your saved games are still on this phone.';
    retry.hidden = false;
    var details = document.getElementById('startup-details');
    if (!details) { details = document.createElement('p'); details.id = 'startup-details'; panel.appendChild(details); }
    var text = String(error && (error.message || error) || 'Startup did not finish within 20 seconds.');
    text = text.replace(/AK-OWNER-[A-Za-z0-9-]+/g, '[private code]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
    details.textContent = 'Startup details (5.4.0): ' + text.slice(0, 350);
  }
  window.ArcticStartup = {
    ready: function () {
      ready = true;
      clearTimeout(timer);
      panel.hidden = true;
      panel.setAttribute('data-startup-state', 'ready');
    },
    fail: fail
  };
  retry.addEventListener('click', function () { window.location.reload(); });
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (!ready && (event.message || (target && target.tagName === 'SCRIPT'))) fail(event.error || event.message || ('Could not load ' + String(target.src).split('/').pop()));
  }, true);
  // A background connection failure must not latch a failure over a working UI.
  timer = setTimeout(function () { if (!ready) fail(); }, 20000);
}());
