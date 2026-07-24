# Fishflow

## Deployed ruleset

- **Game ID:** `fishflow`
- **Ruleset version:** `pallanguzhi-durai-1928-1.0.0`
- **Traditional game:** Pallanguzhi / Pallanguli
- **Region:** Tamil Nadu, India
- **Evidence status:** Complete named historical variant
- **Source basis:** H. G. Durai, “Pallanguli: A South Indian Game,” *Man* 28 (1928), pp. 185–186

Fishflow publishes one named Durai 1928 ruleset. It is not described as a universal blend of every regional Pallanguzhi tradition.

## Heritage rules implemented

- Two players use two rows of seven pits.
- Every pit contains six counters at the start of the first round, for eighty-four counters total.
- Each player controls the row nearest them.
- A turn begins by choosing a non-empty active pit on the player's own side.
- All counters from that pit are sown anticlockwise, one into every following active pit.
- Whenever a pit reaches exactly four during sowing, those four counters are captured immediately. Sowing continues with any counters still in hand.
- If the final counter lands in a non-empty pit, that pit is picked up and relay sowing continues.
- If the final counter lands in an empty pit, the contents of the next active pit are captured and the turn ends.
- When either player has no counters in active pits, the opponent collects every counter remaining on their own side.
- For the next round, each player refills pits from their left with six counters per pit.
- A pit that cannot be completely refilled becomes inactive for that round.
- Surplus counters remain in the player's store.
- The starting player alternates between rounds.
- A player loses when they own fewer than six counters and cannot refill any pit for the next round.

## Engine guarantees

The rules reducer treats one selected pit as one complete atomic turn. It resolves:

1. pickup and anticlockwise sowing;
2. interrupting exact-four captures;
3. every relay pickup;
4. final next-pit capture;
5. round-end sweep;
6. left-to-right refill and inactive-pit calculation;
7. alternating round starter;
8. match victory.

The reducer asserts that all eighty-four counters remain conserved across board pits and player stores after every legal action.

## Product modes

- Practice against a deterministic Frost Current bot.
- Local two-player hotseat.
- Public and private server-authoritative online rooms.
- Reconnectable persisted matches.
- Fishflow-filtered match history with audit and proof hashes.
- Daily Flow, a one-turn modern puzzle generated from valid heritage states.

## Modern digital policy

Daily Flow scoring is a modern practice metric. It rewards captured counters, exact-four pickups, relay depth and round conversion. It does not alter heritage match victory.

Online play is free-play only. Fishflow has no entry lock, wagering, payout or token reward.

Any change to sowing order, exact-four handling, relay stopping, refill direction or victory must create a new ruleset version.
