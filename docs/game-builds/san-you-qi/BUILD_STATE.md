# San You Qi Build State

## Current checkpoint

Current ruleset:

`arctic-final-156-node-3.3.0`

The board now uses the latest user-supplied coordinates and the revised 21-point central topology.

## Applied in this checkpoint

- Updated all 135 Red/Green/Blue normalized coordinates from the latest placement export.
- Updated surviving central coordinates.
- Deleted C19, C21 and C23.
- Reduced the board from 159 to 156 playable intersections.
- Deleted H4, H5 and H6; kept H1, H2 and H3.
- Replaced C3-C19-C17 with C3-C17.
- Replaced C5-C21-C9 with C5-C9.
- Replaced C15-C23-C11 with C15-C11.
- Kept C20, C22 and C24 as continuation-only points with no horizontal-row neighbors.
- Preserved C4-C20, C20-C22, C20-C24 and C24-C22.
- Preserved enemy-territory status for every surviving C-point.
- Removed the obsolete Red Soldier-on-C19 case.
- Kept Blue Soldier C24 → C20/C22.
- Applied revised Fort, Mountain and extended-Sea movement restrictions.
- Corrected Horse Sea logic: only the first orthogonal leg is blocked by the extended river; Red L4-5 → C18 is therefore legal when its horse leg is clear.
- Locked promoted Soldier behavior to forward + sideways, never sideways-only.
- Locked Cannon rank movement and both Blue L5 central branches in regression tests.
- Corrected Flag after leaving home to Chariot-like unlimited orthogonal movement with no return to its original kingdom.
- Added check interruption: a checked kingdom responds immediately, then the interrupted normal turn resumes.
- Third-party discovered mate is credited to the faction whose piece actually gives the check, not automatically to the player whose move uncovered it.
- Added the six compressed central Horse jumps: Red L4-5/L6-5 ↔ C20; Green L4-5/L6-5 ↔ C22; Blue L4-5/L6-5 ↔ C24.
- Restored flying-General legality on approved continuation lines. Cannon geometry still includes sideways/branch routes, but those moves are correctly filtered when the Cannon is the only blocker shielding its General.
- Added canonical central camp territory: Red C2-C6/C20; Green C8-C12/C22; Blue C14-C18/C24; shared gates C1 Red+Blue, C7 Red+Green, C13 Green+Blue.
- Shared gates do not trigger promotion/Flag departure for an owning camp.
- A crossed Flag may return to its own shared gate, but cannot continue from that gate into exclusive home territory.
- Updated unit tests, smoke text, rulebook copy, catalogue text and placement-tool defaults.

## Terrain checkpoint

Extended-Sea edges that block Chariot, allow Cannon, and block Horse only when used as its first orthogonal leg:

- C3-C17
- C5-C9
- C15-C11

Mountain crossings that block Cannon:

- C2-C18
- C6-C8
- C14-C12

Fort boundary stopping points:

- C1 (Red/Blue)
- C7 (Red/Green)
- C13 (Blue/Green)

Cannon may stop on the boundary point from its own side but may not continue through into the opposite kingdom. The three direct outer Fort crossings are Cannon-blocked.

## Current gameplay phase

Local 1/2/3-player modes, Easy/Medium/Hard bots, online rooms, reconnect/bot coverage, and the Sanguo-style tactical battle screen are implemented.

The current QA focus is movement correctness, check interruption, terrain edge cases, bot regression and online server-engine parity.
