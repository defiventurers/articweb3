#!/usr/bin/env python3
"""Sign a web-only update using the verified, unchanged native 5.2.1 shell.

Use build-apk.py for any Java, native resources, permissions or SDK changes.
This release changes only web assets and the manifest version fields.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import tempfile
import zipfile

BASE_SHA256='d2e0a9feaeb620ef17649da67b92773a7a8f3b8b84f971ec5d4c9595bbc0f364'
CERT_SHA256='20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37'

def patch_version(raw,version,code):
    data=bytearray(raw)
    if struct.unpack_from('<HH',data)!=(3,8):
        raise ValueError('Expected compiled Android XML')
    strings=[]
    positions=[]
    offset=8
    changed=set()
    while offset<len(data):
        kind,header,size=struct.unpack_from('<HHI',data,offset)
        if size<header or offset+size>len(data):
            raise ValueError('Malformed compiled manifest')
        if kind==1:
            count,_,flags,start,_=struct.unpack_from('<IIIII',data,offset+8)
            utf8=bool(flags&0x100)
            for i in range(count):
                pos=offset+start+struct.unpack_from('<I',data,offset+header+4*i)[0]
                def length(at,short):
                    first=struct.unpack_from('<B' if short else '<H',data,at)[0]
                    bit=0x80 if short else 0x8000
                    step=1 if short else 2
                    if first&bit:
                        second=struct.unpack_from('<B' if short else '<H',data,at+step)[0]
                        return ((first&(bit-1))<<(7 if short else 16))|second,at+step*2
                    return first,at+step
                chars,pos=length(pos,utf8)
                if utf8:
                    byte_count,pos=length(pos,True)
                else:
                    byte_count=chars*2
                encoding='utf-8' if utf8 else 'utf-16-le'
                strings.append(bytes(data[pos:pos+byte_count]).decode(encoding))
                positions.append((pos,byte_count,encoding))
        if kind==0x102 and strings:
            name=struct.unpack_from('<I',data,offset+20)[0]
            if strings[name]=='manifest':
                attr_start,attr_size,count=struct.unpack_from('<HHH',data,offset+24)
                for i in range(count):
                    pos=offset+16+attr_start+i*attr_size
                    name=struct.unpack_from('<I',data,pos+4)[0]
                    data_type=data[pos+15]
                    value=struct.unpack_from('<I',data,pos+16)[0]
                    if strings[name]=='versionName':
                        if data_type!=3 or strings[value]!='5.2.1':
                            raise ValueError('Unexpected base version name')
                        at,n,encoding=positions[value]
                        new=version.encode(encoding)
                        if len(new)!=n:
                            raise ValueError('Version string width changed; use the full native build')
                        data[at:at+n]=new
                        changed.add('name')
                    elif strings[name]=='versionCode':
                        if data_type!=0x10 or value!=64:
                            raise ValueError('Unexpected base version code')
                        if code<=64:
                            raise ValueError('The update must have a newer version code')
                        struct.pack_into('<I',data,pos+16,code)
                        changed.add('code')
        offset+=size
    if changed!={'name','code'}:
        raise ValueError('Both version fields must be updated')
    return bytes(data)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ['base-apk','build-tools','keystore','password-file','output']:
        parser.add_argument('--'+name,type=Path,required=True)
    parser.add_argument('--java',default='java')
    args=parser.parse_args()
    mobile=Path(__file__).resolve().parents[1]
    release=json.loads((mobile/'release-config.json').read_text())
    if hashlib.sha256(args.base_apk.read_bytes()).hexdigest()!=BASE_SHA256:
        raise SystemExit('The base APK is not the verified 5.2.1 release')
    (args.build_tools/'zipalign').chmod(0o755)
    signer=args.build_tools/'lib/apksigner.jar'
    def run(*command):
        return subprocess.check_output([str(c) for c in command],text=True,stderr=subprocess.STDOUT)
    certificate=run(args.java,'-jar',signer,'verify','--print-certs',args.base_apk)
    if CERT_SHA256 not in certificate:
        raise SystemExit('Unexpected base signing certificate')
    args.output.mkdir(parents=True,exist_ok=True)
    final=args.output/('AntarcticKingdoms-v'+release['versionName']+'.apk')
    with tempfile.TemporaryDirectory(prefix='ak-assets-') as temp:
        unsigned=Path(temp)/'unsigned.apk'
        aligned=Path(temp)/'aligned.apk'
        with zipfile.ZipFile(args.base_apk) as base,zipfile.ZipFile(unsigned,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as out:
            for entry in base.infolist():
                if entry.filename.startswith(('META-INF/','assets/')):
                    continue
                value=base.read(entry.filename)
                if entry.filename=='AndroidManifest.xml':
                    value=patch_version(value,release['versionName'],release['versionCode'])
                out.writestr(entry,value)
            assets=mobile/'android/app/src/main/assets'
            for file in sorted(assets.rglob('*')):
                if file.is_file():
                    out.write(file,'assets/'+file.relative_to(assets).as_posix())
        run(args.build_tools/'zipalign','-f','4',unsigned,aligned)
        run(args.java,'-jar',signer,'sign','--ks',args.keystore,'--ks-key-alias','arctic-play','--ks-pass','file:'+str(args.password_file),'--v1-signing-enabled','false','--v2-signing-enabled','true','--v3-signing-enabled','true','--v4-signing-enabled','false','--out',final,aligned)
    report=run(args.java,'-jar',signer,'verify','--verbose','--print-certs',final)
    if CERT_SHA256 not in report:
        raise SystemExit('Unexpected output signing certificate')
    run(args.build_tools/'zipalign','-c','4',final)
    with zipfile.ZipFile(args.base_apk) as base,zipfile.ZipFile(final) as update:
        retained=[n for n in base.namelist() if not n.startswith(('META-INF/','assets/')) and n!='AndroidManifest.xml']
        if any(base.read(n)!=update.read(n) for n in retained):
            raise SystemExit('Native contents changed unexpectedly')
    value={'file':final.name,'bytes':final.stat().st_size,'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'package':release['packageName'],'version':release['versionName'],'versionCode':release['versionCode'],'minSdk':24,'targetSdk':35,'certificateSha256':CERT_SHA256,'nativeShell':'unchanged verified 5.2.1','nativeFilesByteMatched':len(retained)}
    (args.output/'build-info.json').write_text(json.dumps(value,indent=2)+'\n')
    (args.output/(final.name+'.sha256')).write_text(value['sha256']+'  '+final.name+'\n')
    print(json.dumps(value,indent=2))

if __name__=='__main__':
    main()
