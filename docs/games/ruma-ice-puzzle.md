# Ruma Ice Puzzle

## Ruleset

- Product: Ruma Ice Puzzle
- Traditional name in later literature: Tchuka Ruma
- Ruleset: `ruma-ice-puzzle / tchuka-ruma-modern-solitaire-1.0.0`
- Players: one
- Engine: solitaire relay sowing
- Opening selected for this queue: four ordinary pits containing 2–2–2–2 counters and an empty Ruma

## Board

Four ordinary pits lead rightward into one permanent store called the Ruma. Eight counters remain conserved throughout the puzzle.

The sowing route is:

`Pit 1 → Pit 2 → Pit 3 → Pit 4 → Ruma → Pit 1`

Counters placed in the Ruma never leave it.

## Complete choice

1. Choose one non-empty ordinary pit.
2. Lift every counter from that pit.
3. Sow rightward, one counter per following place, including the Ruma.
4. If the final counter lands in an ordinary pit that already contained counters before the drop, lift the whole pit and continue automatically.
5. If the final counter lands in the Ruma, pause and choose any non-empty ordinary pit to continue the attempt.
6. If the final counter lands in an ordinary pit that was empty before the drop, the attempt fails.
7. Win by moving all eight counters into the Ruma.

The rules engine records the pre-drop occupancy, so an ordinary pit containing only the newly landed counter is correctly treated as an empty-pit failure.

## Solver and puzzle aids

The release contains a breadth-first solver over complete post-Ruma states. It powers:

- hints that preserve a winning continuation;
- proof that the 2–2–2–2 opening is solvable;
- a six-choice reference solution;
- daily setups selected from a tested solvable set;
- the one-choice Final Drop Lesson.

The classic reference solution, using one-based pit labels, is:

`Pit 3 → Pit 4 → Pit 3 → Pit 4 → Pit 2 → Pit 4`

Undo, restart, move count, relay count and local best scores are modern interface aids. They do not change the sowing rules.

## Provenance boundary

Tchuka Ruma is well documented as a modern solitaire and is associated with India in later game literature. The secure chain to a specific living Indian community, historical locality or ancient source is disputed.

The product therefore does not describe this exact ruleset as unquestionably ancient or ethnically Indian. It is presented as a documented modern puzzle within the wider South Asian sowing-game research catalog. Stronger provenance claims require stronger primary evidence and a new source note.

## Product modes

- Classic 2–2–2–2 Puzzle
- Daily Ruma Challenge
- Final Drop Lesson
- Solver-backed hints
- Undo and restart
- Local best-move storage

## Release boundary

This is a local solo puzzle. It does not need a multiplayer room, wallet login, escrow, token reward or on-chain move transaction. A future optional completion proof may hash the setup and choice sequence, but no blockchain mechanic is forced into this release.
