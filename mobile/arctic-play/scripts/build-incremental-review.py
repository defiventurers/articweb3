#!/usr/bin/env python3
"""Reproduce the guarded heritage, verifier-HOLD, Android and browser candidates."""
from pathlib import Path
import argparse
import json
import subprocess
import sys
import zipfile

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--baseline', required=True, type=Path)
p.add_argument('--sdk', required=True, type=Path)
p.add_argument('--output', required=True, type=Path)
p.add_argument('--keystore', type=Path)
p.add_argument('--password-file', type=Path)
a = p.parse_args()
mobile = Path(__file__).resolve().parents[1]
root = mobile.parents[1]
out = a.output.resolve()
baseline = a.baseline.resolve()
if out == root or root in out.parents and out.name in {'src', 'server', 'frontend', 'mobile'}:
    p.error('Choose a dedicated build output directory')
out.mkdir(parents=True, exist_ok=True)
before, heritage, fairness, overlay = [out / n for n in ['baseline', 'heritage', 'fairness', 'overlay']]
for folder in [before, heritage, fairness, overlay]:
    folder.mkdir(exist_ok=True)
# The native packager verifies the complete approved APK hash and signer.
# Extraction is traversal-safe and never writes native/source files.
with zipfile.ZipFile(baseline) as z:
    for item in z.infolist():
        if not item.filename.startswith('assets/') or item.is_dir():
            continue
        relative = Path(item.filename).relative_to('assets')
        if '..' in relative.parts:
            raise ValueError('Unsafe baseline entry')
        target = before / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(z.read(item))

def run(*args):
    subprocess.run([str(x) for x in args], cwd=root, check=True)

run('node', mobile / 'scripts/patch-heritage-v5915.mjs', before / 'app.js', heritage / 'app.js')
run('node', mobile / 'scripts/patch-fairness-v5915.mjs', '--input', before, '--output', fairness, '--app', heritage / 'app.js')
for name in ['app.js', 'fair-worker.js', 'verifier.js']:
    (overlay / name).write_bytes((fairness / name).read_bytes())
(overlay / 'app.css').write_bytes((before / 'app.css').read_bytes() + b'\n' + (mobile / 'src/heritage-intro.css').read_bytes())
command = [sys.executable, mobile / 'scripts/build-incremental-v5915.py', '--baseline', baseline,
           '--runtime-dir', overlay, '--sdk', a.sdk.resolve(), '--output', out / 'android']
if a.keystore or a.password_file:
    if not a.keystore or not a.password_file:
        p.error('Supply both original signing inputs')
    command += ['--keystore', a.keystore.resolve(), '--password-file', a.password_file.resolve()]
run(*command)
run('node', mobile / 'scripts/build-incremental-web.mjs', '--baseline-apk', baseline,
    '--runtime-dir', overlay, '--output', out / 'web', '--version', '5.10.2', '--version-code', '106')
print(json.dumps({'android': str(out / 'android'), 'web': str(out / 'web'),
                  'note': 'Unsigned candidates are not installable releases. Device, live login and multiplayer gates remain.'}))
