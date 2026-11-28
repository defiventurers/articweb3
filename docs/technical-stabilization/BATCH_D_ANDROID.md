# Batch D1 — retained Android artifact verification

Reviewed main: `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`. Candidate branch:
`codex/fonso-stabilization-batch-d`, based on
`75328370f0703ab7907dda9dc833f8aab93c21f9`. Checked 28 November 2026 UTC.

**Outcome:** the exact approved v5.10.2 and signed v5.11.1 review APKs were
recovered and independently verified. An artifact mismatch is **NOT
REPRODUCIBLE**. Both match their recorded hashes, original certificate, package,
versions and guarded payload changes. Physical acceptance remains **OWNER ACTION
REQUIRED**. No APK was rebuilt, signed, installed, published or replaced.

The engineering addition is a reproducible, key-free verifier and rejection
tests. It replaces no application code and does not represent an application
defect as fixed merely because verification tooling was added.

## Actual artifacts

| Check | Approved baseline | Signed review |
| --- | --- | --- |
| Version / Android versionCode | 5.10.2 / 106 | 5.11.1 / 111 |
| SHA-256 | `275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd` | `91fbc8cd0578462511356888e8fab5e6008f9008e555571dbf93473783488f3e` |
| File size | 52,201,720 bytes | 52,201,720 bytes |
| Package | `xyz.arcticdominion.play` | Same |
| minSdk / targetSdk | 24 / 35 | 24 / 35 |
| Declared permission | `android.permission.INTERNET` | Same |
| Signer count / schemes | One; v2 and v3 verify | Same |
| ZIP integrity / alignment | Passed | Passed |

Both use certificate SHA-256
`20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`.
The higher versionCode, matching package and original certificate establish the
artifact prerequisites for an upgrade. They do not prove installation or saved
data retention on the founder's phone.

The approved baseline was reconstructed from the seven existing public Git
parts under `frontend/public/early/downloads/`. Every part's size and SHA-256,
the combined size and the pinned whole-file hash matched. The review was
recovered from the founder's retained original artifact and matched
[`apk-verification.json`](../reviews/games-storybook/apk-verification.json).
Its binary and extracted assets have not been added to the repository or
published. The v5.11.0 reissue records were also reviewed; this check does not
claim a separate physical installation of v5.11.0.

The exact checkout that originally signed v5.10.2 remains **unresolved**. Its
`app-version.json` contains version/capability metadata, not a source commit.
Historical source-build records do not establish that checkout. The retained
binary is the approved baseline; a normal Vite or tracked-mobile-source build
must not be substituted for it.

## Payload and guarded-patch evidence

Each archive contains **447 ZIP entries**. Excluding only the three known
signing metadata entries gives **444 payload entries**; **438 are byte-identical**.
The six changes exactly match the existing review record:

| Entry | Verified change |
| --- | --- |
| `AndroidManifest.xml` | Only existing versionName/versionCode values |
| `assets/app.js` | Exact guarded GamesAdventure presentation patch and one release literal |
| `assets/app.css` | Exact existing storybook CSS append |
| `assets/app-version.json` | Version and versionCode; capability list preserved |
| `assets/game-assets.json` | Release/cache metadata and recomputed asset sizes |
| `assets/game-assets-sw.js` | One release cache-key literal |

The existing `patch-storybook-v5102.mjs` was run against extracted baseline
assets in a temporary directory. Its output reproduces the actual signed review
`app.js` and `app.css` byte for byte after the documented release literal change.
The entire expected payload was then compared, not just the changed-entry count.
All **416 image/SVG artwork entries**, native `classes.dex`, resource table,
startup/index assets, bot/learning scripts and fair-play/verifier scripts remain
identical. No native `.so` libraries are present. The resource table is stored
uncompressed at aligned data offset 565236 in both archives.

Three signing metadata entries differ as expected: `META-INF/ARCTIC-P.SF`,
`META-INF/ARCTIC-P.RSA` and `META-INF/MANIFEST.MF`. No other `META-INF` entry is
silently excluded by the new comparator. Official `apksigner` verifies the
complete APK signatures independently.

The source hashes, protected entry hashes and observed results are retained in
[BATCH_D_ANDROID_EVIDENCE.json](BATCH_D_ANDROID_EVIDENCE.json). No binary payload,
provider download URL, private source-file identifier or signing input is in
that evidence.

**Release boundary:** preserving the existing APK also preserves its original
workers and native runtime. A/B/C repository fixes are not automatically bundled
into these retained APKs. Runtime compatibility and any future APK update must
be accepted separately; this verification is not a claim that a frontend build
or the latest branch produced the approved application.

## Reproducible read-only verification

Use Python 3.11 or newer, the repository's existing mobile build dependencies,
Node and Android Build Tools 35.0.0. Supply the two retained original files:

```sh
python3 mobile/arctic-play/scripts/verify-retained-apks.py \
  --baseline /private/AntarcticKingdoms-v5.10.2.apk \
  --review /private/AntarcticKingdoms-v5.11.1.apk \
  --build-tools /path/android-sdk/build-tools/35.0.0
```

The command checks fixed reviewed hashes/sizes before processing the archives,
calls `apksigner verify`, `aapt2 dump badging` and `zipalign -c -P 16 4`, verifies
CRC/resource layout, reproduces the guarded patch in a temporary directory,
compares all payload entries and rehashes both inputs afterward. It emits JSON
to stdout. There is no sign, deploy, install, submission, APK-output or
expected-hash-update option. Guards remain active under Python optimization.

Official Android Build Tools 35 were downloaded for verification only. The
archive's 61,958,799-byte size and SHA-1
`2cfaa0bbb2336e9ec18ed3ecea84fa2e2af607bc` matched Google's repository index; its
SHA-256 is
`bd3a4966912eb8b30ed0d00b0cda6b6543b949d5ffe00bea54c04c81e1561d88`.
No signing credentials were retrieved. Android documents the read-only
[`apksigner verify`](https://developer.android.com/tools/apksigner) and
[`zipalign -c`](https://developer.android.com/tools/zipalign) operations used here.

## Regression and negative evidence

```sh
python3 -m unittest discover -s mobile/arctic-play/tests -p 'test_retained_apks.py' -v
# 11 passed, 0 failed, 0 skipped

python3 -m unittest discover -s mobile/arctic-play/tests -p 'test_apk_layout.py' -v
# 5 passed, 0 failed, 0 skipped
```

New fixtures cover wrong certificates/signer counts/signature schemes, package,
versions, SDK/permission drift, malformed or duplicate binary manifest fields,
corrupt ZIP data, duplicate/escaping members, unknown artifacts, protected
payload changes, release metadata, unrelated `META-INF` content and the absence
of a signing mode. Existing tests cover stored/aligned resources and corruption.

A separate actual-artifact negative check changed one byte in `resources.arsc`
of a temporary copy. The new verifier rejected its whole-file digest, official
`apksigner` rejected its signature, and ZIP CRC identified `resources.arsc`.
The altered copy was deleted. Both retained originals were rehashed afterward
and remained identical to their approved records.

CI can run the key-free fixtures and reconstruct the public baseline to exercise
the guarded patch. Such a synthesized asset tree must be labelled separately
from the locally recovered exact signed review. No private review binary is
required or uploaded by these unit tests.

## Device acceptance and remaining gates

This workspace has no Android emulator, `adb` or `/dev/kvm`. No emulator image
was installed. Browser/DOM tests of extracted assets are reported separately in
[BATCH_D_ACCEPTANCE.md](BATCH_D_ACCEPTANCE.md); they do not establish Android
WebView, OS installation, TalkBack or physical-device behavior.

For the founder's acceptance session:

1. Record the installed app version and preserve the existing account and saved
   game. Verify the review APK hash above. Do not uninstall, clear storage or
   downgrade the primary phone to create a test baseline.
2. Test a clean installation on a spare device or separate empty test profile.
   Test the in-place upgrade on the existing phone, retaining its data. A version
   or certificate refusal is a stop condition, not a reason to delete the app.
3. Follow the full acceptance checklist for loading/Home, Adventure/All Games,
   Chaturanga/setup, How-to-Play, bots/local play, navigation, saved-game resume,
   safe areas, Android back, TalkBack, restart, performance and crash recovery.
4. Schedule real Para sign-in with the existing-account and sender/eligibility
   safeguards in the C runbook. New accounts, signatures or collectible delivery
   still require their specific founder action; do not infer live acceptance
   from mocked authorization tests.
5. Record device/Android/WebView versions, before/after app versions, save
   identifiers and observed results. Keep private account/session information out
   of public evidence. Physical acceptance is complete only after those actual
   observations, and distribution requires its separate approval.

No artifact mismatch requires an APK patch in this batch. The unresolved
original signing checkout, physical acceptance and any intended release remain
explicit gates.
