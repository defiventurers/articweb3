#!/usr/bin/env python3
"""Apply the approved display names to v5.9.8 without reverting its newer UI.

Produces a verified, aligned unsigned candidate when the original signing files
are absent. Only a candidate signed with the original certificate is installable
as an update. Never create a replacement signing identity.
"""
from pathlib import Path
import argparse,hashlib,json,re,struct,subprocess,zipfile
from apk_layout import verify_apk_layout

p=argparse.ArgumentParser()
for key in ['baseline','sdk','output']:p.add_argument('--'+key,type=Path,required=True)
p.add_argument('--keystore',type=Path);p.add_argument('--password-file',type=Path)
a=p.parse_args();root=Path(__file__).resolve().parents[1];work=root/'build/mascot-names-v599';work.mkdir(parents=True,exist_ok=True);a.output.mkdir(parents=True,exist_ok=True)
expected='ac7baa5086014e99b0dce691d99aa47902d1a8130dd4a98061e45185157840c4'
assert hashlib.sha256(a.baseline.read_bytes()).hexdigest()==expected,'Expected the verified v5.9.8 APK'
def tool(name):return next(a.sdk.rglob(name)).resolve()
def run(*args):subprocess.run([str(v) for v in args],check=True)
with zipfile.ZipFile(a.baseline) as z:
 files={i.filename:z.read(i) for i in z.infolist() if not i.is_dir() and not i.filename.startswith('META-INF/')}
 original=dict(files)
edits=[]
for name in ['assets/app.js','assets/bot.js','assets/learn.js','assets/fair-worker.js']:
 src=work/(Path(name).stem+'.before.js');dest=work/Path(name).name;src.write_bytes(files[name])
 command=['node',root/'scripts/rename-mascot-bundle.mjs',src,dest]
 if name!='assets/app.js':command.append('--worker')
 run(*command);files[name]=dest.read_bytes();edits.append(name)
run('node',root/'tests/mascot-apk-runtime.mjs')

# Android's public binary XML structure: ResStringPool and start-element attrs.
# https://android.googlesource.com/platform/frameworks/base/+/56a2301/include/androidfw/ResourceTypes.h
manifest=bytearray(files['AndroidManifest.xml']);strings=[];string_locations=[]
u16=lambda pos:struct.unpack_from('<H',manifest,pos)[0]
u32=lambda pos:struct.unpack_from('<I',manifest,pos)[0]
def length8(pos):
 n=manifest[pos];return (((n&127)<<8)|manifest[pos+1],pos+2) if n&128 else (n,pos+1)
def length16(pos):
 n=u16(pos);return (((n&32767)<<16)|u16(pos+2),pos+4) if n&32768 else (n,pos+2)
pos=u16(2);version_name=version_code=0
while pos<len(manifest):
 kind,header,size=struct.unpack_from('<HHI',manifest,pos);assert size>=header and size>0
 if kind==1:
  count=u32(pos+8);utf8=bool(u32(pos+16)&256);start=u32(pos+20)
  for i in range(count):
   loc=pos+start+u32(pos+header+4*i)
   if utf8:
    _,loc=length8(loc);n,loc=length8(loc);end=loc+n;encoding='utf8'
   else:n,loc=length16(loc);end=loc+2*n;encoding='utf-16-le'
   strings.append(bytes(manifest[loc:end]).decode(encoding));string_locations.append((loc,end,encoding))
 if kind==0x102:
  ext=pos+header;tag=strings[u32(ext+4)];attr_start,attr_size,count=struct.unpack_from('<HHH',manifest,ext+8)
  if tag=='manifest':
   for i in range(count):
    attr=ext+attr_start+i*attr_size;name=strings[u32(attr+4)];data=u32(attr+16)
    if name=='versionCode':assert data==96;struct.pack_into('<I',manifest,attr+16,97);version_code+=1
    if name=='versionName':
     assert manifest[attr+15]==3 and strings[data]=='5.9.8'
     begin,end,encoding=string_locations[data];value='5.9.9'.encode(encoding);assert len(value)==end-begin;manifest[begin:end]=value;version_name+=1
 pos+=size
assert version_name==version_code==1
files['AndroidManifest.xml']=bytes(manifest);edits.append('AndroidManifest.xml')
metadata=json.loads(files['assets/app-version.json']);metadata.update(version='5.9.9',versionCode=97);metadata['capabilities']=list(dict.fromkeys(metadata.get('capabilities',[])+['mascot-names-v1']));files['assets/app-version.json']=json.dumps(metadata).encode();edits.append('assets/app-version.json')
warm=json.loads(files['assets/game-assets.json']);warm['version']='5.9.9'
for item in warm['assets']:
 assert len(original['assets/'+item['url']])==item['bytes']
 item['bytes']=len(files['assets/'+item['url']])
files['assets/game-assets.json']=json.dumps(warm).encode();edits.append('assets/game-assets.json')
cache=files['assets/game-assets-sw.js'];updated,n=re.subn(rb'ak-public-game-art-bundled-5\.9\.8',b'ak-public-game-art-bundled-5.9.9',cache);assert n==1
files['assets/game-assets-sw.js']=updated;edits.append('assets/game-assets-sw.js')
raw=work/'unsigned.apk'
with zipfile.ZipFile(raw,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in files.items():z.writestr(name,data,compress_type=zipfile.ZIP_STORED if name=='resources.arsc' else zipfile.ZIP_DEFLATED)
apk=a.output/'AntarcticKingdoms-v5.9.9-Mascot-Names-UNSIGNED.apk';run(tool('zipalign'),'-f','-p','4',raw,apk)
layout=verify_apk_layout(apk);run(tool('zipalign'),'-c','-p','4',apk)
badging=subprocess.check_output([str(tool('aapt2')),'dump','badging',str(apk)],text=True)
assert "versionCode='97'" in badging and "versionName='5.9.9'" in badging
assert all(files[n]==data for n,data in original.items() if n not in edits)
status='unsigned — original signing key required';cert=None
if a.keystore or a.password_file:
 assert a.keystore and a.password_file,'Supply both original signing files'
 signed=a.output/'AntarcticKingdoms-v5.9.9.apk'
 run(tool('apksigner'),'sign','--ks',a.keystore,'--ks-key-alias','arctic-play','--ks-pass','file:'+str(a.password_file),'--out',signed,apk)
 def certificate(path):
  text=subprocess.check_output([str(tool('apksigner')),'verify','--print-certs',str(path)],text=True)
  return re.search(r'certificate SHA-256 digest: ([0-9a-f]+)',text).group(1)
 cert=certificate(signed);assert cert==certificate(a.baseline),'Signing identity changed'
 run(tool('apksigner'),'verify','--verbose',signed);run(tool('zipalign'),'-c','-p','4',signed);layout=verify_apk_layout(signed);apk=signed;status='signed with original certificate'
report={'version':'5.9.9','versionCode':97,'sourceCommit':'797df870bdca917c3d7f96980dd482b113b03f50','baselineVersion':'5.9.8','baselineSha256':expected,'file':apk.name,'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'signingStatus':status,'certificateSha256':cert,'mapping':{'polly':'Nova','retsba':'Rocco','pengu':'Piko','abster':'Ziggy'},'changedFiles':edits,'unchangedOtherEntries':len(original)-len(edits),'layout':layout,'artworkAndNativeDexUnchanged':True,'legacyStickerMessagesSupported':True,'deviceVerified':False}
(a.output/'AntarcticKingdoms-v5.9.9-Mascot-Names-Verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
