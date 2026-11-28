# Batch B1 — deployment compatibility and controlled reconciliation

Reviewed 2026-11-28 UTC. Branch: `codex/fonso-stabilization-batch-b`, based on
Batch A head `19ceaa6c2d66ce726f9050ef1c674c3d06553e19`. Batch A remains a required
dependency; its approved-artifact recovery and funded authorization are preserved.

## Outcome and status

| Item | Status | Evidence |
| --- | --- | --- |
| Commit-skew hypothesis: newer Vercel frontend incompatible with older Render backend | **NOT REPRODUCIBLE** | The deployed source commits differ, but their entire server, shared, frontend source and public trees are identical. Relevant mobile network/auth and active build inputs are also identical. |
| Reusable candidate contract/policy check | **FIXED AND TESTED LOCALLY** | New bounded, read-only probe; eight focused tests include the actual transformed startup, saved-session compatibility and WebSocket envelopes. |
| Current production authority and complete release acceptance | **PRODUCTION VERIFICATION PENDING** | Public fair-config is hidden by the registration hold. The live API advertises internal funded mode; it does not pass the proposed free-release policy. |
| Rollout, configuration and rollback | **OWNER ACTION REQUIRED** | No deployment, merge to main, environment change or production write was performed. |

No source/API rewrite or production deployment is justified merely to align
commit labels. The candidate adds a reviewable verification tool and preserves
the actual observed limitations.

## Actual deployed pair

Provider evidence is recorded separately in
[`BATCH_B_PROVIDER_EVIDENCE.json`](BATCH_B_PROVIDER_EVIDENCE.json). Safe public GET
responses and their evaluation are in
[`BATCH_B_COMPATIBILITY_OBSERVATIONS.json`](BATCH_B_COMPATIBILITY_OBSERVATIONS.json).

| Surface | Verified identity/configuration |
| --- | --- |
| GitHub `main` | `f696f57637ec8a1433bcaeafcd0ebc494fcba96b` |
| Vercel production | `dpl_5o4Gvv6Fq6qPBQ91w3SsnFZVpNfy`, ready; Git metadata points to that main SHA; created 2026-11-23T23:55:11.287Z |
| Company domain | `antarcticgaming.co` alias points to that exact Vercel deployment; the old `arcticdominion.xyz` aliases also remain on it |
| Render live deploy | `dep-dc29aevavr4c73f8uorg`, commit `8324ff30f355f0e2b7b08d1d776b502ea8e822b2`; finished 2026-11-23T19:38:09.248Z |
| Render service | `srv-d8knkism0tmc73ct2t3g`; root `server`; build `npm install`; start `npm start`; automatic deploys from `main` enabled; no configured HTTP health-check path |
| Runtime corroboration | `/arctic-play/health` returned the same full Render SHA, `arctic-play-1.0.0` and all eight advertised games |

Production Vercel build events independently confirm `npm install`, followed by
`build:mainnet`: `npm run build:browser-app && npm run check:mainnet && vite build
--mode mainnet`. The browser step executed `node scripts/build-browser-app.mjs`;
the provider reported build completion in 24 seconds. These logs were fetched in
bounded pages because the connector truncates arrays longer than 100 events. No
environment values were requested or retained.

This identifies the provider deployment and an independently observed runtime
commit. It does **not** identify every generated runtime byte. Both existing
builds execute source-generation steps, and the old runtime's fair authority
cannot be inferred from its Git SHA.

### Why the observed SHA difference is not an interface regression

The following Git tree object IDs are identical at both production source commits:

| Path | Common Git tree object |
| --- | --- |
| `server/` | `3f0b3419ad0fc49eda6c77c452527f955a50f723` |
| `shared/` | `ec2a5c0d3ca51568e346143465083cfb16f6b60a` |
| `frontend/src/` | `acaf671b82ee18b3a2f0bbf422e415d248481c65` |
| `frontend/public/` | `9e625cddae2c7247a8a5133214584d9ada37aefe` |

`git diff 8324ff30f355f0e2b7b08d1d776b502ea8e822b2
f696f57637ec8a1433bcaeafcd0ebc494fcba96b --name-only` was inspected in full. Its
changes are Storybook review/guarded APK additions, related tests/docs/CI, and the
Shanshui parity checker. The Shanshui script changes only `--check` comparison;
its generation branch is unchanged and it is not called by the recorded Vercel
or Render build entrypoints. No authentication, account-session, WebSocket,
schema initializer, chain configuration, deployed engine source or active
browser-generation input changed between those two commits. Storybook assets
are not evidence that the ordinary source build reproduces the retained APK.

### Interfaces actually traced

| Interface | Existing contract and compatibility evidence |
| --- | --- |
| Backend bootstrap | `npm start` preloads `allGamesBackendBootstrap.js`, which transforms `index.js` through the prize/multigame and game-specific injectors. `start-with-runtime-status.js` installs request security/status before `start-with-indexer.js` loads that transformed backend. Tests use this path; raw `node index.js` is not an equivalent candidate. |
| Legacy frontend socket | `{type, requestId, payload}` requests and correlated result/error replies. Wallet authentication retains challenge/signature verification. Batch A adds authorization only to funded paths and preserves free room operations. |
| Native-source/browser socket | `ap_` messages carry account `cloudSession`, capability list and room `playerId`/`seatToken`; actions include revision and action ID. Reconnect retrieves authoritative state without replaying pending actions. Current eight-game socket tests pass. |
| Account HTTP/session | Cloud capability version 2, opaque UUID plus 43-character secret, bearer authorization, account/progress revision fields and saved-session handling are preserved. A historical session without new timestamps is still accepted within its original expiry; tests verify no extension and retained progress. |
| Para adapter | PKCE/ticket handoff and identity/wallet binding are unchanged between deployed commits. Public configuration is `BETA`, chain 46630. The separate legacy Abstract launch chain is 2741; the difference is intentional and must not be “corrected” by sharing defaults. Mock-JWKS integration tests cover both chain/environment binding and account ownership. |
| Rules and proof | Game version and all required advertised capabilities match the source clients. Published intended authority remains `9fa0be4a43f049957ef407ee73361a0b6a3bb24ed59f487a36190165be82c8cb`; independent reconstruction is enforced by Batch A. An advertised fair-play capability alone does not establish the live hash/key or replay success. |
| Database | Deployed commits have identical store/schema source. Actual binding, privileges, schema inspection, outage recovery and restore are separately covered by Batch B3; equal source is not proof of an equal database. |
| Build artifacts | Render's postinstall builds Para wallet UI, then the mobile-source browser app. Vercel's `build-browser-app.mjs` invokes the same `build-current.mjs --frontend` path. Batch A replaces historical manifest/engine rewriting with exact reproduction checks before output mutation. Candidate build must include that guard and all required art inputs. |

The public snapshot at 2026-11-28T02:50:14.713Z had **22 passing checks and three
holds**: fair-config returned 503 `LAUNCH_RESET_PAUSED`; launch mode was
`internal` with `highStakesAllowed:true`; legacy health reported
`highStakesEnabled:true`. No live funded request or transaction was attempted.
These fields establish configuration, not proof that a paid match or settlement
has occurred. Do not reopen registration or enable a paid mode to make the check
green.

## Implemented verification and local tests

New files:

- `server/deploymentCompatibility.js`: six exact public GETs, reviewed source
  expectations, bounded response parsing and sanitized evidence. Rejects redirects,
  HTML, malformed/oversized JSON, timeouts and unknown responses. Checks game IDs,
  seat counts, capabilities, cloud version, Para binding, intended proof authority
  and pinned recording key, plus free-release switches. Commit skew is unresolved
  identity evidence rather than an invented protocol error. Non-match commerce
  remains an independent capability.
- `server/scripts/check-deployment-compatibility.js`: read-only CLI; exit 0 means
  this limited preflight passed, 1 means held/incompatible/unresolved, 2 means the
  tool could not run. It performs no deployments, auth starts, sign-ins, room
  writes, mints, chain calls or environment changes.
- `server/tests/deployment-compatibility.test.js`: eight tests, including a child
  process running the actual startup wrappers. The fixture uses an isolated
  temporary account file and ephemeral proof key; all senders/indexers are off
  and external fetch is disabled. It checks real HTTP contracts, protected saved
  data, historical session migration and actual socket reply envelopes.

Commands run under Node 24.22.3:

```sh
node --test server/tests/deployment-compatibility.test.js
node --test server/tests/para-game-wallet.test.js server/tests/company-account-play.test.js server/tests/arctic-play-socket.test.js server/tests/funded-access-socket.test.js
git diff --check
```

Results: **8 new + 25 existing tests passed**, zero failures or skips. The existing
socket suite creates isolated free matches and validates a legal action for all
eight tables; it does not claim live-match or full-match completion acceptance.
Para tests use local signed fixture tokens and mocked JWKS, not a real consent
flow. The startup fixture deliberately does not build browser assets; if they
are absent it asserts that the browser capability remains held instead of
inventing an asset-success result. Physical Android acceptance remains Batch D.

Run against an approved isolated candidate from the exact reviewed checkout:

```sh
node server/scripts/check-deployment-compatibility.js \
  --origin https://REVIEWED-CANDIDATE-HOST \
  --backend-commit FULL_40_CHARACTER_REVIEWED_BACKEND_SHA \
  --para-environment BETA \
  --para-chain-id 46630
```

Choose the Para environment and chain from the approved deployment binding;
the probe requires explicit inputs. It does not print API keys, bearer tokens,
RPC URLs, connection strings or arbitrary response/error text. Retain both the
provider deployment IDs and the probe output. Readiness uses the separate B2
health monitor; neither probe replaces game proof verification or founder approval.

## Proposed rollout — separate founder approval required

1. Review the Batch A dependency and Batch B changes; pin their final candidate
   SHA and deployable build IDs. Preserve the retained approved v5.10.2 binary and
   the v5.11.1 review build. Do not derive a replacement APK from this source build.
2. Before merging a production-tracked branch, arrange the approved deployment
   window and control automatic promotion/deployment. Render currently deploys
   `main` automatically; merging is therefore not an inert source-only operation.
3. Build the exact candidate in a complete checkout with the approved assets and
   lockfiles. Use the existing transformed start path. Prepare `npm ci --no-audit
   --no-fund` as the reproducible replacement for Render's current `npm install`,
   retaining its build lifecycle scripts; apply that setting only with the
   deployment approval. The Batch A authority guard must pass before generated
   outputs are accepted. Record artifact hashes and build logs.
4. In an authorized isolated environment, verify the B3 schema/recovery contract,
   both B2 health endpoints and this compatibility probe. Keep sender workers off.
   Run the targeted local tests above against the exact candidate. A complete
   browser build must advertise browser-play; missing assets are a blocker.
5. Prepare production with `LOCKED_MATCH_MODE=off`, `HIGH_STAKES_ENABLED=false`,
   `LEGAL_PUBLIC_MAINNET_APPROVED=false` and an empty internal-wallet allowlist.
   This changes observed live settings and requires explicit approval. Preserve
   auth/session secrets and chain-specific bindings; never paste their values
   into the handoff. Keep the registration/mint hold until its separately approved
   procedure is ready. If it prevents the fair authority probe, obtain controlled
   read-only authority evidence or resolve that narrow route gate separately;
   a launch-hold response is still not acceptance.
6. Roll out backend first while existing free clients remain supported. Verify
   Render's exact runtime SHA, `/healthz`, dependency-aware `/readyz`, source/proof
   integrity, saved-account behavior and the approved free-room rehearsal. Only
   then promote the paired frontend and its health rewrites; otherwise the new
   frontend proxy would target a backend without `/readyz`.
7. Use a staged production Vercel build when the approved plan requires testing
   the same artifact that will serve users. Preview-to-production promotion
   rebuilds with production settings; staged-production promotion does not.
   Repeat validation after any rebuild. See [Vercel promotion documentation](https://vercel.com/docs/deployments/promoting-a-deployment).
8. Verify company-domain readiness with redirect rejection and exact content
   validation, both sign-in destinations, a preserved existing save and an
   explicitly approved free-match smoke test. Reconfirm paid switches remain off.
   Record the actual pair and retain the prior deploy IDs. Live Para consent and
   physical Android checks remain distinct owner actions.

## Rollback and stop conditions

Stop promotion for incorrect authority/key, startup transformation failure,
missing assets, unavailable required database/schema, auth/session regression,
unexpected WebSocket errors, health redirects/HTML, or a reopened funded switch.
Do not “repair” a failure by changing game rules, expected digests or ownership.

For a frontend-only regression, restore the prior known Vercel production
deployment `dpl_5o4Gvv6Fq6qPBQ91w3SsnFZVpNfy` and validate its routes and API pair.
An existing production deployment can be restored without rebuilding; this also
retains its old compiled configuration. Its old `/api/health` redirect defect
returns, so use the validated direct backend monitor during rollback. See
[Vercel promotion/rollback documentation](https://vercel.com/docs/deployments/promoting-a-deployment).

The recorded Render deploy `dep-dc29aevavr4c73f8uorg` is a **historical recovery
reference, not a safe automatic rollback target**: it predates A1/A2 and used
internal funded configuration. Render reuses the target build, start command,
health-check path and environment variables during rollback; current shared
environment groups require separate review. A dashboard rollback disables
autodeploy, but an API rollback does not. Confirm retained artifact availability,
keep automatic redeployment controlled, and select a verified safe recovery
artifact/configuration with funded access closed. Do not rely on current disabled
environment variables surviving a historical rollback. See
[Render rollback documentation](https://render.com/docs/rollbacks).

If no safe prior backend artifact/configuration can be proved, keep promotion
held and prepare an approved forward recovery or maintenance procedure. Database
state is not reverted by an application rollback; use B3's isolated recovery
procedure and separate authorization for any production restore. No destructive
database operation is part of this plan.
