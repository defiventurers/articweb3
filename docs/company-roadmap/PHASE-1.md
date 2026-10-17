# Phase 1 — optional recovery and durable progress

Guest play remains available. Profile → Progress & recovery creates a private recovery-code account. Recovery codes and sessions are random 256-bit secrets; only their hashes reach the database. Android session credentials use AndroidKeyStore AES-GCM. Code replacement revokes existing sessions. Account deletion requires the recovery code.

A separate `ak_documents` Postgres table stores optional app accounts. Set `DATABASE_URL` on the existing Node server; without durable storage the API returns an unavailable state and the APK keeps working offline. The existing free-table websocket and website wallet protocols are unchanged.

Only allowlisted learning completion, journal, memories, visits and chapter achievements sync. Merge keeps the earliest completion and unions discoveries. Saved seats, messages, active positions, display name and device preferences remain local. This avoids overwriting a game in progress. Achievement sync conveys personal progress, not proof of competitive performance or paid ownership.

Usage event sharing is off by default, is account-scoped and excludes chat, board positions and recovery codes. Event names are allowlisted and UUID-deduplicated. Turning sharing off clears account events.

Validation: company-service tests cover recovery, concurrent two-device merging, cross-account isolation, rotation, logout, deletion, credential hashing, event consent/deduplication and file-store restart durability. The file adapter is explicitly for tests/development; production requires Postgres. Production Postgres and AndroidKeyStore on a physical device still require deployment/device testing.
