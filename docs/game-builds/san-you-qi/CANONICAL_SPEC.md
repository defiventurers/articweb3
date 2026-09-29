# San You Qi Canonical Specification

## GAME

San You Qi (三友棋), also called Three Friends Chess.

## CANONICAL SLUG

`san-you-qi`

## CURRENT RULESET

`arctic-final-156-node-3.0.0`

This release combines the historically supported Zheng Jinde / Qing-era Three Friends Chess core with the current Arctic Dominion board reconstruction.

## SOURCE BOUNDARY

Historically supported core includes the three-player / three-kingdom structure, 18 pieces per army, Xiangqi-derived ordinary pieces, special Fire and Flag roles, central Sea/Mountain/City terrain, army appropriation after defeat, and last-surviving-General victory.

Arctic Dominion reconstruction / implementation data includes the exact 156-node digital graph, exact supplied coordinates, continuation routes, H1-H3, faction-specific promotion boundaries, and exact Fort/Mountain/Sea crossing behavior.

Do not present the exact C-point graph as verbatim Qing rule text.

## BOARD

The current game board contains **156 playable intersections**:

- Red arm: 45
- Blue arm: 45
- Green arm: 45
- Central graph: 21 — `C1-C18, C20, C22, C24`

Deleted central points: `C19`, `C21`, `C23`.

Exact normalized coordinates live in:

`frontend/src/games/san-you-qi/topology.js`

## CENTRAL GRAPH

Only these horizontal C-lines remain:

- H1: C1-C2-C3-C4-C5-C6-C7
- H2: C13-C14-C15-C16-C17-C18-C1
- H3: C7-C8-C9-C10-C11-C12-C13

H4/H5/H6 are deleted.

C20, C22 and C24 are each alone in their horizontal row. Explicit continuation connections:

- C4-C20
- C20-C22
- C20-C24
- C24-C22

The full route graph is documented in `FINAL_MOVEMENT_GRAPH.md`.

## TERRAIN

### Sea

Extended-river crossings:

- C3-C17
- C5-C9
- C15-C11

Cannon may cross. Chariot and Horse may not cross those Sea edges.

C20, C22 and C24 remain legal continuation-network stopping points. Cannon may use C4-C20-C22, C4-C20-C24 and C24-C22.

### Mountain

Cannon is blocked across:

- C2-C18
- C6-C8
- C14-C12

### Fort / City

Fort RB: Red L1-5, Red L2-5, C1, Blue L8-5, Blue L9-5.

Fort BG: Blue L1-5, Blue L2-5, C13, Green L8-5, Green L9-5.

Fort RG: Red L8-5, Red L9-5, C7, Green L1-5, Green L2-5.

A Cannon may enter and stop on C1/C7/C13 from its own side but may not continue through that Fort into the opposite kingdom. The three direct outer Fort links are also Cannon-blocked.

## SOLDIER ENEMY TERRITORY

The extended river does not change enemy status of surviving nodes.

Red enemy: `C8 C9 C10 C11 C12 C13 C14 C15 C16 C17 C18 C22 C24`

Blue enemy: `C2 C3 C4 C5 C6 C7 C8 C9 C10 C11 C12 C20 C22`

Green enemy: `C1 C2 C3 C4 C5 C6 C14 C15 C16 C17 C18 C20 C24`

A Soldier promotes permanently on first landing in enemy territory and gains sideways movement only where a horizontal movement line exists.

Blue Soldier on C24 keeps the approved forward choices C20 and C22.

## STARTING CONFIGURATION

Each army has 18 pieces.

Back row:
`Chariot, Horse, Elephant, Guard, General, Guard, Elephant, Horse, Chariot`

Middle:
- Cannon L2-3
- Flag L4-3
- Flag L6-3
- Cannon L8-3

Front:
- Soldier L1-4
- Fire L3-4
- Soldier L5-4
- Fire L7-4
- Soldier L9-4

## APPROPRIATION

Each piece stores both `faction` (original kingdom/artwork/orientation) and `owner` (current controller). After checkmate, the defeated General is eliminated and surviving pieces transfer control while retaining original faction identity.

## IMPLEMENTATION FILES

- `frontend/src/games/san-you-qi/topology.js`
- `frontend/src/games/san-you-qi/rules.js`
- `frontend/src/games/san-you-qi/SanYouQiApp.jsx`
- `frontend/src/games/san-you-qi/rules.test.js`
- `frontend/tests/san-you-qi-smoke.spec.js`

## DEPLOYMENT

- `?game=san-you-qi`
- `?game=heritage-arcade&table=san-you-qi`
