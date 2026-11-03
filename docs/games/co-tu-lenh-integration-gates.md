# Cờ Tư Lệnh — Operation Frozen Front / Integration & Release Gate

## Outcome

**Working practice reconstruction**, not historically certified final Cờ Tư Lệnh and not an APK release.

- Direct app route: `?game=co-tu-lenh` (after branch merge and deployment only).
- Two human players pass-and-play on a phone, practice/undo mode, Easy/Medium/Hard locally evaluated bots, guided introduction by Pengu.
- Private online two-seat rooms through existing WebSocket server, with 6-character codes, random tokens stored in player browser, SHA-256 hashed server-side, revision checks and server-side rules enforcement. Guest online is free and walletless.
- Responsive intersection SVG board, 22 red/blue vector game tokens, optional 11 watertight 3D concept masters (26 mm bases) and 22 GLB coloured previews.
- Current local tests: 19 rules cases + 4 server-room cases = 23 cases. Syntax of generated CJS and JSX parsed successfully locally.
- Server integrates through `allGamesBackendBootstrap.js` by wrapping the **post**-ArcticPlay source transformation. Does not replace existing games.
- Chain transaction hooks, betting, settlement, and operator controls are NOT introduced.

## Explicit unresolved requirements

**Accuracy:** The initial 19-piece per-side formation is a visually informed reconstruction of a low-resolution public board, not independently transcribed from the original 2021/2025 rules. River Ford columns 5 and 7 are also provisional. Transport, commander in Headquarters protection, triple attacks, multi-unit stack capture and the precise AA/suicidal bombing resolution need confirmed examples from the selected official edition. Therefore do not describe this as an official-rule-complete heritage title.

**Online:** The private protocol is implemented but has only isolated service tests; actual two-browser WebSocket end-to-end, reconnect timing, Render/Vercel connectivity and mobile touch smoke tests still require a running copy of the full repository and infrastructure. Do not represent it as production verified.

**3D:** The 11 master STL objects are first-pass geometry, each watertight according to `trimesh`. They are not artist-approved, slice-reviewed or print-tested physical miniatures. Printed-cosmetics IP and manufacturing approval are open.

**Release:** Full project dependencies and Android build environment are not installed in this session. No APK is signed/built. Do not merge/deploy until Vite and backend regression suites and all launch gates pass; paid play remains disabled.

## Primary test/run commands

From `frontend/`:

```bash
npm ci
npm run check:co-tu-lenh-engine
npm run test:co-tu-lenh
npm run build:testnet
```

From `server/`:

```bash
npm ci
npm run test:co-tu-lenh
npm run test:games
npm run check:testnet
```

Additional manual acceptance:

1. Verify all 38 token positions with rulebook and test 132 nodes at 320px mobile viewport; no side-scroll.
2. Play 10 local full games in each victory format; verify no illegal moves and clear check/safety semantics.
3. Verify guest online red/blue seats in Chrome/Android Safari, generate an invite, reconnect both seats after network drops, ensure stale moves rejected and no tokens stored in database.
4. Test capture/transport, siege, air-defence, tank/cargo destruction, and heroic upgrades against primary rulebook examples.
5. Compare source 2021 2nd edition to current Vietnamese rules before removing practice label.
6. Check frontend production build, server startup bootstrap, source transform once-only guards, npm test suite, audit assets, Playwright and screenshots.
7. Visual and licensing approval for character hosts, 2D pieces and 3D print rights; slicer validation and physical test print.
8. Android build, package signature, backup/restore, update flow, crash telemetry, manual Android login check.
9. Testnet multiplayer beta, and only then consider chain-specific Abstract/Robinhood integrations. No paid mode.

## Historical attribution and sources

Original Cờ Tư Lệnh created by Nguyễn Quý Hải, modern Vietnam c. 2010, not Xiangqi and not ancient Indian. Rules baseline: [BGA English](https://en.doc.boardgamearena.com/Gamehelpcommanderchess), [Vietnamese overview](https://thuthuatchoi.com/huong-dan-cach-choi-co-tu-lenh.html), [Vietnam military newspaper](https://www.qdnd.vn/ban-doc/thu-ban-doc/hoi-thi-co-tu-lenh-570537), [2021 rules edition listing](https://boardgamegeek.com/filepage/225658/commander-chess-co-tu-lenh-rules-for-2nd-edition). Verify publication/rights before commercial marketing.
