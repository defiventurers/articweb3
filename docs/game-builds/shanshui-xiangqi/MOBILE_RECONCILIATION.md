# Shanshui mobile beta 5.7.0

3 November 2026. Reviewed `main` at
`97bbdd5121eb0e75c0993f0066c5c16a0b13f5a1`, first playable Shanshui at
`3cf8f773948e52c796ca39a83251ce27b66bc8ee`, and restored current mobile
source in `09ca49e2b704fe1cb67eadde5f73085fe89bb869`.

## Delivered and accepted scope

The current mobile interface replaces the old checked-in shell. The existing
seven games retain their IDs, learning modes, account/visa entry, updates,
offline-license checks and unlock journey. Shanshui is a separate catalogue
entry beyond those seven halls. It uses the same global access gate and grants
no invented mastery, blockchain rewards or Fair Play receipt support.

The signed **5.7.0 beta / versionCode 79** includes two-player local teams,
four-player 2v2, three bot levels, tutorials, movement practice and board
arrangement. Private online two-seat and four-seat rooms support authenticated
create/join, invitations, ready/start, bots, chat, saved seats and reconnect.
The public backend needs capability `shanshui-antarctic-v1` before those online
rooms can be used there. No deployment was performed.

## Reconciliation and package evidence

Current source was recovered from the complete saved 5.4.0 archive and the
5.4.1, 5.4.2, 5.5.0, 5.6.0, 5.6.1, 5.6.3, 5.6.5 and 5.6.8 source updates.
Only their mobile/shared portions were restored; backend overlays were not
applied. The 5.6.2 binary hotfix is represented by the later source and runtime.
Input hashes are recorded in `mobile-source-inputs.json`.

The build requires the exact `AntarcticKingdoms-v5.6.8.apk` (code 78), SHA-256:
`1f25ab4abd8578b399611e0f1ac66e801443c661235dd57c81a2c2788734ae6e`.
All **323 existing artwork files** are copied byte for byte. Shanshui art is
appended. Existing Yan Yi sprites supply Red, Blue and Green; Purple has seven
new transparent tokens. New artwork remains pending visual approval.

The saved beta APK SHA-256 is:
`128cfc7d5b31b0ffbd2569415c9bd0543c5741c3bc2cb834ba0eefb1d6cf8963`.
Its original signing certificate SHA-256 is:
`20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`.
ZIP alignment and signing were verified when the APK was built. All 14 retained
native/resource entries, including DEX and the resource table, match 5.6.8.
Only web assets and the two manifest version fields change. This preserves the
fixed native sign-in handoff and current launcher. No private key is committed.

The recovered source rebuilds the saved beta's app bundle, styles, all workers
and preload manifest byte for byte. Builds no longer regenerate production
server engines, company modules, or public browser deployments implicitly.
Unresolved runtime imports fail the build. Update signing requires the original
private key rather than silently generating a new app identity.

## Validation

| Check | Result |
| --- | --- |
| Canonical Shanshui engine | 14 Node tests passed |
| Current mobile regressions | 59 passed: seven-game phone flows, current Para sign-in/visa, offline licenses, access, discovery, updates, startup and all 338 preload entries |
| Server/account/room regression selection | 20 passed, including both Shanshui formats and the existing bootstrap/socket tables |
| Chromium local play | 390×844 and 1440×1000 passed: artwork, legal taps, turns, undo, themes, tutorials, editor and real bot worker |
| Two signed-in Chromium phones over real sockets | Create/join/ready/start, move broadcast, chat, reload/rejoin, bot replacement and four-seat room start passed |
| Legacy rules comparison | Six non-dice mobile engines matched production legal actions and resulting states over 30 sampled plies each |

The current Chaturanga mobile source already supports one-die/skip actions
absent from the older production server engine. Existing capability gates remain;
the server engine was not overwritten. Shanshui uses its separate canonical
engine and versioned adapter.

The complete historical saved-source suite was also run during reconciliation:
171 passed, 28 failed and 4 skipped at that intermediate point. It includes
obsolete pre-Para sign-in expectations, former mascot/icon masters and source
artwork/editor fixtures absent here. The progression and preload issues it
identified were corrected and covered by the passing current selection.
Do not describe that entire historical suite as passing. Physical-phone update,
provider login/return and offline-pass restoration still need device validation.
The Java URL test was not rerun because this runtime lacks a Java compiler;
the fixed native DEX is preserved exactly.

## Rebuild and review

```sh
npm ci --ignore-scripts --prefix mobile/arctic-play/build-deps
npm ci --ignore-scripts --prefix shared/fair-play
npm run build --prefix mobile/arctic-play -- --baseline-apk /absolute/path/AntarcticKingdoms-v5.6.8.apk
npm run test:current --prefix mobile/arctic-play
```

Run `node tests/shanshui-browser.mjs` and
`node tests/shanshui-online-browser.mjs` from `mobile/arctic-play`, using
Playwright Chromium or `SHANSHUI_CHROMIUM_EXECUTABLE`. Online tests use
isolated test accounts, never a player's credentials.

```sh
python3 mobile/arctic-play/scripts/build-asset-update.py --base-apk /absolute/path/AntarcticKingdoms-v5.6.8.apk --build-tools /absolute/path/android-build-tools --keystore /private/original.jks --password-file /private/password.txt --output /absolute/path/release
```

Install as an **Update**, without uninstalling. This is a beta, with no Render,
store, update-feed, chain or public-browser deployment. No paid entry or settlement
was enabled. Next: reviewed backend release, physical-device validation and
multiplayer beta.
