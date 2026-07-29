# Khasi Fishflow

## Heritage ruleset

- Product: Khasi Fishflow
- Traditional game: Mawkar Katiya
- Ruleset: `khasi-fishflow / mawkar-katiya-das-gupta-1923-core-1.0.0`
- Recorded community: Khasi Hills
- Source baseline: H. C. Das Gupta's early twentieth-century Khasi game description
- Players: two
- Engine: two-row relay sowing

## Board and opening

- Two rows of seven pits.
- Five stones begin in every pit.
- Each player controls the row nearest them.
- Seventy stones remain conserved across the board and both stores.

## Complete turn

1. Choose a non-empty active pit on your own row.
2. Lift every stone from that pit.
3. Sow clockwise through the active pits, one stone per pit.
4. When the final stone lands in a pit that already contained stones, lift the complete pit and continue relay sowing.
5. When the final stone lands in an empty pit, stop.
6. Capture every stone from the directly opposite active pit.
7. The landing stone remains in place.

The landing-stone policy is explicit because the broad recovered summary names an opposite-pit capture but does not spell out whether the newly placed landing stone is also collected.

## Rounds and inactive-pit handicap

A round ends when one active row becomes empty. Every remaining board stone is swept into its owner's store. Each player then refills from the left with five stones per pit.

- A pit that cannot receive all five stones becomes inactive.
- Extra stones remain in the player's store.
- The next round's starting player alternates.
- The resulting difference in active pit counts is the released handicap mechanism.
- A player with fewer than five total stones cannot refill even one pit and loses the match.

## Source boundary

The historical account includes unusual surplus and deficit handicap or capture clauses. The project source summary explicitly requires a direct-page transcription before those clauses are used in ranked play.

This release therefore:

- ships the recovered core as an unranked free-play queue;
- implements the documented shrinking-board refill handicap;
- does not invent a special surplus transfer, deficient-pit tax or alternate capture rule;
- requires a new ruleset version when the direct source page is obtained.

## Product modes

- Practice against the Ember bot
- Local two-player
- Opposite Capture Drill
- Public online rooms
- Private room codes
- Persistent reconnectable matches
- Game-specific history and proof hashes

## Authoritative multiplayer

The server validates room membership, assigned side, turn ownership, active-pit selection, every clockwise sowing step, every relay pickup, the empty landing, the directly opposite capture, round sweeps, five-stone refills, inactive pits and victory.

Every action enters an ordered audit hash chain. The final proof binds the ruleset, room, match state and audit history.

## Release boundary

Free play only. Wallet profiles support identity, room ownership, reconnect and match history. They are not described as wallet-signature authentication. No entry fees, wagering, payouts or token rewards are included.
