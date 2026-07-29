# Khasi Fishflow

## Heritage ruleset

- Product: Khasi Fishflow
- Traditional game: Mawkar Katiya
- Ruleset: `khasi-fishflow / mawkar-katiya-das-gupta-1924-digital-1.0.0`
- Source baseline: H. C. Das Gupta, “Notes on a Type of Sedentary Game prevalent in many parts of India,” *Journal and Proceedings of the Asiatic Society of Bengal*, vol. 19 (1924), pp. 71–74
- Region: Khasi Hills, Meghalaya
- Players: two
- Engine: two-row relay sowing with handicap rounds

## Opening

The board has two rows of seven pits. Five stones begin in every pit, for seventy stones total. Aurora controls the lower row and Ember controls the upper row.

A player chooses one non-empty active pit from their own row and lifts every stone from it.

## Relay sowing

Stones are sown clockwise, one at a time, through active pits. When the hand empties:

- if the next active pit contains stones, lift all of them and continue sowing from the following active pit;
- if the next active pit is empty, the relay stops and the active player captures every stone from the pit directly opposite that empty pit.

Captured stones enter the player’s store. The opponent then takes the next turn.

## Later rounds and inactive pits

When the board is empty, each player uses their owned stones to refill their row from the left at five stones per pit.

- A fully funded pit starts with five stones.
- A final partial amount occupies the next pit.
- Unfunded pits become inactive and are skipped during sowing.
- Stones beyond the seven-pit row remain in reserve.

The player with at least one complete seven-pit row is treated as the full-side player for that handicap round.

## Handicap rules

The recovered description is terse about exact event timing. This version freezes the following deterministic digital interpretation:

- a player’s partial remainder or reserve value becomes their handicap capture value;
- during the opponent’s turn, after each individual stone is deposited, the pit that just changed is tested;
- if its count exactly equals the defender’s handicap value, those stones are captured immediately by the defender;
- only the changed pit is tested, so simultaneous global scanning is not used;
- the owner of a partial handicap pit cannot choose that pit as a starting pit;
- when the full-side player deposits into the opponent’s partial pit, one stone is immediately taxed into the full-side player’s store;
- when no playable pit remains, any stranded partial-pit stones are transferred to the full-side player before the next round is prepared.

Changing this timing or trigger order requires a new ruleset version.

## Victory

Rounds continue until one player owns all seventy stones across stores, reserves and the next-round allocation. That player wins.

## Product modes

- Practice as Aurora Current
- Practice as Ember Current
- Local two-player
- Opposite Capture Drill
- Public online rooms
- Private room codes
- Side selection
- Persistent reconnectable matches
- Game-specific match history

## Authoritative multiplayer

The server validates:

- room membership and assigned side;
- current turn;
- active and inactive pits;
- partial-pit start restrictions;
- every clockwise deposit;
- relay pickup order;
- empty-gap stopping;
- opposite-pit capture;
- automatic handicap captures;
- full-side partial-pit tax;
- round reconstruction;
- seventy-stone conservation;
- final ownership and proof hash.

Every action enters an ordered audit hash chain. The final proof binds the ruleset, room, final state and audit history.

## Release boundary

Free play only. Wallet profiles support identity, room ownership, reconnect and history. They are not described as wallet-signature authentication. No entry fees, wagering, payouts or token rewards are included.
