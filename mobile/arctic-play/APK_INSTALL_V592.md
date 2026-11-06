# Android install repair · 5.9.2

Reviewed `main` at `be6d1cbfe124105dae2a53c3d2fda9542f8cb797` (PR #64 merged).

## Outcome and acceptance criteria

The entry-update builder wrote every ZIP entry with DEFLATE, including
`resources.arsc`. Android 11+ refuses this layout for apps targeting API 30+.
The builder now stores that resource table uncompressed before alignment.
A shared guard checks the actual local-header offset, compression and ZIP CRC
after alignment and signing. Full/native, asset-only and update-feed preparation
paths also use the guard. Version metadata is 5.9.2/code 90, and the entry builder
reads it from release-config.json rather than hardcoding 5.9.1.

Acceptance: original package and signing certificate, higher version code,
valid v2/v3 signatures, stored resource table at a 4-byte boundary, matching
asset byte counts and no regression of the pinned 5.9.0 baseline constraint.

## Verified deliverable

The already-built corrected APK was recovered and verified independently using
official Android Build Tools 35.0.0; no new signing identity was generated.

- File: `AntarcticKingdoms-v5.9.2.apk`, 45,590,866 bytes.
- SHA-256: `543fcbeb7c6ed86af2c9342ffa6794ebdb5f504280f233aabd1e014363b20975`.
- Package: `xyz.arcticdominion.play`; version 5.9.2/code 90; min API 24, target 35.
- Certificate SHA-256: `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`.
- `apksigner verify --verbose --print-certs`: v2 and v3 pass.
- `zipalign -c -p 4`: pass. `resources.arsc` is stored at offset 643,620.
- ZIP CRC integrity: pass.

Regression fixtures distinguish compressed-but-aligned from stored-but-misaligned
resource tables and reject missing/corrupt tables. Run:

```sh
python3 -m unittest discover -s mobile/arctic-play/tests -p test_apk_layout.py -v
python3 mobile/arctic-play/scripts/apk_layout.py /path/to/AntarcticKingdoms-v5.9.2.apk
```

## Accepted decisions and remaining limits

Keep the existing app identity, landing screen and signed-in game bundle.
The source-restoration boundary in PASSPORT_ENTRY_V591.md still applies: do not
replace the delivered discovery UI with a normal build from older public sources.
This task verifies a recovered signed artifact; it does not claim a fresh full
rebuild from the repaired scripts, a physical-device install, or live Google login.

The public `arctic-play-releases/releases/latest.json` feed still advertises
3.0.0/code 17 as of the review. Publication requires uploading the verified APK
as `releases/ArcticPlay-v5.9.2.apk` on that branch, verifying its downloaded
checksum, then updating latest.json with code 90 and the matching size/hash.
Never advertise a missing or unchecked APK. Merging this source fix alone does
not publish the binary or change that release feed.
