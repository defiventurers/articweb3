# Ice Hunters

## Deployed ruleset

- **Game ID:** `ice-hunters`
- **Ruleset version:** `bagh-chal-standard-1.0.0`
- **Traditional game:** Bagh-Chal
- **Region:** Nepal / South Asia
- **Players:** Two
- **Release scope:** Free play only

## Heritage boundary

Bagh-Chal is a Nepalese South Asian tiger-and-goat strategy game. Ice Hunters includes it as a regional comparison title in the wider heritage catalog. The product must not describe Bagh-Chal as an Indian-origin invention.

The arctic penguin presentation is a modern visual adaptation. The underlying asymmetric structure remains four tigers against twenty goats.

## Rules implemented

- Four tiger pieces begin on the four corner intersections of a 5×5 line board.
- The goat side owns twenty pieces and takes the first turn.
- During deployment, the goat side places one piece on any empty intersection.
- Tigers move after every goat placement.
- Goats cannot move until all twenty have been placed.
- After deployment, every piece moves one step to an adjacent empty intersection along a printed line.
- A tiger may capture by jumping one adjacent goat to the next empty intersection on the same straight printed line.
- The jumped goat is removed.
- Captures are optional.
- A turn contains one move or one capture; captures do not chain.
- Tigers win immediately after capturing five goats.
- Goats win immediately when all four tigers have no legal move or capture.

## Digital draw policy

Traditional summaries do not provide a universal tournament draw procedure. This version therefore declares the following modern platform policy:

- Threefold repetition after goat deployment is a draw.
- One hundred captureless movement plies after goat deployment is a draw.

These limits are product policies, not heritage claims. Changing them requires a new ruleset version.

## Multiplayer authority

- Online rooms are public or private and use four-character room codes.
- The room creator chooses Tigers or Goats; the joining player receives the opposite role.
- The server validates every placement, movement, jump path, capture, turn and result.
- The client never supplies a replacement board state.
- Room state, action history and audit events persist for reconnect.
- Completed matches store a final proof hash over the ruleset, game state and audit log.
- Match history is filtered by `gameId`.

## Product modes

- Practice as the Penguin Colony against a deterministic Frost Hunter bot.
- Practice as the Frost Hunters against a deterministic colony bot.
- Local two-player hotseat.
- Public online rooms.
- Private room-code matches.
- Reconnectable online matches and game-specific history.

## Web3 boundary

Wallet identity is used only for optional profile identity, room ownership, reconnect and persistent match history. Ice Hunters does not include entry locking, wagering, prize payouts or token rewards.
