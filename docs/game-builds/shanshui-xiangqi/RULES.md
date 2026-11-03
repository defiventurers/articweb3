# Shanshui Xiangqi — Antarctic v1 rules and modes

Ruleset: `shanshui-antarctic-v1`. Build baseline: `main` at
`97bbdd5121eb0e75c0993f0066c5c16a0b13f5a1`. Final for this digital edition;
not a claim that every detail below is verified as the creator's complete rules.

## Provenance

山水象棋 is a Chinese Xiangqi adaptation. The primary reference is 棋行山水's
[basic-rules video](https://www.bilibili.com/video/BV1JqsKeuEGG/) (28 August
2024, 2:35). Its text and diagrams establish the rules marked **Source** below.
The video explicitly defers detailed rules. Additional searching did not locate
an authoritative full rulebook. Exact inventor and invention date remain unknown.
Do not describe this particular game as ancient or Indian.

The working English name is **Mountain & River Chess**. The original source's
four-army arrangement and piece roles remain intact. Existing Yan Yi art is
reused only as presentation, as requested; Yan Yi's rules are not imported.

## Formats and modes

| Format / mode | Control and behaviour | Status of format |
| --- | --- | --- |
| Two-player teams | One person controls Red + Purple; the other Blue + Green. One army moves in each scheduled slot. | Source format, Antarctic v1 decisions below |
| Four-player 2v2 | One person per army, fixed diagonal allies. | Explicit Antarctic adaptation |
| Quick play (vs bot) | Choose a team; the bot controls both enemy armies. Easy, Medium and Hard use the same legal moves. | Digital mode |
| Local two-player | Pass the device or share the screen; both teams controlled by people. | Digital mode |
| Local four-player | Four people share a device, one army each. | Digital mode / adaptation |
| Private online | Two-seat team table or four-seat 2v2 table using the existing authenticated room service. Empty seats may be bots. | Digital mode; requires backend/client release |
| Learn piece movement | Place one selected piece, then follow legal geometry without turn or victory adjudication. | Practice only |
| Arrange the board | Starts empty; select pieces, place, move, remove and lock. A separate button fills the starting position. Validate before starting a local match. | Editor only, cannot submit online states |
| How to Play | Quick rules, Full rules with progress, and interactive movement practice. | Tutorial, never a separate rules engine |

There is no free-for-all, gambling mode, promotion, captured-piece drop or Han
Emperor in this edition. Two human seats and four armies are different concepts.

## Source rules

1. **Source:** use 13 × 13 intersections (169 points, diagram-derived), four
   corner 3 × 3 palaces, a horizontal river and a vertical mountain line in the
   canonical opening view. The explanatory terrain diagram rotates the board.
2. **Source:** Blue is upper left, Red upper right, Purple lower left and Green
   lower right. Red + Purple oppose Blue + Green. The former is called White
   team and the latter Black team in the source; army colours remain distinct.
3. **Source:** Red → Blue → Purple → Green, counterclockwise. Move one piece
   belonging to the scheduled army. A two-player controller cannot choose either
   of their two armies freely.
4. **Source, diagram-derived:** each army starts with 17 pieces: General ×1;
   Advisor, Elephant, Horse, Chariot and Cannon ×2; mountain infantry ×3 and
   river infantry ×3. Total 68. All four initial positions are mirrors of the
   upper-left formation, recorded in `rules.js` and tested for disjointness.
5. **Source:** Chariots move any clear orthogonal distance; Cannons move on clear
   orthogonal lines and capture across exactly one intervening piece. Horses
   move 2+1 with the first orthogonal leg blocked by an occupied point.
6. **Source:** the General moves one orthogonal step in its own palace; Advisors
   one diagonal step on its four-point diamond (the source formation uses the four edge midpoints). Elephants move two diagonal steps with an
   empty midpoint on the reachable network determined by their starting points. They may enter mountain/river boundaries but cannot cross
   either into a neighbouring army's quadrant.
7. **Source:** mountain infantry (兵) advance towards and across the mountain;
   river infantry (卒) advance towards and across the river. Each moves one
   forward, never backward; sideways movement becomes available after crossing.
   Mountain infantry cannot enter the river; river infantry cannot enter the
   mountain. Thus one army has two different infantry forward vectors.
8. **Source:** while an army still has its ally, normal check and stalemate
   adjudication are not used. Capture its General in an actual move to remove
   that entire colour. The introductory video explicitly states this for the
   initial four-army phase and applies mating rules to the eliminated army's ally.
9. **Source:** after losing its ally, a surviving army can be checkmated or
   stalemated. Defeat both enemy armies to win as a team.
10. **Source:** a General facing an enemy General along an unobstructed line may
    capture it and return to its original point as one action. The animation
    demonstrates a row. The victim's entire army leaves play.

## Explicit Antarctic v1 decisions filling source gaps

| ID | Final digital decision | Reason / exact semantics |
| --- | --- | --- |
| A1 | Skip eliminated army slots; surviving armies retain the fixed cyclic order. | An army never inherits its defeated ally's slot or pieces. Consecutive turns for one human can result after elimination. |
| A2 | King-safety and checkmate/stalemate apply only to a team's lone surviving army. | Both teams use this rule independently, so it also handles a later one-army-versus-one-army ending. |
| A3 | For an army whose ally remains, a move may expose its General. If it has no geometric move, its only legal action is Pass. | Matches the source's actual-capture phase without inventing early stalemate elimination. |
| A4 | The central row 6 is river interior; column 6 is mountain interior. Their intersection has both tags. Banks are rows 5/7; feet columns 5/7. | Mountain infantry cannot land on row 6; river infantry cannot land on column 6. Bank and foot endpoints remain legal. Other pieces may use the centre. |
| A5 | Sideways unlocks on the opposite bank/foot, beyond the centre line, never on the centre itself. | Blue/Purple mountain infantry: column ≥7; Red/Green: column ≤5. Blue/Red river infantry: row ≥7; Purple/Green: row ≤5. It is derived from position, not a UI flag. |
| A6 | Friendly and allied captures are forbidden; all pieces can be Cannon screens and movement blockers. | Fixed teams; source does not introduce friendly fire. |
| A7 | Facing-General capture works along either a clear row or clear column. | Symmetric extension of the illustrated row case. Not a diagonal capture. Applies in all phases; lone-army safety still applies. |
| A8 | Mate/stalemate is evaluated when the lone army's scheduled turn arrives. Remove that whole army, then continue resolving the next scheduled turn. | Avoids prematurely judging a position before intervening moves. |
| A9 | Three repetitions of the same role/army/point position, active army and elimination set draw. 400 consecutive actions without capture draw. Every surviving army passing consecutively draws. | Explicit digital termination rules, not a tournament Xiangqi perpetual-chase implementation. |
| A10 | No clock in the first release. Two-seat resignation resigns the entire team; four-seat resignation removes only that army. | Avoids an undocumented timing convention. Leaving an online seat uses the existing bot replacement policy. |

Lone-army safety is evaluated after capture removals, so removing the enemy army
that supplied an attack can legitimately make a move safe. Facing-General
capture-and-return leaves the acting General on its origin and consumes exactly
one action, even if an animation shows an outbound and return journey.

All A1–A10 decisions are immutable within this ruleset. A change requires a new
ruleset ID; a client must not reinterpret an old room under a new version.

## Presentation and asset decisions

- Red, Blue and Green sprites reference the existing Yan Yi files unchanged.
- Purple uses seven new amethyst tokens derived from the Blue equivalents;
  the seven roles share their established silhouettes. Infantry shares the
  soldier sprite with explicit mountain/river badges and directional arrows.
- Boards have exact shared coordinates in light and dark variants. Grid,
  palaces and terrain are deterministic image assets, not inferred from artwork.
- The default view rotates the source view 90° clockwise so Red is at the bottom
  right. A player's chosen view stays fixed between turns; piece faces stay upright.
- Pengu explains routes/rules; Polly introduces practice; Retsba supplies tactics.
  Hosts stay outside the board; no existing approved mascot art is redesigned.

## Engineering acceptance

One pure engine supplies moves, practice targets, bot actions and server
validation. Server rooms select a fixed format, validate seat ownership, state
revision and ruleset version, and never accept editor positions. Existing game
IDs and engines remain untouched. New match records remain free gameplay and
do not initiate chain transactions. Deployment and a signed APK are separate
release steps from source/build verification.
