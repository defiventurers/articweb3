# Agon — The Queen’s Cold Throne

## 1. Short Summary

This is a playable Arctic Dominion adaptation of **Agon, or the Queen’s Guards**, a deterministic two-player abstract game credited to Anthony Peacock and published in London in 1842. It is not ancient. Its public-domain mechanical core uses 91 hexagonal cells, one Queen and six Guards per side, inward-only progress, custodial “sandwich” displacement, and a seven-piece throne formation.

## 2. Historical Research

- **Confirmed:** Thomas Sherwin published *Agon, or the Queen’s Guards; a New Game of Skill* in 1842. The British Library catalogue preserves the record.
- **Confirmed:** The 1851 Great Exhibition catalogue lists “A. Peacock” of Islington as inventor and exhibitor of an Agon board, pieces, and instructions.
- **Confirmed:** R. K. Philp’s 1852 *Family Pastimes* and an independent 1866 *Fireside Games* text document the core rules used here.
- **Strongly supported:** Agon is widely described as the earliest known published board game played on hexagonal cells. “Earliest known” is used instead of an absolute first-ever claim.
- **Uncertain / rejected for project copy:** Older writing associated Agon with eighteenth-century French game tables. Later archival chronology argues that the Agon-like boards were probably later additions.
- Alternate names include **The Queen’s Guards**, **Queen’s Guard**, and **Royal Guards**.

## 3. Source Reliability Notes

1. [Family Pastimes; or, Homes Made Happy (1852)](https://books.google.com/books?id=sD4CAAAAQAAJ) — near-contemporary, public-domain rules and strategy notes.
2. [Fireside Games for Winter Evening Amusement (1866)](https://upload.wikimedia.org/wikipedia/commons/2/2c/Fireside_games%3B_for_winter_evening_amusement_%28IA_firesidegamesfor00frik%29.pdf) — independent period rules with diagrams and numbered laws.
3. [Great Exhibition catalogue (1851)](https://www.e-rara.ch/download/pdf/22342354.pdf) — primary catalogue evidence naming Peacock as inventor.
4. [Board Game Studies Colloquium XIII proceedings (2010)](https://www.giochidelloca.it/storia/depaulis_12.pdf) — scholarly archival chronology by Edward Copisarow.
5. [Wikimedia Commons Agon setup diagram](https://commons.wikimedia.org/wiki/File:Agon_board_1.svg) — modern CC BY-SA geometry/setup cross-check; not copied as artwork.

Modern commercial art, modern rulebook wording, and modern scans are not shipped in the game. The cover and interface are original.

## 4. Original Board Description

- Regular hexagonal board, six cells per side: 91 cells total.
- Concentric structure: throne 1; rings 1–5 contain 6, 12, 18, 24, and 30 cells.
- Two players; each has one Queen and six Guards.
- No dice or other randomizer.
- All pieces start on the outer ring in a half-turn-symmetric pattern. Queens occupy opposite corners; Guards alternate around the perimeter with empty cells between them and a two-cell gap near the two remaining far corners.
- Pieces step to adjacent cells and may remain on the same ring or enter the next inner ring, never voluntarily move outward.
- Only Queens may occupy the central throne.
- An enemy piece flanked on opposite adjacent sides along one hex axis is displaced and later returned.

## 5. Arctic Dominion Adaptation

- Queen → crowned ruler penguin of the Sapphire or Coral Court.
- Guard → diamond-marked Warden penguin.
- Throne → glowing Crown Crystal.
- Hex rings → alternating bands of pressure ice over a frozen sea.
- Capture → non-violent “displacement” into a visible return dock.
- Palette → midnight navy, glacier cyan, sapphire, coral rose, and restrained antique gold.
- Phone layout puts the board first; desktop uses command, board, and court rails.

## 6. Final Playable Rules

1. Sapphire moves first; turns alternate.
2. On a normal turn, move one Queen or Guard exactly one adjacent hex that is empty.
3. The destination must be on the same ring or one ring closer to the throne. No jumping or voluntary outward movement is allowed.
4. Only a Queen may enter the throne.
5. A piece may not voluntarily move or return directly between two opposing pieces on opposite adjacent sides.
6. After a move or return, every adjacent opponent flanked between the moved piece and another friendly piece on the same straight hex axis is displaced.
7. A displaced Guard must be returned to any safe vacant outer-ring cell on its owner’s next turn. A displaced Queen may be returned to any safe vacant cell. The return consumes the turn.
8. When several pieces await return, the Queen returns first. Guards may return in any order, one on each applicable turn.
9. Returning a piece is treated as a full move and can itself create a displacement.
10. Win immediately when your Queen occupies the throne and all six of your Guards occupy its six neighboring cells.
11. Lose immediately if your six Guards close around an empty throne while your Queen is elsewhere.
12. Modern digital completion policy: no legal action is a blockade loss; threefold repetition or 160 plies without capture is a draw.

## 7. Rule Variants And Chosen Version

- **Chosen default — owner choice:** Near-contemporary sources let the owner place a displaced Queen on a vacant board cell.
- **Optional — rival’s decree:** A 1975 compilation has the opponent choose the Queen’s return cell. This is an explicit toggle.
- **Documented alternative opening:** Period sources allow players to place pieces alternately instead of using the fixed setup. It is documented but omitted from v1 to keep onboarding and bot evaluation consistent.
- **Modern band-return variant:** Some later versions return a piece only to the next outer band. It is not used.

## 8. Game Logic Specification

- Board cells use axial coordinates `{q,r}` within radius 5. Ring distance is `max(abs(q), abs(r), abs(q+r))`.
- A piece is `{id, side, kind, cell, status}`. `cell: null` plus `status: "relocating"` means off-board pending return.
- State holds `currentPlayer`, computed `actingSide`, `pendingRelocations`, `variant`, `turn`, `ply`, `noProgressPly`, `winner`, `winReason`, `history`, and `repetitions`.
- Legal move generation checks six axial neighbors, occupancy, non-increasing ring distance, Queen-only throne access, and simulated self-sandwich.
- Capture detection tests all six rays from the destination for adjacent enemy plus friendly support one cell farther. Multiple captures resolve simultaneously.
- The pending queue is Queen-prioritized. It persists across alternating turns, so each return consumes exactly one owner turn.
- Outcome checks run after every action: royal formation, empty-throne forfeit, repetition, no-progress limit, and next-side mobility.
- Undo uses immutable state snapshots; reset and variant/mode changes create a fresh fixed setup.
- The practice bot is deterministic and one ply deep. It favors inward progress, formation completion, and multiple displacement. It is not claimed to solve Agon.

## 9. UI/UX Plan For Phone And PC

- The first screen is **Play**, not a marketing cover.
- Persistent tabs: Play, Rulebook, Research Notes.
- Desktop: command rail, large central board, two court cards, and return dock.
- Phone: board and turn banner first, then controls, court status, and return dock.
- Pieces use large touch targets, crown/diamond role symbols, glow selection, and distinct destination dots.
- Current-player and rival-decree states are announced in text, not color alone.
- Undo, Restart, Rules, play mode, and Queen-return variant are always reachable.

## 10. Art Direction

The board is code-drawn translucent ice, keeping all 91 cells crisp at any resolution. Pudgy penguin pieces reuse the project’s durable inline character language while adding Queen and Guard markers. The rulebook is a pale frozen-scroll panel with icy rollers rather than copied parchment. Suggested motion is limited to short selection glow, placement settle, and aurora shimmer; reduced-motion users receive static states. Suggested audio reuses soft UI taps, ice chimes, and a gentle displacement gust, with global mute respected.

## 11. Test Cases

- Board topology yields ring counts `1, 6, 12, 18, 24, 30` and 91 unique cells.
- Fixed setup has 14 unique pieces, six Guards per side, and opposite Queens.
- All normal moves are adjacent and never outward; Guards never enter the throne.
- A voluntary self-sandwich is rejected.
- A valid sandwich removes the enemy Guard to the queue and forces an outer-ring return.
- Captured Queen takes priority over captured Guards.
- Rival’s decree changes the acting side without changing turn ownership.
- Queen plus six surrounding Guards wins.
- Route smoke test verifies 91 rendered cells, a legal move advancing the turn, both documentation tabs, and no phone-width overflow.

## 12. Improvements Applied

- Corrected the project framing from “ancient” to documented Victorian heritage.
- Replaced destructive “capture” language in the theme with visible, mechanically exact displacement.
- Made multi-capture priority explicit and testable.
- Added a return dock so off-board state is never hidden.
- Added labeled digital stalemate/draw policies instead of silently inventing historical rules.
- Separated the later opponent-choice Queen rule into an optional selector.
- Reserved screen space for existing network/audio chrome on phones and desktops.
- Used code-native board geometry instead of copying a modern diagram.

## 13. Remaining Uncertainties

Surviving rules do not fully standardize who chooses a Queen’s return destination, whether a return placement can itself displace another piece, or formal draw/stalemate handling. The implementation chooses owner-choice by default, treats a return as a complete move, and labels all completion safeguards as modern. The alternative free-placement opening remains a documented candidate for a future variant.
