# Chaturanga v2 — approved match art upload

This is a **review-only** branch. Six user-supplied derivative WebP files are required here before the source build can pass.

1. Download the file `chaturanga-match-v2-upload.zip` supplied in the ChatGPT conversation.
2. Extract its files and upload all **six .webp files** (do not upload the ZIP itself) to this exact directory on branch `codex/v5914-game-views-chaturanga-v2`: `frontend/public/assets/launch-v1/chaturanga-match/`.
3. Keep the filenames intact. `ASSET-MANIFEST.json` is provided for local verification, but only the six WebP assets are required for the build.
4. Commit on the review branch; do **not** commit directly to `main`. The build pins each asset's SHA-256.

Files:
- `approved-v2.webp` — the complete uploaded design, preserving the header, king icons, board, dice and golden decoration.
- `header-v2.webp` — optional isolated upper art.
- `players-v2.webp` — optional isolated four-seat panel art.
- `board-surround-v2.webp` — transparent board aperture for future reusable layouts.
- `grid-v2.webp` — rectified 1024×1024 board texture used by the live board.
- `dice-panel-v2.webp` — optional isolated ice dice stage.

The live match currently uses the full approved image as a decorative plate and the grid texture for interactive cells. Live React text, status, user names, dice pips, real piece sprites and controls remain above the image. For UI acceptance, verify 320×640, 360×800, 393×852, 430×932 and tablet; verify all four rotated perspectives and edge taps.

**Never sign or distribute an APK from this review branch until the original verified v5.10.4 source is integrated, nine-game visual restoration is accepted, device tests pass, and the original-key signing workflow confirms a versionCode above 108.**
