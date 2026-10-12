# Arctic Play Android releases

Install [ArcticPlay-v1.4.0.apk](https://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/ArcticPlay-v1.4.0.apk) over your existing Arctic Play app. Keep the existing app and its data to retain your profile, favorites, practice games and saved room seats.

In version 1.4.0, open **Profile → App updates**. The screen checks when opened, shows installed/latest versions and release notes, and offers **Check for updates** and **Download update**. The same-version APK can be downloaded to share with friends. Offline checks show a retry action and remove stale download buttons.

Your phone's browser downloads the APK. Open it and confirm **Update** in Android. If Android asks, permit the browser or file app to install from that source.

Requires Android 7.0 or newer and an up-to-date Android System WebView. Package: `xyz.arcticdominion.play`. Version 1.4.0 / versionCode 5. Internet is the only requested permission. APK size: 8592049 bytes.

SHA-256: `aeb927bc2bcf0c7b816ab26324eda408c87d9937b1371b5da283efc3a93e4557`  
Signing certificate SHA-256: `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`

All seven games, artwork, dark-mode preference and original signing identity are retained. The APK assets were compared with this source and its 212 artwork files match version 1.3.0.

Validation: 32 app tests, 10 private-room tests and five headless phone/landscape layouts passed. APK v2/v3 signatures, original-certificate continuity and ZIP alignment passed. Physical Android installation and browser-to-installer handoff still require a real device check.

[Source commit](https://github.com/defiventurers/articweb3/commit/70eb7a6304905cb6a5f5c0627043b41e5b198ba7) · [Source review](https://github.com/defiventurers/articweb3/pull/49)

## Future releases

The app reads `releases/latest.json` on this branch. Build and sign every update with the original private signing key and a higher versionCode. Generate metadata using `mobile/arctic-play/scripts/prepare-update.py` from the source branch. Publish each new APK and updated metadata together in one commit, retain older APKs, and verify the public download against its checksum. Keep all signing material private.
