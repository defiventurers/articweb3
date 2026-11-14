# Mystery Golden Egg — owner signature checkpoint

Reviewed source: `main` at `100c3c7513ce90fd2e5e5fc4163155c4c8419d36`.
The existing `AntarcticMysteryEgg.sol` is unchanged. `deploy-eggs.mjs --wallet`
now prepares a self-contained Rabby signing page at `/ops/egg-deploy/`.

## Accepted deployment inputs

- Chain: Robinhood Testnet, 46630; official RPC and explorer.
- Existing Passport: `0xF059141A4e21eF5786e66e96F1c4357858a0De11`.
- Owner/admin: `0xaE139be36A9AaF91af8F719740cE3a2F7102E66e`.
- Backend minter: `0x4378fDEfE1BB9d3D3B3b1B6433A6C29c560aEcCc`.
- Maximum 33 editions; metadata base:
  `https://articweb3.onrender.com/arctic-play/v3/passport/egg-metadata/46630/`.
- Creation data SHA-256: `b5dc2b636361957d8461ad21ef21db427ace14f18a0fa6c198fe6f6d6e0ed903`.
- Expected runtime SHA-256, with Passport immutable:
  `1021a9fa71d5534cd1da7097a9ac4f686d195594836dfd137051b03f1a0ee76e`.

## Read-only observations before owner signing

On 14 November 2026 UTC (15 November IST), owner confirmed/pending nonce was
17/17, with approximately 0.05896374155 test ETH. Complete explorer owner
history contained 17 transactions with no next page. Its only creations were
the existing registry at nonce 0 and Passport at nonce 1. RPC code checks for
all owner creation addresses through nonce 16 agreed. Explorer search for
Antarctic Mystery returned no matches. No Egg deployment was found; this is
rechecked by the wallet page immediately before any deployment request.

Live backend readback: `ready: true`, `eggReady: false`, `kinds: ["visa"]`,
signer as above, `minter: true`, `funded: true`, balance `0.15` test ETH.
No Egg contract address or deployment transaction has been confirmed yet.

The launch hold was also blocking public metadata GET requests with 503
`LAUNCH_RESET_PAUSED`. The targeted fix permits read-only NFT metadata while
keeping account, auth and registration routes paused, including POST attempts
to metadata/status paths. No environment hold or registration flag is changed.

## Validation

- Contract compilation succeeded; existing Passport runtime hash is unchanged.
- Three contract/wallet tests passed: Passport, Egg, and real local-EVM browser
  wallet flow with lost-response recovery, canonical receipts, exact runtime,
  role checks and duplicate blocking.
- Backend focused suites: 14 passed, one PostgreSQL integration test skipped
  because no local test database URL was configured.
- JavaScript syntax and Git whitespace checks passed.
- Generated inline-script CSP hash matched the HTML script.

## Resume after signature

Keep the same page and transaction. Copy the deployment hash or download its
receipt. Independently validate the creation input, canonical successful
receipt, two L2 confirmations, runtime, admin, minter, Passport, and edition cap.
Publish Solidity explorer verification using 0.8.24, optimizer 200, Paris EVM.
Merge only `AK_EGG_CONTRACT_46630` into Render service
`srv-d8knkism0tmc73ct2t3g`, workspace `tea-d510hcf5r7bs73aulbp0`; deploy the
configuration and confirm `eggReady: true` with both `visa` and `egg`.
Verify metadata editions 1 and 33 and their artwork. Keep registration paused.
Do not redeploy the Passport, reset data, mint a test edition from the live 33,
request keys, or deploy another Egg to resume this checkpoint.
