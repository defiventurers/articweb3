#!/usr/bin/env python3
"""SHA-pinned Home replacement preserving the current game and account runtime."""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,zipfile
from apk_layout import verify_apk_layout

p=argparse.ArgumentParser()
for name in ['baseline','sdk','esbuild','keystore','password-file','output']:p.add_argument('--'+name,type=Path,required=True)
a=p.parse_args();root=Path(__file__).resolve().parents[1];work=root/'build/home-v594';work.mkdir(parents=True,exist_ok=True);a.output.mkdir(parents=True,exist_ok=True)
assert hashlib.sha256(a.baseline.read_bytes()).hexdigest()=='8e569faffb6d218b6441d4b6358d951c5cbb63cc326020345da42f1b46bce640','Wrong baseline APK'
def run(*args):subprocess.run([str(x) for x in args],check=True)
def tool(name):return next(a.sdk.rglob(name)).resolve()
with zipfile.ZipFile(a.baseline) as z:files={n:z.read(n) for n in z.namelist() if not n.startswith('META-INF/') and not n.endswith('/')}
old=files['assets/app.js'].decode()
start=old.index('function NC({onBrowse:e,');end=old.index('let PC=',start)
assert old.count('function NC({onBrowse:e,')==1 and old[end-1]=='}'
source=(root/'src/HomeLanding.jsx').read_text();source=re.sub(r'^import .*?;\n','',source,flags=re.M).replace('export function HomeLanding','function NC').replace('useLayoutEffect(','d.useLayoutEffect(')
input_js=work/'home.jsx';input_js.write_text(source);compiled=work/'home.js'
run('node','-e',"const fs=require('fs'),es=require(process.argv[1]);fs.writeFileSync(process.argv[3],es.transformSync(fs.readFileSync(process.argv[2],'utf8'),{loader:'jsx',jsxFactory:'__AKVisaH',jsxFragment:'x.Fragment',target:'es2020'}).code);",a.esbuild,input_js,compiled)
patched=old[:start]+compiled.read_text()+old[end:]
def replace_once(needle,replacement):
 global patched
 assert patched.count(needle)==1,('Unexpected bundle anchor',needle,patched.count(needle))
 patched=patched.replace(needle,replacement,1)
replace_once('onContinue:cr,continueLabel:lr,','onContinue:cr,continueLabel:lr,continueImage:Sn?Sv[Sn.room.tableId]?.card:or?Sv[or]?.card:null,')
replace_once('src:Qv.icon,alt:``,width:`40`,height:`40`','src:i===`home`?`art/home-v1/brand-logo.webp`:Qv.icon,alt:i===`home`?`Antarctic Gaming Co.`:``,width:`40`,height:`40`')
assert patched.count('children:i===`home`?`Lantern Harbor`')==2
patched=patched.replace('children:i===`home`?`Lantern Harbor`','children:i===`home`?`Antarctic Kingdoms`')
replace_once('versionName:`5.9.0`,versionCode:88,distribution:`direct-apk`','versionName:`5.9.4`,versionCode:92,distribution:`direct-apk`')
files['assets/app.js']=patched.encode();files['assets/app.css']+=b'\n'+(root/'src/home-redesign.css').read_bytes()
manifest=(root/'android/app/src/main/AndroidManifest.xml').read_text();assert 'versionCode="92" android:versionName="5.9.4"' in manifest
manifest_path=work/'AndroidManifest.xml';manifest_path.write_text(manifest);manifest_apk=work/'manifest.apk'
run(tool('aapt2'),'link','-I',tool('android.jar'),'-I',a.baseline,'--manifest',manifest_path,'--min-sdk-version','24','--target-sdk-version','35','-o',manifest_apk)
with zipfile.ZipFile(manifest_apk) as z:files['AndroidManifest.xml']=z.read('AndroidManifest.xml')
new=[];artroot=root.parents[1]/'frontend/public/assets/home-v1'
for f in sorted(artroot.glob('*.webp')):
 url='art/home-v1/'+f.name;files['assets/'+url]=f.read_bytes();new.append({'url':url,'bytes':f.stat().st_size})
assert len(new)==10
meta=json.loads(files['assets/app-version.json']);meta.update(version='5.9.4',versionCode=92);meta['capabilities']=list(dict.fromkeys(meta.get('capabilities',[])+['home-redesign-v1']));files['assets/app-version.json']=json.dumps(meta).encode()
warm=json.loads(files['assets/game-assets.json']);warm['version']='5.9.4';entries={e['url']:e for e in warm['assets']}
for e in new:entries[e['url']]=e
warm['assets']=list(entries.values())
for e in warm['assets']:e['bytes']=len(files['assets/'+e['url']])
files['assets/game-assets.json']=json.dumps(warm).encode()
files['assets/game-assets-sw.js']=re.sub(rb'ak-public-game-art-bundled-5\.9\.[0-9]+',b'ak-public-game-art-bundled-5.9.4',files['assets/game-assets-sw.js'])
raw=work/'unsigned.apk'
with zipfile.ZipFile(raw,'w',zipfile.ZIP_DEFLATED) as z:
 for n,data in files.items():z.writestr(n,data,compress_type=zipfile.ZIP_STORED if n=='resources.arsc' else zipfile.ZIP_DEFLATED)
aligned=work/'aligned.apk';run(tool('zipalign'),'-f','-p','4',raw,aligned);verify_apk_layout(aligned)
apk=a.output/'AntarcticKingdoms-v5.9.4.apk';run(tool('apksigner'),'sign','--ks',a.keystore,'--ks-key-alias','arctic-play','--ks-pass','file:'+str(a.password_file),'--out',apk,aligned)
def certificate(path):
 text=subprocess.check_output([str(tool('apksigner')),'verify','--print-certs',str(path)],text=True);return re.search('certificate SHA-256 digest: ([0-9a-f]+)',text).group(1)
assert certificate(apk)==certificate(a.baseline)
run(tool('apksigner'),'verify','--verbose',apk);run(tool('zipalign'),'-c','-p','4',apk)
with zipfile.ZipFile(a.baseline) as z:
 original_art=[n for n in z.namelist() if n.startswith('assets/art/') and not n.endswith('/')];assert all(files[n]==z.read(n) for n in original_art)
 preserved_js=[n for n in z.namelist() if n.endswith('.js') and n not in ['assets/app.js','assets/game-assets-sw.js']];assert all(files[n]==z.read(n) for n in preserved_js)
 assert all(files[n]==z.read(n) for n in z.namelist() if re.fullmatch(r'classes\d*\.dex',n))
assert all(len(files['assets/'+e['url']])==e['bytes'] for e in warm['assets'])
dest=root/'android/app/src/main/assets';dest.mkdir(parents=True,exist_ok=True)
for n,data in files.items():
 if n.startswith('assets/'):
  f=dest/n[7:];f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data)
report={'version':'5.9.4','versionCode':92,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'bytes':apk.stat().st_size,'certificateSha256':certificate(apk),'baselineSha256':hashlib.sha256(a.baseline.read_bytes()).hexdigest(),'originalArtUnchanged':len(original_art),'gameWorkersAndOtherJsUnchanged':len(preserved_js),'nativeDexUnchanged':True,'preloadEntries':len(warm['assets']),'newArt':new,'layout':verify_apk_layout(apk),'runtimeChanges':'Recompiled Home component, resume cover prop, Home header branding and app fallback version only. Existing route handlers, game engines, account authority and loading readiness retained.','deviceVerified':False,'liveLoginVerified':False}
(a.output/'AntarcticKingdoms-v5.9.4-Verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
