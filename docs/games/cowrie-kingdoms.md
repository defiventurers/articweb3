# Cowrie Kingdoms

## Release-one heritage ruleset

- Product: Cowrie Kingdoms
- Traditional game: Ashta-Kashte
- Ruleset ID: `cowrie-kingdoms / ashta-kashte-falkener-1892-duel-1.0.0`
- Source: Edward Falkener, *Games Ancient and Oriental and How to Play Them* (1892), pp. 265–267
- Comparative transcription: H. J. R. Murray, *A History of Board-Games Other Than Chess* (1951), p. 131
- Locality: India; Falkener does not record a precise locality for this rules description
- Source player count: two to four
- First digital queue: two-player duel

## Frozen rules

The board is a seven-by-seven square. The centre and the middle square of each edge are crossed safe squares. Each player controls four pieces and uses four cowries.

Cowrie values:

- one, two or three mouths up score 1, 2 or 3;
- all four mouths up score 4 and grace;
- no mouths up score 8 and grace;
- a grace earns another cast;
- a capture earns another cast.

Falkener states that the 8 and grace may be played separately. The digital state therefore stores an Ashta throw as two allocation units: a grace-entry unit and a movement-8 unit. The player may allocate or pass each unit separately.

Pieces enter on the crossed edge square through grace. They travel anticlockwise around the outer ring. From the square before their entry cross, they turn into the left corner of the next concentric ring and continue clockwise through the two inner rings to the centre. The Ember route is the exact 180-degree rotation of the Aurora route. The centre requires an exact throw.

## Pairs and captures

Two friendly runners may occupy the same cell and form a pair. A player may move either runner separately or move the pair together with one stored value.

- A single runner captures one opposing single by exact landing on an unprotected cell.
- A single runner cannot capture an opposing pair.
- A pair may capture an opposing single or pair by exact landing.
- Every captured runner returns home.
- A capture grants one additional cast, regardless of whether one or two runners were removed.
- Marked cells are safe and cannot be captured.
- The source-specific exception permits a runner to enter on its own crossed starting cell while one opposing runner rests there.

The first player to finish all four runners in the centre wins.

## Variant boundary

Cowrie Kingdoms is a family product, not one blended game. This release does not import rules from Telugu Ashta Chemma, five-house or seven-house Chowka Bara, or Bell's Thaayam.

In particular, this release does not add:

- a capture requirement before the inner route;
- Thaayam-specific named twin-piece classes or movement values;
- another region's cowrie table;
- another board size;
- a different safe-square layout.

Those require separate ruleset IDs, queues and documentation.

## Declared digital policies

- Aurora begins a two-seat digital duel.
- A friendly stack is limited to two runners.
- Pair movement is optional; either member may split away on a later move.
- Pieces may pass occupied cells; only the destination is resolved.
- A player may pass any stored throw, matching Falkener's optional-play rule.
- The current release offers a two-player queue even though the historical rules allow two to four players.
- Safe-cell coexistence is limited to the source-specific entry exception in legal move generation.

Changing any of these policies requires a new ruleset version.

## Product modes

- Practice as Aurora
- Practice as Ember
- Local two-player
- Ashta Grace Drill
- Public online rooms
- Private room codes
- Persistent reconnectable matches
- Game-specific history and proof hashes

## Release boundary

Free play only. Wallet identity is used for profiles, room ownership, reconnect, history and proof attribution. There are no entry fees, wagers, payouts or token rewards.
