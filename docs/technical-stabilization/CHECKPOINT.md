# FONSO technical stabilization checkpoint

Updated: 2026-11-28 (Asia/Kolkata). **Batch B in progress.**

## Current Batch B checkpoint

- Reviewed main is unchanged: `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`.
- Batch A PR #121 remains open, draft and unmerged at `19ceaa6c2d66ce726f9050ef1c674c3d06553e19`.
- Development branch: `codex/fonso-stabilization-batch-b`, created from that exact Batch A head. A separate stacked draft PR will target the Batch A branch while #121 remains unmerged.
- Acceptance: B1 evidence actual deployment versions and test relevant interface compatibility; B2 strict machine-readable health/readiness and monitoring; B3 evidence actual database binding or explicitly retain the access limitation, fix reproduced recovery defects, and verify recovery only with isolated data.
- Provider records independently confirm Vercel production `f696f576` and Render live `8324ff30`; the relevant existing interface source files are identical. No incompatibility is inferred solely from these different commits.
- Current health failure reproduced in the live browser: `/api/health` ends at `/coming-soon.html` with `text/html` and “Coming soon”. Render has an empty HTTP health-check path (TCP default).
- Runtime reports configured/ready Postgres stores, and Render startup logs confirm initialization. The exact Neon runtime host/branch binding remains unresolved because connected Render tools cannot read environment values. No credentials were retrieved or exposed in repository artifacts.
- Implementation in progress: read-only compatibility gate and local interface checks; health route/strict monitor/readiness; durable-store failure/recovery regressions and isolated restore procedure.
- Provider evidence: [`BATCH_B_PROVIDER_EVIDENCE.json`](BATCH_B_PROVIDER_EVIDENCE.json). Per-task evidence and test results will be added before handoff.
- No production deployment, merge to main, live account/mint/funding, contract, DNS/billing, or production database operation. Batch C and D remain **NOT STARTED**.

If interrupted, resume this Batch B branch and current working tree; do not rerun Batch A or company setup. Finish B1/B2/B3 and record the PR, tests, limitations and Batch C continuation before stopping.

## Preserved Batch A handoff

The following records the completed Batch A work; its old continuation instruction is historical while Batch B is in progress.

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
| Batches B, C and D | **NOT STARTED** | Continue sequentially only after this Batch A handoff. |

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

## Exact next continuation instruction

> Execute Batch B only for FONSO from `codex/fonso-stabilization-batch-a` in
> `defiventurers/articweb3`. Read `docs/technical-stabilization/CHECKPOINT.md`,
> `BATCH_A_FAIR_PLAY.md`, `BATCH_A_FUNDED_ACCESS.md`, `BATCH_A_EVIDENCE.json` and the
> linked Batch A PR first. Verify current main and PR state; do not restart the
> completed Batch A audit. Preserve its current-authority recovery, funded
> authorization, historical hold and the approved v5.10.2 APK baseline. Implement
> B1 frontend/backend compatibility, B2 machine-readable health monitoring and B3
> evidenced database binding/recovery. Reproduce each current issue before fixing
> it, use scoped reviewable commits and relevant tests, and save checkpoints
> incrementally. Determine actual Vercel/Render runtime artifacts and source
> transformations before choosing a deployment candidate. Use only isolated
> database restore tests. Prepare rollout/rollback and exact owner actions; do
> not deploy production, change DNS/billing, mint, modify contracts or perform
> irreversible database operations without separate founder authorization. Stop
> after Batch B with evidence and the Batch C continuation prompt.
