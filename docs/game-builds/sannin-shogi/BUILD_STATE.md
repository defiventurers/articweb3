# Sannin Shogi build state

- 2026-09-16: Applied the user-recorded board-art fit: centre `667,590`, global scale `1.3`, and per-row X/Y offsets plus horizontal scales. The SVG grid and `board.webp` share one viewBox, so the calibration scales together across responsive layouts.
- 2026-09-16: Reduced board pieces from 63 to 56 viewBox units and set their final vertical offset to 2 viewBox units down within each fitted hex. The adjustment inherits each row and global artwork transform.

Canonical decisions live in `CANONICAL_SPEC.md` and are lead-owned.

## Identity and selected edition

- Game ID: `sannin-shogi`; Heritage table: `24`.
- Product title: **Sannin Shogi — Three Homes, One Pleasure Garden**.
- Rules baseline: John Fairbairn's English Shogi Magazine transcription, checked against Kapitan Revival no. 40 and its Shogi Geppo-derived Japanese rules.
- Historical identity: Kokusai Sannin Shogi, devised by Tanigasaki Jisuke around 1930–31; Tanigasaki's book appeared in 1932. This is a modern historical Japanese variant rather than an ancient folk game.
- First release: deterministic three-seat local hot-seat play. No bot, online, wallet, chain, server, database, or staking claim.

## Evidence record

- https://sanko-bunka-kenkyujo.or.jp/untitled56.html — record of Tanigasaki's 1932 Kokusai Sannin Shogi publication.
- https://www.ne.jp/asahi/tetsu/toybox/kapitan/kp040.htm — Japanese rules, terminology, and Shogi Geppo publication history.
- https://wikipedia2006.classicistranieri.com/s/a/n/Talk~Sannin_shogi_3217.html — archived Fairbairn/Shogi Magazine English rules transcription used as the detailed implementation baseline.
- https://jpsearch.go.jp/item/tokyomuseumcolection-edo_tokyo_museumjbD03000508 — Edo-Tokyo Museum/Japan Search record for the Kokusai Sannin Shogi supplement.
- https://commons.wikimedia.org/wiki/File:Sannin_setup.svg — surviving setup diagram cross-check.

## Reconciled rules and digital policies

- The board is the user-locked and historically appropriate regular radius-6 pointy-top hex: 127 cells, side length 7, rows `7/8/9/10/11/12/13/12/11/10/9/8/7`.
- Each force has 18 pieces: K1 R1 B1 G2 S2 N1 L2 P8. The complete historical setup is encoded once and rotated exactly 120° for First/Middle/Last.
- Movement uses the source's six edge-adjacent orthogonal lines and six distance-two radian lines; flanking cells do not block a radian ray. No orthodox-shogi move was substituted.
- K/R/B/S/L/P promote; G/N do not. The supplied promoted-Knight art is retained but marked archival and unused. The supplied King raster represents +K too, with a persistent `+K` non-color marker and accessible illuminated-King label.
- Illumination resolves all eligible first unprotected enemy targets, at most one on each of twelve rays. This is the canonical deterministic reconstruction of an ambiguous historical passage.
- Full-position repetition is prohibited. Identity records board/hand allegiance, turn, alliance, promotion, castling, checked-history, and illumination rights.
- Pregame alliances are explicit rather than randomly assigned in local hot-seat setup, so players can seat themselves transparently. The compulsory alliance detector implements consecutive material-winning attacks using the documented hierarchy. Discovered-third-party attack language remains represented conservatively by this deterministic threat ledger rather than speculative line attribution.

## Implemented game-owned deliverables

- `frontend/src/games/sannin-shogi/hex.js` and `hex.test.js` — Worker 3's sole geometry/projection source; 127 cells, 342 edges, rotation and projection contract.
- `frontend/src/games/sannin-shogi/rules.js` — pure serializable engine with canonical setup, owner-relative movement/rays, capture/allegiance/hand/drop rules, promotion, castling, check safety, Garden victory, +K illumination, alliances, elimination, mate/draw/repetition policy, and public `getLegalActions → validateAction → applyAction` boundary.
- `frontend/src/games/sannin-shogi/rules.test.js` — deterministic setup and gameplay regressions.
- `frontend/src/games/sannin-shogi/SanninShogiApp.jsx` — local three-seat setup/play, SVG board interaction, hands/drops, promotion choice, undo/restart, outcomes, accessible labels, in-app Rulebook, and Research Notes.
- `frontend/src/games/sannin-shogi/sanninShogi.css` — game-owned responsive, board-first Arctic presentation with mobile horizontal safety and reduced-motion handling.
- `frontend/public/assets/games/sannin-shogi/` — Worker 2's 42 lossless transparent runtime WebPs extracted from the user's supplied composite without redesign. This public directory intentionally contains no manifests or QA-only media.
- `docs/game-builds/sannin-shogi/qa/` — non-runtime `pieces.json` crop/mask and legal-use manifest, machine-readable `qa-report.json`, checkerboard contact sheet, and source/mask alignment overlay.

## Verification log

- 2026-09-14: baseline audits and integration map completed.
- 2026-09-15: Phase 1 historical source/rule/geometry reconciliation approved by the acting coordinator and frozen in `CANONICAL_SPEC.md`.
- 2026-09-15: Worker 2 asset extraction landed. `docs/game-builds/sannin-shogi/qa/pieces.json` records the source filename/hash, explicit crops, mask geometry, legal-use semantics, and the +K alias. The contact sheet, source/mask overlay, and QA report live beside it and passed without failures.
- 2026-09-15: Worker 5 packaging repair completed by Worker 2. The extraction script now writes only 42 runtime WebPs to `frontend/public/assets/games/sannin-shogi/` and all four evidence files to `docs/game-builds/sannin-shogi/qa/`. A deterministic rerun preserves that split and no public file contains the absolute local attachment path.
- 2026-09-15: packaging verification reran the extractor with exit `0` and QA status `pass`; all 46 output hashes remained identical on a second run. The public directory contains exactly 42 WebPs and zero non-WebP files; the docs QA directory contains exactly four evidence files. `npm.cmd run assets:audit` marked every Sannin asset `OK` at approximately 33–41 KB. Its repository-wide exit remained `1` only because of 48 pre-existing files over 2 MB and 38 warnings over 700 KB outside the Sannin directory.
- 2026-09-15: Worker 3 geometry suite passed 12/12 tests.
- 2026-09-15: canonical self-audit repaired strict ruleset/alliance/occupancy invariants; finalized-state repetition identity; ID- and nonroyal-history-independent repetition canonicalization; compulsory-alliance ally-check/mate sequencing; equivalent castle/move destination collisions; exact movement and radian-flank regressions; roving six-direction keyboard navigation; dynamic cell labels; focus-trapped/restoring dialogs; Fit/zoom; 44px controls; invalid-choice announcements; restart/result flow; onboarding; forward markers; selected-piece inspector; illumination preview; forced-colors cues; and upright legible +K rendering.
- 2026-09-15: final focused suite passed 39/39 tests across geometry, engine, compiled React semantics, dialog focus interaction, and a real King select/land interaction regression guarding castle/promotion ambiguity.
- 2026-09-15: `npm run build:testnet` passed (3,838 modules transformed). The build emitted only pre-existing unresolved PPBA texture references, a dynamic-import advisory, and the existing large-chunk advisory.
- 2026-09-16: final integrated owner QA repaired three game-owned responsive details: every Sannin control now has a 44px minimum in both dimensions; alliance status follows canonical Middle → Last order; Fit mode caps the desktop board at 720px while retaining the 344px phone pan minimum and 100–200% explicit zoom. Match/setup transitions also reset document scroll so the board cannot mount above a scrolled phone viewport.
- 2026-09-16: measured 320×568 runtime after repair: 127 gridcells, one roving tab stop, zero body overflow, 344px contained board with 288px viewport, minimum cell hitbox approximately 25.8×29.8px, no undersized Sannin controls, and canonical `First to move / Middle + Last allied` status. At 1280×800, Fit is 720px wide.
- 2026-09-16: final focused suite passed 39/39; direct/Heritage Playwright route suite passed 6/6 across desktop Chromium and mobile Chrome; `npm run build:testnet` passed with 3,842 modules. Remaining warnings are repository-wide pre-existing texture, dynamic-import, and bundle-size advisories.

## Shared integration completed by lead

The lead completed the following shared edits:

1. Imported `SanninShogiApp` and routed hidden direct slug `?game=sannin-shogi` to it.
2. Routed Heritage table 24 / `?game=heritage-arcade&table=sannin-shogi` to the dedicated app before the `CompactBoard` fallback.
3. Added catalog, host, and companion metadata while preserving the committed 12 primary + 11 race/sowing visible collections.
4. Added direct and Heritage smoke coverage, URL synchronization, and back-to-atlas query cleanup.
5. Marked table 24 `playable` and `LIVE · AUDITED`. No backend or deployment-variable edit was made.

## Final owner verdict

- **GO** for Sannin-owned implementation and both integrated routes.
- **GO** from independent engine, asset/visual, and shared integration/deployment reviews.
- Native-preview navigation failed at the Halofy bridge, so final route evidence used the coordinator-approved Playwright fallback plus direct measured runtime probes. This tooling failure is not a product defect.
- Shared release-marker/deployment decisions remain coordinator-owned; no game-owned blocker remains reproduced.
