# Glacier Trail

## Ruleset

- Game ID: `glacier-trail`
- Ruleset version: `pancha-keliya-parker-1909-1.0.0`
- Heritage name: Pancha Keliya, “The Five Game”
- Region: Sri Lanka
- Source baseline: H. Parker, *Ancient Ceylon* (1909), pp. 609–610
- Release mode: free play only

## Source correction

The production summary described Pancha Keliya as a three-player race. Parker’s primary account instead records two opposing sides. Six counters are used in every game, three per side. Games with four, six or eight people are team forms with half the players on each side. This release implements the source-clear two-seat form and does not invent a three-player ruleset.

## Board

The diagram is one compartment wide. The two sides begin from opposite ends of a nine-room horizontal base, converge at its central marked House, and follow the same bent twenty-five-room ascent. Four more marked Houses occur at the bends. The five marked Houses are safe from attack. The terminal room is Kenda-ge.

## Cowries and stored throws

Six cowries are cast.

- 0 mouths up: `Bokka`, value 0.
- 1 mouth up: `Onduwa`, value 1 and another throw.
- 2, 3 or 4 mouths up: their face value.
- 5 mouths up: `Pancha`, value 5 and another throw.
- 6 mouths up: value 6 and another throw.

A counter may enter only by assigning a whole throw of 1, 5 or 6. Bonus results are stored until a non-bonus result ends the sequence. The player may then assign each complete throw to a counter, or assign the total of the stored sequence to one counter. A throw is never subdivided.

## Movement, cutting and landing

- Each side has three counters.
- Movement follows that side’s base route and then the common ascent.
- Exact landing on an enemy counter in a plain room cuts it back to its starting station.
- Counters in the five marked Houses cannot be cut.
- A counter lands beyond Kenda-ge only with the exact score required.
- The first side to land all three counters wins.

## Declared digital table policy

Parker does not fully specify stacking and congestion. This version uses single occupancy: a friendly counter or an opposing counter in a safe House blocks landing, while counters may pass occupied rooms. Any different stacking policy requires a new ruleset version.

## Multiplayer architecture

- Public and private two-player rooms.
- Aurora or Ember side selection.
- Server-generated cowrie sequences using secure randomness.
- Per-sequence nonce and proof hash.
- Server-generated legal allocations and deterministic rejection reasons.
- Persisted room state and reconnect.
- Game-specific history, audit hash chain and final proof hash.
- Wallet identity for profiles and match records only.
- No entry locking, payout, token reward or wagering.

## Future team ruleset

Parker permits four, six or eight people arranged into two opposing sides, but his short description does not close every team-turn and counter-control detail. Multi-seat team play is therefore deferred to a separately versioned ruleset rather than silently mixed into the two-seat release.
