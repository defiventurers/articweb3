# Antarctic Kingdoms 4.7.0 — A compact home for every game

Home fits on one screen. Continue, Explore the Halls / Find a game and Join friends are grouped at the top. Secondary features now live together in Chats: Your Camp, discoveries, the learning library, daily puzzles, first-move adventures and optional Gathering stories.

Games uses two compact columns on phones, three on wider screens, and one internal scroll surface. Full names, English meanings and dates remain readable. Every card keeps Quick play (vs bot), Explore hall and How to play. The three large learning choices and their mascot guidance remain unchanged.

The release retains all seven games, the exact Shogi board upload, Chaturanga 2v2, per-seat board views, iPhone invitations, saved room reconnection, existing artwork, profile and game saves, and enforced updates for verified higher native versions.

## Build and verify

From the source archive root:

```bash
npm ci --prefix mobile/arctic-play/build-deps
ln -s ../mobile/arctic-play/build-deps/node_modules frontend/node_modules
npm ci --prefix server
node mobile/arctic-play/scripts/build-web.mjs --reuse-artwork server/arcticPlayWeb/art
node --test --test-concurrency=2 mobile/arctic-play/tests/*.test.mjs server/tests/arctic-play-web.test.js server/tests/arctic-play-invites.test.js
BROWSER_PATH=/path/to/chromium node mobile/arctic-play/tests/compact-lobby-browser.mjs
QA_WEBKIT=1 WEBKIT_PATH=/path/to/webkit node mobile/arctic-play/tests/compact-lobby-browser.mjs
BROWSER_PATH=/path/to/chromium QA_OUTPUT=mobile/arctic-play/verification/release-4.7/learning node mobile/arctic-play/tests/learning-access-browser.mjs
BROWSER_PATH=/path/to/chromium QA_WEBKIT=1 WEBKIT_PATH=/path/to/webkit QA_OUTPUT=mobile/arctic-play/verification/release-4.7/teams node mobile/arctic-play/tests/teams-browser.mjs
python3 mobile/arctic-play/scripts/build-apk.py --sdk /path/to/android-sdk --jdk /path/to/jdk --keystore /private/ArcticPlay-release.jks --password-file /private/signing-password.txt --output out
```

A JRE-only environment can add `--javac-jar /path/to/ecj.jar`. Android API 35 and build tools 35 are required. Use the existing original signing key for an in-place update; private signing files are excluded from this source archive.

The evidence is in `verification/release-4.7/release-validation.json` and the adjacent reports. The APK and browser bundle are compared byte for byte. Physical phones have not been tested.

## Distribution status

Built and verified locally. Remote browser/server, APK and update-feed publication are pending. `release/proposed-latest-v4.7.json` is a candidate feed, not a live release. Publish the matching browser/server bundle and signed APK before updating the public feed. Existing mandatory-update behavior observes the verified higher native version code (47); the browser continues to use refresh-based updates.
