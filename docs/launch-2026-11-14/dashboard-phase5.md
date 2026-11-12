# Phase 5 — owner launch dashboard

Reviewed `main` at `be258725c2b357bb9408b369d7989c9548c91112`; implementation branch `codex/launch-dashboard-phase5`.

## Outcome and acceptance

Provide a private owner view of verified sign-ups and independently rechecked Antarctic Passport deliveries, with browser observations, wallet readiness, registrations, delivery failures, daily activity and a totals export. Acceptance requires the deployed API and private proxy to return real database/chain evidence, plus a fresh check of the owner's supplied passport acceptance receipt. A successful build alone does not satisfy that gate.

Dashboard: https://antarctic-launch-dashboard.avidandsouza.chatgpt.site

The Site remains owner-private. Its platform gateway protects the UI and proxy. A separate random server-side service key authorizes only aggregate reads and receipt verification at the existing Render backend; it cannot mint, reset data or change settings. Never publish this Site or expand its audience without reviewing that boundary. No key belongs in client code, Git, query strings, screenshots or exports. Existing public aggregate endpoints and repository visibility are unchanged; their publication policy remains a separate decision.

## Definitions and coverage

| Measure | Definition |
| --- | --- |
| Verified sign-ups | Non-temporary accounts created in the window through a verified supported sign-in; unverified legacy accounts excluded. |
| Browser sessions | Anonymous session observations deduplicated per UTC day, displayed by first observation in IST. Not unique people. APK opens, blocked storage, DNT and GPC are excluded. |
| Wallets ready | Distinct attested wallets on chain 46630 attached to the selected sign-up accounts. Provider creation time is not claimed. First backend verification time is recorded prospectively; historical dates cannot be reconstructed. |
| Registered passports | Consented registrations created in the selected window, separate from mint delivery. |
| Confirmed passports | Canonical successful mint receipts, claim mappings and current wallet ownership rechecked against the reviewed collection, counted by chain mint time. An older registration minted during launch counts in launch. |
| Backlog and errors | All current unconfirmed passport deliveries, with queued/sending/submitted/retry/blocked states, safe error codes and oldest pending registration. |

The journey is a set of activity totals, not an identity-linked visitor conversion funnel. Cohorts automatically switch at midnight IST on 14 November 2026. Current, 24-hour, seven-day, all-time and launch windows are selectable. Charts show at most the latest fourteen days. Health/reconciliation and receipt log cover the collection's current all-time state, independently of the selected activity window.

Read-only reconciliation checks at most eight receipts per minute, oldest first, while the owner dashboard is requested. It compares independently read `totalIssued` at a two-confirmation L2 block with checked delivery rows and reports unchecked/mismatched records and timestamps. The derived PostgreSQL check table survives service restarts. RPC errors preserve prior evidence and mark the check unavailable; absent storage is not displayed as zero. Checks older than fifteen minutes are labelled pending. This bounded reconciliation is not a continuous event indexer or Ethereum finality, and does not close phase 3's registry/indexing gates.

The acceptance JSON importer discards unrelated fields, including the private passport identifier. The backend looks up the actual delivery and Para-attested account wallet, then rechecks the live mint receipt/claim/owner. Exported `confirmed` booleans are not trusted. No user names, emails, wallet list or account IDs appear in aggregate/CSV responses.

## Implementation and operation

- `server/launchOperations.js`: private aggregate query, derived receipt checks and import verifier.
- `server/launchMetrics.js`: `GET /launch/owner/v2?period=current` and `POST /launch/owner/verify-passport`, authenticated with the existing owner key or new dashboard service key.
- `ops/launch-dashboard/`: source UI, private Worker proxy and deterministic builder. Fixture data is for tests/visual inspection only and is never included in the deployed Worker.
- `shared/launch/visit.mjs`: first-party anonymous observation helper used by browser frontend, browser APK source and passport acceptance page. No installed APK is rebuilt here.

Render merges `AK_LAUNCH_DASHBOARD_SERVICE_KEY` with existing configuration. The Site stores the same value as secret `LAUNCH_SERVICE_KEY`. Deploy after configuration changes, verify both ends, and keep secrets out of local source. Rotation requires updating both services and verifying their corresponding deployments; existing minting/Abstract keys are unrelated.

Build the selected owner-private Worker starter using:

```sh
node ops/launch-dashboard/build.mjs --site-dir /ABSOLUTE/SELECTED_SITE
```

Then run that starter's build/validation and native source/publication workflow. Its hosting manifest must retain the exact existing project ID. The canonical worker starter has no dev command, so a separate controlled-data static harness was used with the managed preview for visual QA; it is not production or a second published Site.

## Validation

All 50 server launch tests passed with both optional PostgreSQL/local-EVM integrations enabled, zero skipped. The dashboard integration uses actual compiled ERC-721 code, scoped database records and canonical receipts. It tests historical sign-up/new-mint dates, cross-chain contamination, retries, blocked deliveries, private-field exclusion, import tampering, RPC outages and a reverted chain. Worker/DOM tests verify server-only credentials, fixed upstream paths, import field filtering, real API rendering and preserved stale totals. Desktop layout and receipt presentation were inspected with explicitly labelled controlled test data.

Existing APK v5.10.3, loading screen, icon, game rules, local/bot/practice/online modes and signed-proof authorities are preserved. Abstract, paid entry and settlement, account data and Render infrastructure are unchanged. No account reset or fabricated live player activity is performed. Deployment/live acceptance evidence is recorded separately after verification.
