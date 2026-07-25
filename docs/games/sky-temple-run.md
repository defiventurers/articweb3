# Sky Temple Run

## Heritage ruleset

- Traditional name: Vimanam
- Region: South India
- Ruleset ID: `sky-temple-run / vimanam-kreeda-kaushalya-2008-web-1.0.0`
- Source baseline: Kreeda Kaushalya's documented Vimanam web rules, accessed 2026-07-25, cross-checked against the project heritage rulebook and comparative family descriptions.

## Frozen rules

Each of two players controls six pieces and casts six cowries. One through six mouths up score their face count; zero mouths up scores twelve. A result of one or five may enter a waiting piece. Results of one, five, six and twelve grant another turn. A capture by exact landing on an unprotected rival also grants another turn and returns the captured piece home.

The published named routes are preserved:

- Player 1: `a → c → d → e → f → g → h → i → j → k → l → n → q → r`
- Player 2: `b → c → d → k → j → i → h → g → f → e → m → n → o → p`

The route is rendered digitally by inserting three corridor points between every named source square. This improves movement readability without changing the named-square order or each player's total route. All named squares are protected rest spaces; the inserted corridor points are capturable.

A player must make at least one capture before passing the gate after `k` for Aurora or `e` for Ember. The final rest square requires an exact cast. The first player to finish all six pieces wins.

## Declared digital policies

- Aurora starts a single two-seat digital match.
- Only one piece may occupy a physical square.
- A friendly occupied square blocks landing.
- An enemy on a protected named square blocks landing.
- Pieces may pass occupied squares because movement is counted by route position, not physical blocking.
- The capture gate belongs only to this Vimanam ruleset and must not leak into Panchi.

Changing any of these policies requires a new ruleset version.

## Product modes

- Practice as Aurora
- Practice as Ember
- Local two-player
- Temple Gate Drill
- Public online rooms
- Private room codes
- Persistent reconnectable matches
- Game-specific history and proof hashes

## Release boundary

Free play only. Wallet identity is used for profiles, room ownership, reconnect, history and proof attribution. There are no entry fees, wagers, payouts or token rewards.
