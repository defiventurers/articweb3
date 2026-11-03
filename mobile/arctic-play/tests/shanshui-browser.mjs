// Run after npm run build. Optional SHANSHUI_CHROMIUM_EXECUTABLE for CI images.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../frontend/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const engine = createRequire(import.meta.url)('../build/shanshui.cjs');
const directory = fileURLToPath(new URL('../android/app/src/main/assets/', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.join(directory, name === '/' ? 'index.html' : name);
  if (!file.startsWith(directory)) { res.writeHead(403); res.end(); return; }
  try { const bytes = await fs.readFile(file); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(bytes); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath: process.env.SHANSHUI_CHROMIUM_EXECUTABLE || undefined, args: process.env.SHANSHUI_CHROMIUM_EXECUTABLE ? ['--no-sandbox', '--no-zygote', '--single-process', '--disable-gpu', '--disable-software-rasterizer', '--use-gl=disabled'] : [], headless: true });
const errors = [], badAssets = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.status() >= 400 && /\/art\//.test(response.url())) badAssets.push(response.url()); });
  await page.addInitScript(()=>{const id='11111111-1111-4111-8111-111111111111';localStorage.setItem('arctic-play.v1.cloud-session',JSON.stringify({accountId:id,session:id+'.'+'q'.repeat(43)}));localStorage.setItem('arctic-play.v1.antarctic-visa.v1.'+id,JSON.stringify({id:'passport-fixture',number:'AK-FIXTURE',playerName:'Saved Player',wallet:'0x1234567890123456789012345678901234567890',deliveries:[]}));window.WebSocket=undefined;});
  await page.route('https://articweb3.onrender.com/**',route=>{const u=route.request().url(),id='11111111-1111-4111-8111-111111111111';const value=u.endsWith('/passport')?{identity:{accountId:id,displayName:'Saved Player'},passport:{id:'passport-fixture',number:'AK-FIXTURE',playerName:'Saved Player',wallet:'0x1234567890123456789012345678901234567890',deliveries:[]}}:u.endsWith('/play-access')?{accountId:id,online:true,leaseSeconds:60,offlineOwned:false,license:null,marketingChoiceNeeded:false}:{};return route.fulfill({json:value});});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.getByRole('button',{name:'Games',exact:true}).click();
  await page.getByRole('button', { name: 'Play Shanshui Xiangqi', exact: true }).click();
  await page.getByRole('heading', { name: 'Shanshui Xiangqi', exact: true }).waitFor();
  await page.screenshot({ path: 'build/shanshui-phone-menu.png', fullPage: true });
  await page.getByRole('button', { name: 'Two players Two people. Two armies each. →', exact: true }).click();
  assert.equal(await page.locator('[data-shanshui-point]').count(), 169);
  assert.equal(await page.locator('.shanshui-board image').count(), 69);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: 'build/shanshui-phone-game.png', fullPage: true });
  const state = engine.create('shanshui'), action = engine.actions('shanshui', state)[0], p = state.pieces.find(p => `piece:${p.id}` === action.source);
  await page.locator(`[data-shanshui-point="${p.row},${p.col}"]`).click();
  await page.locator(`[data-shanshui-point="${action.target}"]`).click();
  await page.getByRole('heading', { name: 'Blue to move', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('heading', { name: 'Red to move', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Toggle light and dark board' }).click();
  assert.match(await page.locator('.shanshui-board image').first().getAttribute('href'), /board-light/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'build/shanshui-desktop-game.png', fullPage: true });
  await page.getByRole('button', { name: 'Back to Shanshui menu' }).click();
  await page.getByRole('button', { name: 'Full rules', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click(); assert.equal(await page.locator('progress').getAttribute('value'), '2');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Learn piece movement', exact: true }).click(); assert.equal(await page.locator('.shanshui-board image').count(), 2);
  await page.getByRole('button', { name: 'Mountain infantry', exact: true }).click();
  await page.getByRole('button', { name: 'Back to Shanshui menu' }).click();
  await page.getByRole('button', { name: 'Arrange the board freely', exact: true }).click(); assert.equal(await page.locator('.shanshui-board image').count(), 1);
  await page.getByRole('button', { name: 'Starting position', exact: true }).click(); assert.equal(await page.locator('.shanshui-board image').count(), 69);
  await page.getByRole('button', { name: 'Back to Shanshui menu' }).click();
  await page.getByLabel('Your team', { exact: true }).selectOption('black');
  await page.getByRole('button', { name: 'Quick play (vs bot) You command two allied armies. →', exact: true }).click();
  await page.getByRole('heading', { name: 'Blue to move', exact: true }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Back to Shanshui menu' }).click();
  await page.getByRole('button', { name: 'Private online table', exact: false }).click();
  await page.getByRole('button', { name: 'Four players · 2v2 adaptation', exact: true }).click();
  assert.equal(await page.locator('.seat-choice').last().locator('button').count(), 4);
  assert.deepEqual(errors, []); assert.deepEqual(badAssets, []);
  console.log('PASS: 390px phone + desktop layout, 169 points/68 pieces, assets, legal tap, turn order, undo, themes, tutorials, editor, bot worker and four-seat online selector.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
