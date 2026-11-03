# Antarctic Kingdoms 4.3.0 — Learning access and the original Shogi board

All Games now lists games by their earliest dated historical roots: Chaturanga, Xiangqi, Shogi, Sanguo Qi, San You Qi, Sannin Shogi, Sanguo Yan Yi Qi. The list says “Oldest roots first.” Shogi's date line distinguishes its 11th-century roots from its 15th–16th-century modern form; Sanguo Qi retains its disputed dating. Stable engine IDs, room seats and the separate story chapter sequence are unchanged.

Sanguo Yan Yi Qi displays **The Romance of the Three Kingdoms**, with **2005 (21st century)** underneath. Its history detail gives the documented date, 22 August 2005, without filing terminology.

Shogi gameplay, lessons and board previews use the exact `frontend/public/assets/games/shogi-frozen-shogunate/board.png` uploaded to GitHub. It is bundled unchanged, with cell centers calibrated to the published frontend's 9×9 grid. The new 3D card reproduces that blue-and-gold design and replaces Polly with Retsba while retaining Pengu. Revision-3 scene files and masters are in `art/tables-3d-v3`; the other six masters are unchanged.

**Quick Rules** and **Full Rules** are large, visible buttons on every learning screen and in every game chooser and match menu. Each opens its content directly. Full Rules starts with expanded chapters and includes search; a large Guided lessons button returns to practice. Reading text is larger, and the original lessons and piece guides remain available.

Version: **4.3.0 / code 43**, package `xyz.arcticdominion.play`. The APK uses the original release signing identity so installing it preserves app data. The required-update mechanism and Night mode added in 4.2 remain active. Source includes candidate update metadata, with no remote release or live update-feed publication performed.

## Rebuild and validation

From the repository root, with the pinned mobile build dependencies available:

```sh
node mobile/arctic-play/scripts/prepare-table-art.mjs
node mobile/arctic-play/scripts/build-web.mjs --reuse-artwork /absolute/path/to/recovery/baseline-art
npm test --prefix mobile/arctic-play
```

Sign with `scripts/build-apk.py` and the original private key as described in `RELEASE-4.0.0.md`. Signing keys and passwords are excluded from deliverables.

All **94 automated tests** pass. Browser checks verify the seven cards, chronology, one-click Quick/Full Rules access, visible large buttons, expanded searchable rule chapters, real pointer moves on Shogi's new board, header controls and mandatory updates. Light/dark phone and landscape layouts are covered. Reports are in `verification/release-4.3`. These checks use desktop Chromium with phone viewport sizes; physical Android and iPhone installation were not tested.
