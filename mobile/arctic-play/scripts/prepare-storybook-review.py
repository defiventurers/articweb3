from pathlib import Path
import hashlib,json,zipfile,subprocess,shutil
root=Path(__file__).resolve().parents[3];parts=root/'frontend/public/early/downloads';out=root/'storybook-review';out.mkdir(exist_ok=True)
m=json.loads((parts/'manifest.json').read_text());data=b''
for p in m['parts']:
 b=(parts/p['file']).read_bytes();assert hashlib.sha256(b).hexdigest()==p['sha256'];data+=b
assert hashlib.sha256(data).hexdigest()=='275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd'
import io
with zipfile.ZipFile(io.BytesIO(data)) as z:
 for n in z.namelist():
  if n.startswith('assets/') and not n.endswith('/'):
   p=out/'before'/n[7:];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(n))
shutil.copytree(out/'before',out/'after',dirs_exist_ok=True)
subprocess.run(['node',str(Path(__file__).with_name('patch-storybook-v5102.mjs')),str(out/'before'),str(out/'after')],check=True)
