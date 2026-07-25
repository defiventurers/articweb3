# Ice Rings

## Heritage ruleset

- Traditional name: Pretwa
- Region: Bihar, India
- Game ID: `ice-rings`
- Ruleset version: `pretwa-murray-1951-compulsory-1.0.0`
- Primary source basis: H. J. R. Murray, *A History of Board-Games Other Than Chess* (1951/1952), pp. 70–71, using A. G. Shirreff's Bihar record and Fig. 31b.

## Source-fixed structure

Murray records Pretwa on a board of three concentric circles with six spokes/diameter directions. The board has nineteen playable intersections: six on each ring plus the centre. Each player has nine pieces arranged on three consecutive spokes, leaving only the centre empty.

A piece moves to the adjacent empty intersection along a printed line. Capture uses the Alquerque short leap: jump one adjacent enemy and land on the empty intersection immediately beyond. Captures may continue with the same piece.

The digital graph preserves:

- adjacent movement around each curved ring;
- adjacent movement inward and outward on each spoke;
- short-leap capture around a ring;
- inward and outward radial capture;
- capture through the centre along a complete diameter.

## Tournament interpretation

Murray states that Pretwa uses the Alquerque family rules of movement and capture, but the short Pretwa passage does not independently settle capture compulsion. This release therefore labels the following as a versioned tournament interpretation rather than presenting it as an unqualified historical fact:

- if any capture exists, a simple move is illegal;
- after a capture, the same piece must continue while another capture remains;
- captured pieces are removed immediately;
- a player also wins when the opponent has no legal move;
- threefold repetition is a digital draw;
- one hundred captureless plies is a digital draw.

The primary heritage victory is capturing every opposing piece. The frequently repeated modern “reduce the opponent to three” shortcut is not included because it is not stated in Murray's Pretwa entry or the project rulebook baseline.

## Product modes

- Practice as Aurora Rings
- Practice as Ember Rings
- Local two-player
- Ring Break Drill
- Public online rooms
- Private room codes
- Persistent reconnectable matches
- Ice-Rings-specific history and proof hashes

## Release boundary

Free play only. Wallet identity is used for profiles, room ownership, reconnect, history and proof attribution. There are no entry fees, wagers, payouts or token rewards.
