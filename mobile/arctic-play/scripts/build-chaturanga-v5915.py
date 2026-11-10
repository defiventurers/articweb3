#!/usr/bin/env python3
"""Build the heritage Chaturanga over the shipped v5.9.14 APK without reverting its newer UI."""
from pathlib import Path
import argparse,hashlib,json,struct,subprocess,zipfile
from apk_layout import verify_apk_layout
p=argparse.ArgumentParser()
for key in ['baseline','sdk','output']:p.add_argument('--'+key,type=Path,required=True)
p.add_argument('--keystore',type=Path);p.add_argument('--password-file',type=Path)
p.add_argument('--live-provider-probe-verified',action='store_true')
a=p.parse_args();mobile=Path(__file__).resolve().parents[1];work=mobile/'build/chaturanga-v5915';work.mkdir(parents=True,exist_ok=True);a.output.mkdir(parents=True,exist_ok=True)
expected='7bebeac7e8e8ac094dbf5ff3442feead6b66a7c2650f57db56b6a1f33160aea0'
assert hashlib.sha256(a.baseline.read_bytes()).hexdigest()==expected,'Expected verified v5.9.14 APK'
def tool(name):return next(a.sdk.rglob(name)).resolve()
def run(*args):return subprocess.check_output([str(v) for v in args],text=True)
with zipfile.ZipFile(a.baseline) as z:
 original={n:z.read(n) for n in z.namelist() if not n.endswith('/') and not n.startswith('META-INF/')}
files=dict(original);before=work/'before.js';after=work/'app.js';before.write_bytes(files['assets/app.js'])
print(run('node',mobile/'scripts/patch-chaturanga-v5915.mjs',before,after,'app').strip());files['assets/app.js']=after.read_bytes();files['assets/app.css']+=b'\n'+(mobile/'src/chaturanga-heritage.css').read_bytes()
for kind,name in [('bot','bot.js'),('learn','learn.js'),('fair','fair-worker.js')]:
 entry='assets/'+name;old=work/('before-'+name);new=work/name;old.write_bytes(files[entry]);print(run('node',mobile/'scripts/patch-chaturanga-v5915.mjs',old,new,kind).strip());files[entry]=new.read_bytes()
for name in ['court.webp','cover.webp']:files['assets/art/chaturanga-heritage-v1/'+name]=(mobile.parents[1]/'frontend/public/assets/chaturanga-heritage-v1'/name).read_bytes()
# Preserve compiled resource IDs; rewrite only manifest version attrs and its UTF16 pool.
b=bytearray(files['AndroidManifest.xml']);u16=lambda pos:struct.unpack_from('<H',b,pos)[0];u32=lambda pos:struct.unpack_from('<I',b,pos)[0]
pos=u16(2);strings=[];pool=None;version_code=version_name=0
while pos<len(b):
 kind,header,size=struct.unpack_from('<HHI',b,pos);assert size>=header and size>0
 if kind==1:
  assert u32(pos+12)==0 and not u32(pos+16)&256,'Unexpected manifest string format'
  count=u32(pos+8);start=u32(pos+20);pool=(pos,header,size,start,count)
  for i in range(count):
   loc=pos+start+u32(pos+header+4*i);length=u16(loc);assert length<32768
   strings.append(bytes(b[loc+2:loc+2+length*2]).decode('utf-16le'))
 if kind==0x102:
  ext=pos+header
  if strings[u32(ext+4)]=='manifest':
   start_attr,attr_size,count=struct.unpack_from('<HHH',b,ext+8)
   for i in range(count):
    attr=ext+start_attr+i*attr_size;name=strings[u32(attr+4)]
    if name=='versionCode':assert u32(attr+16)==102;struct.pack_into('<I',b,attr+16,103);version_code+=1
    if name=='versionName':assert strings[u32(attr+16)]=='5.9.14';strings[u32(attr+16)]='5.9.15';version_name+=1
 pos+=size
assert version_code==version_name==1
pos,header,size,start,count=pool;data=bytearray();offsets=[]
for string in strings:
 offsets.append(len(data));v=string.encode('utf-16le');data+=struct.pack('<H',len(v)//2)+v+b'\0\0'
while (start+len(data))%4:data+=b'\0'
new=bytearray(b[pos:pos+start]);struct.pack_into('<I',new,4,start+len(data))
for i,offset in enumerate(offsets):struct.pack_into('<I',new,header+i*4,offset)
new+=data;b[pos:pos+size]=new;struct.pack_into('<I',b,4,len(b));files['AndroidManifest.xml']=bytes(b)
metadata=json.loads(files['assets/app-version.json']);metadata.update(version='5.9.15',versionCode=103);metadata['capabilities']=list(dict.fromkeys(metadata.get('capabilities',[])+['chaturanga-long-dice-v1']));files['assets/app-version.json']=json.dumps(metadata).encode()
warm=json.loads(files['assets/game-assets.json']);warm['version']='5.9.15'
for name in ['court.webp','cover.webp']:warm['assets'].append({'url':'art/chaturanga-heritage-v1/'+name,'bytes':len(files['assets/art/chaturanga-heritage-v1/'+name])})
for item in warm['assets']:item['bytes']=len(files['assets/'+item['url']])
files['assets/game-assets.json']=json.dumps(warm).encode()
old=b'ak-public-game-art-bundled-5.9.14';assert files['assets/game-assets-sw.js'].count(old)==1
files['assets/game-assets-sw.js']=files['assets/game-assets-sw.js'].replace(old,b'ak-public-game-art-bundled-5.9.15')
raw=work/'unsigned.apk'
with zipfile.ZipFile(raw,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in files.items():z.writestr(name,data,compress_type=zipfile.ZIP_STORED if name=='resources.arsc' else zipfile.ZIP_DEFLATED)
apk=a.output/'AntarcticKingdoms-v5.9.15-UNSIGNED.apk';run(tool('zipalign'),'-f','-p','4',raw,apk)
status='unsigned';certificate=None
if a.keystore or a.password_file:
 assert a.keystore and a.password_file,'Supply both original signing inputs'
 signed=a.output/'AntarcticKingdoms-v5.9.15.apk'
 run(tool('apksigner'),'sign','--ks',a.keystore,'--ks-key-alias','arctic-play','--ks-pass','file:'+str(a.password_file),'--out',signed,apk)
 certificate='20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37'
 assert certificate in run(tool('apksigner'),'verify','--print-certs',signed),'Original signing certificate required'
 print(run(tool('apksigner'),'verify','--verbose',signed).strip());apk=signed;status='signed with original certificate'
run(tool('zipalign'),'-c','-p','4',apk);layout=verify_apk_layout(apk)
badging=run(tool('aapt2'),'dump','badging',apk);assert "versionCode='103'" in badging and "versionName='5.9.15'" in badging
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None
 for name,data in files.items():assert z.read(name)==data
changed=[n for n in files if files[n]!=original.get(n)]
assert set(changed)=={'AndroidManifest.xml','assets/app.js','assets/app.css','assets/bot.js','assets/learn.js','assets/fair-worker.js','assets/art/chaturanga-heritage-v1/court.webp','assets/art/chaturanga-heritage-v1/cover.webp','assets/app-version.json','assets/game-assets.json','assets/game-assets-sw.js'}
report={'version':'5.9.15','versionCode':103,'baselineVersion':'5.9.14','baselineSha256':expected,'reviewedSourceBranch':'main','reviewedSourceCommit':'7267d327c714a33601f1a599aaaea6efa7982dac','sourceParentCommit':'04c686b1c9208cbfc0670e9dff01b04b291ef55a','rulesProfile':'chaturanga-long-dice-v1','bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'signingStatus':status,'certificateSha256':certificate,'layout':layout,'changedEntries':changed,'unchangedEntries':len(files)-len(changed),'existingArtworkAndNativeDexUnchanged':True,'workersPatchedForChaturanga':True,'onlineServiceDeploymentTested':False,'deviceInstallationTested':False}
(a.output/'AntarcticKingdoms-v5.9.15-Verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
