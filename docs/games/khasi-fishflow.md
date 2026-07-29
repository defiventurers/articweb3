# Khasi Fishflow — Mawkar Katiya

Ruleset: `mawkar-katiya-das-gupta-1923-1.0.0`

Source baseline: H. C. Das Gupta, “Notes on a Type of Sedentary Game Prevalent in Many Parts of India,” *Journal and Proceedings of the Asiatic Society of Bengal* 19 (1923), pp. 71–74. Recorded among Khasi players at Cherrapunji.

## Core rules

- Two rows of seven pits.
- Five counters in every pit at the start.
- A player chooses an active non-empty pit on their own row.
- Sowing follows the fourteen-pit clockwise circuit.
- When the hand empties, the player lifts the counters from the immediately following occupied pit and continues.
- If that following pit is empty, the player captures the counters in the opposite pit.
- A round ends when one side of the board is empty.

## Refill and handicap round

Captured stock refills pits with five counters from the player’s left. A player who cannot fill all seven pits leaves later pits inactive. A remainder below five becomes a restricted partial pit.

This implementation includes the recorded handicap structure:

- each player records their round remainder;
- during the opponent’s move, a pit reaching that recorded number is captured for the handicap owner;
- the player who filled the complete row removes one counter whenever their sowing enters the opponent’s partial pit;
- the partial pit cannot be selected as the opponent’s starting pit.

The handicap system is surfaced in the UI instead of hidden behind automatic scoring.

## Product scope

- practice against a deterministic bot;
- local two-player;
- handicap-round drill;
- responsive two-row board;
- free play only.

Authoritative network rooms are not included in this first PR. They should use a dedicated `kf_*` namespace and server-side relay resolution before competitive release.
