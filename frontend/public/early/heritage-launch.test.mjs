import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const dir=path.dirname(new URL(import.meta.url).pathname);
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
const html=read('index.html'),client=read('passport-launch.js'),theme=read('passport-launch.css'),baseline=read('app.css');
const home=html.slice(html.indexOf('<section id="home-view"'),html.indexOf('<section id="passport-view"'));
test('Home uses existing approved heritage layout and compiled original stylesheet',()=>{
 for(const cls of ['home-landing home-v2 home-heritage','home-v2-hero','home-v2-scene','home-v2-hosts','home-heritage-frame','home-v2-primary','home-v2-secondary','home-v2-journey','home-v2-shop'])assert.ok(home.includes(cls),cls);
 for(const image of ['home-hosts-welcome.webp','home-harbor-night.webp','chaturanga-heritage-v1/cover.webp','learn-pengu.webp','join-friends.webp','passport-journey.webp','physical-board-preview.webp'])assert.ok(image.endsWith('home-harbor-night.webp')?baseline.includes(image):home.includes(image),image);
 assert.match(html,/href="\.\/app.css\?v=ch-screen2"/);
 assert.match(baseline,/home-heritage \.home-v2-hero/);
});
test('All Home action buttons are gated while Home and Passport remain navigable',()=>{
 assert.equal((home.match(/<button\b/g)||[]).length,5);
 assert.equal((home.match(/data-soon/g)||[]).length,5);
 assert.ok(!home.includes('data-open-passport'));
 const nav=html.slice(html.indexOf('<nav class="bottom-nav"'),html.indexOf('</nav>'));
 assert.equal((nav.match(/<button\b/g)||[]).length,5);
 assert.equal((nav.match(/data-tab=/g)||[]).length,2);
 assert.equal((nav.match(/data-soon/g)||[]).length,3);
 assert.match(client,/app\.dataset\.tab=name==='passport'\?'profile':'home'/);
 assert.match(client,/document\.querySelectorAll\('\[data-soon\]'\)/);
 assert.ok(!html.includes('src="./app.js"'),'game runtime must not launch');
});
test('Passport signup elements, accessible feedback, QR-free wallet and egg receipts retained',()=>{
 for(const id of ['passport-view','adult-confirm','sign-in','connection-status','registration-card','new-wallet','consent','register','collection-card','created-wallet','visa-state','egg-state','visa-tx','egg-tx','refresh','passport-error','soon-dialog'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(client,/\/auth\/para\/start/);assert.match(client,/\/passport\/egg\/acceptance/);
 assert.match(html,/instagram\.com\/antarcticgamingco/);assert.match(theme,/header-update\{display:grid!important/);
});
