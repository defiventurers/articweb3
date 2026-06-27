# Phase 45 Anti-Cheat Checklist

Purpose: tighten server authority before live mainnet rehearsal. This phase does not add gameplay. It blocks two avoidable abuse paths in the existing game server.

## Server-Enforced Rules

- Clients cannot write arbitrary vault activity records.
- Vault activity should come from verified server flows, indexed chain events, or backend-owned settlement/lock checks.
- Players cannot end a turn before rolling dice.
- Players cannot voluntarily end a turn while the server detects a legal move for the active team.

## Existing Protections To Keep

- Server checks the connected wallet against the requested wallet.
- Server checks that the player is in the room.
- Server checks that the room is currently playing.
- Server checks that it is the player's active team turn.
- Dice are generated through the server commit-reveal flow.
- High Stakes rooms require real wallets, entry locks, and launch switch approval.
- Settlement is checked once and guarded by server-side status fields.

## GitHub Evidence

Run the Launch And Runtime Evidence Test workflow or run locally from the server package root:

```bash
node tests/anti-cheat-transform.test.js
```

Expected output:

```txt
[anti-cheat] transform evidence passed
```

## Manual Smoke

After Render deploys:

1. Open `/runtime/status` and verify `checks.launchStatusReadable=true`.
2. Confirm the health response exposes `antiCheat.serverOnlyVaultActivity=true`.
3. Start a normal Open Ice room and verify turn flow still works.
4. During a turn, try ending the turn before rolling. It should fail.
5. During a turn with a legal move, try ending the turn. It should fail.
6. Complete a no-move turn after dice roll. It should advance normally.

## Not Covered

- Full replay dispute resolution.
- Formal proof verification for every move.
- Bot strategy fairness.
- Wallet signature challenge per WebSocket session.
- Rate limiting per wallet/IP.

Those are separate hardening phases.
