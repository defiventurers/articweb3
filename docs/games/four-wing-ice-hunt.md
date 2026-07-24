# Four-Wing Ice Hunt

## Deployed ruleset

- **Game ID:** `four-wing-ice-hunt`
- **Ruleset version:** `diviyan-keliya-parker-1909-1.0.0`
- **Traditional names:** Diviyan Keliya; Kotiyo saha Harak; Leopards and Cattle
- **Region:** Sri Lanka
- **Evidence status:** Historical ruleset with a reproduced Parker board and opening sequence
- **Source basis:** H. Parker, *Ancient Ceylon* (1909), pp. 581–583

## Heritage rules implemented

- Two players control two leopards and twenty-four cattle.
- The board is a five-by-five intersection court with a six-point triangular wing attached to each side.
- The leopard player places one leopard first. Parker recommends the centre but permits any board point.
- The cattle player then places one cattle piece where it cannot be captured immediately.
- The leopard player places the second leopard.
- The cattle player then places one cattle piece after every leopard turn until all twenty-four are deployed.
- Cattle cannot move during deployment.
- After deployment, every piece moves one step to an adjacent empty point along a printed line.
- A leopard may capture one adjacent cattle piece by jumping to the next empty point on the same straight printed line.
- The jumped cattle piece is removed.
- Cattle never capture.
- The cattle player wins by immobilising both leopards.
- The leopard player wins by capturing all cattle.

## Clarification preserved in code

Parker observes that the cattle side is strategically unlikely to recover after losing eight pieces. The deployed ruleset does **not** convert that observation into an eight-capture victory threshold. It keeps the stated objective of capturing the cattle while separately tracking the strategic warning.

Captures are optional and single-jump in this ruleset. No Baghchal capture threshold, goat deployment rule, or chained capture has been imported.

## Modern digital policy

These rules are platform policies, not heritage claims:

- threefold repetition after deployment produces a draw;
- 160 movement plies without a capture after deployment produce a draw;
- online actions are validated by the server;
- rooms, reconnect state, action audit logs, final state and match history are persisted;
- online play is free-play only, with no entry lock, payout or token reward.

Any future balance or tournament change must use a new ruleset version.
