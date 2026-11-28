# Batch D2 — free multiplayer acceptance

Reviewed base: `75328370f0703ab7907dda9dc833f8aab93c21f9`, on `codex/fonso-stabilization-batch-d`. Reviewed main remains `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`; the development branch and production must not be equated. Evidence date: 28 November 2026 UTC. Review PR: [#125](https://github.com/defiventurers/articweb3/pull/125), stacked on the Batch C development branch.

## Outcome

Two independent socket clients completed a natural five-ply **Two Stones / Do-guti** match. Separately, two authenticated account clients played four signed **Shogi** moves through the Android `ap_*` protocol, restored the same seats/board/proof after a backend restart with real PostgreSQL, and agreed on a signed resignation result. The final Shogi proof replayed independently; a tampered event failed verification. These are automated local acceptance results, not physical-phone or live-production acceptance.

Verified defects were fixed in socket identity, delayed duplicate handling and room persistence ordering. No rules, catalogue IDs, board geometry, URLs, artwork, SQL schema, authentication provider, fair-play authority or proof format changed. Existing funded, indexer, collectible and chain-writing gates stayed disabled in every new acceptance fixture.

| Item | Status | Evidence |
| --- | --- | --- |
| Wallet-profile impersonation | FIXED AND TESTED LOCALLY | An unsigned socket previously acted as an existing Two Stones wallet; 17 additional reachable wallet-game prefixes also admitted impersonated room creation. All 18 now require the existing signature-bound wallet login. |
| Delayed Two Stones duplicate | FIXED AND TESTED LOCALLY | A message accepted at ply 5 was accepted again at ply 12 when its move became legal again. Persistent accepted-request hashes now reject it, including after reconnect and PostgreSQL-backed process restart. |
| Room persistence ordering and snapshot timing | FIXED AND TESTED LOCALLY | A later CI run found the stored row at ply10 after12 acknowledgements. Deterministic tests reproduced older-write overwrite and mutable snapshot capture; per-room FIFO and immediate snapshots fix both. Fresh CI remains separately recorded. |
| Free Two Stones end-to-end match | FIXED AND VERIFIED IN TEST ENVIRONMENT | Two independent WebSocket clients agree on the authoritative five-ply immobilization result and history; invalid moves and duplicate actions do not advance the board. |
| Android-protocol free Shogi acceptance | FIXED AND VERIFIED IN TEST ENVIRONMENT | Real account/session checks, seat tokens, signatures, worker validation, database persistence, restart restoration and independent final-proof verification. |
| Live networks, actual phones and founder accounts | OWNER ACTION REQUIRED | No live account, wallet sign-in, match or physical Android acceptance was performed. |
| Production rollout | PRODUCTION VERIFICATION PENDING | Deployment remains a separate founder decision and must preserve the Batch A–C launch gates. |

## Actual architecture exercised

The fixture launches the production `server/package.json` start path: preload `allGamesBackendBootstrap.js`, then `scripts/start-with-runtime-status.js` and its indexer/HTTP wrapper. It exercises `loadPrizeBackend.transformBackendSource`, all game injections, actual request-security/funded guards, HTTP readiness and native WebSocket dispatch. It does not call a service mock as the integration entry point.

| Protocol | Identity and authority | Acceptance scope |
| --- | --- | --- |
| `ts_*` and the enumerated older wallet families | Existing wallet challenge/signature login sets `ws.authorizedWallet`; the service validates legal moves. | Full Two Stones natural match; authorization matrix for all reachable wallet prefixes. |
| `ap_*`, used by the Android game service | Current company account session, saved seat token and account ownership; signed intent and worker rules validation. | Two-client Shogi, illegal/stale/duplicate requests, reconnect, durable restart and signed completion. |
| `sg_*`, `sy_*`, `ss_*`, `sh_*`, `xq_*`, `ctl_*` | Separate private-seat/account protocols. | Kept outside the wallet-profile guard. Existing compatibility gates are recorded by the root handoff. |

The fixture supplies only synthetic local accounts, ephemeral test signing keys and loopback PostgreSQL. It blocks external fetches, uses a fixed price snapshot, binds the listener to loopback, and suppresses environment-file loading. Those fixture boundaries avoid external services while preserving the actual game/authentication/transform code. The fair-play service receives a synthetic trusted recording key; the published rules authority is unchanged. On-chain proof anchoring is disabled.

## Root causes and fixes

### Global profile existence did not authenticate a socket

`twoStonesService.requireProfile` previously accepted `payload.wallet` whenever that wallet existed in the shared `profiles` map. It then assigned that socket as the wallet's broadcast destination. The original generic `protectedTypes` list covered the original game actions but omitted prefixed wallet-game actions.

The first production-wrapper regression failed: after two signed-in wallets joined, a third unsigned socket supplied the host wallet and a legal placement and received `ts_game_action_result`. A second matrix demonstrated impersonated room creation for 17 additional prefixes; the already-fixed Two Stones prefix rejected it.

`legacyWalletAccess.js` now identifies exactly the 18 reachable wallet-profile families: `nif`, `fwh`, `fish`, `bti`, `ih`, `siw`, `gt`, `cr`, `fgg`, `str`, `ir`, `ck`, `ts`, `av`, `pt`, `ag`, `sir`, `kf`. The existing ingress login check covers their private/mutating actions. Their public `*_room_list` actions remain available without login. The service-level Two Stones check also requires the normalized authorized wallet to match before changing a broadcast subscription. The existing signed-wallet mismatch check and all funded checks remain in place.

The old Sige `sg_*` aliases are shadowed by the earlier Sanguo private-room dispatcher in the production composition; this patch does not redirect that protocol or claim a catalogue-wide gameplay audit. The new socket matrix verifies anonymous denials and authenticated creation for each of the 18 reachable wallet families.

### Turn checks alone did not prevent a delayed duplicate

The shipped website client generates `req_<time>_<sequence>` identifiers. Two Stones previously ignored them. An immediately repeated move failed because the turn changed, but after eight legal movement plies the original `blue-1: nw → c` action was legal again. Replaying its original request ID advanced the game a second time.

Each newly accepted Two Stones action now records a SHA-256 fingerprint of its match, normalized authenticated wallet, and request ID type/value in optional `acceptedActionRequestHashes` room metadata. This metadata is outside `gameState`, `auditLog` and the existing proof-hash input and is saved through the existing `room_json` path. There is no SQL migration or client payload change. Two players may use the same request ID; numeric and string identifiers remain distinct.

The bound is **44** accepted actions: four initial placements plus the existing maximum of forty movement plies. No receipt is evicted. A duplicate, malformed metadata or an exhausted ledger is rejected before the board advances. Absent metadata remains valid for old saves; present malformed values fail closed. The shipped client always sends an ID; identifier-less Two Stones mutations are now rejected explicitly rather than pretending they can be deduplicated.

**Limits:** pre-upgrade request IDs were never recorded, so they cannot be retrospectively deduplicated. The older service still acknowledges before its asynchronous room write completes. The restart test verifies the row was stored before stopping the process; it does not claim durability for a crash between acknowledgment and persistence. A configured-database outage and that persistence window remain governed by the existing recovery/rollout controls. No historical proof or game state is rewritten.

### Pooled writes could overwrite a newer room with an older state

The Node20 job on candidate `5144a1d6bfef29ffea11bc38738011cb2ae1e572`
found PostgreSQL still at Two Stones ply10 after twelve acknowledged actions.
The existing test failed before restart; it did not accept stale restoration.
The same Node24 run passed, which did not negate the ordering defect.

`roomStore.saveRoom` issued unconditional upserts on independently completing
pool connections. A delayed older write could commit after a newer write. It
also serialized the live room only after asynchronous initialization, and read
player fields after another await. Later game mutations could therefore change
what an earlier save captured or mix room and player snapshots.

The new deterministic regression held a ply10 write while a ply12 write could
finish, then released the older write. Before the fix, the database fixture
ended at ply10. A second regression mutated one live room between calls and
showed both saves capturing ply12. Two of four tests failed before the fix.

The store now snapshots sanitized JSON before its first await and queues saves
per room, including the corresponding player writes. Different rooms remain
concurrent. Failure still rejects to the caller, does not replay the failed
snapshot and does not block later saves. The four regressions pass on both
runtimes; the unchanged twelve-ply PostgreSQL/restart test also passes. No sleep,
retry or reduced assertion replaced the failing acceptance check.

This queue operates within one backend process. It does not coordinate multiple
independent writers or remove the existing acknowledgment-to-durability crash
window. No deletion API exists in this store; no new deletion behavior was added.

## Match and recovery evidence

The Two Stones natural-completion sequence uses the existing rules:

| Ply | Client | Legal action |
| --- | --- | --- |
| 1 | Blue | Place `blue-1` at `nw`. |
| 2 | Coral | Place `coral-1` at `ne`. |
| 3 | Blue | Place `blue-2` at `sw`. |
| 4 | Coral | Place `coral-2` at `se`. |
| 5 | Blue | Move `blue-1` from `nw` to `c`; Coral is immobilized. |

Both clients receive the same final board, Blue winner, `immobilization` reason and proof hash. Each receives exactly one history entry with zero entry and payout amounts. Reconnecting the original authenticated wallet preserves its seat, match and board. Client-supplied fake state is ignored, wrong-turn/illegal/post-finish moves are rejected, and duplicate IDs remain rejected even when the action is otherwise legal.

The Android Shogi case uses two independent account sessions, player IDs, seat tokens and P-256 keys. It rejects a missing session, occupied seat, non-host start, stolen-seat credentials under another account, invalid actions, stale revisions and concurrent duplicates. After two legal signed moves it verifies stored state, stops the actual backend, starts a fresh process against the same isolated PostgreSQL database, and rejoins both original seats. Two further signed moves and a signed Blue resignation close the match with Red winning. Both clients agree; the five-event proof verifies under the unchanged authority and a changed event hash fails. Resignation is the tested Android completion path; this is not a claim of a naturally played Shogi checkmate.

## Repeatable local and CI commands

With pinned dependencies installed and local PostgreSQL 18 binaries available:

```bash
PG_BINDIR=/absolute/path/to/postgresql18/bin node server/scripts/free-multiplayer-smoke.cjs
```

The runner creates and removes a fresh cluster. Each PostgreSQL test also creates its own randomly named disposable database. The connection validator rejects non-loopback hosts, query parameters (including libpq/pg host overrides), fragments and non-PostgreSQL schemes **before** any pool is opened. Cleanup is registered before database creation; consumers close before normal database removal. Test database errors are asserted, not ignored.

For an existing authorized disposable CI PostgreSQL service:

```bash
FONSO_MULTIPLAYER_TEST_DATABASE_URL=postgresql://fixture@127.0.0.1:5432/postgres \
  node --test server/tests/free-multiplayer-socket.test.js \
  server/tests/arctic-play-socket-recovery.test.js \
  server/tests/two-stones-online.test.js \
  server/tests/room-store-ordering.test.js
```

The final gate contains **20 tests**, including four ordering regressions and the existing rules/transform checks. Node **20.20.2** and **24.22.3** each passed **20/20 with zero skips** against PostgreSQL **18.7** after the storage correction. The shared-store Batch B compatibility/health/recovery gate also passed44/44 on both runtimes. Results and source fingerprints are recorded in `BATCH_D_MULTIPLAYER_EVIDENCE.json`; CI run identities are in the combined evidence. Do not report a database-free run with skipped recovery tests as acceptance. The initial fixture force-drop race was corrected by closing consumers before normal removal; it is separate from the subsequently reproduced application write-ordering defect.

## Founder-controlled live continuation

1. Review the stacked candidate and approve deployment separately under the Batch D rollout instructions. Preserve disabled funded/settlement/chain-writing gates and the separate C3 authorization for any pending collectible jobs.
2. Use two authorized existing player accounts/devices. Any required real Para consent or wallet signature is performed by its owner. Do not create a new live account or trigger automatic collectible delivery merely to run this free-game check without the C3 approval.
3. On the intended APK/browser build, open a free starter Shogi room, invite the second account, take distinct seats, mark Ready and start. Confirm no entry fee, deposit, paid-room or settlement control is involved.
4. Make legal moves from each device; verify the same board/turn. During the match, temporarily disconnect one device, reconnect and rejoin with its saved account/seat. Preserve app data and existing saves. Confirm the original seat and current board are restored.
5. Complete the free match and compare both results. Export the signed proof through the existing authenticated flow and verify it against the intended published authority. Retain only public/non-sensitive result evidence; do not put recovery codes, sessions, seat tokens or private signing material in the report.
6. Record actual network/device behavior, elapsed reconnection time, any errors and the tested build/commit. Physical APK acceptance remains D1's separate founder checklist. Automated socket tests do not establish device UI, latency under mobile networks or production capacity.

## Changed files

Runtime: `server/loadPrizeBackend.js`, `server/legacyWalletAccess.js`, `server/twoStonesService.js`, `server/roomStore.js`. Regression/fixture files: `server/tests/two-stones-online.test.js`, `server/tests/free-multiplayer-socket.test.js`, `server/tests/arctic-play-socket-recovery.test.js`, `server/tests/room-store-ordering.test.js`, `server/tests/helpers/free-multiplayer-fixture.cjs`, `server/tests/helpers/local-test-database.cjs`. Reproducible runner: `server/scripts/free-multiplayer-smoke.cjs`. No APK or artwork was modified by D2.
