# Launch operations and limits

The user authorised the full launch checklist, including a fresh start on November 14, 2026. The application is a free game release; public paid entry/settlement remains governed by existing repository launch gates.

## Reproducible app

`npm ci --prefix mobile/arctic-play/build-deps` and `npm ci --prefix shared/fair-play`, then `node mobile/arctic-play/scripts/build-current.mjs --native --frontend` build the same source for Android, the backend browser route and `/play/` on the website. The artwork inventory pins the verified 5.9.15 assets by hash. No minified-bundle patching is used.

The backend `npm install` postinstall compiles its browser route as well as Para's public wallet UI. Frontend production builds compile `/play/` before Vite. Direct `?game=` heritage URLs remain intact; `/?legacy=1` opens the larger original catalogue and Abstract wallet routes.

Public growth dashboard: `/arctic-play/app/?view=launch-dashboard` (or `/play/?view=launch-dashboard` on the website). Only anonymous aggregate numbers are public. Owner delivery health requires `AK_LAUNCH_OWNER_KEY` (at least 32 characters), kept outside the player journey. Browser sessions are counted once per UTC day; this is not a count of unique people. Honor Do Not Track / Global Privacy Control.

## Robinhood testnet

Chain `46630`, RPC `https://rpc.testnet.chain.robinhood.com`, explorer `https://explorer.testnet.chain.robinhood.com`, faucet `https://faucet.testnet.chain.robinhood.com`. Public RPC is rate limited; a provider endpoint is recommended for production traffic. Retain Abstract AGW on Abstract; it is not a Robinhood wallet adapter.

Use a **Para production** project for public identities even while NFTs and proofs use the **blockchain testnet**. Beta and production wallets are distinct. The current public beta key must not be presented as unlimited launch capacity. Required private configuration: production key and application audience, `AK_PARA_ENVIRONMENT=PRODUCTION`, `AK_PARA_PRODUCTION_APPROVED=true`, `AK_PARA_CHAIN_ID=46630`. Do not invent production credentials or silently migrate a wallet.

`contracts/launch/` uses ordinary EVM Solidity tooling, not zkSync deployment tooling. `npm ci && npm test` validates passport/keepsake minting, authorization, metadata, and append-only proof records. `node deploy.mjs` estimates; `--broadcast` deploys only to supported testnets with an explicitly configured funded test signer. No real-money modes are enabled.

After deployment configure the chain-scoped passport/achievement/arrival addresses, a separate minter key, RPC and worker. The passport is minted and confirmed before any souvenir or achievement. Its public metadata excludes names, email, wallet lists and recovery information. Metadata attributes come from server-verified achievements. Receipt confirmation, registration and mint count remain separate. Keep source verification, deployment receipts and deployment records.

## Fair Play

Recovered and integrated proof recording covers the seven original mobile halls, both Shanshui seat formats and standard untimed Cờ Tư Lệnh tables. It verifies game-only P-256 action signatures, exact rule replay, service receipts, final result and pinned drand beacon signatures. Public randomness is **drand**, not an invented Chainlink VRF deployment. A retry retains the same future round. Bot signatures are service-authored and labelled bots. Practice is not publicly attested.

The funds-free registry records move-hash inclusion and pre-beacon roll commitments. It does not execute rules or adjudicate winners. `unanchored`, `pending` and confirmed receipts must remain visibly distinct. Proof availability is advertised only when the pinned service key and exact rules build match. Preserve historical rules/verifier releases when changing the rules digest.

Cờ Tư Lệnh currently retains its distinct server-validated private protocol, hidden deployment and clock behaviour. Do not advertise the shared signed-proof format as supported there until its adapter and hidden-state/clock evidence have passed independent replay tests. Legacy website protocols also require their own evidence; a frontend build does not prove all catalogue games are on-chain.

## Fresh start

Only the previously selected `My Workspace` → `articweb3` service is in scope. No managed Postgres or Key Value instance was returned by Render discovery; the account store reports configured live, so its database is likely external. A connection through an authorised operator channel is needed to inspect exact row counts. Other services, including `chaturanga-game` and unrelated projects, are outside this reset.

The operator script `server/scripts/reset-launch-users.cjs` previews exact app tables, the November 14 IST cutoff, blockers and a plan digest. It defaults to read-only. Apply requires the date to have arrived, stopped writers, the reviewed digest and a new private backup file. It refuses active games, financial obligations, unknown document kinds, post-launch accounts and already delivered/submitted NFT claims. It never drops a database. On-chain NFTs and Para wallets cannot be erased by deleting Render records; their bindings require reconciliation rather than an accidental duplicate mint.

No live deletion has been executed during implementation. Device-local saves are outside Render; resetting them requires a separately versioned in-app migration rather than a database wipe. Restart processes after a successful offline reset so no old room snapshots can be written back.

## Mainnet transition

Testnet passports do not automatically move to mainnet. Use separate deployments/addresses, a snapshot of eligible opt-in claims, wallet re-verification, idempotent migration claim identifiers, a small test cohort and reconciliation of receipt/owner records. Scope token IDs, balances, matches and index cursors by chain and contract. Preserve testnet receipts; never call a remint a bridge. Do not enable mainnet without the repository's security/operational review.

## Artwork source pack

The 333 recovered public runtime assets are stored as five checksum-pinned ZIP parts in `mobile/arctic-play/runtime-art-pack/`. Clean builds restore them automatically, verify every part and the full archive, then validate individual artwork against `runtime-art-sources.json`. The unpacked `runtime-assets/art/` is generated. No signing keys or compiled application code are in the pack. All new final-reference art remains individually editable in `frontend/public/assets/launch-v1/`. To deliberately revise the recovered art, update its approved source, regenerate the pack with `scripts/pack-runtime-art.py`, and update the individual provenance hashes.
