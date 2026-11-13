import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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

test('Games has exactly three navigation modes and Story Adventure is default',()=>{
 assert.match(app,/setGamesView]=useState\('story'\)/);
 assert.match(app,/Story Adventure'\],\['all','All Games'\],\['halls','Halls'/);
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
