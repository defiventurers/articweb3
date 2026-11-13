# Incremental game introductions and cultural halls

## Outcome and boundary

The approved v5.9.15 runtime receives a three-page introduction for each of its nine games. The largest image opens the introduction in both expedition and grid views. Keyboard Enter/Space activates images; Escape returns to Games. Every page has Skip to game. The final page has Proceed to game, with the existing play/access callback retained. Learn the moves uses the existing learning callback. This does not grant access to locked games.

Country/tradition hall tabs group existing expedition entries into Indian court (Chaturanga), Mountain and river hall (the five Chinese-origin tables), Snow garden hall (two Japanese games), and Coastal command hall (Cờ Tư Lệnh). All halls restores the nine-game route. Existing next/previous, swipe, grid, crowns and unlock controls remain present. No player counts or fake community activity are added.

The welcome uses the actual baseline table image and actual baseline piece sprites, with short arrival/greeting motion. It is an ambient illustrated introduction, not a rendered battle video. Pause motion and the system reduced-motion preference are respected. No new character or launcher images replace approved references. Culturally themed headings and trims complement existing artwork; final culture-specific architectural scenes remain an art task.

## Why an incremental patch

The tracked `App.jsx` at source milestone `7c0cdd74f2bb4e75bf2ff38021f287273f314503` does not contain the newer shipped GamesAdventure implementation. Rebuilding that file wholesale would regress approved expedition functionality. The patcher parses the actual shipped bundle, verifies SHA-256 of three original function bodies, and edits only `GamesAdventure`, `AKOriginalGamesGrid`, and its `BC` wrapper. Unknown source bodies fail closed. No engine, worker, network, wallet, Home, startup or icon code is rebuilt by this patch.

The new UI factory and research JSON are editable source. The pinned integration script documents the compiled-runtime anchors instead of pretending the older full source generates the exact approved experience. A later source-consolidation task should recover the approved component implementation before a full App rebuild.

## Integration

Run after extracting the verified v5.9.15 APK assets, before final packaging:

```sh
node mobile/arctic-play/scripts/patch-heritage-v5915.mjs /absolute/runtime/app.js /absolute/output/app.js
```

Append `mobile/arctic-play/src/heritage-intro.css` to the output's existing `app.css`. Keep all baseline assets. The patcher itself does not change release/version metadata or signing. It rejects repeated application.

## Research provenance

`heritageStories.json` selectively preserves the later source's research, including its recorded limitations. On November 11, 2026 the Japan Shogi Association's Chaturanga and Japanese-history pages and the original CN2870925Y design publication were reopened. These directly support the distinctions between two/four-player Chaturanga, the 1058 shogi find, captured-piece reuse, and Sanguo Yan Yi Qi's modern 2005 filing/2007 publication. Other sources retain their original evidence status; they are not claimed newly reverified here.

- https://www.shogi.or.jp/history/world/chaturanga.php
- https://www.shogi.or.jp/history/story/
- https://patents.google.com/patent/CN2870925Y/zh

The in-app references include the World Xiangqi Federation, Digital Ludeme Project research catalogue, Japanese museum/library records, Vietnam sports-authority reporting and the creator-associated Shan Shui video. Catalogue leads and inaccessible originals remain labelled. Cờ Tư Lệnh remains a practice reconstruction under review. Shan Shui invention dating is unresolved. No unsupported royal player, exact 574 CE origin, or whole-catalogue ancient/Indian label is introduced.

## Verification and limits

Executed against the actual extracted v5.9.15 `app.js`:

```sh
HERITAGE_BASELINE_APP=/absolute/baseline-runtime/app.js node --test mobile/arctic-play/tests/heritage-intro.test.mjs
node mobile/arctic-play/scripts/patch-heritage-v5915.mjs /absolute/baseline-runtime/app.js /absolute/output/app.js
node --check /absolute/output/app.js
node mobile/arctic-play/tests/heritage-runtime-ui.mjs /absolute/output/app.js
```

Two test groups pass. The integration group extracts and executes the patched shipped React expedition component in JSDOM, visits all nine stories through keyboard activation, advances all pages, checks Skip/Proceed/Learn callbacks and Escape, retains locked-game routes and crowns, filters Japan then restores nine games, and exercises the actual patched grid/wrapper with the favorite control kept separate. Invalid component bodies and double-patching are rejected. All 24 referenced piece sprite URLs were checked against the extracted baseline asset tree; none are missing.

The separate whole-bundle JSDOM run passes four additional groups: approved Home → Games navigation; all nine three-page stories returning to original crown controls; Japanese hall filtering and return to the complete route; and return to unchanged Home image through the original bottom navigation. That run executes the actual patched compiled app, with image/network/account/worker fixtures. No image decoding, Android WebView, physical-device, live authentication or multiplayer proof is implied. React emits existing grid list-key warnings under the isolated test JSX shim. Rendered browser/phone comparison remains an integration gate owned by the release workflow.
