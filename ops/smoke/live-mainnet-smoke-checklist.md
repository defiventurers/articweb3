# Phase 36: Live Mainnet Smoke Checklist

Purpose: prove the deployed mainnet rehearsal build is alive, correctly gated, and safe to test before inviting anyone else.

This is for internal mainnet rehearsal only. Do not treat this as public launch approval.

## Expected Render Backend Env

```txt
NODE_VERSION=20
ABSTRACT_CHAIN_ID=2741
LOCKED_MATCH_MODE=internal
LEGAL_PUBLIC_MAINNET_APPROVED=false
HIGH_STAKES_ENABLED=true
ETH_VAULT_ADDRESS=<mainnet vault>
DATABASE_URL=<postgres url>
```

Keep these unset unless you deliberately want to unlock higher rehearsal tiers:

```txt
UNLOCK_ALL_REHEARSAL_TIERS
ALLOWED_REHEARSAL_TIERS
```

Default internal rehearsal allows only the `$1` tier.

## Expected Frontend Env

```txt
VITE_CHAIN_ENV=mainnet
VITE_ABSTRACT_CHAIN_ID=2741
VITE_ENABLE_HIGH_STAKES=true
VITE_ETH_VAULT_ADDRESS=<same mainnet vault>
VITE_BACKEND_HTTP_URL=<render https url>
VITE_WS_URL=<render wss url>
```

## Automated Backend Smoke

Run from `server/` after deploy:

```bash
BACKEND_URL="https://<render-service>.onrender.com" npm run smoke:mainnet
```

Pass criteria:

- `/healthz` returns `ok: true`.
- `/runtime/status` returns `chainId: 2741`.
- `lockedMatchMode` is `internal`.
- `legalPublicMainnetApproved` is `false`.
- `highStakes.allowed` is `true`.
- tier count is `3`.
- internal mode reports `allowedTierCodes: ["1"]`.
- `/high-stakes/tiers` keeps `$1` enabled and marks `$4` / `$16` disabled.
- room store and history store are readable.
- indexer endpoint is readable and has no `lastError`.

## Manual Frontend Smoke

Use a wallet with only the small amount needed for rehearsal.

1. Open the production frontend.
2. Confirm the app loads without a blank screen.
3. Connect an Abstract-compatible wallet.
4. Confirm the chain guard expects Abstract Mainnet `2741`.
5. Enter Free Play and create an Open Ice room.
6. Join or fill the room with test participants/bots if supported.
7. Confirm Free Play still works without any wallet value lock.
8. Enter Locked Match Lab.
9. Confirm the launch gate does not block you.
10. Select the smallest tier first: `$1`.
11. Create a High Stakes room.
12. Join with all required rehearsal wallets.
13. Confirm each wallet sees the same room code, tier, entry amount, and vault address.
14. Lock entry from one wallet only after checking the wallet transaction details.
15. Confirm the UI records the lock transaction hash.
16. Repeat lock confirmation for remaining rehearsal wallets only if the first lock behaves correctly.
17. Start the match only after all players show locked.
18. Complete the match.
19. Confirm final placements and payout plan are shown.
20. Confirm settlement status changes or produces a clear operator/debug state.

## Higher Tier Unlocks

Do not unlock `$4` or `$16` during internal rehearsal unless `$1` has already completed cleanly.

To allow `$1` and `$4` only:

```txt
ALLOWED_REHEARSAL_TIERS=1,4
```

To allow all rehearsal tiers:

```txt
UNLOCK_ALL_REHEARSAL_TIERS=true
```

## Operator Endpoint Smoke

If settlement operator key is configured, test with a finished High Stakes room:

```bash
curl "https://<render-service>.onrender.com/ops/settlement/rooms?key=<operator-key>&limit=10"
curl "https://<render-service>.onrender.com/ops/settlement/debug?key=<operator-key>&roomCode=<ROOM>"
```

Pass criteria:

- endpoint returns JSON, not HTML.
- room appears with the correct `contractMatchId`.
- payout total equals collected entry total minus the designed zero-payout positions.
- duplicate prevention reports any existing settlement tx/status.
- recovery advice is understandable before taking any manual chain action.

## Stop Conditions

Stop testing immediately if any of these happen:

- frontend vault address differs from backend vault address.
- wallet transaction shows an unexpected contract.
- entry amount differs from selected tier by more than expected ETH price movement.
- `/runtime/status` says `highStakes.allowed: false`.
- internal mode enables `$4` or `$16` without an explicit tier unlock env.
- indexer `lastError` is non-empty.
- room store or history store is not readable.
- settlement debug data is missing wallets, payouts, or contract match ID.
- public approval is accidentally `true` during internal rehearsal.

## Promotion Rule

Internal rehearsal can continue only when all automated backend checks pass and one full small-tier Locked Match flow completes with clean room history, lock records, and settlement/debug visibility.

Public mainnet remains blocked until legal/compliance approval is explicitly recorded and the launch switch is intentionally changed to `public`. 
