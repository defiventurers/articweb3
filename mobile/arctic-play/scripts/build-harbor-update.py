#!/usr/bin/env python3
"""Recompile onboarding/readiness over the verified 5.9.2 APK, preserving its games."""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,zipfile
from apk_layout import verify_apk_layout

p=argparse.ArgumentParser()
for name in ['baseline','sdk','esbuild','keystore','password-file','output']:p.add_argument('--'+name,type=Path,required=True)
a=p.parse_args();root=Path(__file__).resolve().parents[1]
work=root/'build/harbor-v593';work.mkdir(parents=True,exist_ok=True);a.output.mkdir(parents=True,exist_ok=True)
assert hashlib.sha256(a.baseline.read_bytes()).hexdigest()=='543fcbeb7c6ed86af2c9342ffa6794ebdb5f504280f233aabd1e014363b20975','Wrong baseline APK'
def run(*args):subprocess.run([str(x) for x in args],check=True)
def tool(name):return next(a.sdk.rglob(name)).resolve()
with zipfile.ZipFile(a.baseline) as z:files={n:z.read(n) for n in z.namelist() if not n.startswith('META-INF/') and not n.endswith('/')}
old=files['assets/app.js'].decode();boundary=old.index('\nvar ')
assert old.startswith('(function(){function __AKVisaH') and old[boundary-1]=='}'
controller=(root/'src/harborConnection.js').read_text().replace('export ','')
view=(root/'src/VisaLandingView.jsx').read_text()
view=re.sub(r'^import .*?;\n','',view,flags=re.M).replace('export function','function').replace('useState(','d.useState(').replace('useEffect(','d.useEffect(')
input_js=work/'entry.jsx';input_js.write_text(controller+'\n'+view)
compiled=work/'entry.js'
run('node','-e',"const fs=require('fs'),es=require(process.argv[1]);fs.writeFileSync(process.argv[3],es.transformSync(fs.readFileSync(process.argv[2],'utf8'),{loader:'jsx',jsxFactory:'__AKVisaH',jsxFragment:'x.Fragment',target:'es2020'}).code);",a.esbuild,input_js,compiled)
helper='function __AKVisaH(t,p,...c){return x.jsx(t,{...(p||{}),...(c.length?{children:c.length===1?c[0]:c}:{})});}\n'
patched='(function(){'+helper+compiled.read_text()+old[boundary:]
def replace_once(needle,replacement):
 global patched
 assert patched.count(needle)==1,('Unexpected bundle anchor',needle,patched.count(needle))
 patched=patched.replace(needle,replacement,1)
replace_once('timeoutMs:a=15e3}={}){let o=new AbortController',r'timeoutMs:a=15e3}={}){if(/^\/(auth\/|recover$|passport$|play-access$)/.test(e))await harborConnection.ensureReady();let o=new AbortController')
replace_once('The cloud service needs an update. Your progress stays on this phone.','The connection was interrupted. Please try again.')
replace_once('async function Gt(e=`manage`){','async function Gt(e=`manage`){let __akHarborIntent=harborConnection.captureIntent();')
replace_once('if(!G(`auth-handoff`,','harborConnection.assertIntent(__akHarborIntent);if(!G(`auth-handoff`,')
replace_once('return VisaLandingView({accountId:e.accountId,busy:a,error:s,progress:g,onSignIn:h,onRecover:()=>p(!0),onRetry:()=>u(v=>v+1),onSignOut:It});','return x.jsx(VisaLandingView,{accountId:e.accountId,busy:a,error:s,progress:g,onSignIn:h,onRecover:()=>p(!0),onRetry:()=>u(v=>v+1),onSignOut:It});')
assert 'initialMode:i=`start`,compact:a=!1' in patched
replace_once('className:`entry-harbor`,src:`art/celebration/scenes/lantern-harbor-festival.webp`','className:`entry-harbor`,src:a?`art/onboarding-v2/nova-reassure.webp`:`art/celebration/scenes/lantern-harbor-festival.webp`')
files['assets/app.js']=patched.encode()
files['assets/app.css']+=b'\n'+(root/'src/harbor-onboarding.css').read_bytes()
manifest=(root/'android/app/src/main/AndroidManifest.xml').read_text().replace('android:versionCode="90" android:versionName="5.9.2"','android:versionCode="91" android:versionName="5.9.3"')
assert 'versionName="5.9.3"' in manifest
manifest_path=work/'AndroidManifest.xml';manifest_path.write_text(manifest);manifest_apk=work/'manifest.apk'
run(tool('aapt2'),'link','-I',tool('android.jar'),'-I',a.baseline,'--manifest',manifest_path,'--min-sdk-version','24','--target-sdk-version','35','-o',manifest_apk)
with zipfile.ZipFile(manifest_apk) as z:files['AndroidManifest.xml']=z.read('AndroidManifest.xml')
new=[];artroot=root.parents[1]/'frontend/public/assets/onboarding-v2'
for f in sorted(artroot.glob('*.webp')):
 url='art/onboarding-v2/'+f.name;files['assets/'+url]=f.read_bytes();new.append({'url':url,'bytes':f.stat().st_size})
assert len(new)==11
meta=json.loads(files['assets/app-version.json']);meta.update(version='5.9.3',versionCode=91);meta['capabilities']=list(dict.fromkeys(meta.get('capabilities',[])+['harbor-readiness-v1','nova-onboarding-v2']));files['assets/app-version.json']=json.dumps(meta).encode()
warm=json.loads(files['assets/game-assets.json']);warm['version']='5.9.3';entries={e['url']:e for e in warm['assets']}
for e in new:entries[e['url']]=e
warm['assets']=list(entries.values())
for e in warm['assets']:e['bytes']=len(files['assets/'+e['url']])
files['assets/game-assets.json']=json.dumps(warm).encode()
files['assets/game-assets-sw.js']=re.sub(rb'ak-public-game-art-bundled-5\.9\.[0-9]+',b'ak-public-game-art-bundled-5.9.3',files['assets/game-assets-sw.js'])
raw=work/'unsigned.apk'
with zipfile.ZipFile(raw,'w',zipfile.ZIP_DEFLATED) as z:
 for n,data in files.items():z.writestr(n,data,compress_type=zipfile.ZIP_STORED if n=='resources.arsc' else zipfile.ZIP_DEFLATED)
aligned=work/'aligned.apk';run(tool('zipalign'),'-f','-p','4',raw,aligned);verify_apk_layout(aligned)
apk=a.output/'AntarcticKingdoms-v5.9.3.apk'
run(tool('apksigner'),'sign','--ks',a.keystore,'--ks-key-alias','arctic-play','--ks-pass','file:'+str(a.password_file),'--out',apk,aligned)
def certificate(path):
 text=subprocess.check_output([str(tool('apksigner')),'verify','--print-certs',str(path)],text=True)
 return re.search('certificate SHA-256 digest: ([0-9a-f]+)',text).group(1)
assert certificate(apk)==certificate(a.baseline)
run(tool('apksigner'),'verify','--verbose',apk);run(tool('zipalign'),'-c','-p','4',apk)
with zipfile.ZipFile(a.baseline) as z:
 original_art=[n for n in z.namelist() if n.startswith('assets/art/') and not n.endswith('/')]
 assert all(files[n]==z.read(n) for n in original_art)
 preserved_js=[n for n in z.namelist() if n.endswith('.js') and n not in ['assets/app.js','assets/game-assets-sw.js']]
 assert all(files[n]==z.read(n) for n in preserved_js)
 assert all(files[n]==z.read(n) for n in z.namelist() if re.fullmatch(r'classes\d*\.dex',n))
assert all(len(files['assets/'+e['url']])==e['bytes'] for e in warm['assets'])
dest=root/'android/app/src/main/assets';dest.mkdir(parents=True,exist_ok=True)
for n,data in files.items():
 if n.startswith('assets/'):
  f=dest/n[7:];f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data)
report={'version':'5.9.3','versionCode':91,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'bytes':apk.stat().st_size,'certificateSha256':certificate(apk),'baselineSha256':hashlib.sha256(a.baseline.read_bytes()).hexdigest(),'originalArtUnchanged':len(original_art),'gameWorkersAndOtherJsUnchanged':len(preserved_js),'nativeDexUnchanged':True,'preloadEntries':len(warm['assets']),'newArt':new,'layout':verify_apk_layout(apk),'onboardingUpdate':'Recompiled entry component and bounded readiness controller; guarded cloud preflight and recovery artwork source transforms. Existing game/account authority retained.','deviceVerified':False,'liveLoginVerified':False}
(a.output/'AntarcticKingdoms-v5.9.3-Verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
