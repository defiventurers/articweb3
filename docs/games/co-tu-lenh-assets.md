# Cờ Tư Lệnh: Antarctic Kingdoms art integration — 2026-11-03

Status: **draft / practice reconstruction**, not an APK release.

## Outcome
- The source-native 11-column by 12-row **intersection** topology (132 nodes) is preserved. The coordinate master is defined by SVG canvas 1199 × 1312, origin (148, 183), increments (90.4, 900/11), 0–10 files, 11 top to 0 bottom.
- The background is a newly exported Antarctic board drawn from the verified user-provided board, with **fully golden node dots**, water in the leftmost two column intervals and a continuous river between rows 6 and 5. Fords 5 and 7 remain historically provisional.
- All 22 red and blue unit roles have new cutout WebP sprites on transparent backgrounds, sourced from the user's draft images and blue colour studies. SVG fallbacks remain in place until art approval. The 2D artwork is **not yet approved**; blue face fidelity, extraction edges and board-size visibility need human review.
- The UI switches graphic paths from SVG to WebP, aligns piece centres at the exact mapped nodes and rotates the board image with the Blue view. Mobile users can zoom 1.0×–2.5× without changing legal moves.
- No change to movement engines, match recording, server validation, game IDs, paid play, or blockchain connections.

## Acceptance criteria / evidence
- 132 intersections, 22 matching named WebPs, transparent alpha channel for each file.
- 23 existing engine/room-service tests passed locally.
- 3 asset/board integration checks passed locally.
- Full Vite build and native signed Android APK build NOT run here (complete repository dependencies, Android SDK, production signing material and original APK not available in local runtime). This must NOT be described as an installed or signed APK update.

## Gates before merge / signing
1. Run frontend's current test and build scripts on PR branch with its full dependency tree; inspect CSS and browser interaction at 320px widths. Test drag/pan vs tap and complete gameplay for each mode.
2. Rulebook comparison still needed for initial setup, transportation, HQ protection, AA resolution, hero status, and exact fords. Practice label required.
3. Compare the blue face with the user's approved mascot references, test individual cutout edges, approve all 22 sprites and check small-size legibility on board.
4. Two-device multiplayer beta on staging server, stale command rejection, reconnect, server/WebSocket bootstrap. Free gameplay only.
5. Build APK using **same application ID and signing key** as existing installed version and increment Android version code, then verify signature and device install/upgrade. Do not generate a new keystore for an update.

Source branch: feature/co-tu-lenh-research-draft-20261103. Base evaluated: main at commit 67354b823b11f787b3b8cae44e9e14d02da589a8 (2026-11-03); PR #58 originally based on 97bbdd5121eb0e75c0993f0066c5c16a0b13f5a1.