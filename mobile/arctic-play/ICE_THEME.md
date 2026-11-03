# Antarctic Kingdoms 3.3.0 — Glacier daylight and Night ice

The shared app shell now uses original frozen-lake artwork in two appearances.
Glacier daylight combines pale blue ice and white frosted surfaces. Night ice
uses sapphire ice, cyan fracture highlights and deep blue frosted surfaces.
Home, Friends, Games, Chats, Profile, Camp, learning screens, match controls and
dialogs all use this system. The existing Dark mode switch selects the
appearance; no additional navigation or controls were added.

Text sits on reading surfaces, while the crystalline detail remains around the
edges. There are no animated particles, network-loaded backgrounds or changes
to board colours, hit targets, geometry or game rules. The saved appearance is
applied before React starts. Android launch artwork, system-bar colours and
the Android 12+ splash palette are coordinated with Night ice.

## Artwork and source

- `art/ice/masters/daylight.png` and `night.png`: original generated masters,
  each 941 × 1672 pixels.
- `art/ice/daylight.webp` and `night.webp`: bundled 720 × 1280 runtime files.
- `art/ice/generation.json`: both exact generation prompts and usage details.
- `src/ice-theme.css`: the final shared theme layer.
- `src/theme-init.js`: early saved-theme initialization using the existing
  `arctic-play.v1.theme` preference.
- `android/app/src/main/res/drawable/launch_ice.xml` and
  `drawable-nodpi/launch_ice_texture.webp`: native launch surface.

The new images were generated with the built-in Image Generation tool and
converted to WebP for the APK. They are not advertised as native 8K assets.
All 283 pre-existing packaged artwork files remain byte-identical to 3.2.3,
including the Yan Yi guardian board, boundary dots, covers, mascots and corrected
Xiangqi cutouts. All seven rule engines and website source files are unchanged.

## Rebuild from the source archive

Run these commands at the extracted project root. The archive contains the
reusable artwork under `recovery/artwork`, source masters, native resources and
the dependency manifest/lock used for this release. Generated Android web assets
and temporary native build products are intentionally omitted.

Requires Node.js 22.12+ (24 recommended), Python 3, JDK 17 and Android SDK
platform 35/build-tools 35. Keep the existing release keystore and password file
outside this tree.

```sh
npm ci --prefix recovery/android-build-deps
ln -s ../recovery/android-build-deps/node_modules frontend/node_modules
ln -s ../recovery/android-build-deps/node_modules server/node_modules
ln -s ../../recovery/android-build-deps/node_modules mobile/arctic-play/node_modules
node mobile/arctic-play/scripts/build-web.mjs --reuse-artwork recovery/artwork
node --test mobile/arctic-play/tests/*.test.mjs
python3 mobile/arctic-play/scripts/build-apk.py \
  --sdk /absolute/path/to/android-sdk \
  --jdk /absolute/path/to/jdk-17 \
  --output /absolute/path/to/release-output \
  --keystore /absolute/path/to/existing-release.jks \
  --password-file /absolute/path/to/existing-signing-password.txt
```

For the browser appearance check, install Playwright in the dependency directory
and supply an installed Chromium executable through `AK_CHROME`, then run
`node mobile/arctic-play/tests/ice-theme-browser.mjs`. `AK_QA_DIR` optionally
captures local inspection images; `AK_RESULTS` optionally writes JSON results.

## Validation

The 68-test mobile suite passes, including game rules, saved-state behaviour,
interactive learning, transparent token cutouts and Yan Yi spacing. The 16
browser check groups cover both appearances before React starts, all five main
tabs, Camp, dialogs, interactive learning/options, Xiangqi/rules, 320/375/834px
layouts, offline image decoding and saved appearance after reload. Browser
console checks reported no runtime errors. Internal screenshots were inspected
for Home, learning and match screens in both appearances.

The final APK is ZIP-aligned and verified under APK Signature Schemes v2/v3
using the existing signing certificate. Version 3.3.0/code 23 retains package
`xyz.arcticdominion.play`, min SDK 24 and target SDK 35. Install over the existing
app to keep its local data. Physical-device installation was not available in
this environment. No website deployment or public update-feed change was made.
