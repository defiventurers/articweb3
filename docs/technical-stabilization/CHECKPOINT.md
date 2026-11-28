# FONSO technical stabilization checkpoint

Updated: **2026-11-28 (Asia/Kolkata)**. **Batch C in progress.**

## Current Batch C checkpoint

- Founder instruction: “Merged resume from where you left off.” Continue the saved Batch C instruction; do not restart completed A/B audits.
- Read the attached `MASTER_COMPANY_CONTEXT(1).md`, revision 1.0; retain the approved v5.10.2 runtime/artwork and v5.11.1 review-build distinction.
- Verified main remains `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`. PR #122 is merged into the A development branch; PR #121 remains open/draft to main at `148e319c129d91421c21466c8567ddcc10ec145e`; documentation PR #123 remains open/draft at this observation. No production deployment is implied by the resume instruction.
- Branch `codex/fonso-stabilization-batch-c`, based on the final B checkpoint `30ab0a5d346bb6087da13ea0322e08c8b24a1a80`.
- C1: reproduce Passport #3 metadata failure; recover valid existing-token metadata without minting, reassignment or artwork replacement.
- C2: recover exact three Robinhood testnet deployment/build artifacts, compare creation/runtime bytecode, prepare correct explorer verification payloads. No verification submission/publication or transaction.
- C3: trace current Para signup and automatic eligible collectibles; fix reproduced idempotency/ownership/retry defects using isolated fixtures; reconcile dashboard and chain scopes.
- C1 implementation checkpoint: live Passport #3 metadata 404 reproduced despite canonical successful mint/current ownership. Missing backend receipt association caused the public-route failure. Signer-free metadata recovery, negative verification/resource bounds and Egg evidence chain binding are implemented; route failures were reproduced before fixes. A real local HTTP candidate returned #3=200/#999=404 using read-only official RPC through a test-only workspace transport. Default production transport and live deployment remain unverified. See `BATCH_C_METADATA.md` and `_EVIDENCE.json`.
- C2 progress: all three existing deployment receipts and creation inputs/current runtimes now match exact reconstructed artifacts. Missing `compileBundle` tooling export reproduced and repaired; no explorer submission or contract write. Contract evidence and reviewable publication payloads are being finalized.
- C3 progress: reproduced Para-link session revocation race, frontend stale-auth gate exposure, worker confirmation without canonical receipt and stale-lease overwrite. Fixes and negative tests are implemented. Isolated PostgreSQL 18.7/local-EVM checks are passing on Node 20.20.2 and Node 24; peer review and final consolidated evidence are in progress.
- Private reconciliation: connected-database observations and query evidence are retained in the founder-only appendix. Do not publish them to this public repository without explicit approval. Review the actual pending queue before authorizing any sender resumption.
- All A/B gates, historical holds, strict health/readiness and database recovery protections remain in force. Runtime Neon binding and production acceptance remain unresolved as previously recorded.
- No live signup/consent, mint, contract write, production deploy, DNS/billing change or production database write is authorized. Complete safe preparatory work and stop after C with the Batch D continuation.

If interrupted, resume this branch and current working tree. Finish C1/C2/C3, run relevant regressions, record code/evidence/PRs and owner-only actions, then stop. The Batch B handoff below is preserved historical context.

## Preserved Batch B handoff

Updated: **2026-11-28 (Asia/Kolkata)**. **Batch B implementation and isolated
verification complete; production acceptance remains pending. Stop after B.**

## Current review state

- Reviewed `main`: `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`, rechecked before handoff.
- Batch A [PR #121](https://github.com/defiventurers/articweb3/pull/121) remains open, draft and unmerged to main. Its development head is now `148e319c129d91421c21466c8567ddcc10ec145e`, containing the merged Batch B implementation.
- Development branch: `codex/fonso-stabilization-batch-b`, originally based on A head `19ceaa6c2d66ce726f9050ef1c674c3d06553e19`. Implementation [PR #122](https://github.com/defiventurers/articweb3/pull/122) was merged into the A development branch by `defiventurers` at 2026-11-28T03:02:26Z (08:32:26 IST), during final evidence recording. This session did not perform that merge. Tested implementation/CI commit: `6c71981b08c6036a844fa67ed7381f70964a031b`.
- Final documentation is collected in [PR #123](https://github.com/defiventurers/articweb3/pull/123), targeting the A branch. The merged A development tree exactly matches tested implementation tree `390b455791013506c8b9707af84fae91f96f2440`; the supplement changes documentation only. PR #121 now carries A and B together toward main. Review that combined candidate before any approved main merge: Render automatically deploys main.
- This batch performed no production deployment, main merge, environment/DNS/billing change, live signup/mint/funding, contract action, production data export or database mutation.

## Batch B acceptance and outcome

| Item | Status | Evidence / remaining boundary |
| --- | --- | --- |
| B1: historical frontend/backend SHA-skew defect | **NOT REPRODUCIBLE** | Current GitHub/Vercel `f696f576` and Render `8324ff30` have identical relevant server/shared/frontend source trees. Differences alone do not justify a deployment. |
| B1: candidate compatibility gate | **FIXED AND TESTED LOCALLY** | Read-only contract/identity/policy probe and real transformed startup tests cover API capabilities, saved sessions, Para binding and socket envelopes. |
| B2: misleading health routes and monitoring | **FIXED AND TESTED LOCALLY** | Exact rewrites, strict JSON monitor, live database/schema/privilege checks and startup-restoration latch. Production route verification remains pending. |
| B3: durable-store failure recovery | **FIXED AND VERIFIED IN TEST ENVIRONMENT** | Five initialization failures reproduced; retry/failure handling tested. Isolated PostgreSQL 18.7 outage/restart and 14-table/14-record dump/restore passed using synthetic data only. |
| B3: current Render-to-Neon binding | **BLOCKED BY ACCESS** | Connected Neon catalogs match 12 application tables, but no runtime configuration read proves that Render uses this branch. Owner-local configuration inspection is prepared; it is not automatically active-process proof. |
| Candidate production acceptance | **PRODUCTION VERIFICATION PENDING** | Backend-first rollout, runtime authority, strict company-domain health and configured DB evidence must pass on the approved deployed pair. |
| Deployment, configured binding and recovery objectives | **OWNER ACTION REQUIRED** | Exact actions and rollback safeguards are in the task runbooks below. |
| Batches C and D | **NOT STARTED** | Continue sequentially; no live consent, collectible delivery or physical Android acceptance claimed. |

## Reproduced causes and actual changes

**B1.** Provider deployment IDs and independent runtime commit evidence were
captured. The SHA difference does not change the relevant interfaces. A bounded
six-GET probe now distinguishes incompatible contracts, unresolved identity and
launch-policy holds. Actual startup transformations and build-generation paths
were traced; no frontend build is represented as the approved APK.

**B2.** The apex `/api/health` returns 307 to the Coming Soon HTML page because
the host redirect runs before the rewrite. Backend `/readyz` currently hits a
200/plain text fallback. The candidate exempts only the two intended company
health paths and serves schema-tagged `/healthz` and `/readyz`. Monitoring rejects
redirects, HTML, stale/malformed/oversized responses and status disagreement.
Required persistence failures produce 503. Readiness checks six gameplay tables,
the operations required by current stores, and completed startup restoration.
Initial restore failure stays held until a controlled restart.

**B3.** Five stores cached failed initialization forever and silently returned
memory results despite configured durable storage. They now retry with bounded
backoff, handle connection failure and reject failed durable operations without
automatically replaying writes. Idle-error handlers and six history callers were
hardened. Read-only schema/binding inspection and a fixture-only restore utility
were added; no application schema migration or lockfile was changed.

## Evidence and tests

- [Deployment compatibility / rollout / rollback](BATCH_B_COMPATIBILITY.md)
- [Health implementation / strict monitor / founder actions](BATCH_B_HEALTH.md)
- [Database binding / outage recovery / restore procedure](BATCH_B_DATABASE.md)
- [Combined commands, test digests and limitations](BATCH_B_EVIDENCE.json)
- [Provider records and live HTTP reproduction](BATCH_B_PROVIDER_EVIDENCE.json)
- [Read-only live compatibility observations](BATCH_B_COMPATIBILITY_OBSERVATIONS.json)
- [Sanitized Neon catalogs and actual isolated restore evidence](BATCH_B_DATABASE_EVIDENCE.json)

**141 selected tests passed on each runtime: Node 20.20.2 (observed Render version)
and Node 24.22.3.** This comprises 44 infrastructure checks and 97 relevant account,
free-game, Para, persistence and funded-isolation regressions. The final 16-test
readiness subset passed again after schema-CREATE checks were tightened. No
failures/skips remain. Test-only credential fixtures were adjusted after the
strict repository scanner flagged their dummy URL literals; the scanner was
preserved and rerun. Exact final reruns and CI evidence are recorded in the JSON.

[Batch B CI](https://github.com/defiventurers/articweb3/actions/runs/46100756791)
passed on Node 20.20.2 and Node 24 at the tested implementation commit: 44 + 97
tests on each, zero failures/skips. The full-checkout scanner checked 1,734 text
files with zero findings. All 14 GitHub checks passed, including Batch A, existing
frontend builds, game/server suites and security; the Vercel PR preview also
completed. Later handoff-only commits do not change that tested code. A preview
is not production acceptance.

Published authority integrity and exact reconstruction still pass: 113 declared
inputs checked, 60 loaded modules and 299,733 identical engine bytes. The immutable
rules manifest, engine digests, historical hold and approved visual/APK baseline
are preserved. Batch A source transformations remain in force; B2 adds readiness recording
after boot. Account/session formats, game rules, catalogue IDs and direct game
URLs are preserved. Only the two health paths gain routing exceptions. The database rehearsal compared 14 synthetic tables and
14 records; no production account data was read or exported.

## Remaining risks and exact owner actions

1. **Review merged implementation PR #122, documentation PR #123 and the combined main-bound PR #121.** Keep production changes
   separately approved. Pin the reviewed candidate SHA and build IDs; control
   automatic deployments before any merge to `main`.
2. **Establish database configuration evidence privately.** Follow the hidden
   local prompt in `BATCH_B_DATABASE.md` using the current Render Environment and
   linked group. Save only sanitized hostname/database/schema output and deploy
   metadata. Render Free has no shell/SSH/one-off job; do not upgrade billing for
   this check. A saved-only configuration change can differ from the live process,
   so retain that distinction until an approved runtime diagnostic establishes it.
3. **Approve an exact isolated candidate before rollout.** Keep all sender/indexer
   workers off, prepare its required account schema, verify role privileges and
   successful boot-room restoration, and run the compatibility and health CLIs.
   Failed durable writes are not a queue; an initial restore failure requires a
   controlled restart. Do not call in-memory progress durably saved during an outage.
4. **Approve backend-first production rollout separately.** Current live responses
   still advertise internal funded mode/high stakes and fair-config returns 503
   `LAUNCH_RESET_PAUSED`. Preserve Batch A authorization and historical holds;
   prepare funded-off settings for the approved release. The old Render artifact
   predates A and is not a safe automatic rollback. Do not open funded/registration
   gates merely to make a probe pass.
5. **After backend acceptance**, approve the frontend health rewrites and Render
   health path `/readyz`; verify exact apex JSON with the strict monitor. Render's
   own status-only check does not replace content validation. Rollback must retain
   safe code/configuration; an application rollback does not reverse database writes.
6. **Choose recovery objectives/retention.** Connected Neon reports a six-hour
   history window and no listed snapshots/schedule. Approve a named isolated cloud
   recovery target if a real-data rehearsal is required. No production restore,
   reset, remint or replay is authorized by this checkpoint.

## Exact next continuation instruction

> Execute Batch C only for FONSO from `codex/fonso-stabilization-batch-b` in
> `defiventurers/articweb3`. Read `docs/technical-stabilization/CHECKPOINT.md`,
> `BATCH_B_EVIDENCE.json`, `BATCH_B_COMPATIBILITY.md`, `BATCH_B_HEALTH.md`,
> `BATCH_B_DATABASE.md`, their linked evidence, PR #121, merged implementation [PR #122](https://github.com/defiventurers/articweb3/pull/122) and documentation [PR #123](https://github.com/defiventurers/articweb3/pull/123) first. Verify current main and all PR states; do not restart
> completed A/B audits. Preserve current-authority recovery, funded authorization,
> historical hold, strict health/readiness, database failure safeguards and the
> approved v5.10.2 APK baseline. Implement C1 Passport #3 metadata recovery without
> changing ownership/supply/artwork; C2 exact provenance and bytecode matching for
> the three existing Robinhood testnet contracts using current official docs;
> and C3 Para signup-to-collectible idempotency, eligibility, ownership and failure
> recovery with isolated automated tests. Reproduce current issues before fixes,
> use scoped commits/PRs and save checkpoints incrementally. Prepare exact
> controlled live test and owner actions. Do not create a live account, mint,
> change/deploy contracts, publish additional source for verification, deploy
> production, change DNS/billing or perform irreversible database operations
> without separate founder authorization. Stop after Batch C with evidence and
> the Batch D continuation prompt.

## Preserved Batch A handoff

The following preserves the completed Batch A evidence. The current Batch B status and Batch C continuation above govern new work.

## Outcome and review baseline

A1 and A2 fixes are implemented and tested locally. **167 selected automated
regression tests passed, with no failures or skips.** Exact reconstruction also
matches the published proof engine byte for byte. Production verification is
pending; this checkpoint is not launch approval.

- Repository: `https://github.com/defiventurers/articweb3`.
- Reviewed `main`: `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`, independently
  checked through Git and the GitHub branch API and rechecked before handoff.
- Development branch: `codex/fonso-stabilization-batch-a`.
- Draft pull request: [#121](https://github.com/defiventurers/articweb3/pull/121).
- Tested implementation commit: `0fdfe6fda6e4c1a38d0c44f6434f99f89774e224`.
- Earlier saved A1 implementation commit: `f4365ed80206076a62f9106d1aeb792b0fc088e7`.
- PRs #118 and #119 were read; both are merged. #119 is the reviewed main merge.
- Company Master Context, portable context, Engineering/Architecture/Backlog,
  APK Registry, QA, Infrastructure, Security Risk Register, Launch Readiness and
  Master Priority Backlog were read. Setup revision **1.7** was confirmed.

## Acceptance and status

| Item | Status | Evidence or remaining boundary |
| --- | --- | --- |
| A1: current `9fa0be4a…` authority | **FIXED AND TESTED LOCALLY** | Exact immutable artifact recovery; valid signed fixtures independently replay; altered inputs, rules identifiers/versions, signers and stale replays are rejected. |
| A1: live client/backend pair | **PRODUCTION VERIFICATION PENDING** | Public fair-config request returned 503 `LAUNCH_RESET_PAUSED`; live authority was not established. |
| A1: older `63845f4d…` authority | **OWNER ACTION REQUIRED** | Retain its hold. Recover the exact historical build if those historical proofs must be verified; do not repin them. |
| A2: application/server funded isolation | **FIXED AND TESTED LOCALLY** | Actual local startup wrappers and WebSocket dispatch reject outsiders and forged identities; approved identities succeed; free rooms remain usable. Source wallet writes require fresh server authorization. |
| A2: deployed backend/environment | **PRODUCTION VERIFICATION PENDING** | No live environment change or intrusive live access test was performed. |
| A2: direct on-chain vault closure | **OWNER ACTION REQUIRED** | Backend gates cannot prevent direct calls to an unpaused public vault. Active binding, bytecode and pause flags must be independently verified before any funded reopening. |
| At the Batch A handoff: B, C and D | **NOT STARTED** | Historical status; use the current Batch B section above. |

## Reproduced causes and implemented fixes

### A1 — fair-play authority

The integrity checker and old core tests selected `arcticPlayEngine.cjs`, while
the manifest and server proof service select `fairPlayEngine.cjs`. The latter
already has the correct published digest. A single declared source also drifted:
Dominion's approved pawn artwork expression and adjacent comment. The worker
compiled mutable source while applying a hold for a different historical rules
identifier. The ordinary source build could rewrite the published manifest and
both engines.

The candidate archives the exact original Dominion compilation input, preserves
its published source hash, compiles under its original module identity and checks
all 299,733 output bytes against the unchanged engine. The gate uses the correct
engine and checks declared inputs plus the exact reviewed presentation exception.
The worker loads that pinned engine, keeps historical/unknown authorities on
hold and clears replay after failures. Version checks and restored-proof guards
prevent writing new records under an incompatible authority or key. Unsupported
restored bot rooms preserve their state without repeatedly trying invalid moves.

Full provenance, digests, changed behavior, reproduction and rollback notes:
[`BATCH_A_FAIR_PLAY.md`](BATCH_A_FAIR_PLAY.md).

### A2 — funded access

A correctly signed but unapproved local fixture wallet could create an internal
funded room. The original gate checked only global launch configuration; it did
not establish participant membership and did not cover all existing-room,
spectator, background-start or settlement paths. An explicit disabled flag could
be overridden by a configured vault; unsupported chains could pass as testnet.

The candidate defaults internal access to denial unless the existing
signature-authenticated wallet is in the server-only allowlist. Stored room mode
controls all ingress aliases, filtered outputs/broadcasts and background actions.
Explicit disabling wins; the existing Abstract testnet path accepts only 11124.
Operator requests use header credentials, with the matching protected CORS
preflight. Source deposits/locks require a fresh wallet/chain-bound policy reply,
recheck identity after awaiting it and reject stale rooms or an older backend.
Withdrawals and expired-entry recovery remain available.

Full reproduction, endpoint/protocol coverage, deployment preparation and direct
contract limitations: [`BATCH_A_FUNDED_ACCESS.md`](BATCH_A_FUNDED_ACCESS.md).

## Changed files and preserved scope

The exact **38 changed paths** are in
[`BATCH_A_EVIDENCE.json`](BATCH_A_EVIDENCE.json). They comprise:

- Fair-play checker, immutable reproduction utility/archive/provenance, core,
  source worker/panel, server proof continuation and bot scheduling safeguards.
- The three source-build entrypoints and their shared authority guard.
- Funded access policy and production source transformation, launch chain gate,
  operator CORS, source frontend preflight and header-authenticated operator client.
- Focused regression tests, `.github/workflows/fonso-batch-a.yml`, `.env.example`
  documentation and this stabilization documentation directory.

`rules-manifest.json`, `release-readiness.json`, both tracked CJS game engines and
the current Dominion presentation source are byte for byte unchanged from main.
No game rule, catalogue ID, direct game URL, board geometry, approved artwork,
contract, migration or signed APK was changed. No source build is represented as
reproducing the approved APK. Historical source/Android delivery differences
remain for the later Android batch.

## Test evidence

Node **24.22.3**, existing lockfiles; dependencies installed using
`npm ci --ignore-scripts --no-audit --no-fund` in `server`, `shared/fair-play` and
`mobile/arctic-play/build-deps`. No install lifecycle build was run.

| Check | Result |
| --- | --- |
| `node shared/fair-play/check-rules-integrity.mjs` | PASS; 113 declared sources and the pinned archive checked |
| `node shared/fair-play/reproduce-rules-authority.mjs` | PASS; Rolldown 1.2.15, 60 loaded modules, 299,733 identical output bytes |
| A1 proof/artifact/server/worker suite | **36 passed**, 0 failed, 0 skipped |
| A2 access/launch/operator/frontend/free-socket suite | **34 passed**, 0 failed, 0 skipped |
| Existing Chaturanga/Arctic Play/Shanshui Node regressions | **20 passed**, 0 failed, 0 skipped |
| Existing San You Qi/Sannin Shogi/Shogi Vitest suites | **77 passed**, 0 failed, 0 skipped |
| Source UI verification | Changed JSX screens parse/transform; Fair Play status rendering checked |
| `git diff --check` | PASS |
| `node scripts/security-scan.mjs` | PASS; 1,431 available tracked text files, zero findings (lightweight scanner) |
| GitHub CI | Batch A workflow PASS at the tested implementation commit; 167 tests and full-checkout scanner (1,705 files, zero findings). Other check results are recorded in the evidence snapshot. |

CI evidence: [Batch A workflow](https://github.com/defiventurers/articweb3/actions/runs/46098826536). Existing frontend testnet/mainnet builds and server configuration checks also passed. The existing Vercel integration generated a successful PR preview; it is not a production release. Later commits updating only this handoff do not change the tested code.

Exact commands, log digests, unchanged artifact digests and sanitized observations
are in `BATCH_A_EVIDENCE.json`. The new workflow reruns these checks. An initial
attempt to run Vitest suites under Node's runner was corrected to use the pinned
Vitest executable; all 77 cases then passed.

The browser-targeted worker executes in a Node VM with isolated fixture keys.
Its fixture coverage is the eight tables exposed by `arcticPlayGames.GAME_LIST`
plus the paired long-dice profile. Co Tu Lenh and Shanshui 2v2 have separate
core/service coverage. No browser, emulator, physical-device or live-mainnet
acceptance is claimed. Local socket fixtures use actual production wrappers,
signature verification and game dispatch; financial calls are mocked/disabled.

Independent reviews checked A1 provenance/worker/build callers and A2
transformation/alias/authorization paths. Review findings were addressed and the
final 36- and 34-test suites rerun.

## Accepted decisions and owner-only steps

1. Preserve published authority digests and the current approved presentation.
   An exact archived source input is allowed only when its full published digest
   and reproduced engine agree; arbitrary source changes fail closed.
2. Keep the unsupported historical authority and retained APK hold. No guessed
   artifact, success override or change to expected hashes is acceptable.
3. Enforce internal authorization on the server's signed socket identity. A
   client flag, role, room mode or global launch-status reply grants no access.
4. Use the repository's supported transformed `npm start` path. Raw
   `node server/index.js` bypasses existing transformation layers and is not a
   validated deployment command.
5. Review the draft PR. Batch B must reconcile actual frontend/backend artifacts
   and test the candidate pairing before proposing a production rollout.
6. For an eventual approved rollout, retain `LOCKED_MATCH_MODE=off`,
   `HIGH_STAKES_ENABLED=false`, `LEGAL_PUBLIC_MAINNET_APPROVED=false` and a blank
   internal allowlist until a separate funded rehearsal is explicitly approved.
   No production settings were changed here.
7. Before any funded reopening, verify the active vault's chain, address, bytecode
   and deposit/lock/settlement pause flags. Prepare any required owner transaction
   for separate approval and preserve withdrawals/expired-lock recovery. No
   contract or wallet action was taken in this batch.
8. No new infrastructure, production deployment, merge to main, live account,
   mint, funded match, DNS/billing change or production database operation occurred.

## Batch A continuation completed

The former Batch B instruction has been executed. Use the current Batch C
continuation at the start of this checkpoint; do not restart the Batch A audit.
