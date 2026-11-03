#!/usr/bin/env python3
"""Build and sign the dependency-free native shell with official Android SDK tools.

The bundled React app is built by `npm run build` first. Signing material remains
outside the repository; keep it to sign future updates with the same identity.
"""
import argparse, hashlib, json, os, pathlib, secrets, shutil, subprocess, tempfile, zipfile
import xml.etree.ElementTree as ET

parser=argparse.ArgumentParser()
parser.add_argument('--sdk',required=True,type=pathlib.Path)
parser.add_argument('--jdk',required=True,type=pathlib.Path)
parser.add_argument('--output',required=True,type=pathlib.Path)
parser.add_argument('--keystore',type=pathlib.Path)
parser.add_argument('--password-file',type=pathlib.Path)
parser.add_argument('--javac-jar',type=pathlib.Path,help='Optional Eclipse ECJ compiler jar for a JRE-only build environment.')
args=parser.parse_args()
ROOT=pathlib.Path(__file__).resolve().parents[1]
APP=ROOT/'android/app/src/main'
manifest=ET.parse(APP/'AndroidManifest.xml').getroot()
VERSION=manifest.attrib['{http://schemas.android.com/apk/res/android}versionName']
VERSION_CODE=int(manifest.attrib['{http://schemas.android.com/apk/res/android}versionCode'])
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
# Install the currently approved launcher after any legacy web-art generator.
approved_launcher=ROOT/'art/launcher-current/res'
if approved_launcher.is_dir():shutil.copytree(approved_launcher,APP/'res',dirs_exist_ok=True)
compiled=WORK/'resources.zip';generated=WORK/'generated';generated.mkdir()
run(aapt,'compile','--dir',APP/'res','-o',compiled)
# Package only declared runtime files. Temporary build files and retired art
# never become installable assets, even when a checkout contains old output.
staged=WORK/'assets';staged.mkdir()
source_assets=APP/'assets'
root_names={'index.html','app.js','app.css','bot.js','learn.js','fair-worker.js','shanshui-bot.js','fair-play.css','verifier.js','verify.html','startup.js','theme-init.js','THIRD_PARTY_NOTICES.txt','manifest.webmanifest','app-version.json','game-assets.json','game-assets-sw.js'}
asset_manifest=json.loads((source_assets/'game-assets.json').read_text())
allowed=root_names|{item['url'] for item in asset_manifest['assets']}
for relative in sorted(allowed):
    parts=pathlib.PurePosixPath(relative).parts
    if relative.startswith('/') or '..' in parts or any(part.startswith('.') for part in parts):raise SystemExit('Invalid declared runtime file.')
    if 'sanyou' in parts or 'sanyou-gold-v1' in parts or 'tables-3d-v1' in parts or 'tables-3d-v2' in parts:raise SystemExit('Retired artwork in runtime manifest.')
    dest=staged/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source_assets/relative,dest)
base=WORK/'base.apk' 
run(aapt,'link','-I',platform,'--manifest',APP/'AndroidManifest.xml','--min-sdk-version','24','--target-sdk-version','35','--java',generated,'-A',staged,'-o',base,compiled)
classes=WORK/'classes';classes.mkdir()
sources=list((APP/'java').rglob('*.java'))+list(generated.rglob('*.java'))
compiler=[args.jdk/'bin/java','-jar',args.javac_jar] if args.javac_jar else [args.jdk/'bin/javac']
run(*compiler,'-encoding','UTF-8','-source','8','-target','8','-classpath',platform,'-d',classes,*sources)
jar=WORK/'classes.jar'
with zipfile.ZipFile(jar,'w',zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(classes.rglob('*.class')):archive.write(file,file.relative_to(classes))
dex=WORK/'dex';dex.mkdir()
run(args.jdk/'bin/java','-cp',d8,'com.android.tools.r8.D8','--lib',platform,'--min-api','24','--output',dex,jar)
with zipfile.ZipFile(base,'a',zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(dex.glob('*.dex')):archive.write(file,file.name)
aligned=WORK/'aligned.apk';run(align,'-f','-p','4',base,aligned)
if not args.keystore or not args.password_file:
    raise SystemExit('Supply the original --keystore and --password-file; update builds never create a new app identity.')
key=args.keystore;password=args.password_file
if not key.is_file() or not password.is_file():raise SystemExit('Original signing files are missing.')
apk=OUTPUT/f'AntarcticKingdoms-v{VERSION}.apk'
run(signer,'sign','--ks',key,'--ks-key-alias','arctic-play','--ks-pass',f'file:{password}','--out',apk,aligned)
run(signer,'verify','--verbose','--print-certs',apk)
run(align,'-c','-p','4',apk)
digest=hashlib.sha256(apk.read_bytes()).hexdigest()
(OUTPUT/f'AntarcticKingdoms-v{VERSION}.apk.sha256').write_text(f'{digest}  {apk.name}\n')
legacy=OUTPUT/f'ArcticPlay-v{VERSION}.apk'
shutil.copyfile(apk,legacy)  # Existing 1.4 clients trust this exact stable URL.
metadata={'file':apk.name,'updateFile':legacy.name,'bytes':apk.stat().st_size,'sha256':digest,'package':'xyz.arcticdominion.play','version':VERSION,'versionCode':VERSION_CODE,'minSdk':24,'targetSdk':35,'games':['Shogi','Sannin Shogi','Sanguo Qi','San You Qi','Sanguo Yan Yi Qi','Xiangqi','Chaturanga','Shanshui Xiangqi']}
(OUTPUT/'build-info.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata,indent=2))
