"""Reject resource-table packaging that Android 11+ cannot install."""
from pathlib import Path
import struct
import zipfile


def verify_apk_layout(path):
    """Check the actual local-header data offset, not ZIP metadata estimates."""
    path = Path(path)
    with zipfile.ZipFile(path) as archive, path.open('rb') as stream:
        entries = [item for item in archive.infolist()
                   if item.filename == 'resources.arsc']
        if len(entries) != 1:
            raise ValueError('APK must contain exactly one resources.arsc')
        entry = entries[0]
        if entry.compress_type != zipfile.ZIP_STORED:
            raise ValueError('resources.arsc must be stored uncompressed')
        stream.seek(entry.header_offset)
        header = stream.read(30)
        if len(header) != 30 or header[:4] != b'PK\x03\x04':
            raise ValueError('Invalid resources.arsc local ZIP header')
        if struct.unpack_from('<H', header, 8)[0] != zipfile.ZIP_STORED:
            raise ValueError('resources.arsc local compression differs')
        name_length, extra_length = struct.unpack_from('<HH', header, 26)
        offset = entry.header_offset + 30 + name_length + extra_length
        if offset % 4:
            raise ValueError('resources.arsc must be aligned to 4 bytes')
        bad = archive.testzip()
        if bad is not None:
            raise ValueError(f'APK ZIP integrity failed: {bad}')
    return {'resourcesCompression': 'stored', 'resourcesOffset': offset,
            'resourcesAligned': True, 'zipIntegrity': 'passed'}


if __name__ == '__main__':
    import argparse
    import json
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=Path)
    print(json.dumps(verify_apk_layout(parser.parse_args().apk), indent=2))
