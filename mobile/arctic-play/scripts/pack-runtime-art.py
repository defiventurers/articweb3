#!/usr/bin/env python3
"""Pack recovered public artwork without changing a byte of image data."""
from pathlib import Path
import hashlib, io, json, zipfile
mobile=Path(__file__).resolve().parents[1]
source=mobile/'runtime-assets'
files=sorted(p for p in (source/'art').rglob('*') if p.is_file())
buffer=io.BytesIO()
with zipfile.ZipFile(buffer,'w',compression=zipfile.ZIP_STORED) as archive:
    for file in files:
        entry=zipfile.ZipInfo(file.relative_to(source).as_posix(),date_time=(2026,11,10,0,0,0))
        entry.external_attr=0o100644<<16
        archive.writestr(entry,file.read_bytes())
packed=buffer.getvalue();destination=mobile/'runtime-art-pack';destination.mkdir(exist_ok=True)
for old in destination.glob('runtime-art-part-*.bin'): old.unlink()
parts=[]
for index,start in enumerate(range(0,len(packed),8*1024*1024)):
    part=packed[start:start+8*1024*1024];name=f'runtime-art-part-{index:02d}.bin'
    (destination/name).write_bytes(part)
    parts.append({'file':name,'bytes':len(part),'sha256':hashlib.sha256(part).hexdigest()})
manifest={'format':'zip-stored-v1','files':len(files),'bytes':len(packed),'sha256':hashlib.sha256(packed).hexdigest(),'parts':parts,'provenance':'Public artwork imported from the verified v5.9.15 APK. See runtime-art-sources.json.'}
(mobile/'runtime-art-pack.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'files':len(files),'bytes':len(packed),'parts':len(parts)}))
