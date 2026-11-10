# Passport Wallet — v5.9.14 (102)

Opening Passport → Wallet displays the Para wallet created during sign-up, its ETH balance and its ERC-721/ERC-1155 NFT collection inside the Android app. The existing “My wallet & NFTs” button opens the same app sheet. Copy, refresh, NFT details and pagination do not launch a browser or Para management page.

Acceptance: use the signed-in account's attested Para address; label the actual chain and test currency; keep holdings and details in the app; avoid false zero/empty states on provider errors; cancel and clear holdings on account change/sign-out; preserve the existing games, art, onboarding and native shell.

## Reviewed implementation

- Repository `defiventurers/articweb3`, `main` at `7267d327c714a33601f1a599aaaea6efa7982dac`.
- Source parent: compact menus PR #74, commit `2d4f3c38350bd9dce4716d9436cc28e3175c768c`. This change stacks on that source branch.
- Backend starts through `allGamesBackendBootstrap.js` and the existing company service/passport routes. Authenticated `GET /passport` supplies `identity.accountId` and `identity.wallet`; no backend mutation or deployment is required.
- Wallet holdings use `identity.wallet`, never the separate passport NFT-delivery address. Para authentication, wallet creation and Abstract Global Wallet adapters remain in their existing flows.
- Live Para config checked 2026-11-09: BETA, Robinhood Chain Testnet, chain 46630. Its ETH is test ETH. Mainnet 4663 has a separate RPC/indexer adapter. Native balances also use the canonical configured Abstract/Arbitrum RPCs if an attested account uses them; NFT indexing for those networks is explicitly unavailable until a suitable adapter is configured.

## Implementation decisions

- RPC verifies `eth_chainId` before `eth_getBalance`. Wei/token IDs/ERC-1155 quantities retain integer precision. Native ETH is distinct from wrapped or bridged token balances.
- Blockscout address NFT inventory supplies current indexed ownership, including non-Antarctic collections; queued passport mint/delivery records are not treated as on-chain holdings. Pagination retains the returned cursor and deduplicates chain/contract/token IDs.
- Public providers receive only the public address; no account bearer token, Para credential, wallet key or signing request. Portfolio state is memory-only and cancelled on account changes. Chain configuration and external RPC/indexer origins are fixed by the app.
- NFT text is rendered as text, with length limits. Media supports HTTPS and IPFS-over-HTTPS. Unsupported data/animation media shows an artwork placeholder while retaining token details. External metadata links are not navigation controls.
- Public indexers may lag or fail; balances and NFT errors are independent, with refresh/retry and partial-result messaging. No failed read becomes a zero balance or empty collection.
- Existing gold/light/dark presentation is reused. The Wallet entry sits above the passport book and its sheet uses the existing close/focus/keyboard handling.

## Validation

- 8 wallet portfolio tests: authenticated identity, exact ETH, RPC chain mismatch, provider errors, ERC-721/ERC-1155, ownership, media validation and pagination.
- 5 shipped-runtime UI groups: Passport entry, in-app NFT details/copy/paging/refresh/close, account-switch races/sign-out, and independent failed/empty results. Browser and Para launch functions fail the tests if called.
- 13 existing compact-game regression groups: all nine menus, setup/learn/Hall controls, bot launch, locked hall and exact saved position restoration.
- Current source `App.jsx` compiles with installed locked dependencies. Existing lucide `use client` and frontend `import.meta` IIFE warnings are unrelated to this change; the delivered runtime preserves the previously shipped game bundles.
- Public testnet RPC `eth_chainId` returned `0xb626`; balance read succeeded. Blockscout returned 50 NFTs for the public burn address with a next-page cursor; all 50 normalized successfully. Both providers returned CORS allowance for the Android app origin. No user wallet or account was accessed for this probe.
- APK signatures v2/v3 pass with the original certificate; zip alignment and resource layout pass. Only seven manifest/web/version entries differ from v5.9.13. All 427 other entries, including native DEX, artwork and game workers, are byte-identical.
- Physical-device installation, visual rendering in Android WebView and a real user's post-sign-up wallet are still to be checked. This change does not establish production launch readiness.

## Build and check

```sh
node --test mobile/arctic-play/tests/wallet-portfolio.test.mjs
node mobile/arctic-play/scripts/patch-passport-wallet.mjs /path/to/v5.9.13-app.js /tmp/wallet-app.js
node mobile/arctic-play/tests/passport-wallet.test.mjs /tmp/wallet-app.js
node mobile/arctic-play/tests/compact-game-panels.test.mjs /tmp/wallet-app.js
python3 mobile/arctic-play/scripts/build-passport-wallet.py --baseline /path/to/AntarcticKingdoms-v5.9.13.apk --sdk /path/to/android-tools --output /path/to/output --keystore /private/ArcticPlay-release.jks --password-file /private/signing-password.txt
```

The packager requires the pinned delivered v5.9.13 APK and original signing certificate. The incremental build preserves shipped features newer than the main source snapshot. Run `build-web.mjs` only for a full source build with its separately documented approved artwork baseline. Private signing files and compiled APKs must not be committed.

Official references checked: [Robinhood chain connections](https://docs.robinhood.com/chain/connecting/), [network configuration](https://docs.robinhood.com/chain/add-network-to-wallet/), and [Blockscout's NFT inventory schema](https://github.com/blockscout/blockscout-api-v2-swagger/blob/main/swagger.yaml).
