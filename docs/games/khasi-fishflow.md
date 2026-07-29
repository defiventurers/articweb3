# Khasi Fishflow

- Traditional game: Mawkar Katiya
- Community/place: Khasi people, Cherrapunji, Meghalaya
- Ruleset: `mawkar-katiya-das-gupta-1923-1.0.0`
- Source baseline: H. C. Das Gupta, 1923; cross-checked against Murray and the Digital Ludeme Project transcription
- Players: two
- Board: two rows of seven pits
- Opening: five stones in every pit, seventy total

## Turn

Choose a non-empty active pit on your row. Sow clockwise through the fourteen-pit circuit. When the hand empties, inspect the immediately following active pit. If it is occupied, lift its contents and continue sowing from the next active pit. If it is empty, stop and capture the contents of the pit directly opposite that empty pit.

## Rounds and inactive pits

At round end each player's captured inventory refills pits from the left with five stones each. Pits that cannot be filled are inactive. A non-zero remainder creates a partially filled pit. A player who cannot refill any playable pit loses the match.

## Handicap transcription

The historical account includes unusual round handicaps. The implementation exposes them instead of hiding them:

- each player's surplus reserve or deficient partial-pit count becomes that player's handicap target;
- during the opponent's turn, a pit made exactly equal to that target is captured for the target owner;
- the player with a surplus reserve siphons one stone whenever their sowing enters the opponent's partial pit;
- the deficient player cannot start a move from that partial pit;
- at round end the stronger player takes stones accumulated in that partial pit.

This mechanism is versioned and isolated from Pallanguzhi. It should receive community review before any ranked or reward-bearing queue.

## Product modes

- Practice as Blue Current
- Practice as Coral Current
- Local two-player
- Handicap Current Drill
- Public/private online rooms
- Persistent reconnect and match history

## Release boundary

Free play only. Wallet profiles provide identity, room ownership and reconnect. Gameplay is server-authoritative, but profile login is not described as wallet-signature authentication.
