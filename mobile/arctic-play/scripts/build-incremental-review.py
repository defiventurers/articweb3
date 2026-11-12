#!/usr/bin/env python3
"""Reproduce guarded heritage, versioned proof verification, Android and browser candidates."""
from pathlib import Path
import argparse
import json
import shutil
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
pawns = out / 'pawns'
run('node', mobile / 'scripts/patch-chaturanga-pawns-v5915.mjs', '--input-app', heritage / 'app.js',
    '--input-learn', before / 'learn.js', '--output', pawns)
run('node', mobile / 'scripts/build-proof-verifier.mjs', '--input', before, '--output', fairness, '--app', pawns / 'app.js')
for name in ['app.js', 'fair-worker.js', 'verifier.js']:
    (overlay / name).write_bytes((fairness / name).read_bytes())
for name in ['learn.js']:
    (overlay / name).write_bytes((pawns / name).read_bytes())
(overlay / 'app.css').write_bytes((before / 'app.css').read_bytes() + b'\n' + (mobile / 'src/heritage-intro.css').read_bytes())
hall_source = root / 'frontend/public/assets/launch-incremental/halls'
hall_target = overlay / 'art/launch-incremental/halls'
hall_target.mkdir(parents=True, exist_ok=True)
for name in ['india', 'china', 'japan', 'vietnam']:
    shutil.copyfile(hall_source / (name + '.webp'), hall_target / (name + '.webp'))
pawn_source = root / 'frontend/public/assets/chaturanga-final-four/pawns'
pawn_target = overlay / 'art/chaturanga-final-four/pawns'
pawn_target.mkdir(parents=True, exist_ok=True)
for name in ['red', 'blue', 'green', 'pink']:
    shutil.copyfile(pawn_source / (name + '.webp'), pawn_target / (name + '.webp'))
command = [sys.executable, mobile / 'scripts/build-incremental-v5915.py', '--baseline', baseline,
           '--runtime-dir', overlay, '--sdk', a.sdk.resolve(), '--output', out / 'android']
if a.keystore or a.password_file:
    if not a.keystore or not a.password_file:
        p.error('Supply both original signing inputs')
    command += ['--keystore', a.keystore.resolve(), '--password-file', a.password_file.resolve()]
run(*command)
web_command = ['node', mobile / 'scripts/build-incremental-web.mjs', '--baseline-apk', baseline,
               '--runtime-dir', overlay, '--output', out / 'web', '--version', '5.10.3', '--version-code', '107']
if a.keystore:
    web_command += ['--apk-download-page', 'downloads/']
run(*web_command)
if a.keystore:
    native_report = json.loads((out / 'android/incremental-verification.json').read_text())
    if not native_report['originalSignerVerified']:
        raise ValueError('Browser download requires the verified original signing identity')
    run('node', mobile / 'scripts/package-web-download.mjs', '--apk', out / 'android' / native_report['file'],
        '--web-output', out / 'web', '--version', native_report['version'],
        '--version-code', str(native_report['versionCode']), '--expected-sha256', native_report['sha256'])
print(json.dumps({'android': str(out / 'android'), 'web': str(out / 'web'),
                  'note': 'Unsigned candidates are not installable releases. Device, live login and multiplayer gates remain.'}))
