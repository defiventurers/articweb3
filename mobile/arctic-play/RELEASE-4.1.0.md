# Antarctic Kingdoms 4.1.0 — Seven sculpted game tables

All seven game cards now show complete 3D-style illustrations of physical tables, with substantial slab edges, carved supports and raised miniature pieces. The old perspective-transformed flat board overlay has been removed from the cards and hall scenes. Cards display the full 3:2 composition in both story modes. Matching hall postcards use the same new scene.

| Game | Table design |
| --- | --- |
| Shogi | Thick hinoki wood, crystal feet and upright pentagonal wedges |
| Sannin Shogi | Faceted hexagonal sapphire slab and stepped buttresses |
| Sanguo Qi | Three thick river territories on a fortress pedestal |
| San You Qi | Three-armed observatory table with raised flags and fire pieces |
| Sanguo Yan Yi Qi | Dragon-carved red lacquer court and golden lantern pedestal |
| Xiangqi | Jade river-bridge table on arched trestles |
| Arctic Dominion | Four-tower ice arena table with a separate dice shelf |

The seven 1536×1024 masters are in `art/tables-3d-v1/masters`. Their 1200×800 WebP versions total 2.16 MiB. `art/tables-3d-v1/prompts.json` records the final prompts and reference filenames; each asset was generated separately with the built-in image-generation tool. Run `node scripts/prepare-table-art.mjs` to encode the approved masters without cropping. Only WebP runtime files enter the app.

Playable boards, hit targets, piece sprites, engines, learning diagrams and the 4.0 team/browser features are retained. Card illustrations are presentation assets. The APK and browser edition include identical game and artwork files.

## Validation

- 89 existing mobile gameplay/interface checks pass.
- 12 browser release checks cover all seven cards in dark/light themes at 320×740, 390×844, 690×1400 and 800×400, matching hall pages and stories disabled. No browser runtime errors or failed local image requests.
- Every card loads one complete scene at 3:2 with no flat board overlay.
- APK signing and alignment verified using the original release certificate, SHA-256 `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`.
- Preservation evidence and test reports are in `verification/tables-3d`. Browser checks use desktop Chromium; physical-device installation was not performed.

## Rebuild

Install the pinned `build-deps` dependencies, expose them through `frontend/node_modules`, then from the repository root run:

```sh
node mobile/arctic-play/scripts/prepare-table-art.mjs
node mobile/arctic-play/scripts/build-web.mjs --reuse-artwork /absolute/path/to/recovery/baseline-art
npm test --prefix mobile/arctic-play
```

Build the native package using `scripts/build-apk.py` as described in the 4.0 release instructions, with the original private signing key kept outside the source tree. The release uses package `xyz.arcticdominion.play`, version 4.1.0, code 41.

This release is packaged locally. Remote publication remains pending from the previous release; no GitHub push, hosting deployment or update-feed change was performed for this visual update.
