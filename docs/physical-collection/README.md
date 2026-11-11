# Physical collection: Phase 1–5 implementation record
Reviewed `main` at `880ab5e6ad0f8527f8418088cbc18c08ef1e8508` (2026-11-11).
Scope: nine core APK games (Xiangqi, Shogi, Sannin Shogi, Sanguo Qi, San You Qi, Sanguo Yan Yi Qi, Chaturanga, Cờ Tư Lệnh, Shan Shui Xiangqi).

## Evidence and constraints
- A recursive GitHub tree returned no STLs, OBJs, GLBs, FBXs, Blends or STEP meshes. Source board and token images were found, but image assets are not printable sculpts.
- Arctic-Game-Assets connected Drive folder returned no visible items at this time. Do not rule out previous modeling work elsewhere.
- v5.9.15 APK was used for byte-unchanged local art extraction; main has v5.10.0 changes. Avoid overwriting current game art.
- The standalone showroom is intentionally on a public static route outside gameplay and payment flows. Its card art references existing `frontend/public/assets`, and clearly says digital preview, not photographs.
- `/physical-collection/` becomes available only after this branch merges and the frontend deployment serves the new static file.

## Physical prototype package (local delivery)
A separate 11 MB ZIP was created from the uploaded APK and verified meshes: one 158×158×4 mm universal board tile STL (four tiles per board), nine game-specific prototype piece base STLs, editable OpenSCAD files, original board/cover artwork, SHA-256 manifest, automated watertight-mesh QA, and manufacturer RFQ documents.

These are **sample chassis and token bases**, not fully sculpted printable nine-game army kits. The 316×316 mm board chassis intentionally uses a removable printed art overlay rather than inventing movement lines. Board coordinates and complete physical piece counts require game-by-game sign-off before actual production. Print orientation, resin durability, tolerances and fit require physical sampling.

## Stage gates
1. Recover final approved model masters and reconcile them with source game rules and asset approval tags.
2. Complete full-scale per-game board geometry, approved piece sculpts, correct counts and transport cases.
3. Perform slicing plus actual 3D printing, checks for seams/handling/legibility/damage resistance, and rulebook playtests.
4. Solicit at least three written comparable quotes and a physical manufactured sample before accepting vendor costs.
5. Only after QC, unit economics, GST/returns/shipping and real product photography, publish inventory and enable physical orders.

No printer has been commissioned, no vendor sent an RFQ, no product sale is live, and no launch date is guaranteed.

## Source-specific controls
- San You Qi: 156-point reconstructed graph in `frontend/src/games/san-you-qi/topology.js`, supported historical core recorded in its canonical spec.
- Sannin Shogi: 127-cell pointy-top hex board, radius 6; modern historical Japanese variant rather than ancient origin.
- Shanshui Xiangqi: 13×13 modern Antarctic adaptation; piece presentation uses existing artwork, not a verified historical ruleset.
- Cờ Tư Lệnh: modern Vietnamese game; carrier and source-version review before final physical set.
- Maintain existing heritage roles and IDs; penguin guides are hosts, not substituted source-native animals or counters.
