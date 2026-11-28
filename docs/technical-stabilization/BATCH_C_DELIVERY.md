# Batch C3 — durable signup collectible delivery

Reviewed base: `30ab0a5d346bb6087da13ea0322e08c8b24a1a80`; implementation branch `codex/fonso-stabilization-batch-c`. The Batch C resume checkpoint is `138ca6b56057cd5f9b1e1022be8b0e256f41f87f`. Evidence recorded 2026-11-28 UTC. This is the delivery-worker portion of C3; Para/browser findings are in `BATCH_C_SIGNUP.md`, and C1 owns the public metadata fallback.

## Outcome and boundaries

| Item | Status | Evidence / remaining step |
| --- | --- | --- |
| Incorrect confirmation after an existing on-chain claim | FIXED AND TESTED LOCALLY | Passport/Egg now require the canonical mint receipt, exact chain, wallet, token and transaction before the queue says confirmed. |
| Lost transaction hash after broadcast | FIXED AND TESTED LOCALLY | Recover the original mint receipt read-only; actual PostgreSQL/local EVM tests pass for both collections with unchanged supply/owner. |
| Late worker overwriting a newer delivery result | FIXED AND TESTED LOCALLY | Database updates are fenced by the claimed attempt and lease; a stale worker exits without another write. |
| Registration idempotency, first-33 allocation, authenticated identity and delayed receipts | FIXED AND TESTED LOCALLY | Relevant existing and new integration checks pass. Existing allocation/contract limits were retained, not rewritten. |
| Current dashboard / chain count difference | PRODUCTION VERIFICATION PENDING | Private backend evidence and public chain observations have different scopes; review the private handoff. Actual Render-to-Neon binding remains unresolved from Batch B. |
| Live Para consent and automatic collectible delivery | OWNER ACTION REQUIRED | No live account, mint, wallet signature, deployment or database mutation was performed. Controlled acceptance procedure below. |

## Verified flow

1. The early page starts the Para flow with the early-signup consent and adult-confirmation fields. The auth attempt retains the approved source and return path with PKCE.
2. The backend validates the Para identity token and wallet signature, then associates the authenticated account with the attested EVM wallet on chain 46630. A submitted arbitrary wallet is not the automatic delivery destination.
3. `earlySignup.recordEnrollment` retains the original attribution/time. `fulfill` calls `antarcticPassport.autoRegister` only for the approved, consented Para account and configured auto-enrollment flag. A queue failure preserves successful sign-in and is retried when the authenticated Passport endpoint is read.
4. `antarcticPassportStore.register` holds an account transaction lock and commits the Passport registration and its delivery jobs together. The same account/wallet/chain returns its existing registration. A different account reusing the wallet, or an existing account changing its registered wallet/chain, is rejected.
5. The founding Egg allocation requires the promotion flag, the existing campaign, Para, chain 46630, and the existing launch start. A database-wide transaction lock and unique chain/edition index assign at most 33 reservations. Duplicate requests do not consume additional slots. All approved signup channels share that allocation.
6. The optional cohosted worker validates chain, deployed Passport code, minter role and test-gas budget before claiming work under a transaction-scoped signer lock. An Egg job is not claimed before the same account's Passport is confirmed. The existing on-chain contracts reject duplicate ownership/claim conflicts and enforce the Egg cap.
7. A fresh send saves its transaction hash before waiting for confirmation. A known transaction is polled, not automatically rebroadcast. Two canonical L2 blocks, an exact mint Transfer, the expected claim/token and owner are required for Passport/Egg confirmation. This is not an Ethereum-finality claim.
8. The authenticated acceptance endpoints additionally compare the registered collectible with the current server-bound Para wallet. The normal response distinguishes registration, reservation and pending delivery from a confirmed receipt. See the separate signup report for browser receipt-display fixes.

## Reproduced root causes and smallest corrections

### Existing-claim fast path skipped the receipt

Before this patch, `deliverOne` immediately marked any sufficiently confirmed `tokenForClaim` result as `confirmed`. It did not inspect the stored transaction hash or mint receipt on that path. A process interrupted between broadcast and hash persistence could therefore leave a confirmed row with no transaction hash; the stricter `/passport/acceptance` verifier could never accept it. An unrelated or stale saved receipt was also ignored by the fast path.

The new six-case unit file initially contained four focused reproductions: all four failed against the unchanged worker. The first and third returned `confirmed` where no valid receipt existed, the recovery hook was never called, and lease-loss handling attempted another write. The original failure summary is in `BATCH_C_DELIVERY_EVIDENCE.json`.

`finish` now uses the existing independent receipt verifier before promoting either ERC-721 job. If an already-minted claim lacks valid saved evidence, `passportMintRecovery.js` finds the first historical block containing the immutable claim by bounded bisection, reads the exact mint Transfer at that block, persists that hash, and calls the canonical verifier again. Missing/pruned historical RPC data remains pending/retrying; no successful result is synthesized. Existing claims never take the send path. Arrival/achievement behavior, game rules and the deployed contracts are unchanged.

The local EVM test also reproduces an idempotent successful contract call with **no new mint event**. Its receipt cannot replace the original mint receipt; recovery restores the original hash while Passport supply remains one. The equivalent Egg broadcast-loss recovery leaves its supply and ownership unchanged.

### Expired claims could overwrite newer work

The existing queue incremented `attempts` when claiming a job but returned the old value; `updateJob` matched only the job ID. A late callback could overwrite a newer worker's result after its lease expired. The claim now returns the incremented attempt and lease. Every worker write matches both values. Loss of that claim stops the stale worker, including its error path. No schema or production-data migration is needed.

The signer lock is retained. This change prevents stale database writes; the immutable on-chain claim/recipient checks remain the final duplicate-issuance protection if a process fails around a network broadcast. `attempts` still counts worker claims and receipt polling, not distinct mint transactions.

## Scope reconciliation and publication boundary

Whole-contract lifetime mint counts and source-attributed backend receipt cohorts
are different populations. The public chain observation contains 20 Passport
mint transfers and 12 Egg mint transfers; matching any dashboard total alone is
not proof of per-account delivery or canonical receipt consistency. The exact
connected-database observations and aggregate queries are retained in a private
founder handoff, not published to this public repository. Active Render database
binding and historical account attribution still require the owner checks
recorded in Batch B. No production database mutation was performed.

## Reproducible local validation

Install the pinned server and launch-contract dependencies with their existing lockfiles. Use local PostgreSQL 18 binaries; the launcher rejects external database inputs by not accepting a database URL and creates a new loopback fixture. Every fixture test also rejects a non-loopback `AK_PASSPORT_TEST_DATABASE_URL` when run directly.

```bash
PG_BINDIR=/absolute/path/to/postgresql18/bin node server/scripts/test-passport-delivery.cjs
```

The fixture creates synthetic accounts, mocked Para JWT/JWKS/signatures, actual PostgreSQL schema/transactions and contracts on an in-process Ganache EVM. It destroys its database cluster afterward. It never reads a production dump or submits to Robinhood/Abstract.

The final full runner passed **33/33 with zero skips** on Node **20.20.2** and **24.22.3**, PostgreSQL **18.7**, after independent peer review. The six focused worker regressions also passed independently on both versions. Ganache used its packaged JavaScript uWS fallback on Node 24; this did not change application dependencies or test assertions. `git diff --check` passed.

Coverage includes real Para-shaped authenticated HTTP fixtures, repeat signup, queue failure followed by safe retry, 40 concurrent registrations with exactly 33 Egg reservations, wrong wallet/chain, signer role/gas gates, sender-lock loss, lease replacement, one-block delay, crash after broadcast, canonical receipt recovery, idempotent no-mint receipt rejection, archival RPC failure/recovery, unchanged supply/owner, and a blocked reverted transaction. These are controlled test results, not live Para acceptance.

## Exact owner-controlled live acceptance

1. Approve the candidate deployment separately after review. Confirm the intended chain is Robinhood testnet 46630, the existing three reviewed collection addresses are retained, and signer/contract flags remain chain-scoped. Do not change contract ownership, mint roles, artwork or supply as part of verification.
2. Before starting any enabled sender, review the actual active database queue and approve its intended resumption. A deployment that starts an enabled worker can also deliver any already-pending jobs. Authorization for a single new test account does not silently authorize additional pending jobs. Resolve the Batch B runtime-binding caveat and agree the expected count before this step.
3. Choose one founder-controlled account for the live test. For a fresh end-to-end signup, explicitly approve at most one new Passport and its eligible reserved Egg, plus any separately approved pending-queue work. Reusing an already registered controlled account can verify idempotency without intentionally creating a new registration. Never share a Para code, password, private key or session token in the report.
4. Record timestamped aggregate baseline counts and the selected chain/contract addresses. The founder opens `https://antarcticgaming.co/early`, reads the consent, completes Para sign-in and the wallet ownership step personally, then checks that the displayed wallet/chain match the intended account. Do not create a live account from an automation fixture.
5. Observe one registration and at most one Egg reservation for that account. Wait for delivery; keep pending states visible while the service wakes or confirmations arrive. Capture only the public transaction hash, contract, token ID, canonical block and resulting acceptance status. Require the Passport and, if eligible, Egg acceptance endpoints to report the correct wallet, chain and reserved edition after two canonical L2 blocks. A configured worker or `queued` response is not acceptance.
6. Refresh and sign in again using the same account. Require unchanged registration, claim, edition and mint transaction; no additional mint Transfer or supply increment may result. Verify the receipt and image URLs after confirmation. Do not transfer, burn, remint or clear registration records to make the test pass.
7. If a job fails, preserve its row and transaction evidence, record the safe error category, and stop additional test signups. Delayed receipts retry without a new send. A reverted receipt remains blocked for a reviewed operator decision. Archive-RPC failure must remain pending/retrying until the original receipt can be proved. Do not manually reset a confirmed or submitted row on production.
8. Record live acceptance only after the founder has completed consent and the actual canonical receipt checks. Production verification, owner signatures and any mint authorization remain open until then.

## Changed files and continuation

Delivery source: `server/antarcticPassportWorker.js`, `server/antarcticPassportStore.js`, new `server/passportMintRecovery.js`. Tests: `server/tests/antarctic-passport.test.js`, new `passport-recovery.test.js` and `passport-recovery-integration.test.js`. Reproducible fixture launcher: `server/scripts/test-passport-delivery.cjs`. No package/dependency changes, runtime feature-flag changes, schema migration or contract mutation are required by this worker fix.

Independent worker review and the final combined suite are complete. Continue within Batch C by preparing the reviewable PR and retaining the separate C1/C2/auth reports. Do not start Batch D or a live mint without the founder's next authorization.
