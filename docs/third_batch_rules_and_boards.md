# Third Batch: Rules and Board References

## Cowrie Kingdoms — Ashta-Kashte

Ashta-Kashte is a nineteenth-century Indian square-board race game documented by Edward Falkener. It uses a seven-by-seven board with five marked safe spaces: the central square and the middle square of each outer edge. Two to four players use four pieces each and four cowries. The score equals mouths upward except all mouths-down scores eight plus a grace; all mouths-up is a grace. Grace throws permit a repeat. Pieces enter through a grace on the nearest marked edge square, travel anticlockwise around the outer edge, then enter each successive inner ring through the left relative corner and move clockwise to the central marked finish by exact throw. An opposing piece is removed when landed upon unless it occupies a marked square, while an opponent may coexist on the active player’s entry square. The existing digital two-seat implementation matches the seven-by-seven spiral, four pieces, four cowries, marked safe spaces, grace throws, exact centre finish, and optional player choice to leave a throw unused.

References: [Ludii Ashta-Kashte record](https://ludii.games/details.php?keyword=Ashta-kashte), [Falkener 1892 source record](https://archive.org/details/gamesancientorie00falkuoft/page/286/mode/2up).

## Polar Tablan — Tablan / Taabla / Tabul Fale

Tablan is a Mysore running-fight game on four rows of twelve squares, with twelve pieces per side occupying opposite home rows at setup. The folded board represents a single route: a player moves across their home row, reverses on the second row, reverses again on the third, then enters the opposing home row where each piece locks. Four sticks score by their plain sides: one scores two, four scores eight, none scores twelve, and two or three score zero; a scoring throw earns another throw. A score may instead be split equally between two pieces. A piece must begin with a score of two; there is no doubling; an enemy cannot be captured on the mover’s own home row but can be captured in central rows or by displacement in the opposing home row. The basic win comparison is the number of pieces locked in the opposing home row when one player finishes all surviving pieces; ordered occupation of that row is an optional variant. The existing model follows these standard rules.

References: [Cyningstan Tablan rules](http://www.cyningstan.com/game/229/tablan), [Bead Game Tablan guide](https://www.bead.game/games/traditional/tablan), [A4 Games Bell-based layout](https://a4gamescompany.wordpress.com/tablan-game-rules-routs-and-layout/).

## Seven Ice Rings — Sat-gol

Sat-gol is documented by H. C. Das Gupta as a seven-pit Indian relay-sowing game from the Gosalpur/Jabalpur tradition. The seven circular pits start with four stones each. A move picks up one non-empty pit and sows anticlockwise; when the hand empties, the next non-empty pit is picked up and sowing continues. When the next pit is empty, the stones in the following pit are captured. The shared seven-pit circle and twenty-eight-stone invariant in the implementation preserve the documented physical board and relay-capture character. The code exposes the Gosalpur forced-next-pit behaviour and an open-choice table variant separately rather than silently mixing them.

Reference: H. C. Das Gupta, *A Few Types of Sedentary Games Prevalent in the Central Provinces* (1924), as cited in the existing ruleset; accessible search results are sparse, so this source attribution is retained explicitly rather than extending uncertain rules.

## Two Stones — Do Guti

Do Guti is a two-player Punjab blockade game documented by Hem Chandra Das Gupta from the Mianwali district (now in Pakistan). Its board is a square with diagonals and one side removed: four corner points and a central intersection connected by the three remaining perimeter sides and the four corner-to-centre diagonals. Each player alternately places two stones on open points, then slides one stone along a printed line to an adjacent open point. There is no capture; the first player to leave the opponent without a legal move wins. The existing five-point graph, two-piece placement phase, and immobilisation win condition exactly reflect the documented game. Digital threefold and move-limit draws remain labelled safeguards rather than historical rules.

References: [Ancient Indian Boardgames Digital Documentation — Do Guti](https://souvikmukherjeeresearch.com/omekas/s/ancientindianboardgames/item/273), [Ludii Do Guti record](https://ludii.games/details.php?keyword=Do%20Guti).

The third-batch asset integration compiled successfully. An initial parallel smoke run produced two unrelated browser-process failures while twenty scenarios passed; both named scenarios then passed in focused serial execution, and the complete serial smoke suite passed all twenty-two scenarios. The sticker URLs remain deliberately wired to the application while their generated transparent assets resolve asynchronously.
