# Final Heritage Game Batch — Rules and Board Evidence

This final review covers the two remaining playable catalogue modules: **Sige** and **Sky Temple Run**. The initially listed `sowing` path is a shared `relayEngine.js` utility only; it has no catalogue entry, visual route, or standalone ruleset to rebuild. It is therefore excluded from gameplay changes.

## Sige / Siga (Sri Lanka)

| Aspect | Verified source record | Implementation decision |
| --- | --- | --- |
| Board | A 5×5 board, with the middle square of every outer side and the centre marked with diagonals. | Keep the 25-space square lattice. Mark `c02`, `c24`, `c42`, `c20`, and `c22` as protected X-squares. |
| Equipment | Two counters per player; four cowries. | Preserve two Aurora and two Ember counters plus four tactile cowries. |
| Value and entry | Face-up mouths score 1–4, while none scores 8; a 1 is required to enter. | Preserve the current four-cowrie scorer and entry-on-1 mechanic. |
| Route | Each player begins at the marked square on their own side, travels anti-clockwise around the perimeter, then proceeds clockwise through the inner route to the centre. | Preserve opposing deterministic routes, but draw the board as a complete genuine 5×5 lattice rather than a decorative inferred route. |
| Capture and safe squares | An enemy on an unmarked square is chopped and re-enters on a later 1. Marked squares are safe. | Preserve capture, safe-square, and bonus mechanics. |
| Finish | Centre requires an exact throw; only at the centre may a throw be split between the two counters. | Preserve exact finish and the existing split-finish action. |

> “The middle square of each side and the central square are marked by two diagonals, and when in these positions the counters cannot be attacked.” — H. Parker, *Ancient Ceylon* (1909), pp. 607–608 [1]

## Vimanam / Sky Temple Run (South India)

| Aspect | Verified source record | Implementation decision |
| --- | --- | --- |
| Equipment | Two players, six same-colour coins each, and six cowries. | Preserve twelve pieces and six tactile cowries. |
| Exact player paths | Player 1: `a-c-d-e-f-g-h-i-j-k-l-n-q-r`; Player 2: `b-c-d-k-j-i-h-g-f-e-m-n-o-p`. | Preserve these published paths exactly, including each player’s distinct inner arm and final exit from `r`/`p`. |
| Board form | A tail joins a square outer circuit by a bridge; the bridge continues into the centre and branches into two inner arms. | Render the stated tail, outer circuit, bridge, and two arms with explicit rails, rest squares, and intermediate counting spaces. |
| Entry and scoring | 1 or 5 introduces a coin; 1, 5, 6, and 12 provide another throw; all closed scores 12. | Preserve the current entries, cowrie scoring, and bonus-turn logic. |
| Capture gate | A player must cut an opponent at least once before any of their coins can enter the inner stem. | Preserve the per-player capture licence and clearly expose it in the board legend. |
| Safety and finish | Dark rest squares are safe. A coin must land exactly before bearing off from `r` or `p`; the first player to bear off six wins. | Preserve safe anchors, exact finish, and full-six victory condition. |

> “A player should cut his opponent in order to move his coins into the inner stem of squares … If a player has cut once, all the coins can move into the inner stem.” — Kreeda Kaushalya’s documented Vimanam rules [2]

## References

[1]: https://ludii.games/data.php?gameId=636 "Ludii evidence for Siga (Sri Lanka), quoting H. Parker, Ancient Ceylon (1909), pp. 607–608"
[2]: http://kreedaakaushalya.blogspot.com/2008/06/how-to-play-vimanam.html "Traditional Board Games of India — How to Play Vimanam"
[3]: https://www.bead.game/games/traditional/vimanam "Bead Game — Vimanam"
[4]: https://bharatiyakhel.in/vimanam/ "Bharatiya Khel — Vimanam"
