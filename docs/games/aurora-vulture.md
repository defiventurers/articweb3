# Aurora Vulture

## Release ruleset

- Product: Aurora Vulture
- Traditional game: Kaooa — Vulture and Crows
- Ruleset ID: `aurora-vulture / kaooa-empty-board-single-jump-1.0.0`
- Region: Central Provinces, India
- Players: two
- Pieces: one vulture and seven crows
- Engine: asymmetric pentagram hunt

## Board

The board is a pentagram with ten playable points:

- five outer star points;
- five internal crossings;
- fifteen adjacent graph edges;
- five straight four-point star lines.

Every move follows one printed segment. A vulture jump uses three consecutive points on one straight four-point line: vulture, adjacent crow, empty landing point.

## Setup

This release fixes the commonly documented empty-board sequence:

1. The crow player places one crow on any empty point.
2. The vulture player places the vulture on any remaining point.
3. Crows continue entering one per crow turn until all seven have been deployed.
4. After its initial placement, the vulture may move and capture while crow deployment continues.
5. Only after all seven crows have entered may a crow move.

The empty-board start is a versioned implementation decision because short modern descriptions are clearer about the sequence than the surviving comparative historical summary.

## Movement and capture

- A crow moves to one adjacent empty point.
- The vulture moves to one adjacent empty point.
- The vulture may jump one adjacent crow to the empty point immediately beyond on the same straight star line.
- The jumped crow is removed.
- Capture is optional in this release.
- Multiple capture is not allowed.
- Crows never capture or jump.

## Victory

- The vulture wins immediately after capturing four crows.
- The crows win immediately when the vulture has no adjacent move and no legal jump.

## Declared digital draw policy

- Threefold repetition is a draw.
- Eighty movement plies without a victory is a draw.
- Deployment actions and vulture actions during crow deployment do not count toward the movement-ply limit.

These are digital completion rules, not claims about a historical Kaooa repetition rule. Changing them requires a new ruleset version.

## Product modes

- Practice as Glacier Vulture
- Practice as Aurora Crows
- Local two-player
- Fourth-Crow Strike Drill
- Public online rooms
- Private room codes
- Side selection
- Persistent reconnectable matches
- Game-specific history
- Audit chain and final match proof hash

## Release boundary

Free play only. Wallet identity is used for profile attribution, room ownership, reconnect, history and match proofs. There are no entry fees, wagers, payouts or token rewards.
