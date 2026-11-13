# Approved Chaturanga board — 13 November 2026

User approved `151658.jpg` as the match board for `/early/` and subsequent builds. The original 865×1536 JPEG is retained byte for byte at `frontend/public/assets/launch-v1/chaturanga-match/approved-151658.jpg`. Review base: `744bcd3a5bbb5336159ed6211ba4ebe5aca0eecb`.

| Region | Original image bounds |
| --- | --- |
| Header | y 0–244 |
| Player strip | y 244–322; Green, Blue, Red, Pink |
| Board surround | y 322–1232 |
| Playable grid | x 73–790; y 429–1137 |
| Dice panel | y 1232–1536 |
| Dice pair | approximately x 110–760; y 1271–1360 |
| Roll button | approximately x 266–599; y 1402–1475 |

For row r and column c in 0–7, image-space cell centres are `x=73+(c+0.5)*717/8`, `y=429+(r+0.5)*708/8`. Multiply by displayed plate width / 865. Grid tap targets and pieces use the same canonical 1000×1000 SVG coordinates, rendered with `preserveAspectRatio="none"` into the 717×708 footprint. Existing seat rotation remains intact.

The early browser package is patched from the existing v5.10.2 runtime; it is not replaced with a newer app build. The source build uses the same approved art and geometry. Source packaging now includes the existing `chaturanga-final-four` pawn folder. Cache hashes and the browser build ID are updated; versioned script/style requests avoid stale browser caches. Saved match data is retained.

Validation: source build, 23 existing board-view checks, five existing Chaturanga interface checks, all 64 cells across four perspectives/five widths and all 435 browser cache digests. Physical-device visual and live multiplayer acceptance remain separate and pending.
