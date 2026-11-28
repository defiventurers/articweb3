# Batch B3 — database binding and recovery

Reviewed baseline: `19ceaa6c` on `codex/fonso-stabilization-batch-b`.
Completed local implementation and rehearsal, 2026-11-28 UTC. Batch A protections
remain in place. **FIXED AND TESTED LOCALLY**; **PRODUCTION VERIFICATION PENDING**.

## Binding evidence

**BLOCKED BY ACCESS — exact production provider binding.** The backend source
uses `pg` and `DATABASE_URL` for all durable stores. Current Render startup logs
report 54 rooms restored and all four lobby stores ready; public diagnostics
also report configured/ready flags. Those are evidence of the application's
PostgreSQL path, not proof of its hostname or current connectivity. The available
Render connector cannot read runtime environment variables. The observed service
uses Render's Free plan, which has no dashboard shell, SSH or one-off jobs. No
credentials were retrieved or printed, and no billing change is needed for the
owner-local inspection below.

Read-only Neon account metadata independently shows project `arctic-dominion`
(`gentle-bar-83101012`), PostgreSQL 18 in `aws-ap-southeast-1`, default branch
`production` (`br-flat-bread-azrh4kt2`), database `neondb`, direct endpoint
`ep-restless-hall-azgudkvc`. The endpoint's pooler flag is false. A metadata query
returned PostgreSQL `18.7 (3190d2f)` and `pg_is_in_recovery=false`. Its 12 public
tables passed the read-only application schema contract: 127 required columns
and 18 valid primary/unique indexes, with no compatibility issue found. These
facts **do not establish that the Render process uses this Neon branch**.

The project reports `history_retention_seconds=21600` (six hours), zero listed
snapshots, and an empty production snapshot schedule. Existing branches
`recovery-before-signup-reset-20261114` and
`rehearsal-signup-reset-20261114` were listed only. Their names are not proof that
either is a tested recovery point. No branch was created, restored or modified.

Owner evidence step, using a local checkout of the reviewed candidate with its
existing server dependencies installed:

1. Open the identified Render service's **Environment** page and inspect the
   existing `DATABASE_URL` and any linked environment group. Do not save or
   change anything. Record the service ID, current deploy commit/time, the source
   of the setting, and whether configuration changes were saved without a deploy.
2. Copy the existing value privately into the hidden prompt below in a local
   Bash terminal. Do not paste it into chat, a document, an argument or a screenshot.

```sh
set +x
IFS= read -r -s -p 'Existing Render DATABASE_URL (hidden): ' FONSO_DATABASE_URL
printf '\n'
DATABASE_URL="$FONSO_DATABASE_URL" \
  node server/scripts/check-database-schema.cjs --scope=application
unset FONSO_DATABASE_URL
```

This utility opens an explicitly read-only transaction, selects database/version
metadata and schema catalogs, and prints host/database identity and a digest.
It never prints the URL, password, username, application rows or raw errors.
Compare its hostname (remove only the `-pooler` suffix when applicable) to the
Neon endpoint above and its database name to `neondb`. Preserve only the sanitized
output and the setting/deployment evidence. This establishes the **configured
target**, not necessarily the currently running process's binding: a saved-only
change after the last deploy may differ from the active environment. Actual
in-process identity remains unresolved until an approved deployment or separately
prepared private startup diagnostic can prove it. No new public endpoint exposes
the host. Do not upgrade the Render plan just to perform this check.

## Architecture and schema

Existing initialization SQL lives in store modules; there is no versioned SQL
migration directory or migration ledger. Startup initializes rooms, players,
profiles, history and vault activity. Companion accounts, Passport deliveries,
launch metrics and indexes initialize lazily. The existing initializers include
`CREATE TABLE IF NOT EXISTS`, additive columns/indexes, and Passport constraint
replacement under a transaction lock. A readiness or inspection check must not
call those initializers against production.

The new read-only `databaseSchemaContract.json` and `databaseSchema.js` encode
required columns, types, nullability, primary keys and selected uniqueness
constraints. The `core` scope covers five boot-created tables; `gameplay` adds
`ak_documents` for authenticated accounts, saves and proofs; `application`
covers the 12 observed tables; `chain` additionally requires two Robinhood index
tables, which are absent in the inspected Neon database. Missing optional chain
tables are not an incompatibility unless that indexer is enabled. The inspector
does not claim exhaustive equivalence of defaults, check constraints or indexes.

Each store currently owns a small `pg.Pool`; `databaseSecurity.js` sets a maximum
of five connections per pool, a ten-second connection timeout and a 30-second
idle timeout. External database TLS validates certificates. Several pools can
exist in one process, so five is not a process-wide limit. No connection settings,
pooling tier, infrastructure or credentials were changed. Use a direct endpoint
for dumps/restores, while preserving the separately reviewed application binding.

## Reproduced failure and implementation

Five older stores cached a failed initialization Promise forever and fell back
to memory even when a durable URL was configured. The initial regression run
failed all five configured-outage cases; the no-database local case passed.
`databaseRuntime.js` now retries initialization with a one-second backoff,
coalesces concurrent attempts, marks failed connections unavailable, handles idle
pool errors and returns sanitized failures. Configured durable operations fail
with `DATABASE_UNAVAILABLE`/503 instead of acknowledging a memory fallback.
Explicit unconfigured local stores retain their existing behavior. Failed writes
are not automatically replayed, because an uncertain commit must not duplicate
points, receipts or financial records.

Companion, metrics and chain-index pools also handle idle connection errors.
Six game services had unobserved history-write Promises; their completion paths
now catch failed writes and emit a sanitized persistence warning. Synchronous
injected stores remain compatible. Game outcomes and moves are unchanged.

Recovery remains operationally explicit: lobby rooms are loaded once by boot.
After a startup outage or a restore, drain and restart the backend against the
verified database before reopening traffic. A healthy SQL connection and schema
alone do not prove that the in-memory lobby was rehydrated. The B2 startup latch
holds readiness false when boot/restoration fails, even after a database probe
recovers. Background best-effort room/history writes are not a durable queue;
failed saves require investigation. In-memory free games can still progress
during an outage; do not describe those moves as durably saved.

## Test evidence

**76 selected automated tests passed**, zero failures/skips, under Node 24.22.3.
This includes 11 new B3 cases plus existing affected game, account, metrics and
security tests. Exact commands and sanitized catalog evidence are in
[`BATCH_B_DATABASE_EVIDENCE.json`](BATCH_B_DATABASE_EVIDENCE.json). A separate
baseline-commit reproduction confirmed all five initializers returned false
again after connectivity was restored, with no second query attempted.

The local PostgreSQL **18.7** rehearsal created a private loopback cluster, used
the actual store initializers and synthetic fixtures, stopped/restarted that
database, exported a custom archive with `pg_dump`, and restored it with
`pg_restore --exit-on-error --single-transaction` into a second empty database.
All **14 tables and 14 synthetic records** matched their source digests. A failed
99-point update was not replayed: the stored 42 points remained 42 after recovery.
All fixture database data and the dump were removed after verification.

The actual B2 SQL/schema/privilege probe also returned ready against that fixture;
the fixture supplies its completed initialization state explicitly, so this is
not a claim about production boot. A separate privilege check confirmed that
`room_players` upserts need SELECT as well as INSERT/UPDATE. Existing-table
`CREATE TABLE IF NOT EXISTS` still needs schema CREATE; actual initializers,
startup readiness and deployment role permissions must remain consistent.

PostgreSQL server binaries came from the pinned `@embedded-postgres/linux-x64`
18.7.0-beta.19 distribution; client binaries were extracted from the official
PGDG 18.7 package with its package-manifest checksum verified. These tools were
kept outside the repository. No dependency, lockfile, system package or paid
infrastructure was added. The rehearsal is also usable with normal PostgreSQL
18 binaries supplied by a developer or CI environment.

## Recovery procedure

### Repeat the safe local rehearsal

Install/reuse PostgreSQL 18 client and server tools in a development environment,
then run from the repository root as an unprivileged user:

```sh
PG_BINDIR=/absolute/path/to/postgres18/bin \
  node server/scripts/rehearse-database-recovery.cjs
```

The directory must contain `postgres`, `initdb`, `pg_ctl`, `pg_dump` and
`pg_restore`. The command generates its own loopback URLs and rejects external
or arbitrary fixture targets; it accepts no database URL or production dump.
Success requires `ok:true`, equal source/restore digests, recovered connectivity
and `failedWriteReplayed:false`. This verifies the mechanism with synthetic data,
not recovery of the live Neon branch.

### Prepare a real recovery candidate — owner action required

1. **Identify the source first.** Run the read-only configured-target inspection
   above and retain its deployment evidence, host/database fingerprint and
   timestamp. Resolve any saved-versus-active environment difference before
   deciding that this is the recovery source. Establish
   the incident's last known good time. The observed six-hour history window is
   short; if the required point is outside it, use an independently retained and
   verified backup. Existing branch names do not establish such a backup.
2. **Isolate the target.** Approve an exact nonproduction target and recovery
   timestamp. Prefer a separate historical Neon branch or a new empty recovery
   database. Confirm plan limits before creating anything. Do not reset the
   production branch or reuse the old rehearsal branch without checking what it
   contains. This batch made no cloud branch or snapshot changes.
3. **Stop side effects on the candidate.** Do not start the normal application
   while validating restored data. Keep funded mode, settlement, Passport/Egg
   delivery and chain-index workers disabled; omit all wallet/signing credentials.
   Database receipt history can be older than irreversible on-chain transactions,
   so restoring it must never automatically trigger delivery or settlement.
4. **Use direct connections and private credential files.** For logical
   dump/restore, use PostgreSQL 18 tools and non-pooled endpoints. Configure
   libpq service entries `fonso_recovery_source` and `fonso_recovery_target` in a
   private `PGSERVICEFILE`, with passwords in a private `PGPASSFILE`; both files
   should have mode 0600. Use verified TLS for external endpoints. The source
   service identifies the verified database; the target identifies only the
   approved empty isolated database. Never put credentials into command history,
   process arguments, tickets or these records.

For an approved logical export and isolated target, these commands keep database
credentials outside their arguments. Set `FONSO_RECOVERY_DIR` to a private local
directory first; the archive contains sensitive application data and must be
kept in approved encrypted storage.

```sh
umask 077
mkdir -p "$FONSO_RECOVERY_DIR"
PGSERVICE=fonso_recovery_source pg_dump \
  --format=custom --no-owner --no-acl \
  --file "$FONSO_RECOVERY_DIR/snapshot.dump"
sha256sum "$FONSO_RECOVERY_DIR/snapshot.dump"
pg_restore --list "$FONSO_RECOVERY_DIR/snapshot.dump"
PGSERVICE=fonso_recovery_target psql --no-psqlrc --set=ON_ERROR_STOP=1 -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
```

The last result must be **zero**. Stop on a nonempty target or an identity
mismatch. After checking the approved target again, restore only there:

```sh
PGSERVICE=fonso_recovery_target pg_restore \
  --exit-on-error --single-transaction --no-owner --no-acl \
  --dbname 'service=fonso_recovery_target' \
  "$FONSO_RECOVERY_DIR/snapshot.dump"
```

5. **Validate before opening the candidate.** Run the read-only schema checker
   using the target's privately injected `DATABASE_URL`; use `application`, or
   `chain` only if the chain index is required. Compare scoped record counts and
   integrity checks with the backup manifest in the isolated environment, without
   placing account contents in public logs. Verify account revision/progress,
   room state, match history and delivery/index cursors. Verify the application
   with a disposable synthetic account, the reviewed candidate code and all
   irreversible workers disabled. Check both readiness and successful boot-room
   restoration. Any discrepancy keeps the candidate closed.

### Approved cutover and rollback

Production cutover needs separate founder approval. Prepare the exact reviewed
commit and privately retained current connection setting. Drain traffic and stop
**every writer**, including separate workers/schedules. Retain a verified
pre-cutover recovery point, deploy/restart against the validated target, then
check readiness, restored rooms, a controlled saved-game recovery and the relevant
API/WebSocket contract before reopening free traffic. Keep funded play and all
collectible senders closed until their separate reconciliation/acceptance.

Rollback before reopening writers is a code/configuration rollback to the
retained deployment and database binding, followed by a fresh restart and
verification. If writes have already reached the new database, switching back
would discard those changes: stop writers and reconcile them before deciding
which database is authoritative. Do not restore old account/session, delivery or
settlement state blindly. A database restore cannot undo a blockchain transfer.

This patch adds no application schema migration, so code rollback has no new
DDL to reverse. Rolling back the store fixes restores their original failure
behavior; retain monitoring and the deployment gate rather than masking an outage.

## Remaining owner decisions and limits

- **BLOCKED BY ACCESS:** the owner-local setting check can establish the
  configured database; active process binding still needs deployment-consistent
  evidence or an approved private runtime diagnostic. Render Free has no shell.
- **OWNER ACTION REQUIRED:** approve an isolated cloud recovery target and
  determine recovery-point/recovery-time objectives and backup retention. The
  observed project has a six-hour window and no listed snapshot schedule.
- **PRODUCTION VERIFICATION PENDING:** approve and verify the reviewed candidate
  rollout separately. No production configuration, branch, data, worker, mint,
  wallet ownership, contract, DNS or billing setting was changed.

## References

- [Neon instant restore](https://neon.com/docs/postgres/backup-restore/branch-restore)
- [Neon history window](https://neon.com/docs/postgres/backup-restore/history-window)
- [Neon pg_dump / pg_restore](https://neon.com/docs/import/migrate-from-postgres)
- [Render Free service limitations](https://render.com/docs/free)
- [Render shell compatibility](https://render.com/docs/ssh)

The current official docs confirm that instant restore replaces an entire branch
timeline and interrupts its connections; it is not a merge. The six-hour window
above comes from this project's current metadata, not a generic plan assumption.
