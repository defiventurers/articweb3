# Batch B2 — reliable health endpoints and monitoring

Reviewed baseline: `19ceaa6c2d66ce726f9050ef1c674c3d06553e19`, branch
`codex/fonso-stabilization-batch-b`, 2026-11-28 UTC. Batch A's security and
fair-play changes are retained. No production deployment, domain change,
provider setting change or paid monitoring service was created.

## Status and reproduced evidence

| Item | Status | Evidence |
| --- | --- | --- |
| Company health redirect and monitor false positives | **FIXED AND TESTED LOCALLY** | Exact redirect exclusions, readiness rewrite, strict monitor and regression tests. |
| Bounded dependency-aware readiness | **FIXED AND TESTED LOCALLY** | Actual supported local startup returns 503 for a required unavailable/missing database or incomplete/failed restoration; independent liveness stays 200. |
| Live company URL and backend candidate | **PRODUCTION VERIFICATION PENDING** | Current public behavior was reproduced; candidate has not been deployed. |
| Render health path and production monitor adoption | **OWNER ACTION REQUIRED** | Provider record has an empty health-check path. Approval is needed for the concrete configuration change described below. |

Read-only HTTP observations on 2026-11-28:

| Request | Observed result |
| --- | --- |
| `https://antarcticgaming.co/api/health` | HTTP **307**, `Location: /coming-soon.html`, `Content-Type: text/plain`. |
| `https://www.antarcticgaming.co/api/health` | HTTP **308** to the apex health URL, then the same broken route. The existing canonical-domain redirect is preserved. |
| `https://articweb3.onrender.com/readyz` | HTTP **200**, `Content-Type: text/plain`, body `Artic Web3 lobby server running.` This is the old generic fallback, not readiness. |
| `https://articweb3.onrender.com/health` | HTTP **200**, JSON with legacy capability and store status fields. |

The live browser independently opened the exact company health URL and ended at
`https://antarcticgaming.co/coming-soon.html`, with the Coming Soon page and
`document.contentType === 'text/html'`. A backend `healthz` shell request timed out
in the initial probe; no success is inferred from that request. Root's separate
provider/browser evidence records the observed backend build and runtime state.

The current Vercel company alias points to the `f696f57…` frontend deployment;
the Render provider record uses `npm start`, root directory `server`, and an
empty `healthCheckPath`. These observations are separate from code acceptance.
See Batch B1's deployment evidence for exact versions and compatibility.

### Root cause

`frontend/vercel.json` already rewrote `/api/health` to Render `/health`, but both
company-host catch-all redirects matched `/api/health`. Vercel evaluates
deployment redirects before rewrites, so the rewrite did not run. Exact local
evaluation of the existing host rules reproduced that match for both hosts.
Vercel's [routing order documentation](https://vercel.com/docs/routing) describes
this precedence.

The backend's legacy `/health` and `/healthz` are unconditional 200 responses.
The former is a capability/diagnostic response, and the latter is a valid
liveness check. Neither establishes that required persistence is usable.
Unknown backend paths also return 200 text, as the live `/readyz` observation
demonstrated. A check of HTTP success alone can accept this fallback or a
redirected HTML page.

The existing mainnet smoke helper parsed JSON but followed redirects implicitly
and did not require a health schema. Existing store-ready booleans could also be
stale after an outage. Readiness now performs a live bounded check independently
of those cached booleans. The store recovery correction is documented in
[`BATCH_B_DATABASE.md`](BATCH_B_DATABASE.md).

Review also reproduced two narrower false-positive conditions: PostgreSQL can
report a read/write transaction setting for a role that has only SELECT grants,
and a later successful database ping does not restore rooms skipped during an
initial boot failure. Both are explicitly covered by the final readiness gate.
The current account/save store `ak_documents` is required alongside the legacy
lobby tables, rather than being treated as an optional collectible dependency.

## Implemented behavior

| Exact URL path | Meaning | Healthy / unhealthy |
| --- | --- | --- |
| Backend `/healthz` | Process liveness, independent of external services. Existing `ok`, `service` and `generatedAt` fields remain. | 200 JSON while the request handler responds. |
| Backend `/readyz` | Required database connectivity, schema/operation privileges, gameplay schema and completed initial room restoration. | 200 JSON when ready; 503 JSON otherwise. |
| Company `/api/health` | Rewrite to backend `/readyz`, without a company-host Coming Soon redirect. | Preserves upstream readiness status. |
| Company `/api/health/live` | Rewrite to backend `/healthz`. | Process liveness. |

The exemptions are limited to these two exact company paths. Early-access,
dashboard, artwork and existing held-route behavior are unchanged. `/health`,
`/arctic-play/health` and `/runtime/status` retain their existing roles and
response shapes. They are not substitutes for the strict readiness check.

All health responses prohibit browser/CDN storage. The exact company routes also
disable Vercel external-rewrite caching. Vercel documents that behavior in
[its external rewrite caching guidance](https://vercel.com/docs/rewrites).
Health paths accept GET/HEAD/OPTIONS, reject other methods, and remain behind the
existing origin, rate-limit and HTTP security wrapper. HEAD returns the same
status without a body; content-aware monitors must use GET.

Example readiness response:

```json
{
  "schema": "artic.health.v1",
  "service": "artic-web3-server",
  "check": "readiness",
  "ok": true,
  "status": "ready",
  "generatedAt": "2026-11-28T03:00:00.000Z",
  "dependencies": {
    "database": { "required": true, "status": "ready" },
    "startup": { "status": "ready" }
  }
}
```

The timestamp above is illustrative. Responses expose no database URL, hostname,
database name, table names, credentials, raw database errors or user data.

### Database probe

`server/healthStatus.js` requires the database when **any** of these is true:

- `DATABASE_URL` is configured.
- `NODE_ENV=production` or `RENDER=true`.
- `DATABASE_REQUIRED=true`, for an isolated environment that requires persistence.

Setting the explicit flag to false never makes a configured or production
database optional. A local development process without a database continues to
use its existing memory behavior, and readiness labels that dependency
`required:false, status:not_configured`. Production monitoring rejects that
optional-memory response unless explicitly invoked with `--allow-memory`.

The probe lazily uses one additional PostgreSQL connection at most, retaining the
existing TLS certificate validation. Concurrent requests share one probe; a
result is cached for at most 500 ms. A two-second total deadline covers connection,
queries, schema and privilege inspection. A timed-out acquired client is destroyed; a late
connection is destroyed when it arrives. Connection, client-query and server
statement deadlines are also bounded. Idle errors invalidate the short cache.

The first query checks connectivity and confirms that the session is not forced
read-only. Two read-only metadata queries then use Batch B3's shared schema
contract's **gameplay** scope: the five boot-created tables `rooms`,
`room_players`, `player_profiles`, `match_history` and `vault_activity`, plus
`ak_documents` for current free accounts, sessions, progress, saves and proofs.
Missing/incompatible columns or keys return generic unavailability. Optional
Passport/indexer tables remain outside this ordinary readiness scope.

A further read-only query requires schema USAGE and CREATE, and checks each
required table operation separately. The five lobby tables need SELECT, INSERT
and UPDATE; `ak_documents` additionally needs DELETE. PostgreSQL treats a
comma-separated privilege argument as OR, so the probe instead evaluates one
operation per row and requires every row to pass. The isolated PostgreSQL 18.7
rehearsal confirmed that `room_players` upsert needs SELECT even though its store
does not issue a standalone SELECT. It also reproduced SQLSTATE 42501 when the
existing lazy account initializer executes `CREATE TABLE IF NOT EXISTS` without
schema CREATE, even if the table already exists and the role has CRUD grants.
The readiness requirement reflects that current initializer behavior. It never
grants permissions, changes roles, runs DDL, reads application rows or writes.

The supported source transformation now records a separate startup latch.
It starts closed, completes only after the four legacy store initializers and
saved-room restoration finish, and remains failed after an initial failure.
A later healthy database or successful store retry cannot clear that hold.
The B3 controlled restart procedure is required; rooms are not automatically
replayed into a running lobby. Expected source anchors fail closed if this
startup contract changes. Startup errors are logged generically.

Readiness does not certify optional collectible/indexer functionality, external
wallet providers, every possible write policy/constraint, a game result, paid
launch approval or full release readiness. It also does not prove that more
historical rooms exist than the unchanged startup loader's bounded selection.

### Strict monitor

Run from the repository root after the candidate is deployed to an approved
isolated environment, or against production after an approved rollout:

```bash
node scripts/check-health.mjs https://articweb3.onrender.com/readyz
node scripts/check-health.mjs https://articweb3.onrender.com/healthz --liveness
node scripts/check-health.mjs https://antarcticgaming.co/api/health
node scripts/check-health.mjs https://antarcticgaming.co/api/health/live --liveness
```

Use the apex company URL. The existing `www` canonical redirect is intentional
and strict monitoring rejects redirects. For a deliberately database-free local
instance only, use `--allow-memory` with its exact `/readyz` URL.

`server/healthMonitor.js` requires the exact service/schema/check identity,
boolean status, consistent database/startup dependencies and HTTP status, and a timestamp no
more than 60 seconds old or 30 seconds in the future. It requests JSON with a
five-second deadline, disables redirects, limits the body to 8 KiB and rejects
HTML, missing fields, malformed JSON, redirects, stale responses, contradictory
200/503 status, network failures and timeouts. It never logs the raw response
body or URL. A successful CLI invocation exits 0; a failed check exits 1; invalid
CLI usage exits 2. The result includes a stable reason code.

The existing `server/liveMainnetSmoke.js` now calls the same strict liveness and
readiness validators. Its other checks retain their original **internal mainnet
rehearsal** purpose; do not enable funded play just to pass that old rehearsal
suite. The standalone health command is appropriate for the free-release gate.

## Verification evidence

Executed locally on Node 24.22.3, using existing pinned dependencies:

```bash
node --test server/tests/health-status.test.js server/tests/health-monitor.test.js server/tests/health-routing.test.js server/tests/health-endpoints.test.js server/tests/database-privileges.test.js server/tests/startup-readiness.test.js server/tests/runtime-status.test.js server/tests/live-mainnet-smoke.test.js
```

Result: **25 passed, 0 failed, 0 skipped**. This includes the two existing
runtime/smoke evidence scripts. The final schema-CREATE tightening was also
checked with the relevant privilege/status/startup subset. Syntax checks and
`git diff --check` passed. Root records the combined final Node 20/24 runs.

Coverage includes:

- Real supported startup with `allGamesBackendBootstrap.js`, all production HTTP
  wrappers and transformed game handlers; only the unrelated external price
  fetch is mocked. No contract call, account creation or collectible delivery runs.
- A real local PostgreSQL connection attempt to an unreachable loopback port:
  readiness 503, liveness 200, free lobby/capability endpoints still available.
- Healthy, unavailable, forced-read-only, missing and incompatible-schema
  database fixtures; schema inspection uses the actual B3 gameplay comparator.
  SELECT-only roles, missing individual writes and missing schema privileges fail.
- Concurrent requests, cache expiry, outage/recovery, hung query/schema work,
  late connection cleanup and no sensitive error disclosure.
- The real transformed boot remains unready while restoration is pending; it
  becomes ready after successful restoration. Initial store or restore failures
  stay unready even when the isolated database fixture subsequently recovers.
- A real local HTTP redirect to an HTML page; the monitor never follows it.
  Header/body timeouts and CLI success/failure exit codes are exercised.
- Exact company redirect and rewrite configuration with representative existing
  public/held paths, including the existing board-artwork rewrite.

B3 additionally ran the health SQL/schema/privilege probe against an isolated
local PostgreSQL 18.7 fixture. It returned ready using an explicitly supplied
successful startup status after manual fixture initialization. That verifies
the real database query path; it is not a claim that the production HTTP startup
was exercised against that database. The exact rehearsal and privilege findings
are recorded in `BATCH_B_DATABASE_EVIDENCE.json` and the database runbook.

The Vercel route tests evaluate the actual named negative-lookahead rules; they
do not claim to emulate Vercel's complete edge runtime. The new rewrite must be
checked on the actual approved deployment. Root's combined test run records the
separate Batch A and gameplay regression evidence.

## Concrete rollout, rollback and founder actions

1. Review the Batch B candidate together with Batch B1 compatibility and B3
   binding/recovery evidence. Keep funded mode closed under the Batch A gates.
2. In an authorized isolated environment, deploy the backend candidate using the
   supported `npm start`. Confirm the correct database binding and compatible
   gameplay schema and required role privileges. A fresh database must have the
   account-store schema initialized during explicit candidate preparation;
   readiness does not initialize it. Run the direct liveness/readiness commands;
   exercise an isolated dependency outage and recovery. If initial restoration
   failed, perform a controlled restart after recovery. No production outage is required.
3. Approve a **backend-first** rollout. Verify direct `/readyz` before deploying
   the frontend route change. An old backend returns 200 text for `/readyz`,
   which the strict monitor intentionally rejects.
4. After the backend is healthy, approve Render's health-check path change from
   empty/TCP to `/readyz`. Render's HTTP check accepts any 2xx/3xx within five
   seconds, so retain the strict content-aware monitor as a separate gate.
   Render can stop routing and restart instances after repeated failed checks;
   coordinate this change with the B3 outage/recovery procedure. See
   [Render health-check documentation](https://render.com/docs/health-checks).
5. Approve the frontend deployment, then run both company health commands. Verify
   the exact apex URLs return JSON directly and ordinary Coming Soon/early-access
   routes retain their prior behavior. Save candidate IDs, results and UTC times.
6. Roll back the frontend to its captured prior deployment if its routing fails;
   continue using the direct backend monitor while the company route is held.
   If rolling the backend back to a build without `/readyz`, first restore its
   recorded provider health-check setting as part of the approved rollback.
   Otherwise the old generic 200 text fallback could fool Render's status-only
   check. Keep strict monitoring failures visible until a verified readiness
   implementation is restored. Do not label the legacy fallback healthy.

Production deployment and monitor settings remain pending approval. No live
database failure was induced, and no provider configuration was changed.

## Changed paths owned by B2

- `frontend/vercel.json`
- `server/.env.example`
- `server/healthStatus.js`
- `server/healthMonitor.js`
- `server/databasePrivileges.js`
- `server/startupReadiness.js`
- `server/loadPrizeBackend.js` (additive guarded startup latch)
- `server/runtimeStatusBootstrap.js`
- `server/liveMainnetSmoke.js`
- `scripts/check-health.mjs`
- `server/tests/health-status.test.js`
- `server/tests/health-monitor.test.js`
- `server/tests/health-routing.test.js`
- `server/tests/health-endpoints.test.js`
- `server/tests/database-privileges.test.js`
- `server/tests/startup-readiness.test.js`
- This evidence document.

Shared dependency: B3's `server/databaseSchema.js` and
`server/databaseSchemaContract.json`. Pull request and combined evidence links
are maintained in the Batch B checkpoint by the root task.
