# Fair Play v1 · Antarctic Kingdoms 5.4.0

The seven online APK/browser halls at `/arctic-play/app/` record account-authorized P-256 signed actions. The independent verifier replays the exact published rules, verifies the match agreement and service receipts, and rejects changed, reordered, duplicated or incomplete closed histories. Local practice remains labelled practice. Existing legacy website protocols retain their original verification scheme; use **Play with signed proofs** to enter the new edition.

Chaturanga requests a fixed future drand Quicknet round before fetching its result. Both server and public verifier check its BLS signature with pinned chain metadata. Dice use domain-separated SHA-256 and rejection sampling. An outage keeps the same signed request; retry never chooses a new round. Request timing is service-attested until a corresponding blockchain receipt is verified. Signed records do not by themselves establish onchain timing, availability or the absence of selective service refusal.

Proof exports contain the board, game-only public keys and actions. They exclude account credentials, wallet keys and chat. History is participant-only. Sharing explicitly creates an opaque public link; `DELETE /fair/matches/:id/share` revokes it. Protect the service signing key; publish only `trust.json`. Rotating a trusted key requires an app/verifier release that retains the keys needed by historical proofs.

## Checks

```sh
npm ci --prefix shared/fair-play
node --test shared/fair-play/core.test.mjs server/tests/fair-play.test.js
npm ci --prefix contracts/fair-play-tests
node --test contracts/fair-play-tests/registry.test.mjs
node --test --test-name-pattern='Independent receipt' contracts/fair-play-tests/registry.test.mjs
```

The exact rules source digests and compiled engine digest are in `rules-manifest.json`. The registry compiler/source/runtime digests are in `registry-manifest.json`. Exported proofs must use their original rules build. Preserve release workers for historical verification.

## Backend and routes

Set `AK_FAIR_SIGNING_JWK` privately on the existing backend. Its public key must be pinned in `trust.json`; the service fails closed when its engine hash or key differs. No new paid service is required. The existing account datastore keeps archives. Health advertises `fair-play-v1` only when the signing key and engine match.

- `GET /arctic-play/v3/fair/config`: capabilities and actual recording configuration.
- `GET /arctic-play/v3/fair/matches`: authenticated account history.
- `GET /arctic-play/v3/fair/matches/:id`: participant proof export.
- `POST` / `DELETE .../:id/share`: opt-in public link / revoke.
- `GET /arctic-play/v3/fair/public/:token`: shared proof.
- `GET /arctic-play/v3/fair/beacon/:round`: pinned-signature-verified beacon proxy.
- Authenticated WebSocket `ap_fair_get`: current room proof.
- `/fair-play/` on the main website, or `/arctic-play/app/verify.html`: independent public verifier.

## Activate testnet recording later

No blockchain registry has been deployed by this release. No gas funds, payouts or real-money settlement are enabled. The UI must show **unanchored** until actual receipts are checked.

1. Use a separate testnet-only relayer wallet and obtain test ETH from the chain's official faucet. Default target is Robinhood Testnet, chain 46630; Abstract Sepolia 11124 is also supported. Do not use the existing settlement/vault wallet.
2. Compile and test the funds-free `FairPlayRegistry` above. Set `AK_FAIR_RELAYER_KEY` privately and run `node contracts/scripts/deploy-fair-play.cjs` for a dry-run estimate.
3. Review the testnet/network/estimate, then use `--broadcast` when authorized to spend that test gas. Retain the deployment receipt and verify the exact source/runtime code.
4. Configure `AK_FAIR_CHAIN_ID`, `AK_FAIR_REGISTRY_ADDRESS`, `AK_FAIR_RELAYER_KEY`, and `AK_FAIR_ANCHOR_ENABLED=true` on Render; deploy. This only affects newly agreed matches. Mainnet is separately disabled and is outside this release.
5. Play and export a test match. Verify network, deployed bytecode, registered header, checkpoint receipt/root/count and confirmations in the public verifier. Check roll commitment blocks precede the agreed beacon publication. Test outages and recovery before enabling this configuration for users.

Checkpoints batch up to 64 hashes and publish every 20 actions or at match end. `RollCommitted` fixes each requested round/intent once. Historical checkpoint roots are retained. The registry records inclusion; it neither runs game rules nor decides winners or payouts. Two L2 confirmations are reported separately from Ethereum finality. RPC failure means pending, never verified. Chain activation needs operational monitoring, a funded relayer and an independent security review before any money or prize integration.

## Deployment artifact

The backend installs the checksum-pinned browser runtime archive produced from the same assets packaged in the APK. The runtime contains public game assets only. Signing material stays outside the repository. A full release source archive includes artwork masters and the original build commands; the public runtime archive allows auditing every shipped byte without needing image-generation tools.
