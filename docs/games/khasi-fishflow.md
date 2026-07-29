# Khasi Fishflow

## Heritage baseline

- Traditional game: Mawkar Katiya
- Ruleset: `mawkar-katiya-das-gupta-1923-1.0.0`
- Community and place: Khasi people, Cherrapunji / Khasi Hills
- Source: H. C. Das Gupta, “Notes on a Type of Sedentary Game Prevalent in Many Parts of India,” *Journal and Proceedings of the Asiatic Society of Bengal* 19 (1923), pp. 71–74
- Comparative summary: H. J. R. Murray, *A History of Board-Games Other Than Chess* (1951), p. 169

## Frozen rules

The board has two rows of seven pits. Every pit begins with five counters. A player chooses a non-empty active pit on their side and sows clockwise.

When the final counter is placed, the contents of the following pit are lifted and sowing continues. When that following pit is empty, the move stops and the contents of the pit opposite the empty stopping pit are captured.

Rounds continue until the shared field is exhausted. Players refill their own row with five counters per pit from the left. Incomplete and empty pits become part of the next-round handicap structure. The release tracks inactive pits, remainder targets and the one-counter tax attached to the opponent’s incomplete pit.

The first player to capture the entire field, or leave the opponent unable to refill an active pit, wins.

## Product modes

- Practice as Aurora
- Practice as Ember
- Local two-player
- Public online rooms
- Private room codes
- Persistent reconnect and match history

Online play uses the isolated `kf_*` message namespace. The server validates the selected pit, complete relay, stopping gap, capture, handicap transitions, round refill and winner.

## Release boundary

This is not Pallanguzhi. It has its own 2×7 opening count, relay trigger, opposite-gap capture and Khasi handicap rules. It remains free play only.
