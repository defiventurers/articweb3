# Sige

## Heritage ruleset

- Product: Sige
- Traditional names: Siga / Sige
- Ruleset ID: `sige / sige-parker-1909-1.0.0`
- Source: H. Parker, *Ancient Ceylon* (1909), pp. 607–608
- Location recorded by Parker: Colombo
- Players: two
- Engine: compact cowrie race

This game is the Colombo race game described by Parker as “The Indian Siga.” It is unrelated to the Arabian and African enclosure or jump-capture games that share the name Siga.

## Board and equipment

- 5×5 square board
- Two counters per player
- Four cowrie shells
- The middle square of each edge and the centre are crossed protected squares

Aurora begins at the north crossed square. Ember begins at the opposite south crossed square.

## Cowrie table

- one mouth up = 1
- two mouths up = 2
- three mouths up = 3
- four mouths up = 4
- no mouths up = 8

A throw of 1 or 8 grants another throw after the move is resolved. Capturing an opponent also grants another throw.

## Entry

A counter does not enter until its player throws 1. The 1 places that counter on the player’s crossed starting Katti. The counter does not advance beyond the Katti on that entry throw.

A later 1 may place the second counter on the same starting Katti.

A captured counter returns home and must obtain another 1 before re-entering.

## Route

Each route contains all 25 cells exactly once:

1. enter on the player’s crossed edge Katti;
2. travel anticlockwise around the outer border;
3. from the square immediately before the starting Katti, turn into the inner ring;
4. travel clockwise around the inner ring;
5. finish in the protected central Tachi.

The Ember route is the exact 180-degree rotation of the Aurora route.

## Movement and capture

Every ordinary throw moves one counter by the whole value. Throws are not accumulated or divided during normal movement.

An exact landing on an opponent in an unprotected room sends that counter home. Crossed edge Katti squares and the centre cannot be attacked.

Passing over occupied rooms is allowed; only the destination is resolved.

## Exact centre and Parker’s division exception

The central Tachi requires an exact score.

Only when approaching the centre may one throw be divided between both counters. The two allocated amounts must exactly equal the throw and each allocation must finish its counter in the centre.

Example: if one counter needs 1 and the other needs 7, an 8 may be divided to finish both.

## Victory

The first player to finish both counters in the centre wins.

## Declared digital occupancy policies

Parker explicitly permits both friendly counters to occupy the starting Katti and states that protected squares cannot be attacked. The source does not completely specify all other simultaneous-occupancy cases, so this version declares:

- up to two friendly counters may share a protected Katti;
- opposing counters may coexist on a protected square without capture;
- an unprotected room contains only one counter after resolution;
- landing on a friendly counter in an unprotected room is blocked;
- landing on one enemy counter in an unprotected room captures it;
- pieces may pass occupied rooms.

Changing these policies requires a new ruleset version.

## Product modes

- Practice as Aurora
- Practice as Ember
- Local two-player
- Split Centre Drill
- Public online rooms
- Private room codes
- Persistent reconnectable rooms
- Sige-specific match history

## Multiplayer and proof model

- server-owned four-cowrie randomness;
- nonce and SHA-256 proof hash for every cast;
- server validation of entry, full-value movement, capture, bonus turns and exact finishing;
- persistent room restore and reconnect;
- ordered audit hash chain;
- final match proof hash.

Wallet identity is used for profiles, room ownership, reconnect and history. It is not described as cryptographic wallet-signature authentication.

## Release boundary

Free play only. No entry fees, wagering, payouts or token rewards.
