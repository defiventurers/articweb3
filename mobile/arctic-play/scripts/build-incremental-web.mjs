#!/usr/bin/env node
// Preserve the verified shipped application; add browser installation and an atomic public cache.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const mobile = fileURLToPath(new URL('../', import.meta.url));
const root = path.resolve(mobile, '../..');
const require = createRequire(path.join(mobile, 'build-deps/package.json'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = '27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488';
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  if (!['--baseline-apk','--runtime-dir','--output','--version','--version-code','--apk-url','--apk-download-page','--metrics-endpoint'].includes(key) || !process.argv[i+1]) throw Error('Unknown or incomplete option: '+key);
  if (args[key]) throw Error('Duplicate option: '+key); args[key] = process.argv[i+1];
}
if (!args['--baseline-apk'] || !args['--output']) throw Error('Supply --baseline-apk and --output. Optional: --runtime-dir, --version, --version-code, --apk-url, --apk-download-page downloads/, --metrics-endpoint.');
if (args['--apk-url'] && args['--apk-download-page']) throw Error('Choose either a direct APK URL or the same-origin verified-download page.');
if (args['--apk-download-page'] && args['--apk-download-page'] !== 'downloads/') throw Error('The supported APK download page is downloads/.');
const baseline = path.resolve(args['--baseline-apk']);
if (hash(await fs.readFile(baseline)) !== expected) throw Error('Expected the verified v5.9.15 APK.');
const release = JSON.parse(await fs.readFile(path.join(mobile, 'release-config.json')));
const version = args['--version'] || release.versionName;
const versionCode = Number(args['--version-code'] || release.versionCode);
if (!/^\d+\.\d+\.\d+$/.test(version) || !Number.isSafeInteger(versionCode) || versionCode < 103 || versionCode > 2147483647) throw Error('Invalid web release version.');
const output = path.resolve(args['--output']);
if ([root,mobile,path.parse(output).root].includes(output)) throw Error('Unsafe output directory.');
const marker = path.join(output, '.incremental-web-build');
let existing = []; try { existing = await fs.readdir(output); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (existing.length) {
  if (await fs.readFile(marker, 'utf8').catch(()=>'') !== 'xyz.arcticdominion.play\n') throw Error('Output must be empty or an earlier incremental web output.');
  await fs.rm(output, {recursive:true});
}
await fs.mkdir(output, {recursive:true});
await fs.writeFile(marker, 'xyz.arcticdominion.play\n');
const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'ak-v5915-web-'));
try {
  execFileSync('python3', ['-c', `import pathlib,sys,zipfile
out=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(sys.argv[1]) as z:
 if z.testzip() is not None: raise ValueError('Corrupt baseline archive')
 for entry in z.infolist():
  if not entry.filename.startswith('assets/') or entry.is_dir(): continue
  relative=pathlib.PurePosixPath(entry.filename).relative_to('assets')
  if '..' in relative.parts or relative.is_absolute(): raise ValueError('Unsafe baseline asset')
  target=out/relative; target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(z.read(entry))
`, baseline, staging]);
  const original = new Map();
  async function visit(dir, fn) {
    for (const entry of await fs.readdir(dir, {withFileTypes:true})) {
      if (dir === output && entry.name === '.incremental-web-build') continue;
      if (entry.name.startsWith('.')) throw Error('Hidden runtime entry rejected: '+entry.name);
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw Error('Runtime symlinks are not allowed.');
      if (entry.isDirectory()) await visit(file, fn);
      else if (entry.isFile()) await fn(file);
      else throw Error('Unsupported runtime entry.');
    }
  }
  await visit(staging, async file => original.set(path.relative(staging, file).split(path.sep).join('/'), hash(await fs.readFile(file))));
  await fs.cp(staging, output, {recursive:true});
  if (args['--runtime-dir']) {
    const runtime = path.resolve(args['--runtime-dir']);
    if (runtime === output || runtime.startsWith(output+path.sep)) throw Error('Runtime overlay cannot be the output directory.');
    await visit(runtime, async file => {
      const relative = path.relative(runtime, file);
      const url = relative.split(path.sep).join('/');
      if (!original.has(url) && !url.startsWith('art/')) throw Error('Overlay must contain public baseline runtime files or additive artwork: '+url);
      if (!/\.(?:js|css|html|json|webmanifest|txt|webp|png|jpe?g|svg|woff2?|mp3|ogg|wav)$/i.test(relative)) throw Error('Unexpected runtime file: '+relative);
      const target = path.join(output, relative); await fs.mkdir(path.dirname(target), {recursive:true}); await fs.copyFile(file,target);
    });
  }
  for (const file of ['index.html','startup.js','theme-init.js']) if (hash(await fs.readFile(path.join(output,file))) !== original.get(file)) throw Error('Protected baseline file changed: '+file);
  // User-approved board presentation shared with the published early edition.
  await fs.copyFile(path.join(root,'frontend/public/assets/launch-v1/chaturanga-match/approved-151658.jpg'),path.join(output,'art/launch-v1/chaturanga-match/approved-151658.jpg')).catch(async error=>{if(error.code!=='ENOENT')throw error;await fs.mkdir(path.join(output,'art/launch-v1/chaturanga-match'),{recursive:true});await fs.copyFile(path.join(root,'frontend/public/assets/launch-v1/chaturanga-match/approved-151658.jpg'),path.join(output,'art/launch-v1/chaturanga-match/approved-151658.jpg'));});
  await fs.appendFile(path.join(output,'app.css'),'\n'+await fs.readFile(path.join(mobile,'src/chaturanga-match-v2.css'),'utf8'));
  const appFile = path.join(output,'app.js');
  let app = await fs.readFile(appFile, 'utf8');
  // Existing hook already requires an actual Android bridge. Do not create a fake bridge or bypass account access.
  if (!app.includes('required:s&&!!t&&t.versionCode>e.versionCode') || !app.includes('s=!!globalThis.window?.Android')) throw Error('The protected native-only required-update guard changed; review the runtime.');
  const config = /packageName:`xyz\.arcticdominion\.play`,versionName:`\d+\.\d+\.\d+`,versionCode:\d+,distribution:`(?:direct-apk|web-pwa)`/g;
  if ([...app.matchAll(config)].length !== 1) throw Error('Expected one shipped release-configuration anchor.');
  app = app.replace(config, `packageName:\`xyz.arcticdominion.play\`,versionName:\`${version}\`,versionCode:${versionCode},distribution:\`web-pwa\``);
  app=app.replace('image:O_(`dominion/board.webp`),imageWidth:1e3,imageHeight:1e3','image:O_(`launch-v1/chaturanga-match/approved-151658.jpg`),imageX:-73*1000/717,imageY:-429*1000/708,imageWidth:865*1000/717,imageHeight:1536*1000/708');
  await fs.writeFile(appFile, app);
  for (const file of ['pwa-tools.js','pwa-tools.css','launch-visit.js']) await fs.copyFile(path.join(mobile,'src',file),path.join(output,file));
  const sharp = require('sharp');
  for (const size of [192,512]) await sharp(path.join(staging,'art/brand/icon.webp')).resize(size,size,{fit:'contain',background:'#061a32'}).flatten({background:'#061a32'}).png().toFile(path.join(output,`pwa-icon-${size}.png`));
  const manifest = {id:'./',name:'Antarctic Kingdoms',short_name:'Kingdoms',description:'Traditional strategy games and friends at Lantern Harbor.',start_url:'./',scope:'./',display:'standalone',background_color:'#061a32',theme_color:'#061a32',icons:[192,512].map(size=>({src:`pwa-icon-${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'any'}))};
  await fs.writeFile(path.join(output,'manifest.webmanifest'),JSON.stringify(manifest));
  let apkAttribute = '';
  if (args['--apk-download-page']) apkAttribute = ' data-apk-download-page="downloads/"';
  if (args['--apk-url']) {
    const url = new URL(args['--apk-url']);
    if (url.protocol !== 'https:' || url.username || url.password || !/\.apk$/.test(url.pathname)) throw Error('APK link must be an explicit credential-free HTTPS APK URL.');
    const escape = value => value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    apkAttribute = ` data-apk-url="${escape(url.href)}"`;
  }
  let html = await fs.readFile(path.join(staging,'index.html'),'utf8');
  let metricsAttribute = '';
  if (args['--metrics-endpoint']) {
    const url = new URL(args['--metrics-endpoint']);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('Metrics endpoint must be an explicit credential-free HTTPS URL without query or fragment.');
    metricsAttribute = ` data-metrics-endpoint="${url.href.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}"`;
  }
  if (html.split('</head>').length !== 2 || html.split('</body>').length !== 2) throw Error('Unexpected baseline HTML.');
  html = html.replace('</head>','<link rel="stylesheet" href="pwa-tools.css"></head>').replace('</body>',`<script src="pwa-tools.js" data-version="${version}"${apkAttribute}></script><script src="launch-visit.js"${metricsAttribute}></script></body>`);
  await fs.writeFile(path.join(output,'index.html'),html);
  const metadata = JSON.parse(await fs.readFile(path.join(output,'app-version.json')));
  const baselineMetadata = JSON.parse(await fs.readFile(path.join(staging,'app-version.json')));
  metadata.version = version; metadata.versionCode = versionCode;
  metadata.capabilities = [...new Set([...(baselineMetadata.capabilities||[]),...(metadata.capabilities||[]),'incremental-web-pwa-v1'])];
  if (app.includes('heritage-intro')) metadata.capabilities.push('heritage-intros-v1','cultural-halls-v1');
  if (app.includes('art/chaturanga-final-four/pawns/')) metadata.capabilities.push('chaturanga-final-four-pawns-v1');
  metadata.capabilities = [...new Set(metadata.capabilities)];
  await fs.writeFile(path.join(output,'app-version.json'),JSON.stringify(metadata));
  const assetManifestFile = path.join(output,'game-assets.json');
  const assets = JSON.parse(await fs.readFile(assetManifestFile)); assets.version = version;
  if(!assets.assets.some(a=>a.url==='art/launch-v1/chaturanga-match/approved-151658.jpg'))assets.assets.push({url:'art/launch-v1/chaturanga-match/approved-151658.jpg'});
  for (const asset of assets.assets) {
    if (typeof asset.url !== 'string' || asset.url.startsWith('/') || asset.url.split('/').includes('..')) throw Error('Unsafe game asset URL.');
    asset.bytes = (await fs.stat(path.join(output,asset.url))).size;
  }
  await fs.writeFile(assetManifestFile,JSON.stringify(assets));
  const files = [];
  await visit(output, async file => {
    const relative = path.relative(output,file).split(path.sep).join('/');
    if (!['game-assets-sw.js'].includes(relative)) files.push({url:relative,sha256:hash(await fs.readFile(file))});
  });
  const shell = ['index.html','app.js','app.css','startup.js','theme-init.js','manifest.webmanifest','app-version.json','game-assets.json','pwa-tools.js','pwa-tools.css','launch-visit.js','fair-play.css','verify.html','verifier.js','bot.js','learn.js','fair-worker.js','shanshui-bot.js','co-tu-lenh-bot.js','pwa-icon-192.png','pwa-icon-512.png'].filter(file=>files.some(entry=>entry.url===file));
  const id = `${version}-${hash(JSON.stringify(files)).slice(0,16)}`;
  const worker = (await fs.readFile(path.join(mobile,'src/pwa-game-assets-sw.js'),'utf8')).replace('__AK_WEB_BUILD__',JSON.stringify({id,files,shell}));
  await fs.writeFile(path.join(output,'game-assets-sw.js'),worker);
  // Host support varies; deployment must preserve these cache policies or equivalent headers.
  await fs.writeFile(path.join(output,'_headers'),'/*\n  Cache-Control: no-cache\n  X-Content-Type-Options: nosniff\n/game-assets-sw.js\n  Cache-Control: no-store\n');
  const changedOriginals = [];
  for (const [file,digest] of original) if (hash(await fs.readFile(path.join(output,file))) !== digest) changedOriginals.push(file);
  const report = {version,versionCode,baselineVersion:'5.9.15',baselineSha256:expected,buildId:id,originalFiles:original.size,changedOriginals,protectedStartupAndThemeExact:true,originalArtUnchanged:[...original].filter(([file])=>file.startsWith('art/')).every(([file,digest])=>!changedOriginals.includes(file)),preservedBaselineCapabilities:baselineMetadata.capabilities,apkLink:args['--apk-url']||null,apkDownloadPage:args['--apk-download-page']||null,offlinePolicy:'Only explicitly hashed public shell/assets; accounts and APIs never cached. Existing matches keep their release until all tabs close.',liveLoginVerified:false,liveMultiplayerVerified:false,published:false};
  await fs.writeFile(path.join(output,'web-build-info.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output,...report}));
} finally { await fs.rm(staging,{recursive:true,force:true}); }
