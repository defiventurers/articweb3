# FONSO technical stabilization checkpoint

Updated: **28 November 2026 (Asia/Kolkata)**. **Batch D code and local isolated
verification complete; final CI is pending. Stop after D.** Physical Android,
live Para/free-network acceptance and production deployment remain owner gates.

## Current review state

- Reviewed main: `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`.
- Branch: `codex/fonso-stabilization-batch-d`, based on completed C checkpoint
  `75328370f0703ab7907dda9dc833f8aab93c21f9`. Resumed the saved D continuation
  after the founder said “Resume”; completed A/B/C audits were not restarted.
- [D PR #125](https://github.com/defiventurers/articweb3/pull/125) is open/draft,
  stacked on C PR #124. PR #121 remains open/draft toward main; #122 is merged
  into A; #123 and #124 remain open/draft. No main merge was performed.
- Reviewed commits so far: `2505b93f3acb025c6de967c58e8cd99f8501f2c6`
  (retained APK verifier) and `3ebb00386208acf3efc6cd529b15610996b45924`
  (legacy socket authorization and delayed replay correction). Final tested
  candidate/CI identity will be recorded in `BATCH_D_EVIDENCE.json`.
- No production deployment, live account, mint, funded match, contract/DNS/billing
  change, production database operation or held private-package publication.

## Batch D outcomes

| Item | Status | Evidence / boundary |
| --- | --- | --- |
| Retained APK identity/payload mismatch | **NOT REPRODUCIBLE** | Exact v5.10.2 and signed v5.11.1 recovered; original digests, certificates, versions and all expected payload bytes verified. |
| Repeatable APK verification tooling | **FIXED AND TESTED LOCALLY** | Read-only tool; 11 negative/preservation tests plus 5 existing layout tests pass. A corrupted temporary APK fails digest, signature and CRC checks. |
| Retained UI/worker acceptance harness | **FIXED AND TESTED LOCALLY** | Six bounded scenario groups pass on each exact APK; existing baseline4/review9 navigation groups also pass. |
| Local rendered-browser/emulator checks | **BLOCKED BY ACCESS** | Chromium executable missing and official download403; no emulator/adb/KVM. Fresh rendered CI is pending and is not physical acceptance. |
| Free socket identity and delayed replay | **FIXED AND VERIFIED IN TEST ENVIRONMENT** | 18 legacy wallet families require signature-bound identity; Two Stones retains accepted-request fingerprints outside rules/proof state. |
| Two independent free clients / database restart | **FIXED AND VERIFIED IN TEST ENVIRONMENT** | Natural five-ply Two Stones win; signed Shogi reconnect/PG restart and resignation agree and independently verify. 16/16 tests on both Node versions, zero skips. |
| Physical Android, live Para and live free match | **OWNER ACTION REQUIRED** | Existing save must be preserved; v5.11.1 is still a signed review build. |
| Production acceptance | **PRODUCTION VERIFICATION PENDING** | Exact candidate deployment, active database binding and inherited A/B/C operational gates remain. |

## Root causes and changes

- The shared wallet-profile map proved that a wallet existed, but not that a
  socket owned it. The old ingress allowlist omitted 18 reachable prefixed game
  families. A third unsigned local socket could act as a seated wallet. The
  shared guard now covers those families while retaining public listings and
  separate account/seat protocols; Two Stones also rechecks identity before
  assigning its broadcast socket.
- Turn validation rejected immediate duplicates but allowed an identical old
  Two Stones envelope at ply12 after it first succeeded at ply5. Accepted
  request hashes now bind match, wallet and ID type/value, persist in optional
  room metadata and remain bounded to all44 possible actions without eviction.
  Existing rules, proof input and SQL schema are unchanged.
- Added read-only APK verification, exact retained UI/worker/save/auth fixtures,
  a loopback-only fresh PostgreSQL runner, actual startup/socket regressions,
  CI and physical/rollout/rollback instructions. No APK, art or game engine was
  modified. APK payloads retain their original workers; A/B/C source changes
  must not be represented as automatically bundled into them.

## Test evidence

- Exact APKs: v5.10.2/code106 SHA `275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd`;
  v5.11.1/code111 SHA `91fbc8cd0578462511356888e8fab5e6008f9008e555571dbf93473783488f3e`.
  Both original v2/v3 signatures and package match; 438/444 payload entries and
  all416 artwork entries are identical. Six expected changes reproduce exactly.
- `python3 -m unittest discover -s mobile/arctic-play/tests -p 'test_retained_apks.py'`:
  11/11; existing `test_apk_layout.py`:5/5. Parent independently reran exact-pair
  verification and confirmed unchanged original files.
- Exact retained assets: existing baseline navigation4, review navigation9,
  new acceptance6 per artifact. These are scenario groups, not unit-test totals;
  account/native/image fixtures are explicitly distinguished from Android.
- `PG_BINDIR=/path/to/postgresql18/bin node server/scripts/free-multiplayer-smoke.cjs`:
  16/16, zero skips, independently rerun on Node20.20.2 and24.22.3 with fresh
  PostgreSQL18.7. Both configured-database cases ran and the fixture was removed.
- Existing funded/socket, deployment compatibility, request security and
  anti-cheat transformation gates:24/24 on each Node version. The rules-integrity
  check still validates113 published inputs under unchanged authority `9fa0be4a…`.
- A later-source Chaturanga UI fixture fails identically on both retained APKs
  because it expects absent newer die markup. This is recorded as a path
  mismatch, not concealed as a passing check or used to change approved art.
- Independent runtime and fixture reviews found no remaining concrete blocker.
  Fixture URL override and teardown defects were corrected and regression-tested.
  CI and full-checkout scanner results will be recorded after the final test push.

These gates overlap; do not add them as unique tests. See [combined evidence](BATCH_D_EVIDENCE.json),
[APK verification](BATCH_D_ANDROID.md), [APK evidence](BATCH_D_ANDROID_EVIDENCE.json),
[retained acceptance/physical checklist](BATCH_D_ACCEPTANCE.md),
[acceptance evidence](BATCH_D_ACCEPTANCE_EVIDENCE.json),
[multiplayer](BATCH_D_MULTIPLAYER.md), [multiplayer evidence](BATCH_D_MULTIPLAYER_EVIDENCE.json)
and [rollout/rollback](BATCH_D_ROLLOUT.md).

## Remaining risks and exact owner actions

1. Review PR #125 with its A/B/C dependency and pin the accepted candidate.
   Development review/merge does not authorize production; main auto-deploys in
   the recorded Render configuration.
2. Preserve the current phone/save. Verify the original signed review hash,
   perform an approved in-place upgrade and compare the existing save first.
   Use only a spare device/empty profile for clean installation. Follow the
   full native/visual/Back/TalkBack/performance/crash checklist and record
   acceptance or rejection. No uninstall/data clearing or forced downgrade.
3. Resolve the privately evidenced runtime database binding and separately
   approve any exact backend-first deployment under B/C/D controls. Senders and
   funded/settlement gates stay closed unless their actions are explicitly
   approved. C pending-link reservations prohibit a blind pre-C auth rollback.
4. Approve and personally perform any real Para consent/signature and live
   two-device free match, without incidental new accounts or collectible mints.
   The prepared C private operational and contract-verification packages remain
   held for explicit publication/transaction approval.
5. Retain limits: pre-upgrade Two Stones IDs were not recorded; the legacy save
   path still acknowledges before its asynchronous write. Tests confirm saved
   restart restoration, not the acknowledgment-to-persistence crash window.
   The exact original v5.10.2 signing checkout and historical proof artifact
   remain unresolved; the historical hold was not removed.

## Exact next continuation instruction

> Resume release acceptance only from `codex/fonso-stabilization-batch-d` in
> `defiventurers/articweb3`. Read this checkpoint, `BATCH_D_EVIDENCE.json`,
> `BATCH_D_ANDROID.md`, `BATCH_D_ACCEPTANCE.md`, `BATCH_D_MULTIPLAYER.md`,
> `BATCH_D_ROLLOUT.md` and PR #125 with its A/B/C dependencies. Verify current
> main/PR/CI states and finish any explicitly recorded pending CI only. Do not
> restart completed A–D investigations. Preserve the exact v5.10.2 baseline,
> founder's saved game, current rules authority, historical hold and every
> authorization/database/receipt safeguard. Guide the founder through the
> already prepared physical and controlled live acceptance steps only when
> their prerequisites and explicit approvals are supplied. Do not deploy,
> merge main, create live accounts, mint, change contracts/DNS/billing, publish
> held private packages or perform irreversible database operations without
> separate founder authorization. Record actual observations and remaining
> gates; never infer physical or production acceptance from automated tests.

## Preserved Batch C handoff

Updated: **28 November 2026 (Asia/Kolkata)**. **Batch C code and isolated
verification complete. Production and live collectible acceptance remain
pending. Stop after C.**

## Current review state

- Reviewed main: `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`.
- Resumed the saved Batch C instruction after the founder said “Merged resume from where you left off.” PR #122 is merged into the A development branch, while PR #121 remains open/draft toward main. Documentation PR #123 remains open/draft at the last check. This session did not merge main or deploy production.
- Branch: `codex/fonso-stabilization-batch-c`, based on final B checkpoint `30ab0a5d346bb6087da13ea0322e08c8b24a1a80`. [C PR #124](https://github.com/defiventurers/articweb3/pull/124) is open/draft and stacked on the B branch to preserve its documentation supplement. Tested implementation: `9a5c65dff6c69b878554bdf0e6eaa00eed11b115`. Final PR/CI state is recorded in `BATCH_C_EVIDENCE.json`.
- Approved v5.10.2 APK, artwork, board geometry, catalogue/direct URLs, rules, saved-game formats, Abstract support, A funded authorization and historical holds, and B health/database safeguards are preserved.

## Batch C outcomes

| Item | Status | Evidence / boundary |
| --- | --- | --- |
| C1 existing Passport metadata recovery | **FIXED AND TESTED LOCALLY** | Live #3 metadata404 reproduced despite successful canonical mint/current ownership. Verified read-only fallback retains existing art and avoids invented account/date/achievements. |
| C1 candidate live-read check | **FIXED AND VERIFIED IN TEST ENVIRONMENT** | Local company HTTP service plus fixture association store and read-only official RPC returned #3=200/#999=404. Test-only workspace transport; production default transport remains pending. |
| C1 intended live URL | **PRODUCTION VERIFICATION PENDING** | No production deployment or tokenURI change. |
| C2 compiler API | **FIXED AND TESTED LOCALLY** | Restored missing compileBundle export; existing outputs and all Solidity unchanged. |
| C2 exact provenance / source publication | **OWNER ACTION REQUIRED** | All three creation inputs/current runtimes match. Full source/constructor/transaction/verification package prepared privately; explorer still unverified and publication not approved. |
| C3 auth, receipt recovery and lease protection | **FIXED AND TESTED LOCALLY** | Current-session link authorization, expiring pending-link protection, failed-refresh gate, strict Passport/Egg receipts, original-mint hash recovery and stale-worker fencing. |
| C3 live Para consent/delivery | **OWNER ACTION REQUIRED** | Mocked/isolated automated flow passed; no live account, wallet signature or mint performed. |
| Runtime database binding / historical association | **BLOCKED BY ACCESS** | Prior B runtime-binding gap remains. Private operational reconciliation is retained separately for the founder. |
| Batch D | **NOT STARTED** | Physical Android and free-match acceptance must not be inferred from these results. |

## Root causes and actual changes

- Metadata relied exclusively on a confirmed backend receipt join and returned404 when the association was missing, despite the existing token. A signer-free reader checks reviewed collection/code, chain, two-block owner/URI and canonical block with bounded RPC/cache behavior. Configured database failures remain503. Existing associated metadata stays intact.
- The contract verification callers imported a missing compiler export. The additive builder restores that API, using pinned source/dependencies and identical bytecode. Exact review payloads were prepared without submission.
- An already-minted claim bypassed canonical receipt validation. Crash recovery now proves and saves its original mint hash, with no resend of an existing claim. Job writes match the current attempt and lease.
- Explicit Para linking checked authorization before a later account-binding transaction. It now rechecks inside that transaction and holds incomplete mappings behind a short reservation. The web page now closes Home on failed/stale session or wallet refresh. Egg acceptance also checks the proof chain.

## Test evidence

All local gates passed on **Node20.20.2** and **Node24.22.3**, with zero skips:

| Gate | Passed per runtime |
| --- | ---: |
| Metadata, invalid artifacts, privacy, cache and HTTP/chain acceptance | 32 |
| Synthetic PostgreSQL18.7 + actual local EVM delivery/lease/first33 tests | 33 |
| Account service, saved gameplay, Para authorization and signup | 35 |
| Actual early-page DOM using existing CI jsdom26.1.0 pin | 15 |
| Existing contract/compiler/local-EVM regressions | 9 |
| Additional exact-evidence verification tests in private package | 9 |

[Batch C CI](https://github.com/defiventurers/articweb3/actions/runs/46103075618) passed all five public gates on both runtimes with no failures or skips; the full-checkout credential scan checked 1,753 text files with zero findings. A/B and existing Passport acceptance CI also passed on this implementation. Later handoff commits change documentation only.

These gates overlap; do not add them as unique test cases. The private package is
not published in CI. The initial Node20/jsdom30 harness attempt failed before
application assertions; the existing CI jsdom26.1.0 pin passed on both runtimes.
No application dependency change was made. Rules integrity still checks113 inputs
against the unchanged published authority. The lightweight credential scan found
zero findings. Independent metadata, auth and delivery reviews found no blocker.

- [Metadata](BATCH_C_METADATA.md) and [local HTTP/live-read evidence](BATCH_C_METADATA_EVIDENCE.json)
- [Compiler repair / private source-verification gate](BATCH_C_CONTRACTS.md)
- [Signup/authentication](BATCH_C_SIGNUP.md) and [test evidence](BATCH_C_SIGNUP_EVIDENCE.json)
- [Delivery recovery](BATCH_C_DELIVERY.md) and [test evidence](BATCH_C_DELIVERY_EVIDENCE.json)
- [Exact rollout/rollback and live acceptance](BATCH_C_ROLLOUT.md)
- [Combined evidence and PR/CI state](BATCH_C_EVIDENCE.json)

## Private evidence and publication boundary

Automatic approval review blocked public GitHub upload of connected-database
observations/internal SQL, and separately of the complete contract source/input/
transaction/submission package. The private operational appendix and contract
review ZIP were saved for the founder. The current public candidate contains
code, tests and sanitized handoff instructions. Publishing those private packages
requires explicit approval. An earlier C1 commit contained a brief operational
summary; current documents remove it, but Git history has not been erased. The
founder has the exact history detail in the private appendix.

## Exact owner actions

1. Review the stacked C PR and A/B dependency. Pin an accepted candidate; do not infer production approval from a development merge.
2. Establish active database binding privately, review pending collectible jobs, and approve any intended resumption. Deploying an enabled sender can process existing work in addition to a new test signup.
3. Separately approve a backend-first deployment with sender/funded gates closed unless their actions are explicitly authorized. Validate B health/compatibility and C1 default RPC transport/token metadata before accepting production.
4. Review and explicitly authorize publication/submission of the exact private contract-verification ZIP. All three explorer sources remain unverified until actual success is checked.
5. Approve and personally perform the controlled Para consent/wallet test; authorize its eligible mints and any backlog separately. Preserve transaction evidence and repeat sign-in to demonstrate no duplicate issuance.
6. Use the C rollback runbook. **Pre-C auth does not understand pending-link reservations**; retain the hardened logic or perform separately reviewed reconciliation before such a rollback. No blind database reset, remint or old pre-A runtime rollback.

## Exact next continuation instruction

> Execute Batch D only for FONSO from `codex/fonso-stabilization-batch-c` in
> `defiventurers/articweb3`. Read `docs/technical-stabilization/CHECKPOINT.md`,
> `BATCH_C_EVIDENCE.json`, `BATCH_C_ROLLOUT.md`, the C task reports, PR #124 and dependency PRs #121–#123 first. Verify current main and PR states;
> do not restart completed A/B/C investigations. Preserve current-authority
> recovery, funded authorization, historical hold, strict health/readiness,
> database failure safeguards, pending-link authorization, canonical collectible
> receipts and the approved v5.10.2 APK baseline. Execute D1: recover and compare
> the exact retained v5.10.2 and signed v5.11.1 APKs, verify digests/signatures/
> package/versions/payload changes and guarded patch provenance, run available
> automated/emulator checks, and prepare a precise physical-device checklist
> without clearing the founder's existing save. Execute D2: demonstrate a small
> free match with independent clients, legal move rejection, seat/turn authority,
> disconnect/reconnect restoration and final-result agreement. Distinguish
> automated, emulator, live and physical evidence. Reproduce current failures,
> implement scoped fixes/tests/PRs and save checkpoints incrementally. Do not
> deploy production, enable paid/funded modes, create live accounts, mint, change
> contracts/DNS/billing, publish the private operational or contract-verification
> packages, or perform irreversible database operations without separate founder
> authorization. Stop after Batch D with evidence and exact remaining owner steps.

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
