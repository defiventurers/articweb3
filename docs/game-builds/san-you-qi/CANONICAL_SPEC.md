# San You Qi Canonical Specification

## GAME

San You Qi, also called Game of the Three Friends or Three Friends Chess.

## CANONICAL SLUG

`san-you-qi`

## ASSIGNED SESSION

Originally Game Session 28 (`3fe5fc06-fcfa-40fa-8353-db0ca532e85a`). Lead session `b9e86533-06a6-4856-8d95-7b809f58a428` resumed direct implementation on 2026-09-17 after the user chose to close worker tabs and continue with Codex.

## HISTORICAL RULESET

Playable Zheng Jinde / Qing Kangxi reconstruction of San You Qi. The implementation uses standard Xiangqi movement on three 9 by 5 half-boards with San You Qi special pieces, code-owned central terrain restrictions, three-player turn order, checkmate appropriation, and a digital no-repeat policy.

## SOURCE LINKS

- https://en.wikipedia.org/wiki/Game_of_the_Three_Friends - Qing Kangxi attribution to Zheng Jinde, three players, 18 pieces per side, Red first convention, checkmate appropriation, terrain notes, and last surviving General victory.
- https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%9C%8B%E8%B1%A1%E6%A3%8B%E8%AE%8A%E9%AB%94 - Chinese variant overview with 9 by 5 arms, 18-piece armies, Fire/Flag placements, left/right/center river crossing rule, terrain restrictions, and Flag leaving-home constraints.
- https://commons.wikimedia.org/wiki/File:SanYouQi_Board.svg - CC BY-SA 4.0 board reference showing the three-arm board, starting array, and central terrain artwork.
- https://upload.wikimedia.org/wikipedia/commons/1/18/SanYouQi_Board.svg - Direct SVG reference used only for visual/setup confirmation; geometry remains implemented in code.
- https://xiao-en.org/system/magazine/pdf/b4-33_tra.pdf - Chinese-language article supporting Zheng Jinde/Kangxi attribution, 18-piece composition, Fire placement and movement, Flag movement, and terrain restrictions.
- https://www.wxf-xiangqi.org/images/hangzhou-chess/202006_18.pdf - World Xiangqi Federation material used as secondary historical/context support.

## RULE CLASSIFICATIONS

- VERIFIED HISTORICAL RULE: three players; three Xiangqi half-board arms; 18 pieces per side; one General, two Advisors, two Elephants, two Horses, two Chariots, two Cannons, three Soldiers, two Fires, two Flags; Fire moves one diagonal forward and never retreats; the winner is the last surviving General; checkmate leads to appropriation of the defeated army.
- LIKELY RECONSTRUCTION: exact digital coordinate system; exact terrain-to-file mapping; fixed Red, Green, Blue turn sequence; deterministic checkmate adjudication; left/right/center crossing represented as mirrored rank-0 file exits.
- MODERN VARIANT: Flag-as-Chariot after leaving home is documented in some English secondary material but is not the selected implementation.
- ARCTIC DOMINION DESIGN CHOICE: faction colors, inline SVG pieces, local hot-seat presentation, illegal-move feedback, repetition prevention, and responsive rulebook layout.

## RULE UNCERTAINTIES

The strongest Chinese sources support a Flag that moves exactly two orthogonal steps after leaving home and may not return to its original territory. Some English variant descriptions instead say the Flag becomes a Chariot outside home. This implementation selects the Chinese-source reading because it is more specific and aligns with the "no return home" rule.

Central terrain appears consistently in visual references, but public text does not unambiguously map each terrain type to every logical crossing coordinate. The engine marks the center file as Sea, files 2 and 6 as Mountain, and files 0 and 8 as City for each arm. This is classified as a likely reconstruction.

## BOARD GEOMETRY

Three distinct sectors: `red`, `green`, and `blue`. Each sector has 5 ranks and 9 files, for 135 total logical nodes. Rank 4 is home/back rank, rank 0 is the inner river edge, and file 4 is the center file.

River crossings:

- file 4 branches to both other sectors at file 4.
- files 0 through 3 cross to the left-neighbor sector at mirrored file `8 - file`.
- files 5 through 8 cross to the right-neighbor sector at mirrored file `8 - file`.
- Neighbor mapping: Red left Blue/right Green; Green left Red/right Blue; Blue left Green/right Red.

## COORDINATE SYSTEM

Nodes are `{ sector, rank, file }`. Palace is ranks 2-4, files 3-5 in each sector. All game state is JSON serializable and includes `rulesetVersion`.

## STARTING CONFIGURATION

Per faction:

- Rank 4: Chariot, Horse, Elephant, Advisor, General, Advisor, Elephant, Horse, Chariot.
- Rank 2: Cannon at files 1 and 7; Flag at files 3 and 5.
- Rank 1: Soldier at files 0, 4, and 8; Fire at files 2 and 6.

## PIECE DEFINITIONS

Standard Xiangqi pieces: General, Advisor, Elephant, Horse, Chariot, Cannon, Soldier.

San You Qi special pieces: Fire and Flag.

## MOVEMENT RULES

- General: one orthogonal step inside palace.
- Advisor: one palace-diagonal step along the palace X.
- Elephant: two diagonal steps, blocked by midpoint eye, may not cross the river.
- Horse: standard blockable Xiangqi L-move.
- Chariot: orthogonal sliding, blocked by pieces and Sea terrain.
- Cannon: orthogonal sliding; captures by exactly one screen; blocked by Mountain and City terrain.
- Soldier: forward before crossing; forward or sideways after entering a foreign sector; never backward.
- Fire: one diagonal forward step; never retreats.
- Flag in home sector: exactly two clear steps forward.
- Flag outside home sector: exactly two clear orthogonal steps in any direction, cannot return to its original sector.

## CAPTURE RULES

Capture is by displacement except Cannon, which captures only by jumping exactly one screen. Enemy Generals are not captured directly; defeat is adjudicated by checkmate and appropriation.

## PROMOTION OR SPECIAL ACTIONS

There is no promotion. The Flag changes movement class after leaving its home sector.

## TURN ORDER

Red moves first. Turns proceed Red, Green, Blue, skipping eliminated factions. If a player checkmates and appropriates another army while more than one faction remains, the mating player continues.

## VICTORY / DEFEAT / DRAW CONDITIONS

When a General is checkmated, it is eliminated and the mating player takes control of the defeated player's surviving board pieces. The last surviving General wins. Stalemate is not currently treated as defeat unless check is present. Repeating a prior position is disallowed by the digital legal-action filter.

## DIGITAL ADJUDICATION POLICIES

Illegal actions return explicit errors and do not mutate state. Legal-action generation is the shared source of truth for UI highlights and validation. Direct General capture is disallowed; mate adjudication handles defeated Generals.

## VISUAL DIRECTION

Premium Arctic Dominion heritage table with three colored Xiangqi arms, readable inline tokens, restrained ice-and-scroll styling, and a concise rulebook. The board topology is drawn from code rather than any decorative image.

## ASSET PROVENANCE

No proprietary art assets are copied. Board and pieces are rendered by React/SVG/CSS. Wikimedia SVG was used as a public reference for setup and visual confirmation only.

## RESPONSIVE REQUIREMENTS

Desktop uses board plus side rulebook. Mobile stacks board and rulebook vertically with no horizontal overflow. Board geometry must remain stable under resizing.

## CURRENT IMPLEMENTATION STATUS

Rules engine repaired to `zheng-jinde-qing-kangxi-1.1.0`. UI and shared integration still need review against the corrected rules and full browser QA.

## COMPLETED TESTS

`./node_modules/.bin/vitest.cmd run src/games/san-you-qi/rules.test.js` - 28 tests passing on 2026-09-17.

## OPEN DEFECTS

- Rulebook/catalog still need text review for the corrected Flag rule.
- Browser QA has not yet been re-run after the rules correction.
- Smoke test is weak and should be strengthened after UI selectors are reviewed.

## SHARED INTEGRATION REQUIRED

Lead-owned shared files already contain a San You Qi entry, but they need review after rules correction:

- `frontend/src/App.jsx`
- `frontend/src/data/gameCatalog.js`
- `frontend/tests/all-games-routes.spec.js`
- `frontend/tests/san-you-qi-smoke.spec.js`

## DEPLOYMENT STATUS

Not launch-ready. Focused engine tests pass; shared integration and browser verification are pending.

## NEXT ACTIONS

Review and repair San You Qi UI/rulebook and shared catalog copy, strengthen smoke/component checks, run affected tests and build, perform desktop/mobile browser QA, implement QA improvements, then update this spec and build state.
