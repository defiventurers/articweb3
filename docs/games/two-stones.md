# Two Stones

## Release ruleset

- Product: Two Stones
- Traditional game: Do-guti
- Ruleset ID: `two-stones / do-guti-das-gupta-1926-1.0.0`
- Source basis: H. C. Das Gupta (1926), pp. 143–148
- Region: Punjab, India
- Players: two
- Pieces: two stones per player
- Engine: micro blockade

## Board

The board contains five playable points: the four corners of a square and the centre intersection. Both diagonals are present. Three sides of the square are present and the top side is open. Rotating the entire diagram does not change the graph.

Edges:

- north-west to south-west;
- south-west to south-east;
- south-east to north-east;
- each corner to the centre.

The missing north-west to north-east edge is intentional.

## Setup and turn sequence

1. Aurora begins.
2. Players alternate placing one stone on any empty point.
3. Placement continues until all four stones are on the board.
4. Thereafter, move one own stone to the empty adjacent point along a printed line.
5. After every placement or movement, check whether the opponent has a legal move.
6. If the opponent has no legal move, the active player wins immediately.

There is no capture, jumping, removal, stacking, randomizer, safe point, re-entry or promotion.

## Solved-game result

The implementation enumerates the complete reachable state graph from the empty board:

- 114 reachable positions;
- 12 winning positions for the player to move;
- 4 losing positions for the player to move;
- 98 drawing positions;
- empty-board opening: draw under perfect play.

Because the historical source does not specify repetition handling and perfect play can cycle, this release does not ship a ranked economy.

## Declared digital draw policy

- Threefold repetition is a draw.
- Forty movement plies without immobilisation is a draw.
- Placement plies do not count toward the forty-ply limit.

These are explicit digital completion rules, not claims about the historical source. Changing them requires a new ruleset version.

## Product modes

- Practice as Aurora
- Practice as Coral
- Local two-player
- One-Move Lock Drill
- Public online rooms
- Private room codes
- Persistent reconnectable rooms
- Game-specific history
- Audit chain and final proof hash

## Release boundary

Free play only. Wallet identity is used for profile attribution, room ownership, reconnect, history and match proofs. There are no entry fees, wagers, payouts or token rewards.
