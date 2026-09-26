# San You Qi Build State

## Current checkpoint

San You Qi has been rebuilt around the finalized Arctic Dominion Sanyou board rather than the earlier simplified 135-node logical model.

Current ruleset:

`arctic-final-159-node-2.0.0`

## Completed in this build

- Replaced the old generated Y-board geometry with the production `sanyou-arctic-board.png`.
- Added the exact 135 normalized coloured-arm coordinates.
- Added C1-C24 as real playable nodes, for 159 total intersections.
- Added every user-approved continuation route, including alternate routes.
- Added all six user-approved central horizontal lines.
- Added faction-specific C-point enemy-territory maps.
- Added persistent Soldier promotion on first enemy-territory entry.
- Verified the key Red C19 → C17 and Blue C24 → C20/C22 Soldier directions.
- Replaced placeholder SVG pieces with the uploaded 45 production WebP assets.
- Added the three Red directional artwork sets and the Blue/Green fixed directional sets.
- Rebuilt Chariot/Cannon rays on the explicit line graph.
- Rebuilt Fire, Flag, Horse, Elephant, Guard, General and Soldier movement around the finalized graph.
- Preserved check, checkmate, army appropriation, original-faction identity and current-controller identity.
- Updated focused rules tests and browser smoke tests.
- Updated the Heritage Arcade catalogue to classify the exact graph as a partial reconstruction.

## Opening formation

Per faction:

- Back: Chariot, Horse, Elephant, Guard, General, Guard, Elephant, Horse, Chariot.
- Middle: Cannon, Flag, Flag, Cannon.
- Front: Soldier, Fire, Soldier, Fire, Soldier.

Total: 18 per army / 54 pieces.

## Production assets

Board:

`frontend/public/assets/heritage-arcade/board/sanyou-arctic-board.png`

Pieces:

`frontend/public/assets/heritage-arcade/tokens/`

Expected Sanyou artwork count: 45 WebPs.

- Red NW-facing: 9
- Red back-facing: 9
- Red NE-facing: 9
- Green SW-facing: 9
- Blue SE-facing: 9

## Graph source of truth

`frontend/src/games/san-you-qi/topology.js`

Detailed human-readable graph:

`docs/game-builds/san-you-qi/FINAL_MOVEMENT_GRAPH.md`

## Historical / reconstruction boundary

The historical core supports the Three Friends Chess armies, special Fire/Flag roles, Xiangqi ancestry, terrain restrictions and army appropriation.

The exact C1-C24 topology, exact coordinates, six added horizontal lines, faction-specific central promotion boundaries and exact terrain-edge encoding are the finalized Arctic Dominion reconstruction and must not be described as verbatim historical source text.

## Verification

The GitHub/Vercel deployment status for commit `b55a68a21a4af17928cbbebd0a9c75e25149a4ee` reported success before the documentation/catalogue follow-up commits.

Focused unit and smoke specifications now cover:

- 54-piece setup;
- exact opening positions;
- 159 unique playable nodes;
- all named continuation families;
- all six central horizontals;
- all three faction-specific enemy C-point sets;
- Red C19 Soldier direction;
- Blue C24 Soldier branching direction;
- Red C20 → C24 promotion;
- terrain restrictions;
- Fire and Flag examples;
- opening turn flow;
- correct WebP asset families in browser smoke checks.

## Remaining QA

- Confirm the newest production deployment after the documentation/catalogue commits.
- Run the focused Vitest suite and Playwright smoke suite in CI/local checkout when available.
- Perform visual desktop/mobile QA on the live board and tune piece scale only if necessary; do not change coordinates to solve a purely visual sizing issue.
