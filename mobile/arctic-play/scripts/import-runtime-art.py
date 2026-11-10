#!/usr/bin/env python3
"""Recover approved artwork byte for byte from the verified 5.9.15 release.

Run once to update the checked-in source inventory. Normal builds need no APK.
Only public artwork/static documents are imported; no compiled app, native code,
signing key, account state or source transform is imported.
"""
import argparse, hashlib, json, pathlib, zipfile
p=argparse.ArgumentParser();p.add_argument('apk',type=pathlib.Path);a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[3];mobile=root/'mobile/arctic-play'
digest=lambda b:hashlib.sha256(b).hexdigest()
assert digest(a.apk.read_bytes())=='27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488','Expected verified 5.9.15 APK'
existing={}
for folder in [root/'frontend/public',mobile/'android/app/src/main/res']:
 for f in sorted(folder.rglob('*')):
  if f.is_file():existing.setdefault(digest(f.read_bytes()),f.relative_to(root).as_posix())
inventory=[]
with zipfile.ZipFile(a.apk) as z:
 for n in sorted(z.namelist()):
  if not n.startswith('assets/art/') or n.endswith('/'):continue
  relative=n.removeprefix('assets/');assert '..' not in pathlib.PurePosixPath(relative).parts
  b=z.read(n);h=digest(b);source=existing.get(h)
  if source is None:
   f=mobile/'runtime-assets'/relative;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(b);source=f.relative_to(root).as_posix()
  inventory.append({'url':relative,'source':source,'sha256':h,'bytes':len(b)})
 for n in ['index.html','manifest.webmanifest','THIRD_PARTY_NOTICES.txt','verify.html']:
  if 'assets/'+n in z.namelist():
   f=mobile/'runtime-assets'/n;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(z.read('assets/'+n))
(mobile/'runtime-art-sources.json').write_text(json.dumps({'baselineVersion':'5.9.15','baselineSha256':digest(a.apk.read_bytes()),'assets':inventory},indent=2)+'\n')
print(json.dumps({'artworkFiles':len(inventory),'reused':sum(not x['source'].startswith('mobile/arctic-play/runtime-assets') for x in inventory),'imported':sum(x['source'].startswith('mobile/arctic-play/runtime-assets') for x in inventory)}))
