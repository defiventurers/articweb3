# Sannin Shogi shared integration plan

This is a handoff checklist for the lead's serialized shared-file integration. It
does not authorize workers to edit shared files. The canonical specification and
the live worker-owned implementation remain the source of truth if names or
component contracts change.

## Frozen product boundary

- Preserve Heritage Arcade table ID `24` in the primary collection.
- Support both approved entry URLs:
  - `/?game=heritage-arcade&table=sannin-shogi`
  - `/?game=sannin-shogi`
- The direct catalog entry is available but `hiddenFromLanding: true`.
- Keep the Arctic outer-world collection at 21 boxes. Do not add a Sannin world
  location, box, cover preload, or collection-count change.
- First release is deterministic client-local three-seat/hot-seat play. It has no
  online-room, staking, transaction, wallet-required, server-validation, or
  settlement claim.
- Deployment is frontend/Vercel only. No backend, contract, database, chain,
  wallet-provider, or environment-variable change is required.
- Final piece assets must be the 42 Sannin-specific regular-hex WebPs extracted
  from the supplied composite. The visually different tall Frozen Shogunate
  WebPs are forbidden as final Sannin pixels.

## Preconditions before shared integration

Do not begin the shared patch until all of the following are true:

- `frontend/src/games/sannin-shogi/SanninShogiApp.jsx` (or the final equivalent)
  exists and exposes a documented back/exit callback.
- The dedicated engine and SVG board render exactly 127 unique radius-6,
  pointy-top hex cells.
- The game-owned engine tests pass against the canonical ruleset.
- `frontend/public/assets/games/sannin-shogi/` contains a verified manifest and
  42 transparent regular-hex WebPs derived from the supplied composite.
- Contact-sheet and overlay QA show no clipped badge edges, neighboring pixels,
  faction-band background corners, or inconsistent padding.
- The game-owned UI does not advertise online rooms, wallets, staking, rewards,
  or on-chain moves.

## Lead-owned shared patch checklist

Apply these edits serially after reviewing the worker-owned implementation.

### 1. Heritage table metadata

File: `frontend/src/games/heritage-arcade/ported/data/games.ts`

- Preserve numeric ID `24`, category `Chess & Shogi`, and primary-collection
  placement.
- Update title, subtitle, provenance/status, layout, and loop only from the final
  canonical specification.
- Add `playable: true` only after all placeholder-rejection and release gates in
  this document pass.

### 2. Heritage table dispatch and query synchronization

File: `frontend/src/games/heritage-arcade/HeritageArcadeApp.jsx`

- Import the final Sannin app from `../sannin-shogi/`.
- Map query value `table=sannin-shogi` to numeric table ID `24` during initial
  boot.
- Add an explicit `modeId === 24` render branch before the generic
  `CompactBoard` fallback.
- Pass the Heritage return-to-atlas callback through the Sannin app's final
  back/exit prop. Embedded back must return to the Heritage atlas, not the outer
  Arctic library.
- Add `24` to `auditedTables` only after rules, build, and browser QA pass.
- Centralize the existing table ID/query mapping rather than adding another
  unrelated conditional. The mapping must preserve at least:
  - `1 -> sanguo`
  - `24 -> sannin-shogi`
  - `26 -> shogi`
- When table 24 is opened from its dossier card, featured action, or briefing
  action, update the URL to `game=heritage-arcade&table=sannin-shogi` with
  `history.replaceState` while preserving unrelated safe query parameters.
- When returning from Sannin to the atlas, delete only the `table` parameter and
  retain `game=heritage-arcade`.
- Preserve the existing Sanguo room-link behavior. A `room` parameter must never
  activate Sannin or be consumed by the local Sannin app.

### 3. Hidden direct catalog entry

File: `frontend/src/data/gameCatalog.js`

- Add a catalog object with `id: "sannin-shogi"`, `available: true`, and
  `hiddenFromLanding: true`.
- Fill `title`, `heritage`, `engine`, `players`, `status`, `statusKey`, `theme`,
  `mark`, and `summary` from the final canonical product wording.
- Do not add the ID to `RACE_SOWING_GAME_IDS`.
- Confirm `getCatalogGame("sannin-shogi")` resolves while
  `LANDING_GAME_CATALOG` remains length 21 and excludes Sannin.

### 4. Direct application route

File: `frontend/src/App.jsx`

- Import the final Sannin app component.
- Add `"sannin-shogi"` to `PLAYABLE_GAME_IDS`.
- Add an explicit render branch for `screen === "sannin-shogi"`.
- Render it through `withAppChrome(..., "sannin-shogi")` and connect its direct
  exit callback to `exitToLibrary`.
- Confirm `/?game=sannin-shogi` never falls through to the cover or
  `GamePreviewScreen`.

### 5. Shared host and field-guide metadata

Files:

- `frontend/src/components/PenguinHosts.jsx`
- `frontend/src/components/ExperienceCompanion.jsx`

Required changes:

- Add a deliberate host pair for `sannin-shogi`.
- Add a concise, rules-accurate first-look label, cue, and action.
- Avoid orthodox-shogi assumptions not present in the canonical Sannin rules.
- Do not imply wallet, network, or online functionality.

### 6. Shared discovery/route tests

Files:

- `frontend/src/data/gameCatalog.test.js`
- `frontend/tests/all-games-routes.spec.js` only if it continues to serve as the
  direct-route registry

Required assertions:

- The Sannin catalog entry exists, is available, and is hidden from landing.
- `LANDING_GAME_CATALOG` remains length 21 and contains no `sannin-shogi`.
- The direct route mounts the dedicated app and never shows the preview screen.
- If `all-games-routes.spec.js` is updated, note that its current list already
  omits Shogi and Heritage Arcade and should not be described as exhaustive
  without reconciling those omissions.

The Sannin-owned smoke test should cover both approved URLs, 127 gridcells, one
legal turn, rulebook access, reset, direct exit, embedded back-to-atlas behavior,
desktop/mobile overflow, and absence of online/wallet-required claims.

## Placeholder-rejection gates

Shared integration is not complete unless every gate passes on both approved
routes:

- No table-24 request reaches `CompactBoard`.
- No active Sannin surface contains `shape-hex61`, a 61-cell board, a 9x9 compact
  envelope, generic clan tokens, generic `march` interaction, score-based generic
  victory, or a 130-action limit.
- The board exposes exactly 127 unique interactive cells and the canonical
  `7/8/9/10/11/12/13/12/11/10/9/8/7` row counts.
- The missing legacy texture URL
  `/manus-storage/ppba-board-ice-texture_6396e493.png` is not requested.
- All rendered piece images resolve from the Sannin-owned asset folder and match
  the Sannin manifest; no final piece URL points into
  `games/shogi-frozen-shogunate/`.
- `auditedTables` includes 24 and metadata says `playable: true` only after these
  checks and the full release gate pass.

## Verification commands

Run from `frontend/`. On Windows PowerShell, use `npm.cmd`/`npx.cmd` if script
execution policy blocks `npm.ps1`/`npx.ps1`.

```text
npx vitest run src/games/sannin-shogi
npx vitest run src/data/gameCatalog.test.js
npx playwright test tests/sannin-shogi.spec.js --project=chromium
npx playwright test tests/sannin-shogi.spec.js --project=mobile-chrome
npm run assets:audit
npm run check:testnet
npm run build:testnet
```

For a mainnet-targeted frontend deployment, additionally run:

```text
npm run check:mainnet
npm run build:mainnet
```

Run any affected existing launcher/route regressions after the focused Sannin
checks:

```text
npx playwright test tests/launcher-smoke.spec.js tests/all-games-routes.spec.js --project=chromium
```

The final native-browser review must cover the direct and Heritage URLs at one
desktop viewport and one phone viewport. Verify the atlas-to-table transition,
embedded back, direct exit, rulebook, legal-action feedback, reset, no horizontal
overflow, 127-cell topology, piece-image loading, console errors, failed network
requests, and the absence of wallet/online claims.

## Deployment checklist

- Confirm the selected frontend environment check and production build pass.
- Confirm the Sannin assets are emitted in `dist/assets/games/sannin-shogi/` and
  no source composite or oversized working file is shipped.
- Confirm root query URLs work in the production preview; no pathname rewrite is
  needed because routing remains on `/?game=...`.
- Deploy only the frontend to Vercel using the existing environment configuration.
- Smoke-test both approved production URLs after deployment.
- Do not claim a mainnet rehearsal or public launch from this game integration.
  This checkout has no `ops/mainnet/deployment-record.json`.

## Explicit unchanged-file boundaries

The Sannin integration must not change:

- `frontend/src/arctic/arcticGameRegistry.js` (no outer-world entry or
  `WORLD_LAYOUT` record).
- `frontend/src/arctic/ArcticKingdomsLanding.jsx` (keep the 21-box label).
- Existing 21-count assertions in `frontend/tests/launcher-smoke.spec.js`.
- `frontend/src/components/HeritageCoverArt.jsx` (hidden direct entry needs no
  outer-library cover treatment).
- `frontend/src/main.jsx` or global styles; the Sannin app must import its
  game-owned stylesheet.
- `frontend/vercel.json`; existing root query routing and static-asset policy are
  sufficient.
- Any file under `server/`, `contracts/`, `ops/`, or root deployment scripts.
- Frontend/server environment files and all contract addresses.
- Frozen Shogunate source sheets, board art, WebPs, or manifest.

No `front.webp` is required for the hidden direct catalog entry. Adding an outer
world box, changing landing counts, enabling online rooms, or introducing chain
interactions is a separate product decision and requires a new canonical review.
