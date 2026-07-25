# Cowrie Kingdoms

## Release-one heritage ruleset

- Product: Cowrie Kingdoms
- Traditional game: Ashta-Kashte
- Ruleset ID: `cowrie-kingdoms / ashta-kashte-falkener-1892-duel-1.0.0`
- Source: Edward Falkener, *Games Ancient and Oriental and How to Play Them* (1892), pp. 265–267
- Locality: India; Falkener does not record a precise region for this rules description
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

Falkener specifically states that the 8 and grace may be played separately. The digital state therefore stores an Ashta throw as two allocation units: a grace-entry unit and a movement-8 unit. The player may allocate or pass each unit separately.

Pieces enter on the crossed edge square through grace. They travel anticlockwise around the outer ring, then enter the next concentric ring and follow the clockwise spiral to the centre. Landing exactly on an opponent on an unprotected square returns that piece home. The centre requires an exact throw. The first player to finish all four pieces wins.

## Variant boundary

Cowrie Kingdoms is a family product, not one blended game. This release does not import rules from Telugu Ashta Chemma, five-house or seven-house Chowka Bara, or Bell's Thaayam.

In particular, this release does not add:

- a capture requirement before the inner route;
- Thaayam twin-piece behaviour;
- another region's cowrie table;
- another board size;
- a different safe-square layout.

Those require separate ruleset IDs, queues and documentation.

## Declared digital policies

- Aurora begins a two-seat digital duel.
- Crossed safe squares allow mixed stacks. This preserves Falkener's statement that a player may enter while an opponent rests on the starting square.
- Friendly occupancy blocks landing on unprotected cells.
- Pieces may pass occupied cells.
- A player may pass any stored throw, matching Falkener's statement that a player is not obliged to play a throw.
- The current release offers a two-player queue even though the historical rules allow two to four players.

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
