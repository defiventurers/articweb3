import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/App.jsx');
const dice=read('../src/DiceTray.jsx');
const release=JSON.parse(read('../release-config.json'));
const stories=JSON.parse(read('../src/heritageStories.json'));
const styles=read('../src/v5102-ux.css');

test('v5.10.5 uses an upgrade-compatible Android version with the original package',()=>{
 assert.equal(release.versionName,'5.10.5');
 assert.equal(release.versionCode,109);
 assert.equal(release.packageName,'xyz.arcticdominion.play');
 const manifest=read('../android/app/src/main/AndroidManifest.xml');
 assert.match(manifest,/android:versionCode="109"/);
 assert.match(manifest,/android:versionName="5\.10\.5"/);
 assert.match(manifest,/android:icon="@mipmap\/ic_launcher"/);
});

test('v5.9.14 catalogue is restored under Games; modern nine-story views remain available from Home',()=>{
 assert.match(app,/<p className="games-chronology">7 halls/);
 assert.match(app,/className="ctl-catalogue-entry"/);
 assert.match(app,/className="shanshui-catalogue-entry"/);
 assert.match(app,/className=\{'games-grid '/);
 assert.match(app,/onQuickPlay=\{gameId=>run\(\(\)=>startPractice/);
 const gamesSection=app.slice(app.indexOf("{tab==='games'&&<>"),app.indexOf("{tab==='home'&&",app.indexOf("{tab==='games'&&<>")));
 assert.doesNotMatch(gamesSection,/StoryAdventureGallery|games-view-tabs|AllGamesGallery/);
 assert.match(app,/sheet==='story-adventure'/);
 assert.match(app,/data-testid="games-view-tabs"/);
 assert.match(app,/<StoryAdventureGallery/);
 assert.match(app,/<AllGamesGallery/);
 assert.match(app,/<CulturalGames/);
});

test('Loading artwork remains available while access is checked, without bypassing access control',()=>{
 const source=read('../src/AccountEntry.jsx');
 assert.match(source,/if\(connected&&access\.checking&&!consent\)/);
 assert.match(source,/art\/brand\/lantern-loading-reference\.webp/);
 assert.match(source,/onClick=\{\(\)=>run\(access\.refresh\)\}/);
 assert.match(app,/!playAccess\.allowed/);
});

test('All nine stories have sourced heritage chapters and positive museum tone',()=>{
 const expected=['dominion','xiangqi','shogi','sannin','sanguo','sanyou','yanyi','co-tu-lenh','shanshui-xiangqi'];
 assert.deepEqual(Object.keys(stories.games).sort(),expected.sort());
 for(const [id,story] of Object.entries(stories.games)){
  assert.equal(story.screens.length,3,id);
  assert.ok(story.screens.every(screen=>screen.title&&screen.text),id);
  assert.ok(story.screens.some(screen=>screen.historicalNote),id);
  for(const screen of story.screens)for(const sourceId of screen.sourceIds)assert.ok(stories.sources[sourceId],id+' missing '+sourceId);
 }
 const component=read('../src/LaunchExperience.jsx');
 assert.match(component,/screen\.historicalNote/);
 assert.match(component,/PenguinAudience/);
});

test('Chaturanga retains only a paired roll, passes, and opt-in/out post-roll guide',()=>{
 assert.match(dice,/Roll both dice/);
 assert.match(dice,/Show my moves &amp; dice guide/);
 assert.match(dice,/legal\.find\(a=>a\.kind==='pass'/);
 assert.match(dice,/state\?\.dice\?\.rolled/);
 assert.match(dice,/setRollHelp/);
 assert.doesNotMatch(dice,/>Roll one die</);
 assert.match(app,/setSheet\('dominion-roll-help'\)/);
});

test('Royal victory screen is driven by official result and surviving pieces',()=>{
 assert.match(app,/outcome&&!victoryDismissed&&<VictoryCelebration/);
 const celebration=read('../src/VictoryCelebration.jsx');
 assert.match(celebration,/winningPieces/);
 assert.match(celebration,/DOMINION_TEAMS/);
 assert.match(celebration,/onFinalBoard/);
 assert.match(celebration,/onShare/);
 assert.match(celebration,/onRematch/);
 assert.match(celebration,/onBack/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
});

test('Bundle includes new CSS and adds supporting non-player penguins',()=>{
 assert.match(read('../scripts/build-current.mjs'),/'v5102-ux'/);
 assert.match(read('../src/PenguinAudience.jsx'),/not playable pieces/);
 assert.match(read('../src/GamesViews.jsx'),/PenguinAudience/);
});

test('Original v5.9.14 visual CSS bytes remain intact ahead of approved overlays',()=>{
 const baselineBytes=433523;
 const originalSha256='72cbe99f516cb84012a56155bd23f26097d9740650131ed7451d6b16d8e2d428';
 const current=fs.readFileSync(new URL('../src/approved-shell.css',import.meta.url));
 assert.ok(current.byteLength>=baselineBytes,'Legacy stylesheet was truncated');
 assert.equal(createHash('sha256').update(current.subarray(0,baselineBytes)).digest('hex'),originalSha256,'v5.9.14 visual baseline changed');
});
