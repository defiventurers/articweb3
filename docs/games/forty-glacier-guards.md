# Forty Glacier Guards

## Ruleset

- Game ID: `forty-glacier-guards`
- Ruleset version: `challis-gutia-datta-1939-orthogonal-1.0.0`
- Heritage names: Challis-Gutia, Chalis Gutiya, Chalis Ghutia
- Region recorded by the production source: Jaunpur, Uttar Pradesh, India
- Source baseline: J. Datta’s 1939 description of the forty-piece orthogonal form
- Release mode: free play only

## Heritage boundary

This release implements the forty-per-side form on a 9×9 intersection grid with horizontal and vertical lines only. Each side fills four complete rows and four points on its half of the central row, leaving the exact centre empty.

The separate Titagarh form is not blended into this ruleset. That version adds diagonals through 3×3 blocks and is commonly described with twenty-four pieces per side, though other counts occur. It requires its own board layout, setup and ruleset version.

Datta’s short account and the surviving summaries do not settle whether a player must capture whenever a capture exists or must continue every available jump. This release therefore declares both choices optional:

- a normal adjacent step remains legal when another guard could capture;
- after a jump, the same guard may continue or deliberately end the capture turn.

These policies are visible in the rules screen and encoded in the ruleset version rather than presented as certain historical facts.

## Equipment and setup

- Two sides: Aurora Guard and Ember Guard.
- Forty guards per side.
- Eighty-one intersections arranged as a 9×9 grid.
- Horizontal and vertical printed lines only.
- The single central intersection starts empty.
- Aurora occupies the lower four rows and the right four points of the central row.
- Ember occupies the upper four rows and the left four points of the central row.

## Turn structure

1. Select one guard.
2. Either move to one adjacent empty intersection along a printed line, or jump one adjacent enemy guard to the empty intersection immediately beyond.
3. Remove a jumped guard.
4. After a capture, continue with the same guard when another jump is available, or end the capture turn.
5. The first side to capture all forty opposing guards wins.

Guards never promote.

## Modern digital policies

The heritage source does not provide draw handling suitable for persistent online rooms. This release adds clearly labelled platform rules:

- threefold repetition produces a draw;
- 240 consecutive captureless plies produce a draw;
- a side with no legal step or capture produces an immobilization draw.

## Multiplayer and proof

The server validates every step, jump, captured intersection, same-guard continuation and voluntary chain ending. Rooms support public or private creation, role selection, persistence, reconnect, game-specific history, audit hash chaining and a final proof hash.

Wallets are used for identity, room ownership, reconnect and match history. Forty Glacier Guards has no entry locking, wagering, prize payout, token reward or compulsory transaction flow.
