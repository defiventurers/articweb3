# Antarctic Kingdoms v5.10.5 / Android code 109 — release candidate and blockers

**Release status: SIGNED REVIEW APK EXISTS, NOT PUBLICLY RELEASED. Source PR remains draft.**

## Signed candidate produced 13 November 2026 (IST)

- APK: `AntarcticKingdoms-v5.10.5.apk` (private ChatGPT attachment), **58,967,298 bytes**, SHA-256: `d9faa7be5f1cd960177d1bd6b0884851a7ea0579630146f450c84313442f2022`.
- Original keystore was recovered from the owner's private Library signing backup, and the `arctic-play` private-key entry certificate SHA-256 matched `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`. Signing occurred **locally**, without GitHub ever receiving the keystore or password. All temporary local key/password copies were removed afterward; the owner's original backup remains intact.
- Original-key APK Signature Scheme **v2/v3 verified** with Android SDK 36 `apksigner`. App ID `xyz.arcticdominion.play`, version `5.10.5`, code `109` confirmed at CI `aapt2` packaging gate. All 426 ZIP-stored entries are 4-byte aligned, `resources.arsc` is stored/uncompressed, and archive CRC passed.
- Source build commit: `572e8be7c20547874d77b2f0e5027ad00112ed7d`. Unsigned source build and checks: https://github.com/defiventurers/articweb3/actions/runs/43323076833 . CI passed **79/79** mobile regression tests and produced 443 artwork files. Private unsigned-build artifact was signed by the owner-local original key.
- Cross-version preservation: **435/435 retained artwork files unchanged**, including 50 launcher/loading/brand-sensitive assets. The five older v5.10.4 Chaturanga art layers are intentionally replaced with six newly approved v2 layers.
- **Critical unresolved parity:** Compiled `assets/fair-worker.js` differs from signed v5.10.4 (549,195 versus 389,375 bytes); `assets/verifier.js` differs (362,509 versus 213,798 bytes). These differences alone do not prove a functional regression but **do not establish preservation** of the v5.10.3/5.10.4 verifier. Full original unminified source is still missing. Do not distribute the signed review build as production until this and physical Android install/data tests are addressed.
- Source UI parity across every game and viewport was not independently screenshot-approved; no physical install or live Para/multiplayer QA was claimed. No production update feed was touched and Phase 6 remains paused.


## Source decisions already carried forward
- Built on `codex/v5914-game-views-chaturanga-v2` (PR #95) after syncing with main.
- Version candidate `5.10.5` / `109`, package ID `xyz.arcticdominion.play` (higher than installed v5.10.4/code108).
- Reinstates v5.9.14 Games tab/header and approved v2 Chaturanga full-frame art, board grid, short `Bot Practice`, live seat labels (`YOU/BOT/HUM`) and pip dice; original game and legal move engines unchanged.
- All six approved WebP uploads are SHA-256 pinned. Exact baseline v5.9.14 CSS bytes are pinned by a regression test.
- Old main app source remained 5.10.2/code106; the earlier Work source for signed v5.10.4 was **not present** in GitHub, files or Drive. This branch does **not** pretend to recreate its proprietary compiled source.

## Signed incumbent evidence
- The owner-supplied v5.10.4 APK: `7f0eb1b7bb2cb1d5d974249251bdb0356b15ccc298939f459bc42d296ffd414d` SHA-256, code 108, original signer `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`.
- `docs/launch/v5104-signed-runtime-fingerprints.json` records seven immutable signed runtime entry checksums. It does not grant access to the private signing key.
- The current main signing workflow is trusted-branch `main` only, manual dispatch only, secret-backed; `AK_ANDROID_RELEASE_JKS_B64` and `AK_ANDROID_RELEASE_KEYSTORE_PASSWORD` must exist in GitHub Secrets. This ChatGPT GitHub connector cannot inspect those secrets or issue a workflow_dispatch request.

## Source CI
- First v5.10.5 source commit `9f27423e4af8339635be43c648cfe8fb6febb98c` passed:
  - launch/source/proof checks: https://github.com/defiventurers/articweb3/actions/runs/43320129517
  - Shanshui Xiangqi: https://github.com/defiventurers/articweb3/actions/runs/43320129430
  - frontend smoke: https://github.com/defiventurers/articweb3/actions/runs/43320129444
- Later commits are metadata-only. Recheck the latest head CI before merge.

## Critical remaining gates
1. **Recover and reconcile full uncompiled v5.10.4 source**. Current PR rebuilds older 5.10.2 source. **Do not sign it as an upgrade** until the v5.10.3 independent verifier, v5.10.4 release improvements and protected approved artwork are proven present by source-level diff, compiled-worker tests and runtime comparison. The original signed APK is a read-only verification baseline, not source to patch.
2. Verify *every* game setup/How-to-Play/match/results/room screen remains visually identical to v5.9.14 except approved new Chaturanga layout. Existing source CI is not screenshot parity.
3. Run responsive 320×640, 360×800, 393×852, 430×932 and tablet viewport/device checks; verify 4 Chaturanga rotations and all seat/cell taps, paired dice/pass, bots, multiplayer and saved data.
4. Confirm GitHub original signer secrets are configured **without exposing their values** and that the trusted main-only signing workflow exists and passes. Trigger version `5.10.5` code `109` only after reviewed main source is ready.
5. Independently verify certificate, app ID, higher versionCode, ZIP alignment, uncompressed `resources.arsc`, launcher art, hashes and install-over-existing-data. If any differs, reject artifact; do not publish or instruct users to uninstall.

**Release record:** Signed review APK produced locally from CI unsigned artifact and made available only in the owner's ChatGPT conversation; **not** merged, published via GitHub Releases or promoted to the public update feed. Existing installed app, user data, launcher, wallet, chain settings and Phase 6 unchanged.
