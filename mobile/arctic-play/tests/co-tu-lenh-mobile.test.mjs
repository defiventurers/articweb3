import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const mobile=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const root=path.resolve(mobile,'../..');
const source=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('mobile screen is routed separately from the seven original halls',()=>{
  const app=source('mobile/arctic-play/src/App.jsx');
  const games=source('mobile/arctic-play/src/games.ts');
  assert.match(app,/import \{CoTuLenhMobile\} from '\.\/CoTuLenhMobile\.jsx'/);
  assert.match(app,/screen==='co-tu-lenh'/);
  assert.match(app,/setScreen\('co-tu-lenh'\)/);
  assert.match(app,/VIETNAM · 2010 · MODERN STRATEGY GAME · RESEARCH DRAFT/);
  assert.doesNotMatch(games,/id:\s*['"]co-tu-lenh['"]/,'Game must not use unrelated old hall engine');
  assert.equal((games.match(/\{ id:\s*'((shogi)|(sannin)|(sanguo)|(sanyou)|(yanyi)|(xiangqi))'/g)||[]).length,6);
});

test('game uses same v0.4 client and server rules, with both defence overlays',()=>{
  const wrapper=source('mobile/arctic-play/src/CoTuLenhMobile.jsx');
  const app=source('frontend/src/games/co-tu-lenh/CoTuLenhApp.jsx');
  const rules=source('frontend/src/games/co-tu-lenh/rules.js');
  assert.match(wrapper,/CoTuLenhApp/);
  assert.match(wrapper,/assetBase="art\/co-tu-lenh"/);
  assert.match(wrapper,/wsEndpoint="wss:\/\/articweb3\.onrender\.com"/);
  assert.match(app,/airDefenceZones/);
  assert.match(app,/showDefence/);
  assert.match(rules,/ancientchess_2015_standard/);
  assert.match(rules,/creator_2024_standard/);
});

test('mobile bundles 22 transparent pieces, board, and researched profiles',()=>{
  const build=source('mobile/arctic-play/scripts/build-web.mjs');
  const spriteDir=path.join(root,'frontend/public/assets/co-tu-lenh/pieces');
  const sprites=fs.readdirSync(spriteDir).filter(n=>n.endsWith('.webp'));
  for(const team of ['red','blue'])for(const unit of ['commander','infantry','tank','militia','engineer','artillery','antiair','missile','aircraft','navy','headquarters'])assert.ok(sprites.includes(team+'-'+unit+'.webp'));
  assert.equal(sprites.length,22);
  assert.match(build,/art\/co-tu-lenh/);
  assert.match(build,/rules-profiles-v0\.3\.json/);
  assert.match(build,/game-assets\.json/);
  assert.ok(fs.existsSync(path.join(root,'frontend/public/assets/co-tu-lenh/board/board-antarctic-11x12.webp')));
});

test('Android version is monotonic and signing identity unchanged',()=>{
  const release=JSON.parse(source('mobile/arctic-play/release-config.json'));
  const manifest=source('mobile/arctic-play/android/app/src/main/AndroidManifest.xml');
  const script=source('mobile/arctic-play/scripts/build-apk.py');
  assert.equal(release.packageName,'xyz.arcticdominion.play');
  assert.equal(release.versionName,'5.7.2');
  assert.equal(release.versionCode,81);
  assert.match(manifest,/android:versionCode="81"/);
  assert.match(manifest,/android:versionName="5\.7\.2"/);
  assert.match(script,/Original signing files are missing/);
  assert.match(script,/Cờ Tư Lệnh/);
});
