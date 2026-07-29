# Ruma Ice Puzzle

**Heritage name:** Tchuka Ruma  
**Players:** Solo  
**Engine:** Solitaire relay sowing  
**Ruleset ID:** `tchuka-ruma-teaching-1.0.0`  
**Release mode:** Free solo puzzle

## Core rules

- Four ordinary pits and one Ruma store.
- Eight counters in the selected teaching setup.
- Choose a non-empty ordinary pit and sow rightward.
- Include the Ruma in the route, then wrap to pit one.
- If the final counter lands in an occupied ordinary pit, pick up that pit and continue relay sowing.
- If the final counter lands in the Ruma, pause safely and choose another non-empty ordinary pit.
- If the final counter lands in an ordinary pit that was empty before landing, the attempt fails.
- The Ruma is never used as a source pit.
- Win by moving all eight counters into the Ruma.

## Published puzzle set

| Puzzle | Opening | Par | Status |
| --- | --- | ---: | --- |
| Teaching Current | 2-2-2-2 | 6 | Selected teaching setup |
| Broken Floe | 3-2-2-1 | 7 | Declared modern challenge |
| Deep Freeze | 4-2-2-0 | 8 | Declared modern challenge |

Every published setup is verified by the built-in breadth-first solver. The displayed par is the shortest known decision path under the deployed ruleset.

## Product features

- Dedicated cover, puzzle menu, rules screen and game screen.
- Automatic relay resolution.
- Deterministic failure and victory states.
- Undo and restart.
- Solver-backed hints.
- Par scoring and local best-score persistence.
- Ruma progress meter and decision history.
- Responsive arctic board presentation.
- Node rule tests and a Playwright smoke that completes the teaching setup.

Undo, hints, par scores, local best scores and the uneven challenge openings are modern puzzle tools. They do not claim to be historical play customs.

## Provenance boundary

The relay-sowing rules are well documented in later puzzle literature, but the exact Indian living-tradition provenance is disputed. This product must not market Tchuka Ruma as unquestionably ancient or attach it to a specific community without stronger evidence.
