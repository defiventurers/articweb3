#!/usr/bin/env python3
"""Create a separately labelled API36 Play-review bundle from the protected APK.

Only the target SDK changes for this review variant. Native/Android16 behaviour
still requires device testing; bundle validation is not Play publication.
"""
from pathlib import Path
import argparse, hashlib, json, struct, subprocess, tempfile, zipfile

CERT='20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37'
p=argparse.ArgumentParser(description=__doc__)
for n in ['apk','sdk','bundletool','keystore','password-file','output']:
    p.add_argument('--'+n,type=Path,required=True)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
def run(*args):return subprocess.check_output([str(x) for x in args],stderr=subprocess.STDOUT,text=True)
def tool(name):return next(a.sdk.rglob(name)).resolve()
if CERT not in run(tool('apksigner'),'verify','--print-certs',a.apk.resolve()):
    raise ValueError('Input APK does not have original release identity')
with zipfile.ZipFile(a.apk) as z:
    metadata=json.loads(z.read('assets/app-version.json'))
    files={n:z.read(n) for n in z.namelist() if not n.endswith('/') and not n.startswith('META-INF/')}
b=bytearray(files['AndroidManifest.xml']);u16=lambda p:struct.unpack_from('<H',b,p)[0];u32=lambda p:struct.unpack_from('<I',b,p)[0]
pos=u16(2);strings=[];changes=0
while pos<len(b):
    kind,header,size=struct.unpack_from('<HHI',b,pos)
    if size<header or size<=0:raise ValueError('Invalid manifest chunk')
    if kind==1:
        if u32(pos+16)&256:raise ValueError('Expected UTF16 baseline manifest')
        count,start=u32(pos+8),u32(pos+20)
        for i in range(count):
            loc=pos+start+u32(pos+header+4*i);length=u16(loc)
            strings.append(bytes(b[loc+2:loc+2+length*2]).decode('utf-16le'))
    if kind==0x102:
        ext=pos+header
        if strings[u32(ext+4)]=='uses-sdk':
            start_attr,attr_size,count=struct.unpack_from('<HHH',b,ext+8)
            for i in range(count):
                attr=ext+start_attr+i*attr_size
                if strings[u32(attr+4)]=='targetSdkVersion':
                    if u32(attr+16)!=35:raise ValueError('Expected protected direct APK target35')
                    struct.pack_into('<I',b,attr+16,36);changes+=1
    pos+=size
if changes!=1:raise ValueError('Expected exactly one target SDK change')
files['AndroidManifest.xml']=bytes(b)
with tempfile.TemporaryDirectory(prefix='ak-play-review-') as folder:
    work=Path(folder);review=work/'review-api36.apk';proto=work/'proto.apk';module=work/'base.zip'
    with zipfile.ZipFile(review,'w',zipfile.ZIP_DEFLATED) as z:
        for name,data in files.items():z.writestr(name,data,compress_type=zipfile.ZIP_STORED if name=='resources.arsc' else zipfile.ZIP_DEFLATED)
    badging=run(tool('aapt2'),'dump','badging',review)
    if "targetSdkVersion:'36'" not in badging or "name='xyz.arcticdominion.play'" not in badging:raise ValueError('API36 review manifest mismatch')
    run(tool('aapt2'),'convert','--output-format','proto','-o',proto,review)
    with zipfile.ZipFile(proto) as z,zipfile.ZipFile(module,'w',zipfile.ZIP_DEFLATED) as out:
        for name in z.namelist():
            if name.endswith('/') or name.startswith('META-INF/'):continue
            dest='manifest/AndroidManifest.xml' if name=='AndroidManifest.xml' else 'dex/'+name if name.endswith('.dex') else name
            if dest=='resources.arsc':raise ValueError('Expected proto resources')
            out.writestr(dest,z.read(name))
    out=a.output/('AntarcticKingdoms-v'+metadata['version']+'-API36-REVIEW.aab')
    run('java','-jar',a.bundletool.resolve(),'build-bundle','--modules='+str(module),'--output='+str(out.resolve()),'--overwrite')
    run('java','sun.security.tools.jarsigner.Main','-keystore',a.keystore.resolve(),'-storepass:file',a.password_file.resolve(),'-sigalg','SHA256withRSA','-digestalg','SHA-256',out.resolve(),'arctic-play')
    if 'jar verified' not in run('java','sun.security.tools.jarsigner.Main','-verify',out.resolve()):raise ValueError('Bundle signature failed')
    run('java','-jar',a.bundletool.resolve(),'validate','--bundle='+str(out.resolve()))
    # Verify the APK set Google Play would generate, rather than trusting bundle
    # syntax alone. Explicit signing prevents fallback to a debug identity.
    apks=work/'review.apks'
    run('java','-jar',a.bundletool.resolve(),'build-apks','--bundle='+str(out.resolve()),'--output='+str(apks),'--mode=universal','--aapt2='+str(tool('aapt2')),'--ks='+str(a.keystore.resolve()),'--ks-pass=file:'+str(a.password_file.resolve()),'--ks-key-alias=arctic-play','--overwrite')
    universal=work/'universal.apk'
    with zipfile.ZipFile(apks) as z:universal.write_bytes(z.read('universal.apk'))
    if CERT not in run(tool('apksigner'),'verify','--print-certs',universal):raise ValueError('Generated APK signer differs')
    if "targetSdkVersion:'36'" not in run(tool('aapt2'),'dump','badging',universal):raise ValueError('Generated APK target differs')
    with zipfile.ZipFile(universal) as z:
        for name,data in files.items():
            if name.startswith('assets/') or name.endswith('.dex'):
                if z.read(name)!=data:raise ValueError('Bundle conversion changed runtime payload: '+name)
report={'file':out.name,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'bytes':out.stat().st_size,'version':metadata['version'],'versionCode':metadata['versionCode'],'package':'xyz.arcticdominion.play','targetSdk':36,'originalSigningIdentityVerified':True,'bundleValidation':'passed','generatedUniversalApkSignature':'passed','generatedAssetsAndDexExact':True,'deviceTested':False,'android16BehaviourVerified':False,'playSubmitted':False,'releaseStatus':'review-only'}
(a.output/'play-bundle-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
