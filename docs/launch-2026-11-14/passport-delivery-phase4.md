# Phase 4 — Para wallet and confirmed passport delivery

Reviewed 12 November 2026 on `codex/passport-delivery-phase4`, starting at local commit `d187f07dc11e9420b84ac63ed6490821f1127f93` (same tree as published phase 3 commit `f4e207b2f255bb9a8d71f399b92cd598bf0ef01c`). Main reviewed: `08b8b79c8533d9a82da32c3ea3446b91dea8495a`; prior live backend: `0a7d45cefe8568bd1c66a9281fcd04ec28e1fa12`.

## Outcome and acceptance

Reuse the owner's passport at `0xF059141A4e21eF5786e66e96F1c4357858a0De11` on Robinhood testnet (46630). A successful journey requires a real Para sign-in, a wallet attested in Para's signed JWT, proof of control bound to the current request, explicit NFT-address consent, one durable registration, and a matching canonical mint receipt/claim/owner after two L2 confirmations. This is not Ethereum finality. Local fixtures cannot complete live acceptance.

The passport is a free account-bound ERC-721. Metadata can change with service-verified achievements. Onchain issuance does not independently prove the correctness of game results, historical claims or the metadata author. Player names, emails, sign-in IDs and account IDs are excluded from public metadata and mint arguments.

The normal APK screens, loading, icon and gameplay are not modified. Matching verified Para wallets are recognized even when the shipped form submits its existing external-address mode. A separate same-origin check page supplies an exportable acceptance record:

https://articweb3.onrender.com/arctic-play/passport-check/

## Operator setup

1. Use the existing private console: https://antarctic-robinhood-testnet-console.avidandsouza.chatgpt.site . Retain/import the existing deployment JSON; do not redeploy.
2. Connect the deployed passport's owner wallet on testnet. In **Phase 04 / Passport delivery**, review the backend signer and matching contract, then choose **Authorize passport delivery**.
3. Approve only the required `MINTER_ROLE` grant and a top-up to **0.005 free test ETH**. Existing grants/funding are reused. The backend gets no administrator, registry, settlement or metadata role from this action.
4. Refresh until the backend reports `ready`. Its readiness check independently reads chain ID, reviewed runtime code, minting permission, estimated gas budget and durable database/signer lock. A configured flag is not success.
5. Open the check page, sign in with Para, confirm the wallet and consent, then issue the free testnet passport. Download **Antarctic-Passport-Live-Acceptance.json** only after its independent receipt/claim/ownership check succeeds. Attach that public file to the work chat. No key, seed phrase, login token or recovery code belongs in the export.

Para credentials and any social/OTP challenge stay in Para's own flow. This acceptance requires the user's participation; an agent must not invent a player identity or call a fixture a live sign-in. Registration remains possible while minting setup is pending; queued delivery does not block free gameplay.

## Runtime and recovery

The existing Render web service can host one sequential sender. No additional paid worker is required. `AK_PASSPORT_RUNTIME_ENABLED=true` starts it, and `AK_VISA_DELIVERY_ENABLED=true` enables its guarded configuration. Chain-specific values take precedence:

- `AK_VISA_CHAIN_ID=46630`
- `AK_VISA_RPC_URL_46630` — HTTPS RPC reporting chain 46630
- `AK_VISA_CONTRACT_46630` — deployed passport above
- `AK_PASSPORT_SIGNER_KEY_46630` — dedicated testnet minting signer, stored only as a service secret

Existing Abstract/paid-vault keys, default chain settings and balances are separate. Optional arrival/achievement collection addresses are not required to deliver the passport. Their jobs wait until those collections are configured and the passport is confirmed. No other project NFT is sent first by this queue.

Schema setup is serialized transactionally across route/worker pools. Registration and jobs commit together; duplicate registration reuses the passport. A transaction-scoped PostgreSQL lock excludes another sender during each check/send cycle. It releases on commit, rollback or connection loss, including through a transaction-mode pooler; no advisory session is left attached to an idle pooled backend. The connection is checked again before broadcasting. A failed setup resets its pool/adapter and retries, with a safe stage label in operator status. Submitted transaction hashes survive restart. Every retry looks up its original onchain claim before considering another send; the contract also enforces claim and recipient uniqueness. A successful receipt alone cannot mark a claim confirmed. Failed receipts block that job; transient RPC errors back off. No account data is deleted.

On a sleeping free service, processing resumes when the web service wakes. There is no promise of an always-running background sender or an instant mint. While the user has the page open, polling requests keep checking the actual status. Monitor gas and failures before broader distribution.

The authenticated `/passport/acceptance` endpoint verifies that the registration, authenticated Para wallet, chain and live evidence agree. Earlier rows labelled external by the APK remain valid only when the current server-attested Para wallet matches their address and chain. It checks the transaction's target, successful mint event, canonical block hash, claim-to-token mapping and owner. A missing receipt or changed chain/wallet cannot pass on a saved database confirmation alone. Only the minimal operator readiness endpoint has public CORS; identity and acceptance endpoints remain authenticated/origin-restricted.

Disable `AK_PASSPORT_RUNTIME_ENABLED` and `AK_VISA_DELIVERY_ENABLED` to pause sending; preserve queue records and submitted hashes. Revoke the dedicated signer's minter role if compromised, provision a new chain-scoped signer securely, review pending nonces/receipts, then restart under the new signer. Database rollback must not erase already broadcast transaction evidence. Changing environment variables requires the corresponding deployment to become live.

## Validation

The existing server launch suite includes focused phase 4 checks. An additional integration runs against an explicitly supplied disposable local PostgreSQL database plus Ganache, using the actual compiled ERC-721 and worker. It verifies concurrent schema initialization, signer-lock exclusion, permissions/gas gates, Para JWT/signature/PKCE exchange, consent, wallet binding, duplicate registration, passport-first queueing, exact receipt ownership, optional-collection deferral, metadata privacy and cross-chain conflict rejection. Para's JWKS/JWT in this local test are controlled fixtures, not live authentication.

```sh
cd server
npm run test:launch
AK_PASSPORT_TEST_DATABASE_URL=postgres://USER@127.0.0.1:PORT/DB node --test tests/passport-delivery-phase4.test.js
```

Use an empty disposable database/schema; the integration rejects non-local database hosts. Install pinned dependencies from the existing server, shared/fair-play and contracts/launch lockfiles first. Ganache's optional native uWS binding is absent on Node 24, so its supported JavaScript fallback is used.

## Deliberate mainnet migration plan — execution disabled

1. Reconfirm official chain and Para production requirements. Current Robinhood documentation lists mainnet 4663 and testnet 46630. Choose a production RPC provider with historical state support, measured latency and monitoring; the public endpoints are rate-limited and not recommended for production. Preserve Abstract Global Wallet on Abstract behind its existing adapter.
2. Keep the testnet contract and its history. Minting on a different chain is a new issuance, not a transfer or erasure of the testnet NFT. Publish a clear testnet-to-mainnet policy and user consent; do not imply a bridge or preserve token IDs without a verified mapping.
3. Review and migrate the current single-passport-per-account schema to explicit chain-scoped registrations, wallet uniqueness, delivery foreign keys, claim namespaces and inventory. Back up first, run a dry-run/backfill and restoration rehearsal, compare account/claim/job counts, then review the exact migration. Until then, another chain's registration returns a conflict; changing the configured chain never silently moves an existing passport.
4. Deploy separate reviewed passport/registry contracts, verify source/runtime/constructor/roles, and record creation blocks and metadata URLs. Use a separate least-privilege production minter and administrator custody. Fund only its reviewed real-gas budget. Obtain the project's security/operational approval before setting `AK_VISA_MAINNET_APPROVED=true`; no such approval or flag is supplied here.
5. Switch Para from BETA to the approved production application/audience and allowed origins deliberately. Re-test real supported social/OTP sign-ins and attested wallets; do not assume beta identities or wallet addresses carry over. If an identity changes, require explicit authenticated linking and mapping rather than merging by email.
6. Preserve approved achievements through an auditable source-to-destination entitlement ledger, with duplicate prevention and opt-in. Snapshot source chain/contract/token/account mappings privately, sign/review any public entitlement root without personal data, and reconcile every confirmed destination mint. Test reorgs, retry/crash recovery, gas exhaustion, key rotation and unavailable metadata before expanding a canary cohort.
7. Index each chain/contract from its own creation block with separate cursors and confirmation policies. Reconcile destination mint events, `totalIssued`, confirmed delivery rows and wallet ownership; dashboard phase 5 owns public aggregate presentation. Keep old records accessible and label the selected network.
8. Release a small free canary, obtain live Para-to-mint evidence and device QA, then expand. If a gate fails, pause the destination sender and retain submitted transactions; keep gameplay available. Testnet and Abstract support remain available through explicit adapters. Paid entry/settlement are outside this migration and remain separately gated.

Official primary references checked 12 November 2026:

- https://docs.getpara.com/v3/react/guides/sessions-jwt — attested provisioned wallets, audience binding, expiry and JWKS verification.
- https://docs.getpara.com/v3/react/guides/hooks/use-create-wallet — authenticated wallet creation lifecycle.
- https://docs.robinhood.com/chain/connecting/ — chain IDs, RPC providers and public endpoint limitations.
- https://docs.robinhood.com/chain/deploy-smart-contracts/ — standard EVM tooling and separate network deployments.

Live owner approvals, a real Para sign-in and a confirmed passport receipt remain acceptance gates until their actual evidence is recorded. Building or deploying this code alone does not complete phase 4.


## Deployment readback — 12 November 2026

PRs #88 and #89 are merged. The final server source `ce3db0d446aeb981897af1f70fde47e39b54758b` is live as Render deployment `dep-dbqrhq9srm7s738umrpg`. The owner-private console update succeeded as `appgdep_6af5b6500ee48191b7e0b41d80374828`.

Dedicated testnet signer: `0x009bFDc9d4C2738c1594c485040aa1994723330b`. Its secret was stored only in the existing service's chain-specific environment; other variables were preserved, and the temporary local key copy was removed after the service reported the matching address. The existing service was reused without a paid resource. No owner grant, funding transaction or live Para mint was performed by the agent.

The deployed service reached the `awaiting_minter_role` gate with `minter=false`, `funded=false` and `balance=0.0`. This gate follows its network, reviewed code, database schema and exclusive signer-lock checks. The first session-lock implementation reached the role gate but a replacement deployment remained at setup. Transaction-scoped sender checks replace that mechanism before owner authorization, with `checkStage` diagnostics and tested commit/rollback recovery. This is a testnet rollout while the dedicated sender has no minting role or gas; production lock-protocol transitions require a paused, reviewed rollout. Inspect `passport-live-readback.json` for the final status/timestamp.

The actual player page and script return HTTP 200; the passport image is available; anonymous acceptance returns HTTP 401. Operator config has public CORS, while effective player delivery stays disabled until the runtime is ready. The browser artwork inventory is 437 and the signed-proof rules hash remains unchanged. Registry anchoring is still unconfigured; Abstract indexing is preserved separately.

43 server launch tests pass with the disposable PostgreSQL/EVM integration enabled, plus eight contract/index tests, two compiled-console DOM/EVM checks and one wallet-cache test. The legacy external-labelled Para row and wallet-substitution regression pass in the real database/EVM integration. All six initial and three follow-up CI workflows passed, including the full source/restoration/gameplay checks. Actual player identity, wallet approvals, receipt acceptance and physical Android installation remain unverified.
