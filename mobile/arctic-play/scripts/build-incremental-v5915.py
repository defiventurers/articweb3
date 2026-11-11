#!/usr/bin/env python3
"""Package guarded additions over the verified v5.9.15 APK; never invent a signer.

An unsigned result is a review artifact, not an installable release. Direct-APK
packaging retains the baseline target SDK/native code; Play API36 work is separate.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import struct
import subprocess
import zipfile
from apk_layout import verify_apk_layout

BASELINE = '27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488'
CERTIFICATE = '20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37'
VERSION, CODE = '5.10.2', 106
ALLOWED_OVERLAY = {'app.js', 'app.css', 'fair-worker.js', 'verifier.js'}
ADDITIVE_ART = {'art/launch-incremental/halls/' + n + '.webp' for n in ['india', 'china', 'japan', 'vietnam']}


def digest(data):
    return hashlib.sha256(data).hexdigest()


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
                        if u32(attr + 16) != 103:
                            raise ValueError('Expected baseline versionCode103')
                        struct.pack_into('<I', b, attr + 16, CODE)
                        changed.add(name)
                    if name == 'versionName':
                        index = u32(attr + 16)
                        if strings[index] != '5.9.15':
                            raise ValueError('Expected baseline versionName5.9.15')
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


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--baseline', type=Path, required=True)
    p.add_argument('--runtime-dir', type=Path, required=True,
                   help='Sparse overlay of explicitly allowed changed runtime files')
    p.add_argument('--sdk', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--keystore', type=Path)
    p.add_argument('--password-file', type=Path)
    a = p.parse_args()
    if bool(a.keystore) != bool(a.password_file):
        p.error('Supply both original signing inputs or neither')
    if digest(a.baseline.read_bytes()) != BASELINE:
        p.error('Expected verified approved v5.9.15 APK')
    def tool(name):
        matches = list(a.sdk.rglob(name))
        if not matches:
            raise ValueError('Missing SDK tool: ' + name)
        return matches[0].resolve()
    def run(*parts):
        return subprocess.check_output([str(x) for x in parts], text=True)
    certificate = run(tool('apksigner'), 'verify', '--print-certs', a.baseline)
    if CERTIFICATE not in certificate:
        raise ValueError('Baseline signer mismatch')
    with zipfile.ZipFile(a.baseline) as z:
        if z.testzip():
            raise ValueError('Corrupt baseline ZIP')
        original = {n: z.read(n) for n in z.namelist()
                    if not n.endswith('/') and not n.startswith('META-INF/')}
        entry_info = {n: z.getinfo(n) for n in original}
    files = dict(original)
    overlays = [f for f in a.runtime_dir.rglob('*') if f.is_file()]
    if not overlays:
        p.error('Refuse an empty upgrade')
    for f in overlays:
        relative = f.relative_to(a.runtime_dir).as_posix()
        if relative not in ALLOWED_OVERLAY | ADDITIVE_ART or f.is_symlink():
            raise ValueError('Undeclared overlay file: ' + relative)
        if relative in ADDITIVE_ART and 'assets/' + relative in original:
            raise ValueError('New hall art may not overwrite baseline artwork')
        files['assets/' + relative] = f.read_bytes()
    text = files['assets/app.js'].decode()
    old = 'versionName:`5.9.15`,versionCode:103'
    if text.count(old) != 1:
        raise ValueError('Expected one guarded compiled release configuration')
    files['assets/app.js'] = text.replace(old, f'versionName:`{VERSION}`,versionCode:{CODE}').encode()
    files['AndroidManifest.xml'] = version_manifest(files['AndroidManifest.xml'])
    metadata = json.loads(files['assets/app-version.json'])
    old_capabilities = metadata['capabilities'][:]
    metadata.update(version=VERSION, versionCode=CODE)
    if 'heritage-intro' in files['assets/app.js'].decode():
        metadata['capabilities'] = list(dict.fromkeys(old_capabilities + ['heritage-intros-v1', 'cultural-halls-v1']))
    files['assets/app-version.json'] = json.dumps(metadata).encode()
    warm = json.loads(files['assets/game-assets.json'])
    warm['version'] = VERSION
    for name in sorted(ADDITIVE_ART):
        if 'assets/' + name in files:
            warm['assets'].append({'url': name, 'bytes': len(files['assets/' + name])})
    for item in warm['assets']:
        item['bytes'] = len(files['assets/' + item['url']])
    files['assets/game-assets.json'] = json.dumps(warm).encode()
    marker = b'ak-public-game-art-bundled-5.9.15'
    if files['assets/game-assets-sw.js'].count(marker) != 1:
        raise ValueError('Expected exact baseline asset-cache marker')
    files['assets/game-assets-sw.js'] = files['assets/game-assets-sw.js'].replace(marker, ('ak-public-game-art-bundled-' + VERSION).encode())
    allowed = {'AndroidManifest.xml', 'assets/app-version.json', 'assets/game-assets.json',
               'assets/game-assets-sw.js'} | {'assets/' + f for f in ALLOWED_OVERLAY | ADDITIVE_ART}
    changed = [n for n in files if files[n] != original.get(n)]
    if set(changed) - allowed:
        raise ValueError('Changed protected entries')
    protected = [n for n in original if n.startswith(('assets/art/', 'res/'))
                 or n in {'assets/index.html', 'assets/startup.js', 'assets/theme-init.js', 'resources.arsc'}
                 or re.fullmatch(r'classes\d*\.dex', n)]
    if any(files[n] != original[n] for n in protected):
        raise ValueError('Loading screen, art, icon, resources or native code changed')
    a.output.mkdir(parents=True, exist_ok=True)
    raw = a.output / 'incremental-unaligned.apk'
    with zipfile.ZipFile(raw, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, data in files.items():
            prior = entry_info.get(n, entry_info['assets/app.js'])
            info = zipfile.ZipInfo(n, prior.date_time)
            info.external_attr = prior.external_attr
            info.create_system = prior.create_system
            info.compress_type = zipfile.ZIP_STORED if n == 'resources.arsc' else zipfile.ZIP_DEFLATED
            z.writestr(info, data)
    apk = a.output / f'AntarcticKingdoms-v{VERSION}-UNSIGNED-REVIEW.apk'
    run(tool('zipalign'), '-f', '-p', '4', raw, apk)
    raw.unlink()
    signed = False
    if a.keystore:
        target = a.output / f'AntarcticKingdoms-v{VERSION}.apk'
        run(tool('apksigner'), 'sign', '--ks', a.keystore, '--ks-key-alias', 'arctic-play',
            '--ks-pass', 'file:' + str(a.password_file), '--out', target, apk)
        check = run(tool('apksigner'), 'verify', '--verbose', '--print-certs', target)
        if CERTIFICATE not in check:
            target.unlink()
            raise ValueError('Refuse an APK signed by a different update identity')
        apk, signed = target, True
    run(tool('zipalign'), '-c', '-p', '4', apk)
    layout = verify_apk_layout(apk)
    badging = run(tool('aapt2'), 'dump', 'badging', apk)
    if not all(v in badging for v in ["name='xyz.arcticdominion.play'", f"versionCode='{CODE}'", f"versionName='{VERSION}'", "targetSdkVersion:'35'"]):
        raise ValueError('Packaged native version/package/target mismatch')
    with zipfile.ZipFile(apk) as z:
        for n, data in files.items():
            if z.read(n) != data:
                raise ValueError('Packaged bytes mismatch: ' + n)
    report = {'version': VERSION, 'versionCode': CODE, 'baselineSha256': BASELINE,
              'sha256': digest(apk.read_bytes()), 'file': apk.name, 'bytes': apk.stat().st_size,
              'package': 'xyz.arcticdominion.play', 'targetSdk': 35,
              'originalSignerVerified': signed, 'installableRelease': signed,
              'baselineSignerVerified': True, 'protectedEntriesByteIdentical': len(protected),
              'originalCapabilitiesPreserved': all(c in metadata['capabilities'] for c in old_capabilities),
              'changedEntries': changed, 'layout': layout, 'deviceTested': False,
              'playSubmissionReady': False, 'publicFeedChanged': False}
    (a.output / 'incremental-verification.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
