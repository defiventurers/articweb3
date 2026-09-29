# San You Qi — Final Movement Graph

This is the authoritative human-readable record of the current Arctic Dominion Sanyou Qi movement graph.

The current board has **156 playable intersections**:

- 135 coloured arm points;
- 21 surviving central points: `C1-C18, C20, C22, C24`.

`C19`, `C21`, and `C23` have been deleted.

## Main continuation lines

### Red ↔ Blue

1. Red L1 ↔ Blue L9  
`Red L1-1 → ... → L1-5 → Blue L9-5 → ... → L9-1`

2. Red L2 ↔ Blue L8  
`Red L2-1 → ... → L2-5 → C1 → Blue L8-5 → ... → L8-1`

3. Red L3 ↔ Blue L7  
`Red L3-1 → ... → L3-5 → C2 → C18 → Blue L7-5 → ... → L7-1`

4. Red L4 ↔ Blue L6  
`Red L4-1 → ... → L4-5 → C3 → C17 → Blue L6-5 → ... → L6-1`

The old `C3 → C19 → C17` route is replaced by the direct `C3 ↔ C17` connection.

5. Red L5 ↔ Blue L5  
`Red L5-1 → ... → L5-5 → C4 → C20 → C24 → C16 → Blue L5-5 → ... → L5-1`

### Red ↔ Green

6. Red L5 ↔ Green L5  
`Red L5-1 → ... → L5-5 → C4 → C20 → C22 → C10 → Green L5-5 → ... → L5-1`

7. Red L6 ↔ Green L4  
`Red L6-1 → ... → L6-5 → C5 → C9 → Green L4-5 → ... → L4-1`

The old `C5 → C21 → C9` route is replaced by the direct `C5 ↔ C9` connection.

8. Red L7 ↔ Green L3  
`Red L7-1 → ... → L7-5 → C6 → C8 → Green L3-5 → ... → L3-1`

9. Red L8 ↔ Green L2  
`Red L8-1 → ... → L8-5 → C7 → Green L2-5 → ... → L2-1`

10. Red L9 ↔ Green L1  
`Red L9-1 → ... → L9-5 → Green L1-5 → ... → L1-1`

### Blue ↔ Green

11. Blue L5 ↔ Green L5  
`Blue L5-1 → ... → L5-5 → C16 → C24 → C22 → C10 → Green L5-5 → ... → L5-1`

12. Blue L4 ↔ Green L6  
`Blue L4-1 → ... → L4-5 → C15 → C11 → Green L6-5 → ... → L6-1`

The old `C15 → C23 → C11` route is replaced by the direct `C15 ↔ C11` connection.

13. Blue L3 ↔ Green L7  
`Blue L3-1 → ... → L3-5 → C14 → C12 → Green L7-5 → ... → L7-1`

14. Blue L2 ↔ Green L8  
`Blue L2-1 → ... → L2-5 → C13 → Green L8-5 → ... → L8-1`

15. Blue L1 ↔ Green L9  
`Blue L1-1 → ... → L1-5 → Green L9-5 → ... → L9-1`

## Central horizontal lines

Only three horizontal C-lines remain:

- H1: `C1 ↔ C2 ↔ C3 ↔ C4 ↔ C5 ↔ C6 ↔ C7`
- H2: `C13 ↔ C14 ↔ C15 ↔ C16 ↔ C17 ↔ C18 ↔ C1`
- H3: `C7 ↔ C8 ↔ C9 ↔ C10 ↔ C11 ↔ C12 ↔ C13`

H4, H5 and H6 are deleted.

`C20`, `C22`, and `C24` are each the only point in their horizontal row. They do not receive sideways movement merely from visual proximity.

Their explicit continuation connections are:

- `C4 ↔ C20`
- `C20 ↔ C22`
- `C20 ↔ C24`
- `C24 ↔ C22`

## Terrain

### Extended Sea / river crossings

The new through-Sea links are:

- `C3 ↔ C17`
- `C5 ↔ C9`
- `C15 ↔ C11`

On these three links:

- Cannon: allowed;
- Chariot: blocked;
- Horse: blocked from using the Sea-crossing edge in either direction.

The inner continuation edges `C4-C20`, `C20-C22`, `C20-C24`, and `C24-C22` are part of the Sea network and are legal Cannon crossings.

### Mountain crossings

Cannon may not pass directly through:

- `C2 ↔ C18`
- `C6 ↔ C8`
- `C14 ↔ C12`

The Cannon routes around the Mountain via the extended Sea are:

- Red L4 ↔ `C3 ↔ C17` ↔ Blue L6
- Red L6 ↔ `C5 ↔ C9` ↔ Green L4
- Blue L4 ↔ `C15 ↔ C11` ↔ Green L6

### Fort / City groups

Fort RB:
- Red L1-5
- Red L2-5
- C1
- Blue L8-5
- Blue L9-5

Fort BG:
- Blue L1-5
- Blue L2-5
- C13
- Green L8-5
- Green L9-5

Fort RG:
- Red L8-5
- Red L9-5
- C7
- Green L1-5
- Green L2-5

Cannon may enter and stop on `C1`, `C7`, or `C13` from its own kingdom side, but it may not continue through the Fort into the opposite kingdom.

The direct outer Fort links are Cannon-blocked:

- Red L1-5 ↔ Blue L9-5
- Red L9-5 ↔ Green L1-5
- Blue L1-5 ↔ Green L9-5

## Enemy-territory C-points

The river extension does **not** change the enemy status of surviving points. Deleted points are removed from the sets.

### Red enemy
`C8 C9 C10 C11 C12 C13 C14 C15 C16 C17 C18 C22 C24`

### Blue enemy
`C2 C3 C4 C5 C6 C7 C8 C9 C10 C11 C12 C20 C22`

### Green enemy
`C1 C2 C3 C4 C5 C6 C14 C15 C16 C17 C18 C20 C24`

Any point on another coloured arm remains enemy territory.

## Explicit Soldier check

Blue Soldier on `C24` has forward choices:

- `C24 → C20`
- `C24 → C22`

The previous Red Soldier-on-C19 special case no longer exists because C19 has been deleted.

## Implementation rule

The board is an explicit graph. Nearby points are not automatically connected. Movement legality is determined by the arm lines, continuation lines, H1-H3, piece geometry, terrain restrictions, faction-oriented forward direction, promotion state, blockers and capture rules.

The exact C-point graph is the Arctic Dominion reconstruction and is not presented as a verbatim Qing-era node specification.
