"""Regression fixtures for the v5.9.1 Android install refusal."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

MODULE_PATH = Path(__file__).resolve().parents[1] / 'scripts/apk_layout.py'
SPEC = importlib.util.spec_from_file_location('apk_layout', MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ApkLayoutTest(unittest.TestCase):
    def make_apk(self, compression=zipfile.ZIP_STORED, aligned=True,
                 include_resource=True):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        path = Path(temporary.name) / 'fixture.apk'
        with zipfile.ZipFile(path, 'w') as archive:
            if include_resource:
                entry = zipfile.ZipInfo('resources.arsc')
                entry.compress_type = compression
                # Local header (30) + name (14) is naturally 4-byte aligned.
                # A well-formed 5-byte extra field moves it off that boundary.
                if not aligned:
                    entry.extra = b'\xff\xff\x01\x00\x00'
                archive.writestr(entry, b'resource table fixture' * 30)
        return path

    def test_stored_and_aligned_table_passes(self):
        result = MODULE.verify_apk_layout(self.make_apk())
        self.assertTrue(result['resourcesAligned'])
        self.assertEqual(result['resourcesOffset'] % 4, 0)

    def test_compressed_table_is_rejected_even_when_aligned(self):
        with self.assertRaisesRegex(ValueError, 'uncompressed'):
            MODULE.verify_apk_layout(self.make_apk(zipfile.ZIP_DEFLATED))

    def test_stored_but_misaligned_table_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'aligned'):
            MODULE.verify_apk_layout(self.make_apk(aligned=False))

    def test_missing_table_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'exactly one'):
            MODULE.verify_apk_layout(self.make_apk(include_resource=False))

    def test_corrupt_stored_table_is_rejected(self):
        path = self.make_apk()
        with path.open('r+b') as stream:
            stream.seek(44)
            stream.write(b'!')
        with self.assertRaisesRegex(ValueError, 'ZIP integrity'):
            MODULE.verify_apk_layout(path)


if __name__ == '__main__':
    unittest.main()
