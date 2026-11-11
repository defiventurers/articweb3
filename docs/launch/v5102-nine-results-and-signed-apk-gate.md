# v5.10.2 — Nine-game result completion and signing handoff

> **No signed APK has been produced or published.** This branch completes source-level victory integrations and prepares a private Android review build. The user has not approved visual/device parity. Do not publish the update feed or merge to production until release checks pass.

## Source provenance and decisions

- Reviewed live `main` at commit `36468e5d1072b485ed33eb1cdf6bdf74a7f1893c`. v5.10.2 fixes from merged PR #84 are the base.
- Accepted visual benchmark remains v5.9.15 APK SHA-256 `27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488`.
- Preserve `xyz.arcticdominion.play`, native launcher image bytes, original signing certificate fingerprint `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`, mobile installation data, nine engine rules and URLs.
- Version metadata remains 5.10.2 / Android code 106; **no earlier code-106 APK has been confirmed distributed.** Verify actual update feed/version codes before publication.

## Remaining issue 6 completed in source

1. **Cờ Tư Lệnh:** new royal result overlay for local, pass-and-play, bots and private online games. Uses `isFinished(state)` and `state.winner/state.draw`; shows all alive surviving pieces of the victorious team, correct faction, original sprite files, final-board dismissal, replay/new private table, share, Back to Games. Does not modify rules or state.
2. **Shanshui Xiangqi local/bot/2v2:** shares a purpose-built `RoyalResult` using the engine's `state.outcome`, `teamOf`, and `spriteFor`; all surviving pieces of both allied winning armies included. Bot defeat is labelled accurately.
3. **Shanshui private online:** consumes server-updated `room.gameState.outcome`, not a locally inferred winner; same team-aware pieces and correct controls. A rematch creates a **new private room**, not an unsupported same-room restart.
4. **Shared visual artwork:** original vector crown, aurora, snow and celebratory motion with reduced-motion support, plus existing source-native piece images. No approved mascot was redesigned.
5. **Draws and unresolved results:** not labelled victories. Rule engines alone determine outcomes. Closing the celebration returns to the untouched final board.

## Test evidence

On PR #85, `mobile/arctic-play/scripts/build-current.mjs --native` generated version 5.10.2 with 437 artwork resources, and all GitHub launch checks passed at commit `c847b56eb365afb2ad8f726dae7ed94398c123cb`.
- 73/73 mobile tests, including five new tests of both rule-engine outcomes and result integrations.
- 2/2 nine-intro DOM restoration tests.
- 36/36 server launch tests, 16/16 proof-verification tests, and 2/2 contract launch tests.
- Chaturanga post-roll UI regression passed with the source-candidate dice popup.
- Rules/rooms and browser smoke workflows passed. **These are not physical-device tests.**

## Private APK release path (non-public)

The branch includes `.github/workflows/android-review-signed.yml`, which can build a signed APK only if GitHub Actions contains two owner-controlled repository secrets:

- `AK_ANDROID_RELEASE_JKS_B64`: base64 of the **existing release keystore** `ArcticPlay-release.jks`, never a newly generated key.
- `AK_ANDROID_RELEASE_KEYSTORE_PASSWORD`: existing keystore password (never in repository or chat).

Workflow uses Android API 36 and Node24, runs the source tests, builds with `build-apk.py`, verifies that the APK's signer certificate SHA-256 matches the approved original, checks alignment/CRC/version, and uploads `AntarcticKingdoms-v5.10.2-signed-review` as a private CI artifact. **No publishing is performed.** If secrets are absent, it explicitly skips build/sign/upload and writes `NO SIGNED APK` to the job summary.

Current owner-connected workspace and Google Drive searches did not expose the original signing key/password; older successful signing was in a separate protected build environment. No cryptographic key can be reconstructed from existing signed APKs. Do not ask for the password in chat or store it in untrusted files.

## Final device acceptance before public release

- Source-to-APK identity: package, code 106 or higher if already distributed, original signer, CRC, zipalign, SDK level.
- Install **over** the user's 5.9.15 or 5.10.1 without uninstalling, compare loading and launcher visually, preserve local game data and accounts.
- Smoke all nine game openings, game modes, rules, captures, tutorials, bot, match start/end, multiplayer reconnection and regional halls.
- For all nine victory outcomes, test victory/draw/defeat/resign, all surviving sprites and Back/Final Board/Play Again/Share/Rematch where offered.
- Confirm all four approved mascot identities and heritage story content at phone resolutions (including light/dark and reduced-motion).
- No live Render reset, Passport/NFT mint, Play Store upload or mandatory update feed modification occurred as part of this branch.

## How to obtain a working download when signing becomes available

Run the private GitHub Actions workflow. Inspect uploaded artifact, extract `AntarcticKingdoms-v5.10.2.apk`, independently verify SHA-256, package, version code and certificate, install in place and complete acceptance testing. Then upload the verified file to the owner's controlled Google Drive or signed GitHub release location. **Never link a draft or unsigned build as a ready APK.**
