# November 11 candidate audit: approved v5.9.15 vs recovered v5.10.1

**Candidate is not public-release-approved.** This is a static binary inspection, not an Android device or live-service acceptance.

## Exact files inspected
- Approved baseline uploaded APK: SHA-256 27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488; 50,615,822 bytes; metadata v5.9.15/code103.
- Recovered user-owned v5.10.1 APK: SHA-256 524d9d383b76478583837e53084da971b19eff06fe76f06730973422354e262a; 58,069,673 bytes; metadata code105.
- Candidate comes from source branch codex/careful-launch-v511 at a6e7b7b1cd888a8cb7d9e338701d9261b164b653; it is not current main.

## Verified static checks
- Candidate ZIP CRC, stored/aligned resources.arsc and embedded P-256? No claim about crypto algorithm: embedded certificate SHA-256 20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37 exactly matches baseline.
- `jarsigner -verify` returned 0 but warned that signer is self-signed; both APKs contain Android signing-block IDs 0x7109871a (v2), 0xf05368c0 (v3). `apksigner` and physical install were not available.
- 402/402 original assets/art images are byte-identical, including original loading asset.
- All 7 PNG launchers render pixel-for-pixel identical between baseline and candidate. Six PNG files differ in compressed bytes due lossless PNG re-encoding; one is byte-identical. The preservation guard accepts only verified pixel-identical launcher PNG re-encoding and otherwise compares original art bytes exactly. Pillow is required for this optional pixel check.
- 9 bundles passed `node --check`: app, bot, learn, fair-worker, shanshui-bot, verifier, startup, theme-init, pwa-sw.
- Original 9-game names present, but live game modes, authentication, reconnect and installed UI have not been tested.
- 447 passed / 0 failed release *inspection* checks, specifically inspection-only mode with `release_verified=false`.

## Release-risk deltas to inspect before publication
- Candidate has 7 declared app-version capabilities versus 17 in baseline. Thirteen old declarations are missing, including co-tu-lenh, academy, passport, login/onboarding and home flags. This does not establish feature removal but warrants service-client negotiation and mode regression checks.
- `assets/co-tu-lenh-bot.js` is removed. In newer `frontend/src/games/co-tu-lenh/CoTuLenhApp.jsx` the bot chooses moves synchronously through `chooseBotMove` imported from the rules module; verify 3 difficulties and performance instead of assuming the removed worker is a deleted game.
- Browser/PWA v5.10.1 archive is an unpublished candidate. Live Render main remains 0a7d45ce at last check.
- Do not claim installation compatibility, exact baseline UI restoration, working live passport mint, Play review, completion of reset, or final production-ready meshes without separate proof.

## Physical-engineering milestone
- Nine STL engineering locator jigs generated from the nine saved app-coordinate SCAD files, using original point coordinates. All 9 check watertight, consistent winding, positive volume and one connected component. They are 4mm unprinted engineering plates only; not actual final playable boards.
- Sannin source bug: point x=474.1737mm lies beyond 474mm board source envelope. Proposed STL widens only right physical edge by 4.3737mm without moving any game node; this needs review.
- San You Qi prototype Red_SkiChariot_v3_PROTOTYPE.stl passes watertight, winding and connectedness; 21x21x19.9mm, but does not prove physical fit/finish.
- Prior docs report nearest point spacings ~13.28mm (San You Qi) and ~16.32mm (Sanguo Qi) in 474mm jigs, so 21mm bases can collide. Do not manufacture without occupancy/scale tests.

## Do not merge without
1. Native apksigner and aapt2/zipalign checks on candidate APK and AAB, and Android install directly over existing v5.9.15 without deleting user data.
2. Screenshot / interaction parity on original loading, icon, Home, Games, Shop, Chats, Passport, all nine games, sign-in, recovery, tutorials and offline/private rooms.
3. Live Para production wallet and testnet mint receipts, truthful dashboard reconciling chain events, plus proper Store Console/account state.
4. Explicit owner review of exact DB reset scope and restored backup; no destructive action in this audit.

**No release deploy/Reset/Play submission was run by this checkpoint.**