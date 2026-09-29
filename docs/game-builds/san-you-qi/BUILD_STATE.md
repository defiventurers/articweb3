# San You Qi Build State

## Current checkpoint

Current ruleset:

`arctic-final-156-node-3.0.0`

The board now uses the latest user-supplied coordinates and the revised 21-point central topology.

## Applied in this checkpoint

- Updated all 135 Red/Green/Blue normalized coordinates from the latest placement export.
- Updated surviving central coordinates.
- Deleted C19, C21 and C23.
- Reduced the board from 159 to 156 playable intersections.
- Deleted H4, H5 and H6; kept H1, H2 and H3.
- Replaced C3-C19-C17 with C3-C17.
- Replaced C5-C21-C9 with C5-C9.
- Replaced C15-C23-C11 with C15-C11.
- Kept C20, C22 and C24 as continuation-only points with no horizontal-row neighbors.
- Preserved C4-C20, C20-C22, C20-C24 and C24-C22.
- Preserved enemy-territory status for every surviving C-point.
- Removed the obsolete Red Soldier-on-C19 case.
- Kept Blue Soldier C24 → C20/C22.
- Applied revised Fort, Mountain and extended-Sea movement restrictions.
- Updated unit tests, smoke text, rulebook copy, catalogue text and placement-tool defaults.

## Terrain checkpoint

Sea edges that block Chariot/Horse and allow Cannon:

- C3-C17
- C5-C9
- C15-C11

Mountain crossings that block Cannon:

- C2-C18
- C6-C8
- C14-C12

Fort boundary stopping points:

- C1 (Red/Blue)
- C7 (Red/Green)
- C13 (Blue/Green)

Cannon may stop on the boundary point from its own side but may not continue through into the opposite kingdom. The three direct outer Fort crossings are Cannon-blocked.

## Next phase

After this topology checkpoint is stable:

- local player-count modes;
- bot difficulty levels;
- online rooms, following the Sanguo Qi architecture.

Run focused Vitest and Playwright smoke checks in CI after deployment, then visual-QA the production board.
