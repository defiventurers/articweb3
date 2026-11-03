# Shanshui Xiangqi — first playable implementation

Built 3 November 2026 from `main` commit
`97bbdd5121eb0e75c0993f0066c5c16a0b13f5a1` on `feat/shanshui-xiangqi`.

## Delivered

- Final, versioned **Antarctic v1** rules with source facts separated from ten
  explicit digital completion decisions: [RULES.md](RULES.md).
- Pure canonical engine: 169 points, 68 starting pieces, two-team ownership,
  army turns, eight functional roles, four-point Advisor diamonds, Elephant
  networks, two infantry directions, terrain boundaries, screen/leg/eye blocking,
  actual General capture, whole-army removal, later check safety, mate/stalemate,
  capture-and-return, forced passes, resignation and draw termination.
- Two-human and four-human 2v2 formats; local play, three bot levels, undo,
  saved game resume, light/dark boards, a stable rotatable view and zoom.
- Quick rules, Full rules with progress, one-piece movement practice, and an
  empty-board editor with stock limits, locking and validation before local play.
- Seven new transparent Purple tokens; Red/Blue/Green use the 21 original Yan Yi
  sprites directly, verified byte-identical. Two complete runtime boards and
  starting-position previews, plus editable geometry and decorative master.
- Website catalogue/direct route `?game=shanshui-xiangqi&skipLoader=1` and an
  Android catalogue entry. Catalogue IDs and existing game rules remain intact.
- Private room adapters for `shanshui` (two seats) and `shanshui-2v2` (four seats),
  capability/version checks, account authentication, seat ownership, stale-action
  rejection, reconnect, persistence and worker bots through the existing service.

## Verification actually completed

| Check | Result |
| --- | --- |
| Canonical engine Node tests | 14 passed |
| Shared game UI + catalogue Vitest checks | 7 passed |
| Existing frontend Xiangqi suite | 30 passed |
| Existing and new server room/worker regression selection | 22 passed |
| Final Shanshui rooms, real socket bootstrap, production account auth and access progression selection | 20 passed |
| Mobile engine/assets and existing phone interface checks | 10 passed |
| Chromium mobile-bundle test | Passed at 390 × 844 and 1440 × 1000 |
| Browser checks | All 68 sprites/169 points loaded; no missing art responses or page exceptions; legal tap/turn, undo, themes, tutorial progress, editor, real bot worker and four-seat selector passed |
| Deterministic seeded playout | 600 legal actions without overlapping pieces, missing live Generals or unresolved turns |
| Generated browser/server engine comparison | Passed |
| Mobile web bundle | Built; new CSS, artwork and dedicated bot worker included |
| Frontend Vite production compilation | Passed in testnet mode; existing chunk-size/import warnings and sparse-checkout asset warnings are not launch-gate evidence |
| Git whitespace check | Passed |

The socket transport fixture supplies guest access only inside its isolated test
child. The separate production-default account test verifies signed-in Shanshui
creation and a legal move, and rejects another account using a saved seat.
No production authentication was relaxed.

## Reproduce

From `frontend/` after `npm ci --ignore-scripts`:

```sh
npm run test:shanshui
npx vitest run --config vitest.shanshui.config.ts
npm run test:xiangqi
npm run check:shanshui-engine
npm run assets:shanshui
```

From `server/` after `npm ci --ignore-scripts`:

```sh
node --test tests/shanshui-online.test.js tests/arctic-play-online.test.js tests/arctic-play-socket.test.js tests/company-account-play.test.js tests/access-progression.test.js
```

From `mobile/arctic-play/`:

```sh
npm run build
npm test
node tests/shanshui-browser.mjs
```

The last command needs a Playwright Chromium installation; CI can set
`SHANSHUI_CHROMIUM_EXECUTABLE` to an existing test browser.

## Release boundaries and next blocker

This is a tested source implementation, not a deployed service or new signed APK.
No mainnet/environment launch gate, real-device install, paid entry or settlement
was run or enabled.

The checked-in mobile React source is older than the checked-in production
`arcticPlayEngine.cjs`: the production engine includes newer Chaturanga support.
The existing APK/sign-in work must be reconciled with mobile source before a
release build. Rebuilding that old shell must not replace the current installed
application and its newer sign-in/game features.

For this reason `arcticPlayGames.cjs` composes the new Shanshui adapter with the
existing production engine, preserving its room version and old games. The
mobile build no longer silently overwrites the production engine. New Shanshui
states retain their own immutable ruleset ID. The shared game component and
adapter can be integrated into the reconciled current APK source.

Next release steps: reconcile the current APK shell, carry forward its account
session and offline-access gates into the new game entry, release both client
and backend capability together, sign with the existing app identity, then run
real-device install/reconnect and multiplayer beta checks. The website entry
currently exposes local/bot/practice modes; the Android room shell supplies its
online entry. Do not market either route as a completed public launch.

## Decision record

User authorised: build the game, finalise rules/modes, create boards and the
fourth team, reuse existing Yan Yi art for the other teams, then implement logic.
Implementation decisions: source format is two humans controlling four armies;
four-human 2v2 is labelled an adaptation; source gaps are the documented A1–A10
rules; new Purple art is reviewable and has not been labelled APPROVED.
