# Phases 46-50 Server Hardening Checklist

Purpose: continue mainnet rehearsal hardening without adding new game modes or changing contracts.

## Phase 46: Wallet Session Hardening

- `profile_login` binds the WebSocket connection to the logged-in wallet.
- Protected actions require a logged-in socket wallet.
- Protected action payload wallets must match the logged-in socket wallet.
- Re-login is still allowed so a socket can intentionally bind to another wallet.

Protected actions include room create/join, entry confirmation, team selection, game actions, history, my rooms, and vault activity reads.

## Phase 47: Rate Limits / Abuse Protection

- Each WebSocket connection gets a message-rate window.
- Excess action spam returns `Too many requests. Slow down.`
- Room creation has a stricter per-minute limit.
- This is basic abuse protection, not a full IP/WAF system.

## Phase 48: Match Replay Evidence

- Audit log events now include sequence numbers.
- Each audit event links to the previous event hash.
- Each audit event gets an `eventHash`.
- `roomProof` already includes the audit log, so this improves dispute evidence.

## Phase 49: Leaderboard Integrity

- Bot wallets are not awarded leaderboard stats.
- Missing-profile wallets are not awarded persisted stats.
- Points remain awarded only through server-side match finalization.

## Phase 50: Mainnet Rehearsal UX Cleanup

Room payloads now expose `highStakesStatus` for High Stakes rooms:

```json
{
  "lockedCount": 2,
  "requiredCount": 4,
  "allEntriesLocked": false,
  "realPlayerCount": 4,
  "settlementStatus": "pending",
  "settlementTxHash": null,
  "settlementError": null,
  "settlementAttempts": 0,
  "nextAction": "waiting_for_entry_locks"
}
```

This gives the frontend a single field for lock, settlement, and next-step display.

## GitHub Evidence

Run:

```bash
node server/tests/server-hardening-phases.test.js
```

Expected output:

```txt
[server-hardening] phases 46-50 evidence passed
```

## Render Verification

After deploy, check `/health` and confirm these anti-cheat flags are present:

- `walletSessionBound=true`
- `rateLimitedWsActions=true`
- `auditHashChain=true`
- `leaderboardServerAwardOnly=true`
- `serverOnlyVaultActivity=true`
- `noVoluntarySkipWithLegalMoves=true`

## Manual Smoke

1. Login with wallet A.
2. Send a protected action using wallet B. It should fail with wallet session mismatch.
3. Spam more than 120 messages in 10 seconds on one socket. It should fail with rate-limit text.
4. Create an Open Ice room with bots and finish a game. Bot wallets should not persist leaderboard stats.
5. Start a High Stakes room and inspect the room payload. It should include `highStakesStatus`.
