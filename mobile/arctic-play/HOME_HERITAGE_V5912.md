# Heritage home — v5.9.12

Accepted visual direction, 9 November 2026: a richer Antarctic home in both themes, with gold navigation tabs and a heritage character. Daylight uses ivory, pale ice and antique gold. Night uses deep aurora blues, warm white type and illuminated gold. A classical title, fine framed harbor artwork, a gold play action, Academy and Gathering cards, and a prominent Passport establish the hierarchy. Existing approved artwork and character identities are retained.

Reviewed `main` at `34aa7eb742ec734de037cc4753d3d02f491ee22a`. The shipped v5.9.11 runtime contains interface updates newer than main's App.jsx. The release therefore applies this presentation change to the SHA-pinned shipped runtime, preserving its loading screen, icon, account access and newer game catalogue. Do not rebuild the older main App.jsx over that delivered runtime for this release.

## Acceptance and evidence

- Both themes share the same hierarchy and gold navigation; theme changes retain the existing stored preference and native system-bar integration.
- Continue uses the existing saved-game callback, label and cover. New players receive the existing Explore route. No new unlock or payment authority is introduced.
- Learn, Join friends, Passport, physical-board previews and the harbor story retain their existing destinations.
- Existing mascot names, source-native roles, game IDs, saved positions, assets and game engines remain stable. No heritage dates or historical claims were added.
- Seven packaged-runtime regression groups passed in JSDOM: initial Home, persisted themes, Explore/Learn, name-first join/cancellation, Passport/Shop/story, the exact saved Xiangqi position, and absence of runtime errors.
- The previous live loading-progress, failure/retry and successful-access transition regression passed with the new runtime.
- Core foreground/background palette pairs were checked for contrast; action targets retain at least 44px minimum height. Small screens can scroll to retain accessible controls rather than hide actions.
- Offline layout proofs were inspected. The cloud browser blocks local preview URLs, so these proofs are not claimed as live WebView/browser rendering verification. Android device installation, live account services and multiplayer were not exercised.
- APK Signature Schemes v2/v3 verified against the original release certificate. ZIP integrity, Android resource storage/alignment and zipalign passed. Only the manifest, app JS/CSS and three version/cache metadata files changed. All 428 other non-signature APK entries, including launcher images, approved artwork, native DEX and game workers, are byte-identical to v5.9.11.

## Reproduce

Requires Node 24+, Python 3, Java, Android build tools, `npm ci --prefix mobile/arctic-play/build-deps`, and the original signing inputs through a secure local signing environment.

```bash
python3 mobile/arctic-play/scripts/build-heritage-home.py \
  --baseline /path/to/AntarcticKingdoms-v5.9.11.apk \
  --sdk /path/to/android-build-tools \
  --output /path/to/output \
  --keystore /path/to/original-release.jks \
  --password-file /path/to/password-file
```

The baseline SHA-256 is `6ca54ad3094c99437f47fe343fe8afaf666d3b9a01c093b0421ab4823b2ac3b1`. The script verifies the original signing identity; without signing inputs it creates an explicitly unsigned candidate. Signing secrets are never committed.

To rerun Home interaction checks after generating the usual `build/games.cjs` test module:

```bash
node mobile/arctic-play/tests/home-heritage.test.mjs \
  mobile/arctic-play/build/heritage-home-v5912/app.js
```

Delivered release: v5.9.12 / versionCode 100. SHA-256: `25bb9039776055eee7830fb16cb0c36f7facc83b1dade8ab178bfdb899dc9cf2`. No backend deployment or update-feed publication is included in this task.
