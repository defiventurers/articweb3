// Reproducible source build shared by Android and the browser. No APK patching.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {buildFairRules} from './build-fair-rules.mjs';
import {materializeRuntimeArt} from './materialize-runtime-art.mjs';
const mobile=fileURLToPath(new URL('../',import.meta.url)),root=path.resolve(mobile,'../..');
const require=createRequire(path.join(mobile,'build-deps/package.json')),{build}=await import(require.resolve('rolldown'));
const destination=path.join(root,'server/arcticPlayWeb'),release=JSON.parse(await fs.readFile(path.join(mobile,'release-config.json')));
const hash=b=>createHash('sha256').update(b).digest('hex');
await materializeRuntimeArt(mobile);
await fs.rm(destination,{recursive:true,force:true});await fs.mkdir(destination,{recursive:true});await fs.mkdir(path.join(mobile,'build'),{recursive:true});
const inventory=JSON.parse(await fs.readFile(path.join(mobile,'runtime-art-sources.json')));
for(const a of inventory.assets){const bytes=await fs.readFile(path.join(root,a.source));if(hash(bytes)!==a.sha256)throw Error('Artwork source changed: '+a.source);const target=path.join(destination,a.url);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}
for(const folder of ['launch-v1']){const from=path.join(root,'frontend/public/assets',folder);try{await fs.cp(from,path.join(destination,'art',folder),{recursive:true,filter:source=>!source.includes('/social')&&!source.endsWith('.md')});}catch(e){if(e.code!=='ENOENT')throw e;}}
const alias=Object.fromEntries(['react','react-dom','lucide-react'].map(n=>[n,path.join(mobile,'build-deps/node_modules',n)]));
const plugins=[{name:'explicit-css',load(id){if(id.endsWith('.css'))return {code:'',moduleType:'js'};}}];
const bundle=(input,output,platform='browser')=>build({input,platform,plugins,resolve:{alias},onwarn(w,d){if(w.code==='MODULE_LEVEL_DIRECTIVE')return;if(['UNRESOLVED_IMPORT','MISSING_GLOBAL_NAME'].includes(w.code))throw Error(w.message);d(w);},transform:{target:'es2020',define:{'process.env.NODE_ENV':'"production"',...(platform==='browser'?{'import.meta.env':'{}','import.meta.url':'globalThis.location.href'}:{})}},output:{file:output,format:platform==='node'?'cjs':'iife',minify:platform!=='node',...(platform==='node'?{banner:'if (!globalThis.crypto) globalThis.crypto = require("node:crypto").webcrypto;'}:{})}});
// Publish exact rules digests before building the independent verifier.
await buildFairRules({build,root,mobile});
await bundle(path.join(mobile,'src/App.jsx'),path.join(destination,'app.js'));
for(const [source,target] of [['bot.worker.js','bot.js'],['learning.worker.js','learn.js'],['fair.worker.js','fair-worker.js']])await bundle(path.join(mobile,'src',source),path.join(destination,target));
await bundle(path.join(root,'frontend/src/games/shanshui-xiangqi/bot.worker.js'),path.join(destination,'shanshui-bot.js'));
await bundle(path.join(root,'shared/fair-play/VerifierPage.jsx'),path.join(destination,'verifier.js'));
const nodeModules=['games.ts','offlineLicense.js','presentation.js','updates.js','learning.js','adventures.js','minimalLearning.js','ownerAccess.js','sanyouCalibration.js','boardView.js','practiceBoard.js','soloPractice.js','curriculum.js','learningOrientation.js','courseActivities.js','companionJourney.js','firstJourney.js','chaturangaLongDice.js','walletPortfolio.js'];
for(const source of nodeModules)await bundle(path.join(mobile,'src',source),path.join(mobile,'build',source.replace(/\.(ts|js)$/,'.cjs')),'node');
await bundle(path.join(root,'frontend/src/games/shanshui-xiangqi/mobileAdapter.js'),path.join(mobile,'build/shanshui.cjs'),'node');
const cssNames=['styles','startup','ice-theme','frostbound','archive-world','gathering','celebration','release-controls','learning-rules','compact-lobby','unlocks','chaturanga-fast','account-entry','board-calibration','discovery','visa-compact','visa-welcome','passport-entry','harbor-onboarding','home-redesign','home-heritage','passport-book','passport-wallet','chaturanga-heritage','launch'];
const css=await Promise.all(cssNames.map(n=>fs.readFile(path.join(mobile,'src',n+'.css'),'utf8')));
for(const n of ['shared/antarctic-visa/visa.css','shared/fair-play/fair-play.css','shared/compact-panels/compact-game-panels.css','frontend/src/games/shanshui-xiangqi/shanshui.css','frontend/src/games/co-tu-lenh/coTuLenh.css'])css.push(await fs.readFile(path.join(root,n),'utf8'));
await fs.writeFile(path.join(destination,'app.css'),css.join('\n'));
await fs.copyFile(path.join(root,'shared/fair-play/fair-play.css'),path.join(destination,'fair-play.css'));
for(const n of ['startup.js','theme-init.js'])await fs.copyFile(path.join(mobile,'src',n),path.join(destination,n));
for(const n of ['index.html','verify.html','THIRD_PARTY_NOTICES.txt'])await fs.copyFile(path.join(mobile,'runtime-assets',n),path.join(destination,n));
await fs.copyFile(path.join(mobile,'src/pwa-sw.js'),path.join(destination,'pwa-sw.js'));
await fs.writeFile(path.join(destination,'manifest.webmanifest'),JSON.stringify({id:'/arctic-play/app/',name:'Antarctic Kingdoms',short_name:'Kingdoms',description:'Traditional strategy, stories and friends in Lantern Harbor.',start_url:'./',scope:'./',display:'standalone',background_color:'#071b2e',theme_color:'#071b2e',icons:[{src:'art/brand/icon.webp',sizes:'512x512',type:'image/webp',purpose:'any'}]}));
await fs.writeFile(path.join(destination,'app-version.json'),JSON.stringify({version:release.versionName,versionCode:release.versionCode,capabilities:['dominion-teams-v1','browser-play-v1','fair-play-v1','chaturanga-long-dice-v1','heritage-intros-v1','cultural-halls-v1','launch-dashboard-v1']}));
const assets=[];async function scan(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await scan(f);else if(/\.(webp|png|jpe?g|svg|woff2?|mp3|ogg|wav)$/.test(e.name))assets.push({url:path.relative(destination,f).split(path.sep).join('/'),bytes:(await fs.stat(f)).size});}}
await scan(path.join(destination,'art'));
for(const url of ['bot.js','learn.js','fair-worker.js','shanshui-bot.js'])assets.push({url,bytes:(await fs.stat(path.join(destination,url))).size});
await fs.writeFile(path.join(destination,'game-assets.json'),JSON.stringify({version:release.versionName,assets}));
await fs.writeFile(path.join(destination,'game-assets-sw.js'),(await fs.readFile(path.join(root,'shared/game-assets/game-assets-sw.js'),'utf8')).replace('__GAME_ASSET_CACHE_VERSION__','ak-public-game-art-bundled-'+release.versionName));
if(process.argv.includes('--native')){const native=path.join(mobile,'android/app/src/main/assets');await fs.rm(native,{recursive:true,force:true});await fs.cp(destination,native,{recursive:true});}
if(process.argv.includes('--frontend')){const browser=path.join(root,'frontend/public/play');await fs.rm(browser,{recursive:true,force:true});await fs.cp(destination,browser,{recursive:true});const file=path.join(browser,'manifest.webmanifest'),manifest=JSON.parse(await fs.readFile(file));manifest.id='/play/';await fs.writeFile(file,JSON.stringify(manifest));}
console.log(JSON.stringify({version:release.versionName,artworkFiles:assets.length,destination,sourceBuild:true}));
