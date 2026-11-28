const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../../frontend/vercel.json');

// These two existing host rules use a named regex path. Evaluate that exact
// negative lookahead against route examples, in Vercel redirect-before-rewrite
// order. This does not claim to emulate the rest of Vercel's edge runtime.
function companyRedirect(host, pathname) {
  return config.redirects.find(rule => rule.has?.some(condition => condition.type === 'host' && condition.value === host) &&
    new RegExp('^/' + rule.source.slice('/:path('.length, -1) + '$').test(pathname));
}

test('company health paths escape both host redirects and rewrite to exact machine endpoints', () => {
  for (const host of ['antarcticgaming.co', 'www.antarcticgaming.co']) {
    for (const [source, destination] of [
      ['/api/health', 'https://articweb3.onrender.com/readyz'],
      ['/api/health/live', 'https://articweb3.onrender.com/healthz']
    ]) {
      assert.equal(companyRedirect(host, source), undefined);
      assert.equal(config.rewrites.find(rule => rule.source === source)?.destination, destination);
      const headers = config.headers.find(rule => rule.source === source)?.headers;
      assert.ok(headers?.some(header => header.key === 'Cache-Control' && header.value === 'no-store'));
      assert.ok(headers?.some(header => header.key === 'CDN-Cache-Control' && header.value === 'no-store'));
      assert.ok(headers?.some(header => header.key === 'x-vercel-enable-rewrite-caching' && header.value === '0'));
    }
  }
});

test('company website and unrelated direct routes preserve their previous redirect behavior', () => {
  const publicPaths = ['/coming-soon.html', '/early', '/early/', '/early/index.html', '/early/dashboard/', '/early/dashboard/index.html', '/early/dashboard/dashboard.js', '/early/dashboard/dashboard.css', '/early/passport-launch.js', '/early/passport-launch.css', '/early/app.css', '/early/mystery-golden-egg.svg', '/early/art/passport.png'];
  const heldPaths = ['/', '/games/chaturanga', '/api/health-extra', '/api/health/live/extra', '/api/health/private', '/api/health/', '/runtime/status', '/early/private'];
  for (const host of ['antarcticgaming.co', 'www.antarcticgaming.co']) {
    for (const path of publicPaths) assert.equal(companyRedirect(host, path), undefined, path);
    for (const path of heldPaths) assert.equal(companyRedirect(host, path)?.destination, '/coming-soon.html', path);
  }
  assert.equal(companyRedirect('other.example.test', '/'), undefined);
  assert.equal(config.redirects.find(rule => rule.source === '/early')?.destination, '/early/');
  assert.equal(config.redirects.find(rule => rule.source === '/early/dashboard')?.destination, '/early/dashboard/');
  assert.equal(config.rewrites.find(rule => rule.source === '/assets/heritage-arcade/board/xiangqi-arctic-board.png')?.destination, '/assets/heritage-arcade/board/xiangqi-arctic-board-gold-palace.svg');
});
