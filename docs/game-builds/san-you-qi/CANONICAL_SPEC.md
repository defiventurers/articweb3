# San You Qi Canonical Specification

## GAME

San You Qi (三友棋), also called Three Friends Chess.

## CANONICAL SLUG

`san-you-qi`

## CURRENT RULESET

`arctic-final-159-node-2.0.0`

This release combines the historically supported Zheng Jinde / Qing-era Three Friends Chess core with the finalized Arctic Dominion board reconstruction supplied and approved during the Sanyou board-mapping session.

## SOURCE BOUNDARY

Historically supported core:

- three players / three kingdoms;
- 18 pieces per army;
- 1 General, 2 Guards/Advisors, 2 Elephants, 2 Horses, 2 Chariots, 2 Cannons, 3 Soldiers, 2 Fire, 2 Flag;
- standard Xiangqi movement for the ordinary pieces;
- Fire advances one diagonal step forward and does not retreat;
- Flag has special movement rather than being an ordinary Xiangqi piece;
- central Sea / Mountain / City terrain affects passage;
- checkmate can lead to appropriation of the defeated army;
- last surviving General wins.

Arctic Dominion reconstruction / implementation data:

- the exact 159-node digital graph;
- exact C1-C24 labels and coordinates;
- all explicit continuation routes through C1-C24;
- the six added C-network horizontal lines;
- the faction-specific C-point enemy-territory boundaries used for Soldier promotion;
- exact terrain-to-edge mapping;
- fixed Red → Green → Blue turn order and digital repetition policy.

Do not present the exact C-point graph as a verbatim Qing rule text.

## PRIMARY / SECONDARY REFERENCES USED BY THE PROJECT

- Zheng Jinde, `三友棋譜` (Kangxi-era source, surviving in later collected editions).
- Cui Lequan, `圖說中國古代遊藝`, Sanyou Qi section.
- World Xiangqi Federation paper discussing the surviving Sanyou board and corrected 18-piece setup.
- Chinese variant summaries and the public Sanyou board reproduction used for cross-checking the historical core.

## BOARD

The final game board contains **159 playable intersections**:

- Red arm: 45 points (`L1-1` through `L9-5`)
- Blue arm: 45 points
- Green arm: 45 points
- Central graph: `C1` through `C24`

The exact normalized coordinates live in:

`frontend/src/games/san-you-qi/topology.js`

The production board artwork is:

`frontend/public/assets/heritage-arcade/board/sanyou-arctic-board.png`

## STARTING CONFIGURATION

Each army has 18 pieces.

Back row, from L1-1 through L9-1:

`Chariot, Horse, Elephant, Guard, General, Guard, Elephant, Horse, Chariot`

Middle line:

- Cannon at L2-3
- Flag at L4-3
- Flag at L6-3
- Cannon at L8-3

Front line:

- Soldier at L1-4
- Fire at L3-4
- Soldier at L5-4
- Fire at L7-4
- Soldier at L9-4

## PIECE ART

Production assets are under:

`frontend/public/assets/heritage-arcade/tokens/`

Blue uses the 9 `blue_team_SEfacing_*.webp` assets.

Green uses the 9 `green_team_SWfacing_*.webp` assets.

Red has three 9-piece directional sets:

- L1-L4: `red_team_NWfacing_*.webp`
- L5: `red_team_backfacing_*.webp`
- L6-L9: `red_team_NEfacing_*.webp`

Red pieces keep their original directional artwork identity when controlled after army appropriation; on central/opposing nodes the renderer chooses the matching directional Red set from the piece location.

## CONTINUATION GRAPH

The authoritative movement graph is documented in:

`docs/game-builds/san-you-qi/FINAL_MOVEMENT_GRAPH.md`

Unlike the Sanguo Qi implementation, Sanyou does not treat the three arms as being connected only by direct mirrored river-file exits. The intervening C-points are playable nodes.

## SIX CENTRAL HORIZONTAL LINES

- H1: C1-C2-C3-C4-C5-C6-C7
- H2: C13-C14-C15-C16-C17-C18-C1
- H3: C7-C8-C9-C10-C11-C12-C13
- H4: C19-C20-C21
- H5: C23-C24-C19
- H6: C21-C22-C23

Each adjacent pair in a sequence is connected. A sliding piece stays on the chosen movement line for the duration of a move; it does not turn at a junction.

## SOLDIER ENEMY-TERRITORY / PROMOTION MAP

The user-approved C-point boundary is faction-specific.

Red enemy C-points:

`C8 C9 C10 C11 C12 C13 C14 C15 C16 C17 C18 C22 C23 C24`

Blue enemy C-points:

`C2 C3 C4 C5 C6 C7 C8 C9 C10 C11 C12 C20 C21 C22`

Green enemy C-points:

`C1 C2 C3 C4 C5 C6 C14 C15 C16 C17 C18 C19 C20 C24`

Any point on another kingdom's coloured arm is enemy territory.

A Soldier promotes on first landing in enemy territory. The implementation stores that state permanently and adds sideways movement after promotion.

Two key directional checks from the approved graph:

- Red Soldier on C19: forward only to C17.
- Blue Soldier on C24: forward to C20 or C22.

## MOVEMENT

### General

One orthogonal point inside its original palace. Flying-General attack geometry is enforced along clear straight routes.

### Guard / Advisor

One palace-diagonal step on the palace X.

### Elephant

Standard blockable two-point diagonal movement in its original arm.

### Horse

Blockable Xiangqi L movement, resolved against the final graph. It cannot cross Sea.

### Chariot

Slides along a single explicit straight movement line until blocked. It cannot cross Sea.

### Cannon

Slides along a single explicit straight movement line. Captures the first enemy beyond exactly one screen. It cannot cross Mountain or City.

### Soldier

Before promotion: one point forward using its faction-oriented continuation graph.

After first entry into enemy territory: retains forward movement and gains sideways movement along the horizontal movement graph. It never moves backward.

### Fire

One diagonal-forward step. It never retreats.

### Flag

Before leaving its original territory: exactly two clear forward points.

After leaving its original territory: exactly two clear orthogonal points, with a clear intermediate point, and it may not return to its original kingdom.

## TERRAIN

Terrain is implemented on crossings/edges rather than by pretending a decorative terrain picture is itself a playable square.

Current final reconstruction:

- Sea crossings block Horse and Chariot.
- Mountain crossings block Cannon.
- City crossings block Cannon.
- Soldier, Fire, and Flag are not given a special terrain prohibition beyond their own movement geometry.

## APPROPRIATION

Each piece stores both:

- `faction`: original kingdom / artwork / movement orientation
- `owner`: current controller

After checkmate, the defeated General is eliminated and surviving pieces of that original army are transferred to the mating player's control. Their original faction and orientation are retained.

## TURN / VICTORY

Red opens. Digital order is:

`Red → Green → Blue`

Eliminated kingdoms are skipped. The last surviving General wins.

## IMPLEMENTATION FILES

- `frontend/src/games/san-you-qi/topology.js`
- `frontend/src/games/san-you-qi/rules.js`
- `frontend/src/games/san-you-qi/SanYouQiApp.jsx`
- `frontend/src/games/san-you-qi/sanYouQi.css`
- `frontend/src/games/san-you-qi/rules.test.js`
- `frontend/tests/san-you-qi-smoke.spec.js`

## DEPLOYMENT

The game is integrated at:

- direct route: `?game=san-you-qi`
- Heritage Arcade route: `?game=heritage-arcade&table=san-you-qi`

Vercel production build status should be checked after every topology/rule change.
