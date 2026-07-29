# Ruma Ice Puzzle

## Heritage ruleset

- Product: Ruma Ice Puzzle
- Traditional game: Tchuka Ruma
- Ruleset: `ruma-ice-puzzle / tchuka-ruma-degrazia-1948-campbell-chavey-1995-1.0.0`
- Source baseline: Peter Degrazia’s 1948 description, as analysed by Paul J. Campbell and Darrah P. Chavey in 1995
- Players: solo
- Engine: solitaire relay sowing

Older accounts describe Tchuka Ruma as an East Indian solitaire game, but this release does not claim a narrower regional origin without stronger evidence.

## Board and opening

The board has four ordinary pits followed by one permanent store called the Ruma.

- Two pebbles begin in each ordinary pit.
- The Ruma begins empty.
- There are eight pebbles total.
- Pebbles deposited in the Ruma are never removed.

## Complete move

1. Choose one non-empty ordinary pit.
2. Lift every pebble from that pit.
3. Sow one pebble into each following pit toward the Ruma.
4. After passing the Ruma, continue from the first ordinary pit.
5. Inspect where the final pebble lands.

### Final pebble in the Ruma

The move ends safely. The player may choose any non-empty ordinary pit for the next move.

### Final pebble in a non-empty ordinary pit

Lift the complete contents of that pit and continue sowing automatically. This can create a long relay chain within one move.

### Final pebble in an empty ordinary pit

The attempt ends immediately in a loss.

## Victory

The puzzle is solved when all eight pebbles are in the Ruma and all four ordinary pits are empty.

## Solver and teaching policy

The classic `2–2–2–2 | 0` position is solved locally in the browser. The guided mode searches the reachable state graph and can identify a starting pit that preserves at least one complete route to the Ruma.

- The solver does not play the puzzle automatically.
- A hint exposes one safe starting pit only.
- Repeated states are treated as non-winning routes.
- The Last Pebble Drill demonstrates the terminal `0–0–0–1 | 7` move.

## Product modes

- Guided Classic
- Classic Puzzle
- Last Pebble Drill
- Local best-move count

Ruma Ice Puzzle is intentionally local-only. A solo deterministic puzzle gains no product value from wallet login, matchmaking, escrow or server persistence.

## Release boundary

No blockchain transaction, wallet requirement, entry fee, wagering, payout or token reward is used. Future puzzle packs or cosmetic boards may use wallet identity, but the core heritage puzzle remains immediately playable without onboarding friction.
