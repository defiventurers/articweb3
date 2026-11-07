# Antarctic Kingdoms Home · v5.9.4 / 92

Reviewed main commit: `5bb2c978fbdc96474b2788af56f56d4b35eb35c4`.
Implementation branch: `feature/home-redesign-v594`.

## Outcome and acceptance criteria

The Home screen introduces Antarctic Gaming Co., Antarctic Kingdoms and Lantern Harbor in that order. The approved Home artwork is bundled locally as ten WebP files. The harbor changes with the existing light/dark preference, and Nova, Retsba, Pengu and Abster welcome the player. All interface copy remains native text.

- One primary action: Explore the Games for a new player; Continue playing or Continue learning when App supplies its existing resume handler. A resumed game uses its actual cover, not the illustrative Yan Yi example.
- Learn opens the existing learning catalogue. Join friends opens the existing validated name/code form with six-character invitation paste support.
- Physical boards opens the existing Shop. The artwork is explicitly labelled a concept preview, with no new checkout or availability promise.
- Antarctic Passport opens the existing discovery journey. The optional story link opens the world guide. The five navigation tabs remain in place.
- Search is in Games. The manual update shortcut is hidden on Home and remains available in Profile. Mandatory-update enforcement is unchanged.
- Short screens can scroll the Home content without moving the bottom navigation. Home-only styles are removed when leaving Home. The normal phone layout fits the principal actions without the former large story banner.

## Accepted decisions

Use Antarctic Passport, Nova and the approved furry Home renders for this presentation. Preserve the heritage-game roles and existing game artwork. Keep one clear primary action, the actual saved-game authority, and the existing account/offline policy. Do not introduce blockchain or operator controls into Home.

## Reproducible release boundary

Public source still predates the shipped discovery catalogue and Shop. A normal whole-app rebuild would regress those screens. This release therefore recompiles `src/HomeLanding.jsx` and layers `src/home-redesign.css` into the exact signed v5.9.3 baseline, SHA-256 `8e569faffb6d218b6441d4b6358d951c5cbb63cc326020345da42f1b46bce640`.

`scripts/build-home-update.py` checks every bundle replacement anchor and changes only Home, its actual resume-cover prop, Home header branding and the fallback app version. The existing route callbacks, authentication readiness, game engines, source transformations and backend bootstrap remain intact. The Android manifest is recompiled with version 5.9.4/code 92 and the result signed with the original certificate. No server deployment is needed for this Home update.

```sh
python mobile/arctic-play/scripts/build-home-update.py \
  --baseline /private/AntarcticKingdoms-v5.9.3.apk \
  --sdk /tools/android-sdk --esbuild /tools/node_modules/esbuild \
  --keystore /private/release.jks --password-file /private/password.txt \
  --output /output
```

Requires Java 21, Android platform/Build Tools 35, Node and esbuild. Signing secrets and APK binaries are excluded from this source change. The older App source forwards the new Home callbacks for eventual source restoration; it is not represented as a complete reconstruction of the shipped App.

## Verification

The builder verifies v2/v3 signatures, signing-certificate continuity, ZIP integrity, uncompressed/aligned resources, all preload byte lengths, and byte equality of the previous 378 artwork files, eight other JavaScript files/workers and native DEX.

All 52 focused Node regression tests passed for sign-in readiness/cancellation, passport/recovery, asset loading, startup recovery, required/manual updates, progression, logout and offline-license verification. All five APK-layout regression checks passed. `tests/home-redesign-browser.py` passed against the actual packaged bundle in Chromium with mocked API replies and a simulated Android bridge. It checks light/dark layouts at 320×640, 360×800, 390×844, 412×915, 768×1024 and 844×390, 44-pixel minimum Home touch targets, overflow/reachability, catalogue/search/favorites, learning, room-code validation/paste, Shop, journey, story, Profile updates and a real saved Xiangqi position. No page errors were recorded.

Compile the test engine with esbuild into `build/games.cjs`, then run:

```sh
python mobile/arctic-play/tests/home-redesign-browser.py \
  --browser /tools/chromium --output /output/home-qa
python -m unittest discover -s mobile/arctic-play/tests -p '*apk*.py'
```

Physical Android installation, Android WebView rendering, live Google sign-in and live multiplayer are not verified by these browser fixtures. A signed APK is not launch-readiness evidence. Complete shipped-source restoration remains a separate engineering blocker; main-branch merge and public update-feed promotion are separate release steps.
