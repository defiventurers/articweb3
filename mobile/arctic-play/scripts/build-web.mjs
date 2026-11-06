// Preserve released artwork. No build step mutates server/ or legacy rulesets.
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const mobile=fileURLToPath(new URL('../',import.meta.url)),root=path.resolve(mobile,'../..');
const flag=process.argv.indexOf('--baseline-apk'),baseline=flag>=0?path.resolve(process.argv[flag+1]||''):process.env.ANTARCTIC_BASELINE_APK;
process.chdir(root);
if(!baseline)throw Error('Supply --baseline-apk /path/to/AntarcticKingdoms-v5.6.8.apk. Released artwork is required.');
const baselineHash='1f25ab4abd8578b399611e0f1ac66e801443c661235dd57c81a2c2788734ae6e';
if(createHash('sha256').update(await fs.readFile(baseline)).digest('hex')!==baselineHash)throw Error('Expected the verified v5.6.8 APK.');
const require=createRequire(path.join(mobile,'build-deps/package.json')),{build}=await import(require.resolve('rolldown'));
const destination=path.join(mobile,'android/app/src/main/assets'),release=JSON.parse(await fs.readFile(path.join(mobile,'release-config.json')));
const manifest=await fs.readFile(path.join(mobile,'android/app/src/main/AndroidManifest.xml'),'utf8');
if(!manifest.includes(`android:versionName="${release.versionName}"`)||!manifest.includes(`android:versionCode="${release.versionCode}"`))throw Error('Release and Android manifest versions differ.');
await fs.rm(destination,{recursive:true,force:true});await fs.mkdir(destination,{recursive:true});
execFileSync('python3',['-c',`import pathlib,sys,zipfile
out=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(sys.argv[1]) as z:
 for name in z.namelist():
  if not name.startswith('assets/') or name.endswith('/'):continue
  p=pathlib.PurePosixPath(name).relative_to('assets')
  if '..' in p.parts:raise ValueError('Unsafe asset path')
  dest=out/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(name))`,baseline,destination]);
const alias=Object.fromEntries(['react','react-dom','lucide-react'].map(name=>[name,path.join(mobile,'build-deps/node_modules',name)]));
const plugins=[{name:'explicit-css',load(id){if(id.endsWith('.css'))return {code:'',moduleType:'js'};}}];
async function bundle(input,file,platform='browser'){return build({input,plugins,platform,onwarn(warning,defaultHandler){if(['UNRESOLVED_IMPORT','MISSING_GLOBAL_NAME'].includes(warning.code))throw Error(warning.message);defaultHandler(warning);},resolve:{alias},transform:{target:'es2020',define:{'process.env.NODE_ENV':'"production"'}},output:{file,format:platform==='node'?'cjs':'iife',minify:platform!=='node',...(platform==='node'?{banner:'if (!globalThis.crypto) globalThis.crypto = require("node:crypto").webcrypto;'}:{})}});}
await bundle(path.join(mobile,'src/App.jsx'),path.join(destination,'app.js'));
for(const [input,output]of [['bot.worker.js','bot.js'],['learning.worker.js','learn.js'],['fair.worker.js','fair-worker.js']])await bundle(path.join(mobile,'src',input),path.join(destination,output));
await bundle(path.join(root,'frontend/src/games/shanshui-xiangqi/bot.worker.js'),path.join(destination,'shanshui-bot.js'));
await bundle(path.join(root,'shared/fair-play/VerifierPage.jsx'),path.join(destination,'verifier.js'));
await fs.mkdir(path.join(mobile,'build'),{recursive:true});
for(const name of ['games.ts','offlineLicense.js','presentation.js','updates.js','learning.js','adventures.js','minimalLearning.js','ownerAccess.js','sanyouCalibration.js','boardView.js','practiceBoard.js','soloPractice.js','curriculum.js','learningOrientation.js','courseActivities.js','companionJourney.js','firstJourney.js'])await bundle(path.join(mobile,'src',name),path.join(mobile,'build',name.replace(/\.(ts|js)$/,'.cjs')),'node');
await bundle(path.join(root,'frontend/src/games/shanshui-xiangqi/mobileAdapter.js'),path.join(mobile,'build/shanshui.cjs'),'node');
const art=path.join(destination,'art/shanshui');await fs.mkdir(art,{recursive:true});
const newArt=['board-light.webp','board-dark.webp','starting-position-light.webp','starting-position-dark.webp'];
for(const name of newArt)await fs.copyFile(path.join(root,'frontend/public/assets/games/shanshui-xiangqi',name),path.join(art,name));
await fs.cp(path.join(root,'frontend/public/assets/games/shanshui-xiangqi/pieces'),path.join(art,'pieces'),{recursive:true});
// Cờ Tư Lệnh artwork is additive, independent of the protected v5.6.8 art inventory.
const ctlArt=path.join(destination,'art/co-tu-lenh'),ctlSource=path.join(root,'frontend/public/assets/co-tu-lenh');
await fs.mkdir(path.join(ctlArt,'board'),{recursive:true});
await fs.cp(path.join(ctlSource,'pieces'),path.join(ctlArt,'pieces'),{recursive:true,filter:source=>!source.endsWith('.svg')});
await fs.copyFile(path.join(ctlSource,'board/board-antarctic-11x12.webp'),path.join(ctlArt,'board/board-antarctic-11x12.webp'));
await fs.copyFile(path.join(ctlSource,'rules-profiles-v0.3.json'),path.join(ctlArt,'rules-profiles-v0.3.json'));
await fs.copyFile(path.join(ctlSource,'youtuber-rules-v1.json'),path.join(ctlArt,'youtuber-rules-v1.json'));
const styles=['styles.css','startup.css','ice-theme.css','frostbound.css','archive-world.css','gathering.css','celebration.css','release-controls.css','learning-rules.css','compact-lobby.css','unlocks.css','chaturanga-fast.css','account-entry.css','board-calibration.css','discovery.css','visa-compact.css','visa-welcome.css','passport-entry.css','harbor-onboarding.css','home-redesign.css'];
const css=await Promise.all(styles.map(name=>fs.readFile(path.join(mobile,'src',name),'utf8')));
for(const file of ['shared/antarctic-visa/visa.css','shared/fair-play/fair-play.css','frontend/src/games/shanshui-xiangqi/shanshui.css','frontend/src/games/co-tu-lenh/coTuLenh.css'])css.push(await fs.readFile(path.join(root,file),'utf8'));
css.push('.ctl-catalogue-entry{display:grid;grid-template-columns:minmax(100px,35%) 1fr;gap:18px;align-items:center;margin:16px 0 24px;padding:16px;background:var(--surface,#102942);border:1px solid #638da988;border-radius:20px}.ctl-catalogue-entry img{width:100%;max-height:270px;object-fit:contain;border-radius:14px}.ctl-catalogue-entry h2{font-size:22px;margin:6px 0}.ctl-catalogue-entry p{font-size:14px;line-height:1.5}@media(max-width:440px){.ctl-catalogue-entry{grid-template-columns:1fr}.ctl-catalogue-entry img{max-height:150px}}');
css.push('.shanshui-catalogue-entry{display:grid;grid-template-columns:minmax(100px,35%) 1fr;gap:18px;align-items:center;margin:16px 0 24px;padding:16px;background:var(--surface,#102942);border:1px solid #a789ce77;border-radius:20px}.shanshui-catalogue-entry img{width:100%;border-radius:14px}.shanshui-catalogue-entry h2{font-size:22px;margin:6px 0}.shanshui-catalogue-entry p{font-size:14px;line-height:1.5}.shanshui-online-setup,.shanshui-online-summary{max-width:900px;margin:20px auto;padding:20px}.shanshui-online-setup form,.shanshui-online-summary form{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}.shanshui-app input{font:inherit;max-width:100%;padding:10px;border:1px solid #aaa;border-radius:10px}.shanshui-online-seats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}');
await fs.cp(path.join(root,'frontend/public/assets/passport-landing-v1'),path.join(destination,'art/passport-landing-v1'),{recursive:true});
await fs.cp(path.join(root,'frontend/public/assets/onboarding-v2'),path.join(destination,'art/onboarding-v2'),{recursive:true});
await fs.cp(path.join(root,'frontend/public/assets/home-v1'),path.join(destination,'art/home-v1'),{recursive:true});
await fs.writeFile(path.join(destination,'app.css'),css.join('\n'));
for(const file of ['startup.js','theme-init.js'])await fs.copyFile(path.join(mobile,'src',file),path.join(destination,file));
await fs.writeFile(path.join(destination,'app-version.json'),JSON.stringify({version:release.versionName,versionCode:release.versionCode,capabilities:['dominion-teams-v1','browser-play-v1','fair-play-v1','shanshui-antarctic-v1','co-tu-lenh-practice-v05']}));
const warm=JSON.parse(await fs.readFile(path.join(destination,'game-assets.json')));
for(const name of [...newArt,...(await fs.readdir(path.join(art,'pieces'))).map(n=>'pieces/'+n)]){const url='art/shanshui/'+name;warm.assets.push({url,bytes:(await fs.stat(path.join(destination,url))).size});}
warm.assets.push({url:'shanshui-bot.js',bytes:(await fs.stat(path.join(destination,'shanshui-bot.js'))).size});
for(const name of ['board/board-antarctic-11x12.webp',...(await fs.readdir(path.join(ctlArt,'pieces'))).filter(n=>n.endsWith('.webp')).map(n=>'pieces/'+n)]){const url='art/co-tu-lenh/'+name;warm.assets.push({url,bytes:(await fs.stat(path.join(destination,url))).size});}for(const url of ['backgrounds/passport-arrivals-daylight.webp','hosts/passport-polly-welcome.webp','brand/antarctic-gaming-co-logo.webp'])warm.assets.push({url:'art/passport-landing-v1/'+url,bytes:(await fs.stat(path.join(destination,'art/passport-landing-v1',url))).size});warm.version=release.versionName;
for(const name of (await fs.readdir(path.join(destination,'art/onboarding-v2'))).filter(n=>n.endsWith('.webp'))){const url='art/onboarding-v2/'+name;warm.assets.push({url,bytes:(await fs.stat(path.join(destination,url))).size});}
for(const name of (await fs.readdir(path.join(destination,'art/home-v1'))).filter(n=>n.endsWith('.webp'))){const url='art/home-v1/'+name;warm.assets.push({url,bytes:(await fs.stat(path.join(destination,url))).size});}
for(const item of warm.assets)item.bytes=(await fs.stat(path.join(destination,item.url))).size;
await fs.writeFile(path.join(destination,'game-assets.json'),JSON.stringify(warm));
await fs.writeFile(path.join(destination,'game-assets-sw.js'),(await fs.readFile(path.join(root,'shared/game-assets/game-assets-sw.js'),'utf8')).replace('__GAME_ASSET_CACHE_VERSION__','ak-public-game-art-bundled-'+release.versionName));
await fs.writeFile(path.join(mobile,'build/mobile-baseline.json'),JSON.stringify({version:release.versionName,baselineVersion:'5.6.8',baselineSha256:baselineHash,legacyGames:7,newGames:['shanshui-xiangqi','co-tu-lenh'],artworkPolicy:'Existing artwork reused byte for byte',nativePolicy:'Unchanged v5.6.8 native shell'},null,2)+'\n');
console.log(`Built current Antarctic Kingdoms ${release.versionName}: seven existing games + Shanshui + Cờ Tư Lệnh; ${warm.assets.length} preload assets. Server files were not regenerated.`);
