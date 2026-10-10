#!/usr/bin/env python3
"""Build and sign the dependency-free native shell with official Android SDK tools.

The bundled React app is built by `npm run build` first. Signing material remains
outside the repository; keep it to sign future updates with the same identity.
"""
import argparse, hashlib, json, os, pathlib, secrets, shutil, subprocess, tempfile, zipfile

parser=argparse.ArgumentParser()
parser.add_argument('--sdk',required=True,type=pathlib.Path)
parser.add_argument('--jdk',required=True,type=pathlib.Path)
parser.add_argument('--output',required=True,type=pathlib.Path)
parser.add_argument('--keystore',type=pathlib.Path)
parser.add_argument('--password-file',type=pathlib.Path)
args=parser.parse_args()
ROOT=pathlib.Path(__file__).resolve().parents[1]
APP=ROOT/'android/app/src/main'
OUTPUT=args.output.resolve();OUTPUT.mkdir(parents=True,exist_ok=True)
(ROOT/'build').mkdir(exist_ok=True)
WORK=pathlib.Path(tempfile.mkdtemp(prefix='apk-',dir=ROOT/'build'))
env=os.environ.copy();env['JAVA_HOME']=str(args.jdk.resolve());env['PATH']=str(args.jdk/'bin')+os.pathsep+env.get('PATH','')
def run(*command):
    subprocess.run([str(part) for part in command],env=env,check=True)
def locate(name):
    matches=list(args.sdk.rglob(name))
    if not matches: raise SystemExit(f'Missing SDK tool: {name}')
    return matches[0]
aapt=locate('aapt2');align=locate('zipalign');signer=locate('apksigner');platform=locate('android.jar');d8=locate('d8.jar')
if not (APP/'assets/index.html').exists():raise SystemExit('Run npm run build before building the APK.')
compiled=WORK/'resources.zip';generated=WORK/'generated';generated.mkdir()
run(aapt,'compile','--dir',APP/'res','-o',compiled)
base=WORK/'base.apk'
run(aapt,'link','-I',platform,'--manifest',APP/'AndroidManifest.xml','--min-sdk-version','24','--target-sdk-version','35','--java',generated,'-A',APP/'assets','-o',base,compiled)
classes=WORK/'classes';classes.mkdir()
sources=list((APP/'java').rglob('*.java'))+list(generated.rglob('*.java'))
run(args.jdk/'bin/javac','-encoding','UTF-8','-source','8','-target','8','-classpath',platform,'-d',classes,*sources)
jar=WORK/'classes.jar'
with zipfile.ZipFile(jar,'w',zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(classes.rglob('*.class')):archive.write(file,file.relative_to(classes))
dex=WORK/'dex';dex.mkdir()
run(args.jdk/'bin/java','-cp',d8,'com.android.tools.r8.D8','--lib',platform,'--min-api','24','--output',dex,jar)
with zipfile.ZipFile(base,'a',zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(dex.glob('*.dex')):archive.write(file,file.name)
aligned=WORK/'aligned.apk';run(align,'-f','-p','4',base,aligned)
key=args.keystore or OUTPUT/'signing/ArcticPlay-release.jks'
password=args.password_file or OUTPUT/'signing/signing-password.txt'
if bool(args.keystore)!=bool(args.password_file):raise SystemExit('Supply both --keystore and --password-file.')
if not key.exists():
    key.parent.mkdir(parents=True,exist_ok=True);password.parent.mkdir(parents=True,exist_ok=True)
    password.write_text(secrets.token_urlsafe(32)+'\n');os.chmod(password,0o600)
    run(args.jdk/'bin/keytool','-genkeypair','-keystore',key,'-storepass:file',password,'-keypass:file',password,'-alias','arctic-play','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Arctic Play, O=Arctic Dominion','-storetype','JKS')
    os.chmod(key,0o600)
apk=OUTPUT/'ArcticPlay-v1.0.0.apk'
run(signer,'sign','--ks',key,'--ks-key-alias','arctic-play','--ks-pass',f'file:{password}','--out',apk,aligned)
run(signer,'verify','--verbose','--print-certs',apk)
run(align,'-c','-p','4',apk)
digest=hashlib.sha256(apk.read_bytes()).hexdigest()
(OUTPUT/'ArcticPlay-v1.0.0.apk.sha256').write_text(f'{digest}  {apk.name}\n')
metadata={'file':apk.name,'bytes':apk.stat().st_size,'sha256':digest,'package':'xyz.arcticdominion.play','version':'1.0.0','minSdk':24,'targetSdk':35,'games':['Shogi','Sannin Shogi','Sanguo Qi','San You Qi','Sanguo Yan Yi Qi','Xiangqi']}
(OUTPUT/'build-info.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata,indent=2))
