# San You Qi Build State

## Current Checkpoint

Lead session resumed direct implementation on 2026-09-17 after the user chose to close the worker sessions and continue with Codex. The previous worker record claimed completion, but lead review found stale documentation, a left/right river-crossing defect, empty terrain legality, and a disputed Flag rule implemented against the weaker source.

Current status: rules engine repaired and focused engine tests passing. UI, shared catalog text, route smoke tests, build, and browser QA remain in progress.

## Ownership

- Game ID: `san-you-qi`
- Original worker: Game Session 28 (`3fe5fc06-fcfa-40fa-8353-db0ca532e85a`)
- Temporary implementer: Lead session (`b9e86533-06a6-4856-8d95-7b809f58a428`)
- Game-owned paths:
  - `frontend/src/games/san-you-qi/`
  - `docs/game-builds/san-you-qi/`
  - `frontend/tests/san-you-qi-smoke.spec.js`

## Source Evidence

- English Wikipedia: Qing Kangxi / Zheng Jinde attribution, three-player Xiangqi variant, 18 pieces per player, checkmate appropriation, last General victory.
- Chinese Wikipedia variant page: left/right/center river crossing, terrain restrictions, Fire/Flag setup, no return for Flag after leaving original territory.
- Wikimedia Commons `SanYouQi_Board.svg`: public board/setup visual reference.
- Xiao-en Chinese article PDF: 18-piece army, Fire movement, Flag movement, and terrain restrictions.
- World Xiangqi Federation PDF: secondary historical/context support.

## Decisions Made

- Selected Chinese-source Flag rule: in home territory the Flag moves exactly two clear steps forward; after leaving home, it moves exactly two clear orthogonal steps in any direction and cannot return to its original sector.
- Rejected the English secondary "Flag becomes Chariot" rule for this build.
- Implemented left/right/center river crossings:
  - center file branches to both other sectors;
  - left files cross one neighbor;
  - right files cross the other neighbor.
- Added code-owned terrain markers:
  - Sea: center file rank 0;
  - Mountain: files 2 and 6 rank 0;
  - City: files 0 and 8 rank 0.
- Classified exact terrain-to-file mapping as likely reconstruction.

## Files Modified In This Resume

- `frontend/src/games/san-you-qi/rules.js`
- `frontend/src/games/san-you-qi/rules.test.js`
- `frontend/src/games/san-you-qi/SanYouQiApp.jsx`
- `docs/game-builds/san-you-qi/CANONICAL_SPEC.md`
- `docs/game-builds/san-you-qi/BUILD_STATE.md`

## Test Commands And Results

- `./node_modules/.bin/vitest.cmd run src/games/san-you-qi/rules.test.js`
  - Result: PASS, 28 tests passing.

## Known Defects / Remaining Work

- San You Qi rulebook text must be updated to remove "Flag becomes Chariot."
- Catalog summary/engine text must be updated to match the corrected Flag rule.
- Smoke test should be made deterministic enough to verify direct route, board render, reset/replay/rules controls if present, and mobile-safe layout.
- Browser QA has not yet been rerun after the rule correction.
- Production build and affected route regression have not yet been rerun.

## Shared Integration Requests For Lead

Lead must review and serialize any remaining shared edits:

- `frontend/src/App.jsx`
- `frontend/src/data/gameCatalog.js`
- `frontend/tests/all-games-routes.spec.js`

## Next Action

Repair San You Qi UI/rulebook and shared catalog copy to match `RULESET_VERSION` `zheng-jinde-qing-kangxi-1.1.0`, run component/smoke/build checks, perform desktop and mobile browser QA, implement any QA improvements, then update this record again.
