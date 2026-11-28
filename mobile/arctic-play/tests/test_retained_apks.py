"""Key-free negative fixtures; no real APK, signing key or SDK is required."""
import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
import warnings
import zipfile

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
SPEC = importlib.util.spec_from_file_location('verify_retained_apks', SCRIPTS / 'verify-retained-apks.py')
VERIFY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFY)


def manifest(version='5.10.2', code=106, duplicate=False):
    """Minimal binary XML fixture with Android's typed version attributes."""
    strings = ['manifest', 'versionCode', 'versionName', version]
    content, offsets = b'', []
    for text in strings:
        offsets.append(len(content))
        encoded = text.encode('utf-16le')
        content += struct.pack('<H', len(encoded) // 2) + encoded + b'\0\0'
    content += b'\0' * (-len(content) % 4)
    start = 28 + len(strings) * 4
    pool = struct.pack('<HHIIIIII', 1, 28, start + len(content), len(strings), 0, 0, start, 0)
    pool += struct.pack('<' + 'I' * len(strings), *offsets) + content
    code_attr = struct.pack('<IIIHBBI', 0xffffffff, 1, 0xffffffff, 8, 0, 0x10, code)
    name_attr = struct.pack('<IIIHBBI', 0xffffffff, 2, 3, 8, 0, 3, 3)
    attributes = code_attr + name_attr + (code_attr if duplicate else b'')
    element = struct.pack('<HHIII', 0x102, 16, 36 + len(attributes), 1, 0xffffffff)
    element += struct.pack('<IIHHHHHH', 0xffffffff, 0, 20, 20, len(attributes) // 20, 0, 0, 0)
    body = pool + element + attributes
    return struct.pack('<HHI', 3, 8, 8 + len(body)) + body


def signature():
    return ('Verifies\nVerified using v2 scheme (APK Signature Scheme v2): true\n'
            'Verified using v3 scheme (APK Signature Scheme v3): true\nNumber of signers: 1\n'
            'Signer #1 certificate SHA-256 digest: ' + VERIFY.CERTIFICATE + '\n')


def badging(version='5.11.1'):
    return ("package: name='xyz.arcticdominion.play' versionCode='" + str(VERIFY.PINS[version]['code'])
            + "' versionName='" + version + "'\nminSdkVersion:'24'\ntargetSdkVersion:'35'\n"
            "uses-permission: name='android.permission.INTERNET'\n")


class RetainedApkTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)

    def archive(self, extra=None):
        path = self.directory / 'fixture.apk'
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_STORED) as archive:
                for name, value in [('resources.arsc', b'original resource table'),
                                    ('AndroidManifest.xml', manifest()), ('classes.dex', b'fixture dex'),
                                    ('assets/app.js', b'fixture app'), ('assets/app.css', b'fixture css')]:
                    archive.writestr(name, value)
                for name, value in extra or []:
                    archive.writestr(name, value)
        return path

    def payloads(self):
        baseline = {'AndroidManifest.xml': manifest(),
                    'assets/app.js': b'versionName:`5.10.2`,versionCode:106; OriginalGames();',
                    'assets/app.css': b'original home styles',
                    'assets/app-version.json': json.dumps({'version': '5.10.2', 'versionCode': 106, 'capabilities': ['retained']}).encode(),
                    'assets/game-assets-sw.js': b'cache="ak-public-game-art-bundled-5.10.2"',
                    'assets/game-assets.json': json.dumps({'version': '5.10.2', 'assets': [{'url': 'app.js', 'bytes': 1}]}).encode(),
                    'assets/fair-worker.js': b'original rules', 'classes.dex': b'original native shell',
                    'assets/approved-art.webp': b'approved art fixture'}
        overlay = {'app.js': baseline['assets/app.js'].replace(b'OriginalGames()', b'ReviewGames()'),
                   'app.css': baseline['assets/app.css'] + b'; games-only review styles'}
        return baseline, VERIFY.expected_review_payload(baseline, overlay)

    def test_signature_requires_one_exact_signer_and_both_supported_schemes(self):
        self.assertEqual(VERIFY.parse_signatures(signature())['certificateSha256'], VERIFY.CERTIFICATE)
        for altered in [signature().replace('Number of signers: 1', 'Number of signers: 2'),
                        signature().replace(VERIFY.CERTIFICATE, '0' * 64),
                        signature().replace('v2): true', 'v2): false'),
                        signature().replace('v3): true', 'v3): false'),
                        signature().replace('Verifies\n', ''),
                        signature() + 'Signer #2 certificate SHA-256 digest: ' + VERIFY.CERTIFICATE + '\n']:
            with self.subTest(altered=altered), self.assertRaises(ValueError):
                VERIFY.parse_signatures(altered)

    def test_package_versions_sdk_and_permission_drift_are_rejected(self):
        for version in VERIFY.PINS:
            self.assertEqual(VERIFY.parse_badging(badging(version), version)['versionName'], version)
        for altered in [badging().replace('xyz.arcticdominion.play', 'another.package'),
                        badging().replace("versionCode='111'", "versionCode='110'"),
                        badging().replace("versionName='5.11.1'", "versionName='5.10.2'"),
                        badging().replace("minSdkVersion:'24'", "minSdkVersion:'23'"),
                        badging().replace("targetSdkVersion:'35'", "targetSdkVersion:'34'"),
                        badging() + "uses-permission: name='android.permission.CAMERA'\n"]:
            with self.subTest(altered=altered), self.assertRaises(ValueError):
                VERIFY.parse_badging(altered, '5.11.1')

    def test_binary_manifest_changes_only_existing_version_values(self):
        before = manifest()
        self.assertEqual(VERIFY.version_only_manifest(before), manifest('5.11.1', 111))
        self.assertEqual(before, manifest(), 'The input bytes remain untouched.')

    def test_wrong_truncated_duplicate_and_nonbinary_manifests_fail_closed(self):
        for value in [b'<manifest/>', manifest()[:-1], manifest(code=107), manifest(version='5.10.3'), manifest(duplicate=True)]:
            with self.subTest(value=value[:20]), self.assertRaises((ValueError, struct.error)):
                VERIFY.version_only_manifest(value)

    def test_zip_crc_is_checked_and_corrupted_payload_is_rejected(self):
        path = self.archive()
        payload, count = VERIFY.read_payload(path)
        self.assertEqual(count, 5)
        self.assertEqual(payload['resources.arsc'], b'original resource table')
        with path.open('r+b') as stream:
            stream.seek(44)  # First entry's local-header data offset.
            stream.write(b'!')
        with self.assertRaises((ValueError, zipfile.BadZipFile)):
            VERIFY.read_payload(path)

    def test_duplicate_and_escaping_archive_members_are_rejected(self):
        for extra in [[('assets/app.js', b'ambiguous script')],
                      [('../outside.js', b'escape')], [('/absolute.js', b'escape')],
                      [('assets\\alternate.js', b'ambiguous separator')]]:
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                VERIFY.read_payload(self.archive(extra))

    def test_only_known_signing_metadata_is_excluded_from_payload_comparison(self):
        payload, _ = VERIFY.read_payload(self.archive([
            ('META-INF/ARCTIC-P.SF', b'signing metadata fixture'),
            ('META-INF/unexpected-config.json', b'not signing metadata')]))
        self.assertNotIn('META-INF/ARCTIC-P.SF', payload)
        self.assertIn('META-INF/unexpected-config.json', payload)

    def test_unknown_apk_is_rejected_before_tools_and_without_modification(self):
        path = self.archive()
        original = path.read_bytes()
        with self.assertRaisesRegex(ValueError, 'size differs'):
            VERIFY.verify_pair(path, self.directory / 'unread.apk', self.directory / 'missing-sdk')
        self.assertEqual(path.read_bytes(), original)

    def test_guarded_payload_preserves_native_rules_art_and_exact_release_metadata(self):
        baseline, review = self.payloads()
        result = VERIFY.compare_payloads(baseline, review, review)
        self.assertTrue(result['exactGuardedReproduction'])
        self.assertEqual(result['identicalArtworkEntries'], 1)
        self.assertEqual(json.loads(review['assets/game-assets.json'])['assets'][0]['bytes'], len(review['assets/app.js']))
        self.assertEqual(json.loads(review['assets/app-version.json'])['capabilities'], ['retained'])
        for name in ['classes.dex', 'assets/fair-worker.js', 'assets/approved-art.webp',
                     'assets/app.js', 'assets/app-version.json', 'AndroidManifest.xml']:
            changed = dict(review)
            changed[name] += b'altered'
            with self.subTest(name=name), self.assertRaises(ValueError):
                VERIFY.compare_payloads(baseline, changed, review)
        for changed in [{**review, 'assets/new-art.webp': b'unapproved'},
                        {key: value for key, value in review.items() if key != 'classes.dex'}]:
            with self.assertRaisesRegex(ValueError, 'entry set'):
                VERIFY.compare_payloads(baseline, changed, review)

    def test_missing_or_ambiguous_release_literals_fail_without_patch_fallback(self):
        for value in [b'no release literal', b'old old']:
            with self.assertRaises(ValueError):
                VERIFY.replace_once(value, b'old', b'new')

    def test_cli_has_no_signing_or_submission_mode(self):
        process = subprocess.run([sys.executable, str(SCRIPTS / 'verify-retained-apks.py'),
                                  '--baseline', 'baseline.apk', '--review', 'review.apk',
                                  '--build-tools', 'sdk', '--sign'], capture_output=True, text=True)
        self.assertNotEqual(process.returncode, 0)
        self.assertIn('unrecognized arguments: --sign', process.stderr)


if __name__ == '__main__':
    unittest.main()
