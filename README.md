# Antarctic Kingdoms Android releases

**Antarctic Gaming Co. · Timeless games. A new world.**

Install [AntarcticKingdoms-v2.0.0.apk](https://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/AntarcticKingdoms-v2.0.0.apk) over your existing Arctic Play app. Keep the existing app and its data to retain your profile, favorites, practice games and saved room seats.

Antarctic Kingdoms introduces a penguin royal-piece app icon, an Antarctic lobby and the fictional Frozen Archive. Discover the seven games with Polly, Retsba, Pengu and Abster, make a guided first move, and record your progress in a local Archive journal. Heritage and edition notes explain each game's origins.

## Install or update

Open **Profile → App updates** in Arctic Play v1.4.0 or Antarctic Kingdoms. The screen checks when opened, shows installed/latest versions and release notes, and offers **Check for updates** and **Download update**.

Your phone's browser downloads the APK. Open it and confirm **Update** in Android. If Android asks, permit that browser or file app to install from that source. Do not uninstall the old app first.

Requires Android 7.0 or newer and an up-to-date Android System WebView. Package: `xyz.arcticdominion.play`. Version 2.0.0 / versionCode 6. Internet is the only requested permission. APK size: 8,855,172 bytes.

SHA-256: `198be50ddd71356aa3283fb66b2f574cb236de7b101fc734b59398fd1860ecb9`  
Signing certificate SHA-256: `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`

The update feed intentionally uses [ArcticPlay-v2.0.0.apk](https://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/ArcticPlay-v2.0.0.apk). It is byte-identical to the new branded filename and preserves the download URL format trusted by existing v1.4.0 clients.

## Games and verification

All seven games, rules, legal moves, bots, private rooms and chat are retained. All 212 original game-art files and the original signing identity are unchanged.

Validation: 33 mobile tests and 10 private-room tests passed. Browser smoke checks passed at 320×640, 360×800, 412×915 and 800×360. APK v2/v3 signatures, original-certificate continuity, packaged/tested assets and ZIP alignment passed. Physical Android installation, launcher display, native sharing and browser-to-installer handoff still require a device check.

[Source commit](https://github.com/defiventurers/articweb3/commit/a979553738be4e986043cfa77c23097e5e3157ec) · [Source review](https://github.com/defiventurers/articweb3/pull/51) · [Build information](releases/build-info-v2.0.0.json) · [Verification](releases/verification-v2.0.0.json)

## Previous release

[Arctic Play v1.4.0](https://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/ArcticPlay-v1.4.0.apk) remains available. [Previous source](https://github.com/defiventurers/articweb3/commit/70eb7a6304905cb6a5f5c0627043b41e5b198ba7).

## Future releases

The app reads `releases/latest.json` on this branch. Build and sign every update with the original private signing key and a higher versionCode. Generate metadata using `mobile/arctic-play/scripts/prepare-update.py` from the source branch. Publish both APK filenames and updated metadata together in one commit, retain older APKs, and verify the public download against its checksum. Keep all signing material private.
