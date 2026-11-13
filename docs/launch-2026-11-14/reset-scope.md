# Fresh launch: exact inventory and approval boundary

November 11, 2026. No user record has been deleted or changed by this workstream.

## Evidence available

The parent performed a read-only inventory in the previously selected My Workspace (`tea-d510hcf5r7bs73aulbp0`). The relevant Render service is `articweb3` (`srv-d8knkism0tmc73ct2t3g`), using the repository's main branch with auto-deploy and server root. No Render-managed Postgres or Key Value instance was found in that workspace. This does **not** prove the account database is absent: `DATABASE_URL` may point to an external service. Its identity, ownership, backup access and actual contents remain unresolved. Do not clear service environment variables or disks as a substitute.

## Concrete code-owned data

| Storage | Known contents | Proposed disposition before any approval |
|---|---|---|
| `ak_documents`, kind `account` | Identity linkage, session hashes, recovery hashes, progress, access entitlements, wallet references and optional metrics | Inventory first. Prefer a launch season/cohort over deleting identity and purchased entitlements. |
| `ak_documents`, identity/auth kinds | Login mappings and attempts; exact kinds require database inventory | Review separately; deleting mappings can create duplicate accounts or strand wallets. |
| `ak_documents`, commerce/license kinds | Purchase confirmations, offline licenses and entitlements may exist | Preserve; never infer these are disposable test records. |
| `ak_documents`, proof/history kinds | Match records and fairness owner mappings may exist | Preserve evidence and chain linkage; identify test-only rows explicitly. |
| `ak_passports` | Per-account registration, consent, wallet, chain, claim identity | Preserve/season-label unless a reviewed test-data reset is chosen. Deletion alone would not erase minted NFTs or contract uniqueness. |
| `ak_passport_deliveries` | Mint claim IDs, transaction hashes, statuses and retries | Stop worker before any approved modification. Preserve reconciliation history; deleting jobs could lose receipt recovery or cause duplicate attempts. |
| `ak_launch_visits` | Aggregate anonymous session hashes | Cohort boundary already separates prelaunch; deletion is unnecessary for November 14 counts. |
| Room persistence, profile storage, other schemas | Separate backend modules, unknown deployed configuration | Outside this preview. Must identify actual storage before planning deletion. |
| Para/Google identity and onchain contracts | External accounts, wallets, NFT ownership, claim mappings and proofs | Render deletion cannot reset these. No deletion proposed. |

## Read-only preview

`node server/scripts/preview-launch-reset.cjs` uses the privately configured `DATABASE_URL`, opens `BEGIN READ ONLY`, returns table counts and aggregate kinds/networks/states, then rolls back. It never returns account IDs, wallet addresses, identity claims or secrets. It has no execution/deletion mode. No live database preview has been run because the actual database has not been identified.

## Required reviewable reset package

1. Identify the actual account database and every writer/worker. Confirm the target service and environment without exposing its URL/credentials.
2. Run the read-only preview and inspect exact document kinds. Define test-only selectors, preserved entitlements/financial records, a local-date cutoff, and any account continuity guarantees.
3. Obtain an encrypted access-controlled backup of the chosen tables and related dependencies. Verify restoration into an isolated database and row/hash reconciliation. Backup artifacts containing credentials or user data must not be attached to a public PR or dashboard.
4. Prefer starting a new launch cohort or season. If deletion is still wanted, provide exact SQL selectors, expected counts, FK order, provider/onchain consequences, and rollback commands for the owner to approve.
5. Only after explicit approval of that concrete scope: pause writers and workers, verify database identity and cutoff, rerun the same preview and compare counts/digest, execute a transaction, validate, and resume services. This repository change deliberately supplies no execution command.

The November 14 target is not authorization to schedule an automatic destructive operation. Confirm the intended India-time cutoff and exact data scope. Existing onchain history remains visible and needs a separate documented launch-season treatment.
