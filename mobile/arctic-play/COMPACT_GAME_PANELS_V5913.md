# Compact game launch panels — v5.9.13

Accepted 9 November 2026: game setup and Hall controls should be available without scrolling down a long sheet. Use compact sections and button grids; put long reading into pages.

Reviewed `main` at `7267d327c714a33601f1a599aaaea6efa7982dac`. The release patches the verified shipped v5.9.12 runtime because it contains interface work newer than main's App.jsx. It retains that release's heritage home, loading screen and launcher icon.

## Result

- The seven shared game setups use Play, Setup and Learn tabs. Resume, bots, private-room creation/join, shared-phone play, seat selection, full rules, practice positions and Hall access retain their original callbacks.
- Chaturanga retains Four-way, 2v2, team and kingdom choices. Its private-room setup is compact too.
- Hall views use Play, Learn, Story and Origins tabs. Challenges, sound, earned postcard previews, next-Hall links and edition evidence remain available. Long text and sources use Back/Next pages; source links retain their original destinations. Identical background refreshes do not reset a reading page.
- Cờ Tư Lệnh and Shanshui Xiangqi use compact starting menus with their existing mode buttons, controlled setup selectors and learning paths. Native game menus release the compact viewport constraint when play begins.
- Only the active section renders controls. The panel height follows the viewport, oversized decorative covers are removed on short screens, and the reading area adapts its page length. Controls retain 44px minimum height and tabs support arrow/Home/End keys. This applies to launch/setup and Hall navigation, not to every board, full-rule lesson or account screen in the app.
- Existing game rules, paid-access gates, IDs, saved-game authority and server validation are unchanged. Artwork and mascot identities are retained.

## Validation

Thirteen packaged-runtime regression groups passed: all seven shared setups/Halls, paged origins, Chaturanga team selection and original game start, both newer game menus, locked-game gates and exact saved-game resume. All seven heritage-home interaction regression groups passed. Source App.jsx, including both native game modules, compiled with all imports resolved.

These are JSDOM interaction and source compilation checks. Actual Android installation and live WebView layout on the user's device have not been tested. No live backend or multiplayer check is claimed. The responsive layout must be reviewed on the installed build before a public release.

The signed APK passes v2/v3 signature verification using the original release certificate, ZIP integrity, resource storage/alignment and zipalign. Only manifest/version/cache metadata, app.js and app.css changed. The other 428 non-signature entries, including game workers, native DEX, launcher images and all artwork, are byte-identical to v5.9.12.

## Reproduce

Requires Node 24+, Python 3, Java, Android build tools, and `npm ci --prefix mobile/arctic-play/build-deps`.

```bash
python3 mobile/arctic-play/scripts/build-compact-game-panels.py \
  --baseline /path/to/AntarcticKingdoms-v5.9.12.apk \
  --sdk /path/to/android-build-tools \
  --output /path/to/output \
  --keystore /path/to/original-release.jks \
  --password-file /path/to/password-file
```

Baseline SHA-256: `25bb9039776055eee7830fb16cb0c36f7facc83b1dade8ab178bfdb899dc9cf2`. Signing secrets stay outside the repository. Without signing inputs, the script creates an explicitly unsigned candidate.

After the usual test engine is bundled to `mobile/arctic-play/build/games.cjs`:

```bash
node mobile/arctic-play/tests/compact-game-panels.test.mjs \
  mobile/arctic-play/build/compact-game-panels-v5913/app.js
node mobile/arctic-play/tests/home-heritage.test.mjs \
  mobile/arctic-play/build/compact-game-panels-v5913/app.js
```

Delivered release: v5.9.13 / versionCode 101. SHA-256: `73bc6303b1fbead9ea62ed58224c683fb318c9f23ee317967defba9e594b29f7`. No backend deployment or update-feed publication is included.
