# First Batch: Rules and Board References

## Break the Ice — Panchi

The source game is Panchi, a two-player single-track race game using five counters per player and five cowries. Its board is a shared central stem joined to a square loop, with two player-specific entry points. A counter may enter on one mouth-up, and throws of one, five, and no mouths up grant an extra turn. The original rules require at least one capture before a player can enter the inner finishing stem; marked route squares are safe and can host more than one counter. The existing implementation needs a route-and-safe-space audit because it currently treats the board as a rectangular loop plus a lower tail and uses seven cowries.

Visual audit of the original Figures 1–3 confirms a one-line-wide square loop, two opposing lower entry squares labelled A and B, and one central vertical inner stem that connects through D and terminates at L. The displayed routes are A → C → D → E → F → G → H → I → J → K → D → L for Player A and B → C → D → K → J → I → H → G → F → E → D → L for Player B. The diagrams place each player’s five counters in a home below the board and show five cowries; the original throw table uses 1–5 mouths-up and treats 0 as a ten-step bonus throw.

Reference: [The Indian Spirit, Panchi Rules PDF](https://theindianspirit.com/wp-content/uploads/2021/04/Panchi.pdf).

Local visual verification confirms that the revised Panchi cover now displays five cowries and its source-rule entry condition, the playable board retains the complete lower approach, shared stem, square circuit, and inner exit route, and both home docks render the new blue and coral penguin sticker runners.

## Ice Hunters — Bagh-Chal

Bagh-Chal is a Nepali hunt game on twenty-five intersections of an orthogonal-and-diagonal five-by-five line graph. Four tigers begin on the corners. Goats place one at a time until all twenty are deployed, then move one step on printed lines. Tigers move one step or jump one adjacent goat to the empty point immediately beyond; five captures win for the tigers, while immobilising every tiger wins for the goats. The current implementation already matches the standard starting count, core graph, deployment, and capture target; work should focus on source-accurate rail visibility and replacing CSS animals with cohesive sticker pieces.

References: [Baghchal.net rules](https://www.baghchal.net/rules), [UC Berkeley GamesCrafters](https://gamescrafters.berkeley.edu/games.php?game=baghchal).

Local visual verification confirms that Ice Hunters presents all twenty-five playable intersections, the complete orthogonal-and-diagonal Bagh-Chal rail graph, four hunters occupying the source-correct corners, and the preserved colony-deployment flow. The rendered hunter tokens use the new sticker asset URL; image generation is asynchronous, so the final asset will replace its reserved placeholder automatically.

## Sixteen Ice Warriors — Hewakam Keliya / Solah Guttiya

Hewakam Keliya, documented by Henry Parker in 1909 and also known as Solah Guttiya or Sixteen Soldiers, uses sixteen soldiers per side on a thirty-seven-point alquerque grid with top and bottom triangular appendages. Each player occupies their two nearest grid ranks and adjacent triangle at setup, leaving the central transverse row clear. Pieces step along any drawn line; captures are short jumps over an adjacent opposing piece to an empty point beyond, and multi-jump turns are permitted but capture remains optional in Parker’s record. Capturing every opposing soldier wins. The implementation’s opening formation and basic topology closely match this record, but it needs board-line validation and physical, non-lettered sticker soldier pieces.

References: [Ludii evidence record](https://ludii.games/data.php?gameId=36), [Sholo Guti board and rules](https://alignitgames.com/games/sholo-guti.html).

Local visual verification confirms the full 37-node extended-alquerque board, two complete opposing 16-soldier formations, and the source-correct empty central row. The rail layer has been strengthened so its printed lines stay visible beneath the deferred-load sticker assets.

## Ruma Ice Puzzle — Tchuka Ruma

Tchuka Ruma is a solitary relay-sowing puzzle on a single row of ordinary pits plus a terminal Ruma store. A teaching configuration uses four ordinary pits containing two counters each and an empty Ruma. Choose a non-empty pit and sow toward the store. If the final counter lands in Ruma, select another non-empty pit; if it lands in an occupied ordinary pit, collect and continue sowing; if it lands in an empty ordinary pit, the puzzle fails. The objective is to move all counters into Ruma. The implementation’s four-pit teaching state and relay logic match this structure; the rebuild should replace glyph fish with sticker counters and make the one-row physical board legible.

References: [What Do We Do All Day, Tchuka Ruma](https://www.whatdowedoallday.com/tchuka-ruma/), [DIY Puzzles reference](https://diypuzzles.wordpress.com/2015/02/12/tchuka-ruma/).

Local visual verification confirms the teaching puzzle’s four equal ordinary pits, rightward relay direction, terminal Ruma store, two counters per pit, and preserved hint, undo, restart, and modern challenge controls. The fish counters now use their generated sticker URL; the reserved asset will automatically replace its generation placeholder when available.
