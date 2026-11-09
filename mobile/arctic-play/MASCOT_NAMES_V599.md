# Mascot names — v5.9.9 candidate

Accepted 9 November 2026. Rename the pink, red, blue and green companions to Nova, Rocco, Piko and Ziggy respectively. Keep legacy IDs `polly`, `retsba`, `pengu`, `abster` for saved progress, ownership, asset URLs and network compatibility. This supersedes the older display names in project instructions.

Reviewed `main` at `797df870bdca917c3d7f96980dd482b113b03f50`. Its mobile source is older than the delivered v5.9.8 APK. The release script therefore edits only authored string literals and four explicit reaction functions in the SHA-pinned delivered runtime. It preserves the delivered interface rather than rebuilding an older interface over it. Source labels are updated for subsequent builds, including `PenguinHosts.jsx` and the host direction document.

## Acceptance and evidence

- Guides, clan labels, stories, dialogue and newly sent authored stickers/reactions use the new names.
- New clients recognise both old and new exact authored reaction formats. Arbitrary player names and chat text are not rewritten. Older clients may display new reactions as ordinary readable text.
- Existing guide IDs, save keys, product IDs, roles and artwork paths are unchanged.
- Twenty-two relevant source regression tests passed: mascot names, celebrations, collections, director and Gathering suites.
- The actual patched shipped runtime passed 28 authored reaction cases and all four guide-name checks. Old capitalised names remain only in four compatibility constants in that runtime.
- Current source app bundled successfully with all imports resolved. This source compilation was a check, not the payload used for the APK candidate.
- Candidate manifest reports v5.9.9 / versionCode 97. ZIP integrity, Android resource storage/alignment and zipalign checks passed. All 425 other non-signature APK entries, including artwork and native DEX, are byte-identical to the v5.9.8 baseline.
- No Android device installation, signed release, backend deployment or image editing is claimed. Names baked into artwork are outside this text-only change. Generated server bundles and development bot player names are unchanged; regenerate canonical server bundles through their existing pipeline before a later backend release.

## Reproduce or sign

Install build dependencies with `npm ci --prefix mobile/arctic-play/build-deps` from the repository root. Use Node 24+, Python 3, Java and an Android build-tools directory containing aapt2, zipalign and apksigner.

```bash
python3 mobile/arctic-play/scripts/build-mascot-name-update.py \
  --baseline /path/to/AntarcticKingdoms-v5.9.8.apk \
  --sdk /path/to/android-build-tools \
  --output /path/to/output
```

The baseline SHA-256 must be `ac7baa5086014e99b0dce691d99aa47902d1a8130dd4a98061e45185157840c4`. Without signing inputs, the script produces an explicitly **UNSIGNED** candidate and verification JSON. It cannot be installed as an update in this state.

To finish the installable update, repeat the command with `--keystore /path/to/original-release.keystore --password-file /path/to/password-file`. The existing alias is `arctic-play`. The script verifies the resulting certificate against the baseline; the original certificate SHA-256 is `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`. Use the original release key through a secure signing environment. Do not commit signing files or passwords.

The runtime regression can also be rerun with `node mobile/arctic-play/tests/mascot-apk-runtime.mjs` after the patch script has generated the runtime. Source regression suites require their usual generated CJS test modules under `mobile/arctic-play/build/`.

The remaining release blocker is access to the original signing key. No replacement signing identity is generated.
