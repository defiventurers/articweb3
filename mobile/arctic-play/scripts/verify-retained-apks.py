#!/usr/bin/env python3
"""Read-only verification of the exact approved 5.10.2 and signed 5.11.1 APKs.

No signing inputs, network access, APK output or permission to update pins exists
in this command. The guarded presentation patch is reproduced only in a private
temporary asset directory and is never packaged or installed.
"""
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import json
import re
import struct
import subprocess
import tempfile
import zipfile

from apk_layout import verify_apk_layout

PACKAGE = 'xyz.arcticdominion.play'
CERTIFICATE = '20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37'
PINS = {
    '5.10.2': {'code': 106, 'bytes': 52201720,
               'sha256': '275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd'},
    '5.11.1': {'code': 111, 'bytes': 52201720,
               'sha256': '91fbc8cd0578462511356888e8fab5e6008f9008e555571dbf93473783488f3e'},
}
CHANGED = frozenset({'AndroidManifest.xml', 'assets/app.js', 'assets/app.css',
                     'assets/app-version.json', 'assets/game-assets.json',
                     'assets/game-assets-sw.js'})
ART_EXTENSIONS = {'.png', '.webp', '.svg', '.jpg', '.jpeg', '.gif', '.avif'}
SIGNATURE_ENTRIES = {'META-INF/ARCTIC-P.SF', 'META-INF/ARCTIC-P.RSA', 'META-INF/MANIFEST.MF'}
ROOT = Path(__file__).resolve().parents[3]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def check_file_pin(path, version):
    path = Path(path)
    require(path.is_file() and not path.is_symlink(), 'Supply an existing regular APK file.')
    pin = PINS[version]
    require(path.stat().st_size == pin['bytes'], 'APK size differs from the reviewed artifact.')
    actual = file_digest(path)
    require(actual == pin['sha256'], 'APK SHA-256 differs from the reviewed artifact.')
    return actual


def read_payload(path):
    """Reject ambiguous/unsafe archives before reading or using any member."""
    require(Path(path).stat().st_size <= 100 * 1024 * 1024, 'APK is too large.')
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        require(0 < len(entries) <= 4096, 'Unexpected APK entry count.')
        names = [item.filename for item in entries]
        require(len(names) == len(set(names)), 'Duplicate APK entry.')
        require(sum(item.file_size for item in entries) <= 200 * 1024 * 1024,
                'Expanded APK is too large.')
        for item in entries:
            name = item.filename
            require(bool(name) and '\\' not in name and '\0' not in name
                    and not PurePosixPath(name).is_absolute()
                    and '..' not in PurePosixPath(name).parts,
                    'Unsafe APK entry path.')
            require(item.file_size <= 32 * 1024 * 1024 and not item.flag_bits & 1,
                    'Oversized or encrypted APK entry.')
        require(archive.testzip() is None, 'APK ZIP CRC check failed.')
        payload = {item.filename: archive.read(item) for item in entries
                   if not item.is_dir() and item.filename not in SIGNATURE_ENTRIES}
    require({'AndroidManifest.xml', 'resources.arsc', 'classes.dex', 'assets/app.js',
             'assets/app.css'} <= payload.keys(), 'Required APK payload is missing.')
    return payload, len(entries)


def checked_command(command):
    completed = subprocess.run([str(value) for value in command], check=True,
                               stdin=subprocess.DEVNULL, capture_output=True,
                               text=True, timeout=30)
    return completed.stdout


def parse_signatures(output):
    require(re.search(r'^Verifies$', output, re.M), 'APK signature did not verify.')
    require(re.search(r'^Number of signers: 1$', output, re.M), 'Unexpected signer count.')
    certificates = re.findall(r'^Signer #\d+ certificate SHA-256 digest: ([0-9a-f]{64})$',
                              output, re.M)
    require(certificates == [CERTIFICATE], 'APK signing certificate differs.')
    schemes = {}
    for version in ('v2', 'v3'):
        match = re.search(r'^Verified using ' + version + r' scheme .*: (true|false)$',
                          output, re.M)
        require(match is not None and match.group(1) == 'true',
                'Required APK signature scheme is invalid or absent: ' + version)
        schemes[version] = True
    return {'certificateSha256': CERTIFICATE, 'signerCount': 1, 'schemes': schemes}


def parse_badging(output, version):
    packages = re.findall(r"^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", output, re.M)
    require(packages == [(PACKAGE, str(PINS[version]['code']), version)],
            'APK package or release version differs.')
    minimum = re.findall(r"^minSdkVersion:'(\d+)'$", output, re.M)
    target = re.findall(r"^targetSdkVersion:'(\d+)'$", output, re.M)
    require(minimum == ['24'] and target == ['35'], 'APK SDK requirements differ.')
    permissions = re.findall(r"^uses-permission: name='([^']+)'", output, re.M)
    require(permissions == ['android.permission.INTERNET'], 'APK permissions differ.')
    return {'package': PACKAGE, 'versionName': version, 'versionCode': PINS[version]['code'],
            'minSdk': 24, 'targetSdk': 35, 'permissions': permissions}


def version_only_manifest(original):
    """Independently alter only the two existing binary-XML version values."""
    data = bytearray(original)
    require(len(data) >= 8, 'Truncated Android manifest.')
    u16 = lambda offset: struct.unpack_from('<H', data, offset)[0]
    u32 = lambda offset: struct.unpack_from('<I', data, offset)[0]
    require(u16(0) == 3 and u16(2) == 8 and u32(4) == len(data), 'Invalid Android XML header.')
    strings, locations, found, pools = [], [], set(), 0
    offset = 8
    while offset < len(data):
        require(offset + 8 <= len(data), 'Truncated Android XML chunk.')
        kind, header, size = struct.unpack_from('<HHI', data, offset)
        require(8 <= header <= size and offset + size <= len(data), 'Invalid Android XML chunk.')
        if kind == 1:
            pools += 1
            require(pools == 1 and header >= 28, 'Unexpected Android string pool.')
            count, styles, flags, start = struct.unpack_from('<IIII', data, offset + 8)
            require(styles == 0 and not flags & 256 and header + 4 * count <= start < size,
                    'Unsupported Android string pool.')
            for index in range(count):
                location = offset + start + u32(offset + header + 4 * index)
                require(offset + start <= location < offset + size - 2, 'Invalid string offset.')
                length = u16(location)
                end = location + 2 + length * 2
                require(length < 32768 and end + 2 <= offset + size and u16(end) == 0,
                        'Invalid Android string length.')
                strings.append(bytes(data[location + 2:end]).decode('utf-16le'))
                locations.append((location + 2, end))
        if kind == 0x102:
            ext = offset + header
            require(ext + 20 <= offset + size and strings, 'Invalid Android element.')
            name = u32(ext + 4)
            require(name < len(strings), 'Invalid Android element name.')
            if strings[name] == 'manifest':
                start, stride, count = struct.unpack_from('<HHH', data, ext + 8)
                require(stride >= 20 and ext + start + stride * count <= offset + size,
                        'Invalid manifest attributes.')
                for index in range(count):
                    attribute = ext + start + stride * index
                    name_index = u32(attribute + 4)
                    require(name_index < len(strings), 'Invalid attribute name.')
                    name = strings[name_index]
                    if name not in ('versionName', 'versionCode'):
                        continue
                    require(name not in found, 'Duplicate manifest version attribute.')
                    found.add(name)
                    if name == 'versionCode':
                        require(data[attribute + 15] == 0x10 and u32(attribute + 16) == 106,
                                'Expected baseline versionCode 106.')
                        struct.pack_into('<I', data, attribute + 16, 111)
                    else:
                        value = u32(attribute + 16)
                        require(data[attribute + 15] == 3 and value < len(strings)
                                and strings[value] == '5.10.2', 'Expected baseline versionName 5.10.2.')
                        begin, end = locations[value]
                        replacement = '5.11.1'.encode('utf-16le')
                        require(end - begin == len(replacement), 'Manifest version length changed.')
                        data[begin:end] = replacement
        offset += size
    require(found == {'versionName', 'versionCode'}, 'Manifest version fields are missing.')
    return bytes(data)


def replace_once(data, original, replacement):
    require(data.count(original) == 1, 'Expected exactly one guarded release literal.')
    return data.replace(original, replacement)


def expected_review_payload(baseline, overlay):
    files = dict(baseline)
    files['AndroidManifest.xml'] = version_only_manifest(baseline['AndroidManifest.xml'])
    files['assets/app.js'] = replace_once(overlay['app.js'], b'versionName:`5.10.2`,versionCode:106',
                                         b'versionName:`5.11.1`,versionCode:111')
    files['assets/app.css'] = overlay['app.css']
    metadata = json.loads(baseline['assets/app-version.json'])
    metadata.update(version='5.11.1', versionCode=111)
    files['assets/app-version.json'] = json.dumps(metadata).encode()
    files['assets/game-assets-sw.js'] = replace_once(baseline['assets/game-assets-sw.js'],
        b'ak-public-game-art-bundled-5.10.2', b'ak-public-game-art-bundled-5.11.1')
    preload = json.loads(baseline['assets/game-assets.json'])
    preload['version'] = '5.11.1'
    for item in preload['assets']:
        require('assets/' + item['url'] in files, 'Preload refers to a missing APK asset.')
        item['bytes'] = len(files['assets/' + item['url']])
    files['assets/game-assets.json'] = json.dumps(preload).encode()
    return files


def compare_payloads(baseline, review, expected):
    require(baseline.keys() == review.keys() == expected.keys(), 'APK payload entry set changed.')
    changed = sorted(name for name in baseline if baseline[name] != review[name])
    require(set(changed) == CHANGED, 'APK differs outside the reviewed change set.')
    for name in sorted(expected):
        require(review[name] == expected[name], 'Guarded reproduction differs: ' + name)
    art = [name for name in baseline if PurePosixPath(name).suffix.lower() in ART_EXTENSIONS]
    protected = {name: digest(content) for name, content in baseline.items()
                 if re.fullmatch(r'classes\d*\.dex', name) or name in {
                     'resources.arsc', 'assets/index.html', 'assets/startup.js',
                     'assets/bot.js', 'assets/learn.js', 'assets/co-tu-lenh-bot.js',
                     'assets/shanshui-bot.js', 'assets/fair-worker.js',
                     'assets/verifier.js'}}
    return {'payloadEntries': len(baseline), 'changedEntries': changed,
            'unchangedEntries': len(baseline) - len(changed), 'identicalArtworkEntries': len(art),
            'exactGuardedReproduction': True, 'protectedEntrySha256': protected,
            'changedEntrySha256': {name: {'baseline': digest(baseline[name]), 'review': digest(review[name])}
                                   for name in changed}}


def verify_pair(baseline_path, review_path, build_tools, node='node'):
    paths = {'5.10.2': Path(baseline_path), '5.11.1': Path(review_path)}
    require(paths['5.10.2'].resolve() != paths['5.11.1'].resolve(), 'Supply both distinct retained APKs.')
    before = {version: check_file_pin(path, version) for version, path in paths.items()}
    tools = Path(build_tools).resolve()
    for name in ('apksigner', 'aapt2', 'zipalign'):
        require((tools / name).is_file(), 'Android verification tool is missing: ' + name)
    reports, payloads = {}, {}
    for version, path in paths.items():
        payloads[version], count = read_payload(path)
        signature = parse_signatures(checked_command([tools / 'apksigner', 'verify', '--verbose', '--print-certs', path]))
        manifest = parse_badging(checked_command([tools / 'aapt2', 'dump', 'badging', path]), version)
        checked_command([tools / 'zipalign', '-c', '-P', '16', '4', path])
        reports[version] = {**manifest, **signature, 'sha256': before[version],
                            'bytes': path.stat().st_size, 'zipEntries': count,
                            'layout': verify_apk_layout(path), 'zipalignVerified': True}
    with tempfile.TemporaryDirectory(prefix='fonso-apk-verification-') as folder:
        source, patched = Path(folder) / 'source', Path(folder) / 'patched'
        source.mkdir()
        for name in ('app.js', 'app.css'):
            (source / name).write_bytes(payloads['5.10.2']['assets/' + name])
        checked_command([node, ROOT / 'mobile/arctic-play/scripts/patch-storybook-v5102.mjs', source, patched])
        overlay = {name: (patched / name).read_bytes() for name in ('app.js', 'app.css')}
        expected = expected_review_payload(payloads['5.10.2'], overlay)
        comparison = compare_payloads(payloads['5.10.2'], payloads['5.11.1'], expected)
    for version, path in paths.items():
        require(file_digest(path) == before[version], 'Input APK changed during verification.')
    patch_sources = ['mobile/arctic-play/scripts/patch-storybook-v5102.mjs',
                     'mobile/arctic-play/src/storybookGames.js',
                     'mobile/arctic-play/src/storybook-games.css']
    return {'schema': 1, 'observedAt': datetime.now(timezone.utc).isoformat(),
            'artifacts': reports, 'comparison': comparison, 'inputApksUnchanged': True,
            'guardedPatchSourceSha256': {name: file_digest(ROOT / name) for name in patch_sources},
            'apkBuiltSignedOrInstalled': False, 'emulatorTested': False,
            'physicalDeviceAccepted': False, 'realParaSignInTested': False,
            'originalBaselineSigningCheckout': 'unresolved'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--review', type=Path, required=True)
    parser.add_argument('--build-tools', type=Path, required=True)
    parser.add_argument('--node', default='node')
    arguments = parser.parse_args()
    try:
        result = verify_pair(arguments.baseline, arguments.review, arguments.build_tools, arguments.node)
    except (ValueError, OSError, zipfile.BadZipFile, struct.error,
            subprocess.SubprocessError, UnicodeError, json.JSONDecodeError) as error:
        parser.exit(1, 'Retained APK verification failed: ' + str(error) + '\n')
    print(json.dumps(result, indent=2))
