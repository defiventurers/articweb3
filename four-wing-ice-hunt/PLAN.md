# Game Plan: Four-Wing Ice Hunt

## Scope Contract

Rebuild the existing game as a dedicated playable experience. Preserve the established menu hierarchy and mode set—Online Multiplayer, Practice as Snow Leopards, Practice as the Colony, Local Two Player, and How to Play—while replacing the old Parker-opening wording and rules content with the standardised Four-Wing Hunt rules. The supplied desktop lobby screen is the ground-truth visual reference.

## Risk Tasks

### 1. Four-Wing graph movement and capture-chain logic
- **Why isolated:** Legal movement depends on an irregular line graph, while leap captures and repeated captures must retain correct turn ownership.
- **Approach:** Define board nodes, line-derived edges, and ordered two-edge jump paths in one rules module. Track a `captureChainFrom` position so a leopard that can continue capturing must do so before the turn changes.
- **Verify:** A penguin cannot move across unconnected points; a leopard can perform a valid single capture; a second valid capture keeps the leopard turn; an illegal landing or occupied landing point is rejected.

### 2. Rules-phase progression
- **Why isolated:** The updated game begins with two leopards and eight penguins on the board, then uses a progressive deployment phase rather than the old first-leopard / safe-cattle opening.
- **Approach:** Start from marked opposite leopard positions and the eight central penguin positions. Keep sixteen penguins in reserve. Alternate a colony deployment turn with a leopard turn until all reserves enter, then start ordinary colony movement.
- **Verify:** Initial counts are 2 leopards, 8 colonisers, and 16 in reserve; colonisers cannot make ordinary moves during deployment; turn prompts use the revised terminology and phase names.

## Main Build

Build a React/SVG strategy board that retains the existing game’s clear, interaction-first presentation. A compact menu screen matches the supplied dark Arctic-navy reference, including the original action layout, mint eyebrow, pale serif title, cyan primary action, and gold-edged rules note. The How to Play view becomes the primary documentation change and must explain the complete new standard rule set in plain language.

Practice modes use a compact deterministic client-side bot. Local Two Player supports turn-taking on one device. Online Multiplayer retains its lobby and room-code flow through local browser-room synchronisation so the front-end remains fully testable without adding server scope.

- **Assets needed:** Arctic interface texture, four-wing board texture, snow-leopard token, penguin-coloniser token, and a four-wing crest.
- **Verify:**
  - The five menu features are present and usable.
  - The How to Play section contains the 2/24 pieces, 8 + 16 setup, progressive deployment, connected-line movement, continuing capture-chain, 12-or-more leopard win, and both-leopards-immobilised colony win rules.
  - Game clicks highlight legal origins and destinations and reject illegal actions.
  - Practice bot responds after a human action.
  - The board visibly preserves four symmetric wings and a central line lattice.
  - The supplied lobby styling remains recognisable: deep navy, cyan outlines, mint primary action, large pale serif title, and gold-edged note.
  - No console errors and no missing generated-asset URLs in browser capture.
  - Screenshot verification demonstrates the menu, the revised rules panel, and active gameplay.
