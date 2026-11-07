#!/usr/bin/env python3
"""SHA-pinned Passport and Chats update preserving the current game and account runtime."""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,zipfile
from apk_layout import verify_apk_layout

p=argparse.ArgumentParser()
for name in ['baseline','sdk','esbuild','keystore','password-file','output']:p.add_argument('--'+name,type=Path,required=True)
a=p.parse_args();root=Path(__file__).resolve().parents[1];work=root/'build/passport-v595';work.mkdir(parents=True,exist_ok=True);a.output.mkdir(parents=True,exist_ok=True)
assert hashlib.sha256(a.baseline.read_bytes()).hexdigest()=='c6b2e393ef099ad020944f83802ed86b4fab08d2587039de4501f4b8ec052b6a','Wrong baseline APK'
def run(*args):subprocess.run([str(x) for x in args],check=True)
def tool(name):return next(a.sdk.rglob(name)).resolve()
with zipfile.ZipFile(a.baseline) as z:files={n:z.read(n) for n in z.namelist() if not n.startswith('META-INF/') and not n.endswith('/')}
input_js=work/'baseline.js';input_js.write_bytes(files['assets/app.js']);patched=work/'app.js'
run('node',root/'scripts/patch-passport-bundle.mjs',input_js,patched,a.esbuild)
files['assets/app.js']=patched.read_bytes();files['assets/app.css']+=b'\n'+(root/'src/passport-book.css').read_bytes()
manifest=(root/'android/app/src/main/AndroidManifest.xml').read_text();assert 'versionCode="93" android:versionName="5.9.5"' in manifest
manifest_path=work/'AndroidManifest.xml';manifest_path.write_text(manifest);manifest_apk=work/'manifest.apk'
run(tool('aapt2'),'link','-I',tool('android.jar'),'-I',a.baseline,'--manifest',manifest_path,'--min-sdk-version','24','--target-sdk-version','35','-o',manifest_apk)
with zipfile.ZipFile(manifest_apk) as z:files['AndroidManifest.xml']=z.read('AndroidManifest.xml')
new=[];artroot=root.parents[1]/'frontend/public/assets/passport-book-v1'
for f in sorted(artroot.glob('*.webp')):
 url='art/passport-book-v1/'+f.name;files['assets/'+url]=f.read_bytes();new.append({'url':url,'bytes':f.stat().st_size})
assert len(new)==2
meta=json.loads(files['assets/app-version.json']);meta.update(version='5.9.5',versionCode=93);meta['capabilities']=list(dict.fromkeys(meta.get('capabilities',[])+['passport-book-v1']));files['assets/app-version.json']=json.dumps(meta).encode()
warm=json.loads(files['assets/game-assets.json']);warm['version']='5.9.5';entries={e['url']:e for e in warm['assets']}
for e in new:entries[e['url']]=e
warm['assets']=list(entries.values())
for e in warm['assets']:e['bytes']=len(files['assets/'+e['url']])
files['assets/game-assets.json']=json.dumps(warm).encode()
files['assets/game-assets-sw.js']=re.sub(rb'ak-public-game-art-bundled-5\.9\.[0-9]+',b'ak-public-game-art-bundled-5.9.5',files['assets/game-assets-sw.js'])
raw=work/'unsigned.apk'
with zipfile.ZipFile(raw,'w',zipfile.ZIP_DEFLATED) as z:
 for n,data in files.items():z.writestr(n,data,compress_type=zipfile.ZIP_STORED if n=='resources.arsc' else zipfile.ZIP_DEFLATED)
aligned=work/'aligned.apk';run(tool('zipalign'),'-f','-p','4',raw,aligned);verify_apk_layout(aligned)
apk=a.output/'AntarcticKingdoms-v5.9.5.apk';run(tool('apksigner'),'sign','--ks',a.keystore,'--ks-key-alias','arctic-play','--ks-pass','file:'+str(a.password_file),'--out',apk,aligned)
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
report={'version':'5.9.5','versionCode':93,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'bytes':apk.stat().st_size,'certificateSha256':certificate(apk),'baselineSha256':hashlib.sha256(a.baseline.read_bytes()).hexdigest(),'originalArtUnchanged':len(original_art),'gameWorkersAndOtherJsUnchanged':len(preserved_js),'nativeDexUnchanged':True,'preloadEntries':len(warm['assets']),'newArt':new,'layout':verify_apk_layout(apk),'runtimeChanges':'Recompiled Passport and Chats; preserved existing option/room handlers, game engines, account authority and loading readiness. Added read-only Crown projection and native Back dispatch for Passport subviews.','deviceVerified':False,'liveLoginVerified':False}
(a.output/'AntarcticKingdoms-v5.9.5-Verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
