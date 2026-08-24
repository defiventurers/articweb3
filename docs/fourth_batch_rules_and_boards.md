# Fourth Batch: Rules and Board References

## Aurora Ganjifa Academy — Mughal Ganjifa

Mughal Ganjifa uses ninety-six circular cards: eight suits of twelve cards. The documented suit signs are Taj, Safed, Samsher, Ghulam, Chang, Surkh, Barat, and Qimash. Taj, Safed, Samsher, and Ghulam are strong suits; the last four are weak. A suit’s Raja and Pradhan head its ranks, with number order descending in strong suits and ascending in weak suits. The current Academy model preserves the eight-suit deck, twelve-card suit structure, suit-following trick play, and no permanent trump. Its rebuild should replace text-only card symbols with a tactile, historically inspired round-card treatment while leaving the teaching baseline clear about its simplified winner scoring.

References: [Ashmolean Museum on Persian and Indian cards](https://blogs.ashmolean.org/easternart/2017/11/02/persian-and-indian-playing-cards/index.html), [Christie’s Mughal Ganjifa description](https://www.christies.com/en/lot/lot-4740522), [MAP Academy overview](https://imp-art.org/articles/ganjifa/).

## Aurora Vulture — Kaooa

Kaooa is an Indian hunt game played on a pentagram-like five-point star. Seven crows deploy one at a time on open intersections, while one vulture enters an open point and moves along the printed star lines. The vulture captures by jumping an adjacent crow to the empty point beyond; capture is not compulsory and the standard victory target is four crows. The crows win by immobilising the vulture. The current source-of-truth graph uses five outer and five crossing intersections along the pentagram and matches the seven-crow opening, one-vulture entry, straight-jump capture, and four-crow win target.

References: [What Do We Do All Day — Kaooa](https://www.whatdowedoallday.com/kaooa/), [Board and Pieces — Vultures & Crows](https://sites.google.com/site/boardandpieces/list-of-games/vultures--crows).

## Fishflow — Pallanguzhi

Pallanguzhi is a South Indian two-row sowing game. A common Tamil Nadu form uses two rows of seven pits, six seeds in each pit, and a counterclockwise route. A turn begins from a non-empty pit on the active player’s side; when the hand empties in a pit with seeds, those seeds are picked up to relay onward. A turn ends when the next pit is empty and seeds in the following pit are collected. A special capture occurs when a pit reaches exactly four. At the end of a round, players refill their own pits with six seeds while excess is retained and unaffordable pits are blocked. The existing Fishflow model captures the documented board, opening, route, relays, exact-four collection, and refill/blocked-pit loop.

Reference: [Impart Encyclopedia — Pallanguzhi](https://imp-art.org/articles/pallanguzhi/).

## Khasi Fishflow — Mawkar Katiya

Mawkar Katiya is a Khasi two-row sowing game recorded by Das Gupta in 1923. The source describes two rows of seven shallow pits, five stones per pit, and clockwise sowing. After the final stone is sown, the next pit is picked up to continue when non-empty; when that next pit is empty, the pit opposite the empty pit is captured. The next round refills five stones per pit from the left, leaves excess to the leading player’s credit, and leaves unaffordable pits out of play, with source-specific conditional captures and blocked holes. The existing model accurately implements the first-round topology, opening count, direction, relay, opposite capture, basic rebalancing, and explicitly labels its handicap as a modern unranked simplification rather than heritage law.

References: [Ludii Mawkar Katiya record](https://ludii.games/details.php?keyword=Mawkar%20katiya), [Ludii evidence text](https://ludii.games/data.php?gameId=415).

The fourth-batch visual changes compiled cleanly and the full serial smoke suite passed all twenty-two current scenarios. The Ganjifa table now differentiates all eight documented suits through round-card medallion treatments; Kaooa uses non-lettered vulture and crow silhouettes; Pallanguzhi and Mawkar Katiya use physical seed-chip treatments rather than glyph counters. These visual changes preserve the already verified game logic and accessible controls.
