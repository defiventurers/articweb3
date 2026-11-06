#!/usr/bin/env python3
"""Reproducible, SHA-pinned entry/native update preserving the released v5.9 bundle.

Remote main predates its discovery redesign. Recompile only the pure entry view
and native shell, retaining every engine/worker and the rest of the shipped JS.
"""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,zipfile,shutil
p=argparse.ArgumentParser();p.add_argument('--baseline',type=Path,required=True);p.add_argument('--sdk',type=Path,required=True);p.add_argument('--esbuild',type=Path,required=True);p.add_argument('--keystore',type=Path,required=True);p.add_argument('--password-file',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];work=root/'build/entry-v591';work.mkdir(parents=True,exist_ok=True);a.output.mkdir(parents=True,exist_ok=True)
assert hashlib.sha256(a.baseline.read_bytes()).hexdigest()=='3a8454da624118eba8605a42e9341095e260b5a251b0bf4df20f8599d6462d36','Wrong baseline APK'
def run(*args):subprocess.run([str(x) for x in args],check=True)
def tool(name):return next(a.sdk.rglob(name)).resolve()
aapt=tool('aapt2');platform=tool('android.jar');signer=tool('apksigner');align=tool('zipalign');d8=tool('d8.jar')
manifest=root/'android/app/src/main/AndroidManifest.xml';manifest_apk=work/'manifest.apk'
run(aapt,'link','-I',platform,'-I',a.baseline,'--manifest',manifest,'--min-sdk-version','24','--target-sdk-version','35','-o',manifest_apk)
resources=subprocess.check_output([str(aapt),'dump','resources',str(a.baseline)],text=True)
rid=re.search(r'resource (0x[0-9a-f]+) drawable/launch_ice\n',resources).group(1)
rjava=work/'R.java';rjava.write_text('package xyz.arcticdominion.play; public final class R { public static final class drawable { public static final int launch_ice='+rid+'; }}')
classes=work/'classes';classes.mkdir(exist_ok=True)
sources=list((root/'android/app/src/main/java').rglob('*.java'))+[rjava]
run('java','com.sun.tools.javac.Main','-encoding','UTF-8','-source','8','-target','8','-classpath',platform,'-d',classes,*sources)
jar=work/'classes.jar'
with zipfile.ZipFile(jar,'w') as z:
 for f in classes.rglob('*.class'):z.write(f,f.relative_to(classes))
dex=work/'dex';dex.mkdir(exist_ok=True);run('java','-cp',d8,'com.android.tools.r8.D8','--lib',platform,'--min-api','24','--output',dex,jar)
view=work/'view.js'
compile_js="const fs=require('fs'),es=require(process.argv[1]);let s=fs.readFileSync(process.argv[2],'utf8').replace(/^import React from 'react';\\n/,'').replace('export function','function');fs.writeFileSync(process.argv[3],es.transformSync(s,{loader:'jsx',jsxFactory:'__AKVisaH',jsxFragment:'x.Fragment',target:'es2020'}).code);"
run('node','-e',compile_js,a.esbuild,root/'src/VisaLandingView.jsx',view)
with zipfile.ZipFile(a.baseline) as z:files={n:z.read(n) for n in z.namelist() if not n.startswith('META-INF/') and not n.endswith('/')}
old=files['assets/app.js'].decode();needle='return/* @__PURE__ */ (0,x.jsxs)(`main`,{className:`visa-art-screen`'
assert old.count(needle)==1
start=old.index(needle);end=old.index('function wC({visa:e})',start);assert old[end-1]=='}'
replacement='return VisaLandingView({accountId:e.accountId,busy:a,error:s,progress:g,onSignIn:h,onRecover:()=>p(!0),onRetry:()=>u(v=>v+1),onSignOut:It});}'
patched=old[:start]+replacement+old[end:]
helper='function __AKVisaH(t,p,...c){return x.jsx(t,{...(p||{}),...(c.length?{children:c.length===1?c[0]:c}:{})});}\n'+view.read_text()
assert patched.startswith('(function(){');patched=patched.replace('(function(){','(function(){'+helper,1)
files['assets/app.js']=patched.encode();files['assets/app.css']+=b'\n'+(root/'src/passport-entry.css').read_bytes()
with zipfile.ZipFile(manifest_apk) as z:files['AndroidManifest.xml']=z.read('AndroidManifest.xml')
for n in list(files):
 if re.fullmatch(r'classes\d*\.dex',n):del files[n]
for f in dex.glob('*.dex'):files[f.name]=f.read_bytes()
artroot=root.parents[1]/'frontend/public/assets/passport-landing-v1'
new=[]
for f in sorted(artroot.rglob('*.webp')):
 url='art/passport-landing-v1/'+str(f.relative_to(artroot));files['assets/'+url]=f.read_bytes();new.append({'url':url,'bytes':f.stat().st_size})
meta=json.loads(files['assets/app-version.json']);meta.update(version='5.9.1',versionCode=89);meta['capabilities'].append('auth-custom-tabs-v1');files['assets/app-version.json']=json.dumps(meta).encode()
warm=json.loads(files['assets/game-assets.json']);warm['version']='5.9.1';warm['assets']+=new
for entry in warm['assets']:entry['bytes']=len(files['assets/'+entry['url']])
files['assets/game-assets.json']=json.dumps(warm).encode()
files['assets/game-assets-sw.js']=files['assets/game-assets-sw.js'].replace(b'ak-public-game-art-bundled-5.9.0',b'ak-public-game-art-bundled-5.9.1')
raw=work/'unsigned.apk'
with zipfile.ZipFile(raw,'w',zipfile.ZIP_DEFLATED) as z:
 for n,data in files.items():z.writestr(n,data)
aligned=work/'aligned.apk';run(align,'-f','-p','4',raw,aligned)
apk=a.output/'AntarcticKingdoms-v5.9.1.apk'
run(signer,'sign','--ks',a.keystore,'--ks-key-alias','arctic-play','--ks-pass','file:'+str(a.password_file),'--out',apk,aligned)
def certificate(path):
 s=subprocess.check_output([str(signer),'verify','--print-certs',str(path)],text=True)
 return re.search('certificate SHA-256 digest: ([0-9a-f]+)',s).group(1)
assert certificate(apk)==certificate(a.baseline),'Signing certificate changed'
run(signer,'verify','--verbose',apk);run(align,'-c','-p','4',apk)
with zipfile.ZipFile(a.baseline) as z:
 art=[n for n in z.namelist() if n.startswith('assets/art/') and not n.endswith('/')]
 assert all(files[n]==z.read(n) for n in art)
 assert all(files[n]==z.read(n) for n in z.namelist() if n.endswith('.js') and n!='assets/app.js' and n!='assets/game-assets-sw.js')
report={'version':'5.9.1','versionCode':89,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'bytes':apk.stat().st_size,'certificate':certificate(apk),'original_art_preserved':len(art),'preload_entries':len(warm['assets']),'new_art':new,'baseline_js_only_change':'Pure entry render; original account hooks, all games, discovery and workers retained','auth_surface':'Browser-owned Custom Tab in app task; not an embedded WebView or fully native Para SDK','server_optimizations':'Separate source patch; require server deployment','device_auth_tested':False}
(a.output/'v5.9.1-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
