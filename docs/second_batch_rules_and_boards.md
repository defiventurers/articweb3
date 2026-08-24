# Second Batch: Rules and Board References

## Glacier Trail — Pancha Keliya

Pancha Keliya is a Sri Lankan single-track race game documented by Henry Parker in 1909. Its board begins with nine squares along the bottom row, then rises from the central base square into a twenty-five-space narrow track that turns every five spaces: vertically, right, vertically, diagonally up-left, then diagonally down-left. The square before each turn is a marked safe house, giving five houses of safety; the terminal is Kenda-ge. Two sides use three counters each. Six weighted cowries give values from zero to six; 6, 5, and 1 give an extra throw and admit a counter to the board. A complete throw applies to one counter and cannot be subdivided; an opponent’s counter is sent back only when landed upon in an unmarked room. To leave the final Kenda-ge, a counter must throw exactly one more than its remaining count. The existing Glacier Trail implementation already reflects the nine-base-square and twenty-five-track structure, six cowries, three counters per side, safe turns, stored complete throws, and exact ending.

References: [Ludii evidence record](https://ludii.games/data.php?gameId=180), [Penn Museum Pancha Keliya board](https://collections.penn.museum/collections/object/293130).

Local visual verification confirms that Glacier Trail renders the full nine-space base, five-bend twenty-five-space route, five marked houses, Kenda-ge terminal, six cowries, and both sides’ newly integrated Aurora and Ember runner stickers in a playable local match.

## Crown Run — Dadu

Dadu is a Dawoodi Bohra team race game recorded through community interviews. Its board is a single track comprising seven perpendicular segments of six squares; the first and sixth square of every segment is marked safe. Two teams each have one king and eight standard pieces. Five cowries determine movement, with five mouths-up counting ten; 1 and 10 grant another throw. A 1 is required to enter a piece, and a team must first obtain a 1 before moving. After all throws, the results are assigned whole to pieces in legal order. Same-team pieces may share a square; landing on opponents hits one piece, while a hit king resets the team’s unexited pieces (and a king-versus-king hit also resets exited pieces). No piece may enter the opponent’s home row until its team has hit an opponent. The existing Crown Run model already covers the seven-by-six track, safe marks, nine-piece team, entry requirement, storage-and-allocation throws, hit/reset behavior, and home-row restriction. Its redesign should prioritise the cloth-board topology and distinct king/regular-piece stickers.

References: [Ludii Dadu record](https://ludii.games/details.php?keyword=Dadu), [Schmidt-Madsen, “Discovering Dadu”](https://reference-global.com/article/10.2478/bgs-2024-0004).

Local visual verification confirms that Crown Run preserves its full seven-segment serpentine track, marked safe houses, five-cowrie panel, nine-piece court docks, central exit court, and the visual distinction between the reserved royal fox nakta sticker and regular court-fox kaangi stickers.

## Forty Glacier Guards — Chalis Gutiya

Chalis Gutiya is a forty-piece Indian leaping game documented from Jaunpur, Uttar Pradesh. The board is a square of nine-by-nine intersections. Each side fills the four rows nearest itself plus the adjacent half of the middle row, leaving one central intersection open. Players move one step horizontally or vertically to a vacant adjacent intersection, or jump one adjacent opponent to the empty intersection immediately beyond. Multiple captures are permitted, and the primary historical objective is to capture every opponent. The current implementation’s 81-node orthogonal graph, forty-per-side formation, open centre, and jumping model match the documented baseline. The original rules record multiple capture but do not establish a compulsory-capture requirement, so its optional-capture treatment is retained.

References: [Ludii Challis Ghutia record](https://ludii.games/details.php?keyword=Challis%20Ghutia), [Datta 1939 reference listing](https://mats-winther.github.io/bg/indian_wg.htm).

Local visual verification confirms the nine-by-nine orthogonal rail network, forty guards per side, one empty central point, optional opening capture, and compact Chalis guard sticker tokens. The board retains its touch-safe zoom controls for the dense formation.

## Ice Rings — Pretwa

Pretwa is a Bihar circular war game with nine pieces per side. The standard board has three concentric circles and three diameters, creating six radial directions and nineteen intersections: six on each ring plus a central intersection. The two formations occupy the three adjacent radial lines on opposite sides, leaving the central point empty. Pieces step to adjacent intersections on printed arcs or spokes; captures jump an adjacent opponent to an empty point beyond. A source-accounted ruleset makes captures compulsory and requires continued captures; victory is by taking every opponent. The current nineteen-node three-ring graph, central vacancy, nine-piece formations, compulsory capture, and compulsory continuation reflect this layout.

References: [Cyningstan Pretwa rules](http://www.cyningstan.com/game/117/pretwa), [Bead Game Pretwa setup](https://www.bead.game/games/traditional/pretwa), [Ludii Pretwa record](https://ludii.games/details.php?keyword=Pretwa).

Local visual verification confirms all nineteen intersections, the three concentric rings, three diameters creating six radial directions, the empty centre, nine guards per side, and the preserved compulsory-capture route indicators. The newly reserved Pretwa sticker guard is wired to every occupied node without changing the underlying interaction model.
