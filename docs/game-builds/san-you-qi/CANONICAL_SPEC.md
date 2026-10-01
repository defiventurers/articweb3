# San You Qi Canonical Specification

## GAME

San You Qi (三友棋), also called Three Friends Chess.

## CANONICAL SLUG

`san-you-qi`

## CURRENT RULESET

`arctic-final-156-node-3.3.5`

This release combines the historically supported Zheng Jinde / Qing-era Three Friends Chess core with the current Arctic Dominion board reconstruction.

## SOURCE BOUNDARY

Historically supported core includes the three-player / three-kingdom structure, 18 pieces per army, Xiangqi-derived ordinary pieces, special Fire and Flag roles, central Sea/Mountain/City terrain, army appropriation after defeat, and last-surviving-General victory. The Flag moves exactly two points straight forward before leaving home and becomes Chariot-like after crossing out of its own territory.

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

Cannon may cross. Chariot may not cross those Sea edges. For Horse movement, a Sea edge blocks only when it is the Horse's first orthogonal leg; the second straight unit or final turning unit may use that edge.

C20, C22 and C24 remain legal continuation-network stopping points. Cannon may use C4-C20-C22, C4-C20-C24 and C24-C22.

The compressed center also has six explicit Horse tip jumps:
- Red L4-5 / L6-5 ↔ C20
- Green L4-5 / L6-5 ↔ C22
- Blue L4-5 / L6-5 ↔ C24

They remain blocked-Horse moves: the appropriate first leg must be clear.

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

## CENTRAL CAMP TERRITORIES

Every surviving central point belongs to one or two camps.

Exclusive Red territory:
- C2, C3, C4, C5, C6, C20

Exclusive Green territory:
- C8, C9, C10, C11, C12, C22

Exclusive Blue territory:
- C14, C15, C16, C17, C18, C24

Shared Fort-gate territory:
- C1 = Red + Blue
- C7 = Red + Green
- C13 = Green + Blue

A shared gate counts as home territory for either owning camp. Entering that gate does **not** trigger Soldier promotion or Flag enemy-territory state for an owning camp.

Once a Flag has entered enemy territory and gained its post-home movement, it may not re-enter exclusive territory belonging to its original camp. It may, however, return to one of its own shared gates (C1/C7/C13 as applicable). The shared gate is the return boundary; it does not reopen movement into exclusive home territory.

For the third camp that does not share a particular gate, that gate is enemy territory.

## SOLDIER ENEMY TERRITORY

Enemy status is derived from the camp-territory map above. The extended river does not change that ownership.

Red enemy: `C8 C9 C10 C11 C12 C13 C14 C15 C16 C17 C18 C22 C24`

Blue enemy: `C2 C3 C4 C5 C6 C7 C8 C9 C10 C11 C12 C20 C22`

Green enemy: `C1 C2 C3 C4 C5 C6 C14 C15 C16 C17 C18 C20 C24`

A Soldier promotes permanently on first landing in enemy territory. Promotion adds sideways movement where a horizontal movement line exists; the Soldier keeps its original one-step forward movement.

Blue Soldier on C24 keeps the approved forward choices C20 and C22.

## FIRE AT FORT SEAMS

Fire keeps its one-step forward-diagonal movement at the three Fort seams.

The six explicit cross-camp diagonals are:
- Red L2-5 → Blue L9-5
- Red L8-5 → Green L1-5
- Green L2-5 → Red L9-5
- Green L8-5 → Blue L1-5
- Blue L2-5 → Green L9-5
- Blue L8-5 → Red L1-5

These are explicit geometry corrections for the compressed three-kingdom board. They are not retreats; each is forward relative to the Fire's original faction.

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

## FLYING GENERAL

The Xiangqi flying-General rule remains active on approved straight continuation lines. Opposing Generals may not face one another with no intervening piece.

Therefore a piece that is currently shielding its own General may be geometrically capable of moving sideways or onto another continuation branch but still be **legally pinned** if that move exposes the two Generals.

Example: a Red Cannon on Blue L5-4 can have normal Cannon pseudo-moves toward Blue's rank and toward the Green L5 branch, yet those moves are illegal if that Cannon is the only blocker between the Red and Blue Generals.

## STALEMATE DRAW

Arctic Dominion completion rule:

- If the faction whose turn it is is **not in check** and has **zero legal actions**, the entire game ends immediately as a stalemate draw.
- No army is appropriated on stalemate.
- A checked faction with zero legal replies is still checkmate and uses the existing checkmate/appropriation flow.
- This rule applies equally to human turns, local bots and online bots.

## CHECK RESPONSE AND APPROPRIATION

A check interrupts the ordinary three-player cycle: the checked kingdom must answer immediately. If that response displaced the player who would normally have moved next, that skipped turn resumes once the check is cleared.

This is an implementation convention for the three-player ambiguity; the surviving primary verse establishes cyclic play but does not spell out this exact third-party discovered-check edge case.

If a third player's move uncovers a check from another faction's piece, the checking piece's controller receives mate credit if the checked kingdom has no legal reply.

Each piece stores both `faction` (original kingdom/artwork/orientation) and `owner` (current controller). After checkmate, the defeated General is eliminated and surviving pieces transfer control while retaining original faction identity.

## FLAG AFTER LEAVING HOME

While still inside territory belonging to its original camp, Flag moves exactly two clear points straight forward.

After first entering enemy territory, Flag moves like a Chariot: any clear distance orthogonally along one approved movement line. It may not re-enter exclusive territory of its original camp, but may return to a shared Fort gate that belongs to that camp (C1/C7/C13 as applicable).

## IMPLEMENTATION FILES

- `frontend/src/games/san-you-qi/topology.js`
- `frontend/src/games/san-you-qi/rules.js`
- `frontend/src/games/san-you-qi/SanYouQiApp.jsx`
- `frontend/src/games/san-you-qi/rules.test.js`
- `frontend/tests/san-you-qi-smoke.spec.js`

## DEPLOYMENT

- `?game=san-you-qi`
- `?game=heritage-arcade&table=san-you-qi`
