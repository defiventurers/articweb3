"""Reissue the exact approved v5.10.2 payload with release metadata only."""
from pathlib import Path
import hashlib, json, subprocess, zipfile
import argparse, struct
VERSION,CODE="5.11.0",110
def version_manifest(data):
    b = bytearray(data)
    u16 = lambda p: struct.unpack_from('<H', b, p)[0]
    u32 = lambda p: struct.unpack_from('<I', b, p)[0]
    pos = u16(2)
    strings, pool, changed = [], None, set()
    while pos < len(b):
        kind, header, size = struct.unpack_from('<HHI', b, pos)
        if size < header or size <= 0:
            raise ValueError('Invalid binary manifest chunk')
        if kind == 1:
            if u32(pos + 12) or u32(pos + 16) & 256:
                raise ValueError('Expected baseline UTF16 string pool')
            count, start = u32(pos + 8), u32(pos + 20)
            pool = (pos, header, size, start, count)
            for i in range(count):
                loc = pos + start + u32(pos + header + 4 * i)
                length = u16(loc)
                if length >= 32768:
                    raise ValueError('Unsupported string length')
                strings.append(bytes(b[loc + 2:loc + 2 + length * 2]).decode('utf-16le'))
        if kind == 0x102:
            ext = pos + header
            if strings[u32(ext + 4)] == 'manifest':
                start_attr, attr_size, count = struct.unpack_from('<HHH', b, ext + 8)
                for i in range(count):
                    attr = ext + start_attr + i * attr_size
                    name = strings[u32(attr + 4)]
                    if name == 'versionCode':
                        if u32(attr + 16) != 106:
                            raise ValueError('Expected baseline versionCode106')
                        struct.pack_into('<I', b, attr + 16, CODE)
                        changed.add(name)
                    if name == 'versionName':
                        index = u32(attr + 16)
                        if strings[index] != '5.10.2':
                            raise ValueError('Expected baseline versionName5.10.2')
                        strings[index] = VERSION
                        changed.add(name)
        pos += size
    if changed != {'versionCode', 'versionName'} or not pool:
        raise ValueError('Manifest version fields not found exactly')
    pos, header, size, start, count = pool
    data, offsets = bytearray(), []
    for string in strings:
        offsets.append(len(data))
        encoded = string.encode('utf-16le')
        data += struct.pack('<H', len(encoded) // 2) + encoded + b'\0\0'
    while (start + len(data)) % 4:
        data += b'\0'
    new = bytearray(b[pos:pos + start])
    struct.pack_into('<I', new, 4, start + len(data))
    for i, offset in enumerate(offsets):
        struct.pack_into('<I', new, header + i * 4, offset)
    b[pos:pos + size] = new + data
    struct.pack_into('<I', b, 4, len(b))
    return bytes(b)



p=argparse.ArgumentParser(description=__doc__)
for key in ['baseline','sdk','output','keystore','password-file']: p.add_argument('--'+key,type=Path,required=True)
a=p.parse_args()
SDK=a.sdk.resolve();OUT=a.output.resolve();BASELINE=a.baseline.resolve()
OUT.mkdir(parents=True,exist_ok=True)
EXPECTED='275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd'
CERT='20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37'
def run(*args): return subprocess.check_output([str(a) for a in args],text=True)
assert hashlib.sha256(BASELINE.read_bytes()).hexdigest()==EXPECTED
assert CERT in run(SDK/'apksigner','verify','--print-certs',BASELINE)
with zipfile.ZipFile(BASELINE) as z:
    assert z.testzip() is None
    original={i.filename:z.read(i) for i in z.infolist() if not i.is_dir() and not i.filename.startswith('META-INF/')}
    infos={i.filename:i for i in z.infolist()}
files=dict(original)
files['AndroidManifest.xml']=version_manifest(files['AndroidManifest.xml'])
old=b'versionName:`5.10.2`,versionCode:106'
assert files['assets/app.js'].count(old)==1
files['assets/app.js']=files['assets/app.js'].replace(old,b'versionName:`5.11.0`,versionCode:110')
metadata=json.loads(files['assets/app-version.json']);metadata.update(version='5.11.0',versionCode=110)
files['assets/app-version.json']=json.dumps(metadata).encode()
warm=json.loads(files['assets/game-assets.json']);warm['version']='5.11.0'
for item in warm['assets']:item['bytes']=len(files['assets/'+item['url']])
files['assets/game-assets.json']=json.dumps(warm).encode()
oldcache=b'ak-public-game-art-bundled-5.10.2'
assert files['assets/game-assets-sw.js'].count(oldcache)==1
files['assets/game-assets-sw.js']=files['assets/game-assets-sw.js'].replace(oldcache,b'ak-public-game-art-bundled-5.11.0')
changed=[n for n in files if files[n]!=original[n]]
assert set(changed)=={'AndroidManifest.xml','assets/app.js','assets/app-version.json','assets/game-assets.json','assets/game-assets-sw.js'}
assert files['assets/app.js'].replace(b'versionName:`5.11.0`,versionCode:110',old)==original['assets/app.js']
raw=OUT/'raw.apk';aligned=OUT/'aligned.apk';apk=OUT/'AntarcticKingdoms-v5.11.0.apk'
with zipfile.ZipFile(raw,'w') as z:
    for n,data in files.items():
        prior=infos[n];info=zipfile.ZipInfo(n,prior.date_time)
        info.external_attr=prior.external_attr;info.create_system=prior.create_system
        info.compress_type=zipfile.ZIP_STORED if n=='resources.arsc' else prior.compress_type
        z.writestr(info,data)
run(SDK/'zipalign','-f','-p','4',raw,aligned)
run(SDK/'apksigner','sign','--ks',a.keystore.resolve(),'--ks-key-alias','arctic-play','--ks-pass','file:'+str(a.password_file.resolve()),'--out',apk,aligned)
signature=run(SDK/'apksigner','verify','--verbose','--print-certs',apk)
assert CERT in signature and 'Verified using v2 scheme (APK Signature Scheme v2): true' in signature and 'Verified using v3 scheme (APK Signature Scheme v3): true' in signature
run(SDK/'zipalign','-c','-p','4',apk)
badging=run(SDK/'aapt2','dump','badging',apk)
for v in ["name='xyz.arcticdominion.play'","versionName='5.11.0'","versionCode='110'","minSdkVersion:'24'","targetSdkVersion:'35'"]:assert v in badging,v
with zipfile.ZipFile(apk) as z:
    assert z.testzip() is None
    assert z.getinfo('resources.arsc').compress_type==zipfile.ZIP_STORED
    assert {n for n in z.namelist() if not n.startswith('META-INF/')}==set(files)
    for n,data in files.items():assert z.read(n)==data,n
report={'version':'5.11.0','versionCode':110,'baselineVersion':'5.10.2','baselineSha256':EXPECTED,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'sizeBytes':apk.stat().st_size,'package':'xyz.arcticdominion.play','certificateSha256':CERT,'signaturesV2V3':True,'zipalign':True,'zipCRC':True,'resourcesUncompressed':True,'changedEntries':changed,'unchangedEntries':len(files)-len(changed),'appCodeChange':'release version literal only','assetsNativeRulesAndAppearancePreserved':True,'sourceReviewed':'191d816a5abb1bdd1357cdd57d4a05dfb8747b6c','physicalDeviceInstallTested':False,'realParaLoginTested':False}
(OUT/'AntarcticKingdoms-v5.11.0-verification.json').write_text(json.dumps(report,indent=2)+'\n')
raw.unlink();aligned.unlink()
print(json.dumps(report,indent=2))
