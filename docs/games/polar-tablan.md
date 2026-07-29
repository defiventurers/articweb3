# Polar Tablan

## Release ruleset

- Product: Polar Tablan
- Traditional game: Taabla / Tablan / Tabul Fale
- Ruleset ID: `polar-tablan / tablan-bell-open-finish-1.0.0`
- Source baseline: R. C. Bell, *Board and Table Games from Many Civilizations*
- Region: Mysore region, southwest India
- Players: two
- Pieces: twelve per player
- Board: four rows by twelve columns

## Setup

Each player begins with one runner in every square of the row nearest to them. Aurora uses the lower row and Ember the upper row. Aurora starts the digital queue.

## Casting sticks

Four half-cylinder sticks have one plain face and one marked face.

- one plain face up scores 2 and earns another cast after movement;
- four plain faces up score 8 and earn another cast after movement;
- no plain faces up score 12 and earn another cast after movement;
- two or three plain faces up score nothing and pass the turn.

Only the three scoring outcomes create movement.

## Movement obligation

A scored throw must be used whenever a legal allocation exists.

- 2 may move one runner two squares or two different runners one square each;
- 8 may move one runner eight squares or two different runners four squares each;
- 12 may move one runner twelve squares or two different runners six squares each.

A runner's first move can only be made with a score of 2. It may therefore move two squares by itself, or one square as one half of a split 2.

The two legs of a split move are resolved in their displayed order. A split must use two different runners. Friendly runners never share a square.

## Route

Each side follows a four-row boustrophedon route. The sides move in opposite directions.

Aurora:

1. lower home row from left to right;
2. lower middle row from right to left;
3. upper middle row from left to right;
4. Ember home row from right to left.

Ember follows the exact opposite path, beginning in the upper home row and ending in Aurora's home row.

## Capture and locking

A runner captures by exact landing:

- on either shared middle row; or
- when it enters the opponent's home row and displaces an opponent still occupying that starting square.

Captured runners are removed for the rest of the game.

Once a runner lands in the opponent's home row, it becomes locked. It never moves again and cannot be captured. A locked runner also blocks its square.

## Victory and scoring

The race ends when one player has locked every surviving runner into the opponent's home row. Each locked runner scores one finishing-row point. The player with more finishing-row points wins. If the scores are equal, the player who completed the race first wins.

## Versioned source decisions

Bell records an optional rule requiring the opponent's home-row squares to be occupied in a fixed order. This release uses the open-finish form and does not enable that optional ordering rule.

This ruleset is kept separate from archaeological boards labelled Thabla Ata. Similar naming alone is not enough to identify those boards as Bell's Tablan.

## Product modes

- Practice as Aurora
- Practice as Ember
- Local two-player
- Finish Row Drill
- Public online rooms
- Private room codes
- Persistent reconnectable races
- Game-specific history
- Authoritative stick commitments, audit chain and final proof hash

## Release boundary

Free play only. Wallet identity is used for profiles, room ownership, reconnect, history and proof attribution. There are no entry fees, wagers, payouts or token rewards.
