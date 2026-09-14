# Shogi — Frozen Shogunate build state

## Worker ownership

- Thread: `c1d115a2-3845-431f-8d2b-37d979578ec3` (SHOGI worker lane)
- Game source: `frontend/src/games/shogi-frozen-shogunate/`
- Game style: `frontend/src/styles/shogiFrozenShogunate.css`
- Game assets: `frontend/public/assets/games/shogi-frozen-shogunate/`
- Game tests: `frontend/tests/shogi-frozen-shogunate.spec.js`
- Research: `docs/games/shogi-frozen-shogunate.md`

## Completed

- Standard two-player hon-shogi rules engine and responsive Play / Rulebook / Research Notes UI.
- Supplied 9×9 board integrated.
- Supplied green, red, and blue sheets retained verbatim.
- 42 individual WebP pieces exported at 174×340: 14 roles for each faction.
- Top-row mapping: King, Rook, Bishop, Gold, Silver, Knight, Lance.
- Bottom-row mapping: Pawn, Dragon (promoted Rook), Horse (promoted Bishop), Promoted Silver, Promoted Knight, Promoted Lance, Tokin (promoted Pawn).
- `pieces.json` records the mapping and dimensions.

## Verification

- `npm.cmd exec -- vitest run src/games/shogi-frozen-shogunate/rules.test.js` — 10 passed.
- `npm.cmd run build:testnet` — passed.
- Direct Shogi desktop/mobile browser tests — passed.
- Heritage Arcade selection/open test was temporarily integrated and passed on desktop and mobile before the worker removed shared-file edits for lead ownership.

## Shared integration requested from lead

Apply these changes serially in the lead lane:

1. In `frontend/src/games/heritage-arcade/ported/data/games.ts`, append:

```ts
{ id: 26, name: "Shogi", subtitle: "Frozen Shogunate", category: "Chess & Shogi", players: "2 players", status: "Documented Rules", layout: "Standard 9×9 square board with 20 pieces per player and visible captured-piece hands.", loop: "Checkmate the opposing King through movement, promotion, capture and legal re-entry drops under the documented hon-shōgi rules.", playable: true },
```

2. In `frontend/src/games/heritage-arcade/HeritageArcadeApp.jsx`:

- Import `ShogiFrozenShogunateApp` from `../shogi-frozen-shogunate/ShogiFrozenShogunateApp.jsx`.
- Let `table=shogi` initialize `activeMode` to `26`.
- Add `if (modeId === 26) return <ShogiFrozenShogunateApp onExitToLibrary={onBack} />;` at the start of `renderBoard`.

3. Keep the canonical production collection URL as `https://arcticdominion.xyz/?game=heritage-arcade`. Optional direct-open URL: `https://arcticdominion.xyz/?game=heritage-arcade&table=shogi`.

4. The worker test includes a Heritage Arcade route case. Run it after applying integration:

```powershell
npm.cmd exec -- playwright test tests/shogi-frozen-shogunate.spec.js
```

## Source-control state

- Existing Shogi implementation commit on `main`: `fb57575 Add Shogi Frozen Shogunate game`.
- At worker handoff, `main` is one commit ahead of `origin/main` before the WebP/export follow-up commit.
- User explicitly requested commit and push after integration.
