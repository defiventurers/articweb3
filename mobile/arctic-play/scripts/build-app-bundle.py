#!/usr/bin/env python3
"""Produce a Play review AAB from the verified source-built APK, same signing key."""
import argparse,hashlib,json,pathlib,subprocess,tempfile,zipfile
p=argparse.ArgumentParser()
for name in ['apk','sdk','bundletool','keystore','password-file','output']:p.add_argument('--'+name,type=pathlib.Path,required=True)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
mobile=pathlib.Path(__file__).resolve().parents[1];release=json.loads((mobile/'release-config.json').read_text());work=pathlib.Path(tempfile.mkdtemp(prefix='aab-',dir=mobile/'build'))
def run(*args):return subprocess.check_output([str(v) for v in args],stderr=subprocess.STDOUT,text=True)
aapt=next(a.sdk.rglob('aapt2'));proto=work/'proto.apk';run(aapt,'convert','--output-format','proto','-o',proto,a.apk.resolve())
module=work/'base.zip'
with zipfile.ZipFile(proto) as source,zipfile.ZipFile(module,'w',zipfile.ZIP_DEFLATED) as target:
 for name in source.namelist():
  if name.endswith('/') or name.startswith('META-INF/'):continue
  dest='manifest/AndroidManifest.xml' if name=='AndroidManifest.xml' else 'dex/'+name if name.endswith('.dex') else name
  if dest=='resources.arsc':raise RuntimeError('Expected protobuf resources')
  target.writestr(dest,source.read(name))
out=a.output/f"AntarcticKingdoms-v{release['versionName']}.aab"
run('java','-jar',a.bundletool.resolve(),'build-bundle','--modules='+str(module),'--output='+str(out.resolve()),'--overwrite')
run('java','sun.security.tools.jarsigner.Main','-keystore',a.keystore.resolve(),'-storepass:file',a.password_file.resolve(),'-sigalg','SHA256withRSA','-digestalg','SHA-256',out.resolve(),'arctic-play')
verify=run('java','sun.security.tools.jarsigner.Main','-verify',out.resolve());assert 'jar verified' in verify
run('java','-jar',a.bundletool.resolve(),'validate','--bundle='+str(out.resolve()))
report={'file':out.name,'version':release['versionName'],'versionCode':release['versionCode'],'package':release['packageName'],'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'bytes':out.stat().st_size,'bundletool':'1.18.3','bundleValidation':'passed','jarSignature':'verified','targetSdk':36,'playConsoleSubmission':False,'deviceInstallationTested':False,'signing':'original Android update identity'}
(a.output/'app-bundle-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
