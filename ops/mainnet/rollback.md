# Mainnet Rollback Runbook

This runbook is for aborting a capped internal mainnet rehearsal or backing out a bad mainnet env switch.

## Immediate abort triggers

Abort immediately if any of these occur:

- `/mainnet/preflight` returns `HOLD`
- Render backend reports wrong chain ID
- Vercel frontend reports wrong chain ID
- vault address mismatch between frontend/backend/deployment record
- settlement signer is invalid or does not match vault game server
- contract source cannot be matched to the recorded commit
- test lock transaction fails unexpectedly
- indexer cannot see mainnet events after a confirmed lock
- any real-money/reward/compliance concern appears

## Frontend rollback

1. Revert Vercel env to the last known testnet or previous stable env.
2. Redeploy the last known stable frontend commit.
3. Confirm Player Hub loads.
4. Confirm High Stakes is either disabled or points to the intended safe environment.
5. Confirm public users cannot join a broken mainnet room.

## Backend rollback

1. Revert Render env to the previous stable environment values.
2. Remove or replace the mainnet `ETH_VAULT_ADDRESS`.
3. Confirm `CHAIN_ENV`, `ABSTRACT_CHAIN_ID`, and `ABSTRACT_RPC_URL` are no longer pointing to the bad target.
4. Restart Render.
5. Check:

```txt
/indexer/health
/mainnet/preflight
```

6. If backend should be back on testnet, `/mainnet/preflight` should return `HOLD` with `chainIsMainnet=false`.

## Contract safety response

If the contract itself is suspect:

- stop creating new rooms
- pause contract if pause controls are available
- do not call owner drain or recovery actions without review
- preserve logs and transactions
- copy RUN snapshot
- open a blocker issue

## Communication rule

Use internal language only:

- "capped mainnet rehearsal aborted"
- "mainnet rehearsal held"
- "testnet fallback restored"

Do not use public launch or reward language during rollback.

## Post-rollback evidence

Record in `deployment-record.json -> notes`:

- trigger
- time
- frontend commit before/after
- backend commit before/after
- env values changed, without secrets
- room code if applicable
- tx hashes if applicable
- final `/mainnet/preflight` readiness
