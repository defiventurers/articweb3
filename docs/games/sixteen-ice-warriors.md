# Sixteen Ice Warriors

## Ruleset

- Game ID: `sixteen-ice-warriors`
- Ruleset version: `hewakam-keliya-parker-1909-1.0.0`
- Heritage name: Hewakam Keliya / Sixteen Soldiers
- Source baseline: H. Parker, *Ancient Ceylon* (1909), p. 583 and Fig. 247
- Release mode: free play only

## Heritage boundary

Hewakam Keliya is recorded as a Sri Lankan war game and is also described under related Sixteen Soldiers or Solah Guttiya names in South Asian survey literature. This release does not claim that every similar carved Alquerque board carried the same rules.

The deployed board follows Parker's description: use the Diviyan Keliya line board but remove the left and right triangular rooms. The result is a five-by-five central Alquerque court with one triangular room at the north and one at the south.

## Equipment and setup

- Two players.
- Sixteen soldiers per side.
- Thirty-seven playable intersections.
- Aurora occupies the north triangular room and the two northern court rows.
- Ember occupies the south triangular room and the two southern court rows.
- The five-point transverse centre row begins empty.
- Aurora starts a single digital game. A later ranked match format should swap starting sides across two rounds.

## Complete turn

1. Choose one of your soldiers.
2. Make one ordinary step to an adjacent empty intersection along a printed line, or jump one adjacent enemy soldier to the empty point immediately beyond on the same line.
3. Remove a jumped soldier.
4. After a capture, the same soldier may continue making legal jumps without a fixed maximum.
5. The player may deliberately end the capture chain even when another jump exists.
6. Pass the turn after an ordinary move, after the final chosen jump, or after explicitly ending a chain.

## Exact deployed policies

- Captures are optional, not compulsory.
- Capture continuation is optional, not compulsory.
- Only the same soldier may continue a capture chain.
- Pieces move in any direction allowed by the printed graph.
- There is no promotion.
- Victory requires capturing all sixteen opposing soldiers.

## Modern digital policies

The following are platform policies rather than claims about Parker's historical rules:

- Threefold repetition after completed turns is a draw.
- 160 captureless plies is a draw.
- A position in which the active player has neither a step nor a capture is recorded as a stalemate draw.
- Online matches are server-authoritative.

## Multiplayer architecture

- Public and private two-player rooms.
- Aurora or Ember role selection during room creation.
- Server-generated legal actions and deterministic rejection reasons.
- Explicit `end-chain` action for optional capture continuation.
- Persisted room state and reconnect.
- Game-specific match history.
- Audit hash chain and final match proof hash.
- Wallet identity for profiles and match records only.
- No entry locking, prize payout, token reward or wagering.

## Replay model

A replay is reproducible from:

1. the ruleset version;
2. the fixed opening state;
3. the ordered action log, including every capture and `end-chain` decision.

Changing the board, opening formation, compulsory-capture policy or chain policy requires a new ruleset version.
