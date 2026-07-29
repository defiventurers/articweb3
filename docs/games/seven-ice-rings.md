# Seven Ice Rings

## Heritage rulesets

- Product: Seven Ice Rings
- Traditional game: Sat-gol
- Recorded place: Gosalpur, then Jubbulpore district, Central Provinces; now Jabalpur district, Madhya Pradesh
- Source baseline: H. C. Das Gupta, *A Few Types of Sedentary Games Prevalent in the Central Provinces* (1924)
- Players: two
- Engine: shared circular relay sowing

This release exposes two queues because the recorded starting instruction and the later playable interpretation produce materially different games.

### Gosalpur Forced Start

`seven-ice-rings / sat-gol-das-gupta-1924-forced-start-1.0.0`

The opening player chooses any occupied circle. Every later player must begin at the first non-empty circle after the previous move's endpoint.

### Open Choice

`seven-ice-rings / sat-gol-bautista-open-choice-1.0.0`

Every player may choose any non-empty circle. This later interpretation creates meaningful starting decisions and is the default practice queue.

The variants never share matchmaking or history rankings.

## Board and opening

- Seven circles are arranged in one ring.
- Four stones begin in every circle.
- There are 28 stones total.
- The circles are shared; players own only captured stones.

## Complete move

1. Lift every stone from the required or chosen circle.
2. Sow anticlockwise, one stone into each following circle.
3. When the hand empties, inspect the next circle.
4. If that circle contains stones, lift all of them and continue from the following circle.
5. If that circle is empty, the move stops.
6. Capture every stone in the circle immediately beyond the empty circle.
7. The other player takes the next turn.

The digital engine preserves the immediate-beyond rule. It does not use Murray's broader interpretation that skips across a sequence of empty circles to the next occupied one.

## Finishing and scoring

The historical description ends when the players agree that further captures are impossible. Remaining board stones are not counted. The player with more captured stones wins.

The digital release models agreement directly:

- after two consecutive captureless turns, the active player may claim that no useful capture remains;
- the opponent may accept, ending and scoring the match;
- the opponent may instead make a sowing move, which rejects the claim and continues play;
- equal captured totals are a draw.

This avoids silently inventing an automatic historical end condition.

## Relay-cycle policy

A relay can theoretically revisit the same complete position. The engine detects an exact repeated relay state and rejects that starting circle as non-terminating. This is a visible digital safety policy, not a claimed historical rule.

## Product modes

- Practice: Open Choice
- Practice: Gosalpur Forced Start
- Local two-player: Open Choice
- Local two-player: Gosalpur Forced Start
- Distant Capture Drill
- Public and private online rooms for either variant
- Persistent reconnectable matches
- Game-specific history and proof hashes

## Authoritative multiplayer

The server validates:

- room membership and assigned side;
- current turn;
- forced starting circle when applicable;
- non-empty starting circles;
- every anticlockwise sowing step;
- every relay pickup;
- exact stop, empty ring and distant capture;
- stone conservation across board and stores;
- end claims and opponent acceptance;
- final score, draw and proof hash.

Every action enters an ordered audit hash chain. The final proof binds the ruleset, room, match state and audit history.

## Release boundary

Free play only. Wallet profiles support identity, room ownership, reconnect and history. They are not described as wallet-signature authentication. No entry fees, wagering, payouts or token rewards are included.
