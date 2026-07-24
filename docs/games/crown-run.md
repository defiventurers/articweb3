# Crown Run

## Ruleset

- Game ID: `crown-run`
- Ruleset version: `dadu-schmidt-madsen-2024-majority-1.0.0`
- Heritage name: Dadu
- Community: Dawoodi Bohra community of western India
- Source baseline: Jacob Schmidt-Madsen, “Discovering Dadu: A Ludemic Enigma from South Asia,” *Board Game Studies Journal* 18.1 (2024), interview-based rules appendix
- Release mode: free play only

## Heritage boundary

This release implements the majority basic rules synthesized from Schmidt-Madsen’s interviews with Dawoodi Bohra players. Dadu is formally playable by two people but is commonly played by two family teams. The first digital release therefore uses two captain seats, each controlling the shared pieces of one side. A later multi-wallet family-team format requires a separate ruleset version because seating order, teammate control and communication policy must be fixed explicitly.

Household options are not silently mixed into the baseline. Triple cancellation, never-forfeit play, forced re-entry, separate licenses to exit or kill, touch-move, shortened moves, compulsory killing and one-piece-one-kill remain disabled.

## Equipment and board

- Two opposing sides: Aurora Court and Ember Court.
- Eight ordinary `kaangi` and one king-like `nakta` per side.
- Five binary cowrie shells.
- One shared serpentine route made from seven perpendicular five-step segments.
- Thirty-six distinct route rooms because neighbouring segments share their endpoints.
- Eight protected segment endpoints called `macho`.
- The sides enter from opposite ends and move in opposite directions.

## Cowrie values

- Zero mouths up: `0`; the whole chance is forfeited and accumulated results are discarded.
- One mouth up: `1`, called `da`; cast again.
- Two, three or four mouths up: move that value and stop casting.
- Five mouths up: `10`; cast again.

A normal chance cannot be applied unless its sequence contains at least one `da`. After `da` is obtained, stored results are applied one at a time in any legal order.

## Entry and movement

1. Every piece begins outside the route.
2. A stored `1` must enter a waiting piece before it may move or exit another piece.
3. The player chooses whether the entering piece is the `nakta` or an ordinary `kaangi`.
4. Friendly pieces may share a room.
5. Opposing pieces may share an unprotected room.
6. A `macho` occupied by an opponent blocks landing.
7. A side cannot enter the opponent’s final six-room home row until that side has captured at least one enemy piece.
8. Landing exactly on the last route room transfers the piece to the central exit quadrant.
9. Once no allied pieces remain waiting to enter, a further `da` removes a piece from the central quadrant.
10. The first side to exit all nine pieces wins.

## Capture and crown collapse

- Landing on an opponent in an unprotected room captures one opposing piece.
- When several enemies share the room, ordinary `kaangi` are captured before the `nakta`.
- A piece already sharing an unprotected room with an opponent may spend `da` to capture without moving.
- Every capture grants an immediate additional cowrie chance while unused throws remain stored.
- A normal capture returns only the captured piece to the waiting area.
- When an ordinary `kaangi` captures the `nakta`, the victim’s king and every unfinished allied route or central piece return to the waiting area. Already exited pieces survive.
- When a `nakta` captures the opposing `nakta`, all non-waiting pieces reset, including pieces that had already exited.
- A captured `nakta` cancels its side’s permission to enter the opposing home row. That side must capture again.

## Server authority and replay

The server validates every cowrie cast, stored-result application, entry, route move, stack interaction, capture, home-row gate, central transfer, exit and crown reset. Online throws include a nonce and proof hash, rooms persist for reconnect, actions are chained through an audit hash, and completed matches receive a final proof hash.

A replay is reproducible from:

1. the ruleset version;
2. the fixed initial state;
3. the ordered cowrie results and their commitments;
4. the ordered allocation and movement log.

## Web3 scope

Wallet identity is used for profiles, room ownership, reconnect and match history. Crown Run has no entry locking, wagering, prize payout, token reward or compulsory transaction flow.
