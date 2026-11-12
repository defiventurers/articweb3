# v5.10.4 Chaturanga APK recovery and secure release handoff

**Status: signed package recovered; source parity and physical installation unverified. Phase 6 remains paused. No publication or production update-feed changes.**

## Recovery provenance (13 November 2026, IST)

- Source branch intended in previous Work session: `codex/approved-chaturanga-match`. **Not found in GitHub** during recovery.
- Baseline main reviewed: `8a3b021d1277aa4ec1e2789daf7283d5d27fe551`.
- Current main Android source manifest remains **5.10.2 / code 106**, and contains no `src/chaturanga-match.css` or `frontend/public/assets/launch-v1/chaturanga-match/header.webp`. Do not try to rebuild v5.10.4 from this older tree.
- The previous Work session saved **AntarcticKingdoms-v5.10.4.apk** and `verification.json` in the user's private ChatGPT Library, plus two comparison JPGs. The package was materialized and checked read-only; no APK patching or new keystore was used.
- Package: `xyz.arcticdominion.play`; version name **5.10.4**; version code **108**.
- APK bytes: **58,811,535**.
- APK SHA-256: `7f0eb1b7bb2cb1d5d974249251bdb0356b15ccc298939f459bc42d296ffd414d`.
- Embedded Android v2 signer certificate SHA-256: `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37` (approved original).
- Independent v2 **and v3** cryptographic signatures and whole-content digest verification succeeded for the recovered APK, including RSA-SHA256 signatures, 59 signed chunks, and the approved signer certificate. ZIP CRC passed for **477** entries; `resources.arsc` is **stored/uncompressed**; stored resource offsets passed 4-byte alignment.
- Android binary manifest was decoded independently and shows package, code 108 and name 5.10.4. Five `assets/art/launch-v1/chaturanga-match/` WebP layers exist in the signed archive, alongside approved piece sprites.
- Existing Library record reports 415 preserved assets and browser rotated-seat test results. These are **prior-session records**, not freshly rerun tests.
- Saved 320×640 comparison image shows the Chaturanga match upgrade. Saved 393×852 image shows only the icy background and **does not prove match-page rendering**. Treat this viewport as **unverified**.
- `apksigner`, `aapt2`, `zipalign` and a physical Android device were unavailable in this recovery container. Full Android command-line validation and device acceptance remain to be performed.

## Workflow change in this PR

The updated GitHub Action is manual-only and executes only on **main**, not arbitrary untrusted feature branches. It compares requested version/code against the checked-in manifest, requires code >=108, and fails if original-signing secrets are missing. Secrets are only injected into configuration-check/signing steps rather than into npm/script execution. It verifies the APK certificate, alignment, package, version, and uncompressed `resources.arsc` and uploads a private review artifact. It cannot and should not produce 5.10.4 while main still has 5.10.2 sources. It does not publish an update.

GitHub Actions secrets, if not configured, must be added through GitHub's secure Settings interface; do not paste keystore/password into issues or Chat. No secret values were accessed.

## Remaining acceptance gates

1. Recover the exact *uncompiled* v5.10.4 Chaturanga source and approved extracted artwork from the prior Work workspace or an authorized source archive. Review it against current main and commit into a separate branch. Do not reconstruct source by patching minified APK JavaScript.
2. Verify the source changes are Chaturanga-only, retain the v5.10.3 proof verifier, and rerun current source/engine/UI tests and 320/360/393/430/tablet viewports, including 393×852 match navigation.
3. When approved source is merged onto main, manually dispatch this signing action with matching version/name after confirming secrets and review gates. Do not publish automatically.
4. Independently check `apksigner verify --verbose --print-certs`, `aapt2 dump badging`, `zipalign -c -p 4`, SHA-256, then perform **install-over-existing-app** acceptance on a physical device; verify that user data, sign-in, game modes and multiplayer reconnect persist.
5. Only after acceptance, approve any public release/update feed separately.

Never uninstall the existing APK as a test shortcut; this would risk losing app data. Never resign the candidate using a new key.
