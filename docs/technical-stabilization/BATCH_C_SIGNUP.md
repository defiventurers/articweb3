# Batch C3 — Para signup, account ownership and receipt display

Reviewed implementation base: `30ab0a5d346bb6087da13ea0322e08c8b24a1a80`. Branch: `codex/fonso-stabilization-batch-c`; resume checkpoint: `138ca6b56057cd5f9b1e1022be8b0e256f41f87f`. Evidence date: 2026-11-28 UTC. This report covers the authentication and early-page portion of C3. Delivery-worker evidence and the complete controlled mint procedure are in [BATCH_C_DELIVERY.md](BATCH_C_DELIVERY.md).

## Outcome

| Issue | Status | Evidence and remaining boundary |
| --- | --- | --- |
| Session revocation/deletion racing an explicit Para account link | FIXED AND TESTED LOCALLY | Reproduced a successful exchange after revocation; the candidate rechecks the linking session inside the account-binding transaction and keeps unfinished identity mappings unusable for ordinary login. |
| Interrupted account-link recovery | FIXED AND TESTED LOCALLY | Expired unbound reservations recover to a fresh account; a committed wallet binding recovers the original account and saved progress. A delayed old binding cannot resume after recovery. |
| Early page revealing Home after session or wallet invalidation | FIXED AND TESTED LOCALLY | Three asynchronous gate regressions pass against the actual page script with mocked HTTP responses. |
| Wrong-chain Egg acceptance evidence | FIXED AND TESTED LOCALLY | Root's separate route fix requires the proof chain to match the registered chain; direct API regression covers matching and mismatched evidence. |
| Deployment and actual Para consent-to-delivery acceptance | PRODUCTION VERIFICATION PENDING | No candidate deployment or live account/signature/mint was performed. |
| One controlled live signup and eligible delivery | OWNER ACTION REQUIRED | Requires explicit approval, founder completion of Para consent, and approval of any already-pending jobs before enabling a sender. |
| Historical account-to-mint attribution and actual Render database binding | BLOCKED BY ACCESS | Current aggregate counts are recorded below; the historical branch has no reachable endpoint, and the active Render database binding is not established. |

No catalogue IDs, direct game URLs, artwork, game rules, paid-mode controls, Para SDK, authentication provider, database schema or signed Android payload were changed by this portion of C3. The public early-page JavaScript is a separate source path from the retained v5.10.2 APK.

## Actual signup flow

| Step | Current implementation and checked protection |
| --- | --- |
| Open early page | `frontend/public/early/index.html` and `passport-launch.js` keep Home inert until ticket exchange and authenticated wallet validation complete. The page checks `/auth/para/config` before starting. |
| Consent and sign-in start | The page requires the existing adult confirmation and `early-signup-v1` consent. `/auth/para/start` stores that consent in the server-side attempt with an S256 PKCE challenge and the approved early-page origin/return path. |
| Para consent and wallet association | The wallet portal uses the existing Para integration. The backend checks an RS256 JWT against the configured audience/JWKS, identity, time limits and non-guest authentication; the requested EVM address must be among the attested managed wallets. A connected-wallet claim alone is insufficient. A request-bound signature proves possession. |
| Account identity | A one-use ticket plus the original verifier is required for exchange. Para identity is scoped by environment, audience and subject. Matching email addresses do not silently merge accounts. Explicit linking additionally requires the current game account's session. |
| Account and enrollment | The server binds the attested wallet, creates an opaque game session, and records source/consent/first enrollment time. Early enrollment requires Para on Robinhood testnet 46630. A client-supplied delivery address is not trusted. |
| Eligibility and registration | `earlySignup.fulfill` invokes the existing automatic registration. Database constraints/transactions preserve idempotency and the shared first-33 eligible Egg allocation. A queue failure preserves sign-in and retries on an authenticated Passport read. |
| Send and confirmation | Passport precedes Egg. Existing signer/network/launch gates remain. The C3 delivery fix requires the canonical original mint receipt and fences stale worker writes; see the delivery report. |
| Backend receipt | Confirmed rows retain chain, wallet, token and transaction association. A reserved/queued/submitted job is not a received collectible. |
| Visible status | The page calls the account's acceptance endpoints and requires matching chain, wallet, token and transaction plus `paraWalletVerified` before showing `Received`. Pending/unavailable verification remains visible as pending. |
| Repeat and recovery | Repeat sign-in returns the same account and registration; retries do not intentionally issue another collectible. Browser refresh responses are discarded when the current session changes. |

Code references: `server/paraGameWallet.js`, `server/companyAuth.js`, `server/earlySignup.js`, `server/antarcticPassport.js`, `server/antarcticPassportStore.js`, `server/antarcticPassportWorker.js`, and the early-page script. Para's [official JWT/session documentation](https://docs.getpara.com/v3/react/guides/sessions-jwt) was checked against the managed-wallet/audience/JWKS assumptions; the existing provider verification was retained.

## Reproduced root causes and corrections

### Explicit linking checked the session before a later write

`identityAccount` previously checked the target account session, then wrote its `auth-identity` mapping, then performed a separate account transaction to bind the wallet and issue a new session. Revocation or deletion between these operations could leave an accepted identity mapping or complete a link after its authorization disappeared. The isolated regression revoked the session immediately before the mapping write: the old implementation returned HTTP 200 where HTTP 401 was required.

`companyAuth.js` now rechecks the target session in the transaction that binds the wallet and issues the session. A newly created explicit link starts as a 120-second reservation in the existing identity document. Ordinary sign-in cannot use that pending mapping. Finalization requires the same account and reservation ID. There is no schema migration or session-token format change.

An interruption must also be recoverable without giving the new identity access to an unrelated saved game:

- If no wallet binding committed, an expired reservation can be replaced with a fresh ordinary account. The original target's save remains private and unchanged.
- If the wallet binding committed but identity finalization failed, recovery recognizes the same attested wallet and retains the original account/save.
- Recovery serializes with any binding already using the target account transaction, then compares the original identity reservation before replacing it. A later old binding must still pass its original deadline and session checks.
- Revocation/deletion immediately before the mapping or final binding is rejected; a deleted explicit target is not recreated. Active legacy mappings continue to work.

Tests cover both interruption outcomes and a paused old request resuming after another sign-in safely recovers the expired reservation. They do not call real Para or expose account identifiers in this evidence.

### The browser ignored an unsuccessful refresh

The existing-account consent path called `refresh()` but ignored its Boolean result. When refresh returned 401, it cleared the session; the subsequent optional account check was false and the code revealed Home anyway. Separately, a previously verified wallet becoming invalid during refresh cleared account data but left the already-open app visible. Both regressions failed against the unchanged script.

The candidate requires a successful refresh, the same session and a verified wallet before opening Home. A single `clearSession` helper hides/inerts Home and returns to the entry gate when validation fails. A delayed consent response cannot reopen an account after sign-out. These are gate/state corrections, with no visual redesign or new onboarding step.

### Egg proof chain was not included in the final route decision

The existing Egg acceptance route checked the registered wallet's chain but omitted `evidence.chainId` from its final `confirmed` condition. The separate root-owned route change adds that equality check. `server/tests/passport-acceptance-network.test.js` first reproduced wrong-chain evidence being accepted, then passed after the correction. The frontend already independently checked the evidence chain; the server now enforces it too.

## Count scopes

The public chain observation records the full-contract history (20 Passport and
12 Egg mints), while the dashboard source code selects an attributed account and
receipt cohort. Those are different populations. Private connected-database
counts, state observations and query results are retained in the founder-only
handoff. They must not be republished to this public repository without explicit
permission. Production binding and historical account attribution remain subject
to the Batch B owner checks.

## Regression evidence

Local Node 20.20.2 and 24.22.3, synthetic data only. Use the existing CI pin `jsdom@26.1.0` for the DOM harness, installed in an isolated test directory with `--ignore-scripts`; no repository dependency changes were required:

```bash
node --test server/tests/company-service.test.js server/tests/company-account-play.test.js server/tests/para-game-wallet.test.js server/tests/early-signup.test.js
NODE_PATH=/absolute/path/to/isolated-jsdom26/node_modules node --test frontend/tests/early-entry.test.cjs
node --check server/companyAuth.js
```

- Backend: **35/35 passed, zero skips on each runtime**. Includes the four new reservation/race tests, PKCE/replay/identity-wallet checks, repeat signup, delayed queue recovery, original saved progress, Google handoff, account rotation/recovery/logout, production guest gates and retained Android sign-in compatibility fixtures.
- Early-page DOM: **15/15 passed, zero skips on each runtime**. Includes the three new asynchronous gates plus existing correct/incorrect receipt, wallet, network, consent and entry-state cases.
- Syntax check passed. The separate Egg route regression passed **1/1**. Delivery PG/EVM and contract provenance results are recorded in their respective reports, not counted again here.

The initial Node 20 attempt using an already-installed jsdom 30 dependency tree failed before application assertions because that harness's `undici` expected `createZstdDecompress`. Re-running both runtimes with the repository's existing jsdom 26.1.0 CI pin passed; no application workaround or dependency upgrade was introduced. Independent peer review examined Para completion, PostgreSQL per-record lock ordering, expired reservation recovery, revoked/deleted accounts and stale browser responses, with no concrete blocking issue found.

The baseline failures, commands and boundaries are preserved in [BATCH_C_SIGNUP_EVIDENCE.json](BATCH_C_SIGNUP_EVIDENCE.json). DOM/HTTP fixtures do not establish physical Android acceptance or live Para consent.

## Owner-controlled live acceptance

Follow the complete procedure in the delivery report after separate candidate deployment approval. Before starting an enabled sender, prove the actual runtime database binding and approve any intended pending queue resumption. One newly approved signup must not silently authorize arbitrary backlog delivery.

For one founder-controlled account, preserve any existing save and sign-in session. Record the intended chain/collection and sanitized aggregate baseline; the founder personally accepts the existing terms and completes Para. Check the displayed server-bound wallet/chain, one registration and its eligible Egg reservation. Wait for actual canonical mint receipts; check account acceptance, metadata/image URLs and token identity. Save only safe evidence such as public contract/token/transaction and the observed status, never tokens, credentials or private account records.

Repeat refresh and sign-in with the same account; registration, edition and mint transaction must remain stable and supply must not increment again. If delayed or failed, keep the reservation and original receipt evidence, stop additional signups, and use the documented recovery path. Do not burn, transfer, remint, reset production rows or clear an existing save to pass acceptance. Live consent and actual delivery remain unverified until these founder-controlled steps complete.

## Changed files and next continuation

This portion changes `server/companyAuth.js`, `server/tests/para-game-wallet.test.js`, `frontend/public/early/passport-launch.js`, and `frontend/tests/early-entry.test.cjs`, plus this report and its evidence JSON. Root owns the separate Egg route change; the worker agent owns delivery recovery.

Independent auth review and focused Node 20/24 checks are complete. Continue by recording the batch-wide combined results and preparing the Batch C PR. Production, live account/mint authorization and Batch D remain separate gates.
