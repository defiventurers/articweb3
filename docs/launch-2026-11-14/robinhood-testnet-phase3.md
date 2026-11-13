# Phase 3: Robinhood testnet deployment and confirmed events

Status: implementation and local acceptance complete; real wallet funding, transaction approvals, explorer verification and backend activation remain pending. Phase 2's final player-match acceptance is deferred by the user.

The private operator console is deployed at https://antarctic-robinhood-testnet-console.avidandsouza.chatgpt.site . Sign in with the owning ChatGPT account and use an EVM browser wallet. The console requests no seed phrase/private key. It is separate from the game and does not rebuild the APK.

## User steps

1. Open the console in the browser that has a dedicated testnet wallet. Connect it and request free test ETH through https://faucet.testnet.chain.robinhood.com . The faucet returned a plain HTTP 403 in the agent browser; no claim is made that it is unavailable to the user.
2. Review the operator address. The connected wallet owns the contracts; the operator gets registry registrar and passport minter/metadata permissions. It defaults to the connected wallet for a test rehearsal. Automated backend operation needs a securely configured operator key matching this address.
3. Press **Deploy both testnet contracts**. Approve the two testnet creation requests. Submitted transaction hashes and reserved nonces are saved for resumption; an ambiguous prior request does not silently deploy duplicates.
4. Press **Verify source on explorer**. Check again while queued. A submitted GUID is not treated as verified source; the configured address must actually return verified source metadata.
5. Press **Run testnet registry rehearsal**. Approve the three labelled test transactions: match registration, future randomness commitment and closed checkpoint. They are operator test commitments, not a player victory or passport mint.
6. Press **Verify and index chain events**, then **Download deployment record**. Attach that public JSON in the work chat. It supplies the addresses/receipts needed for independent live verification and backend configuration.

## What is implemented

- Restored the exact `FairPlayRegistry.sol` from live source commit `0a7d45cefe8568bd1c66a9281fcd04ec28e1fa12`. Solidity 0.8.24, optimizer 200, Paris EVM reproduces published runtime SHA-256 `dac8ec3e3451e234121c7bfd67f470348dae33f1b8d0d2b84bf8ef76bcfd0e17` and source SHA-256 `7a7afb11371dc3823011ab4dd1ccef84b71b750a32602708d667a0ed710274f8`.
- Deploys the funds-free registry and existing ERC-721 Antarctic Passport. Abstract adapters, optional keepsakes, paid entry and settlement remain separate.
- Validates testnet chain 46630 before sending; checks creation transaction data, owner/operator roles, bytecode, canonical receipt blocks and two confirmations. Mainnet/Abstract are rejected by this deployment flow.
- Provides full standard-JSON compiler input including OpenZeppelin imports, public source verification submission and address-bound status checks on the official testnet explorer.
- Indexes from each verified creation block with chain/contract scope, atomic cursor/event writes, compare-and-swap revisions, confirmation boundaries, replay-safe identities and canonical block checks. Reorg recovery rewinds only derived evidence for the affected chain and contract. It never deletes accounts or passport-registration records.
- Reconciles browser/CLI passport mint-event totals against `totalIssued` at the checked block. Two L2 confirmations are explicitly distinguished from Ethereum finality.
- Includes an opt-in PostgreSQL worker and cursor/event schema. It is disabled by default and does not replace existing Abstract vault indexing. Aggregate queries expose counts/as-of blocks rather than account identities.

## Reproduce

Install pinned contract dependencies with `npm ci --ignore-scripts --omit=optional` in `contracts/launch`. Install existing server/build dependencies with their lockfiles for the server wrapper and compiled-console tests. Run:

```sh
node --test contracts/launch/phase3.test.mjs contracts/launch/launch.test.mjs
node contracts/launch/build-console.mjs
AK_OPERATOR_DIST="$PWD/contracts/launch/operator-dist" node --test contracts/launch/operator.test.mjs
node contracts/launch/deploy-testnet.mjs plan
```

The CLI supports `deploy`, `verify`, `verify-source`, `rehearse` and `index` with `--record /absolute/public-deployment.json`. Broadcast modes use a dedicated testnet key from `AK_LAUNCH_DEPLOYER_KEY`; no key is accepted as a command-line argument or written into the public record. `AK_LAUNCH_OPERATOR_ADDRESS` selects its operational role address. `AK_LAUNCH_RPC_URL` may select another HTTPS endpoint, but the reported chain must still be 46630. Index state uses an atomic file snapshot and an exclusive process lock. A keyless `verification-input` mode exports compiler input.

## Backend activation gate

After the actual public record passes independent verification, save it as `server/deployments/robinhood-testnet.json` and deploy the backend-only change. Its contract addresses and transaction hashes are public; credentials stay in Render's private environment. Use `AK_RH_DEPLOYMENT_RECORD` for another record path and `AK_RH_EVENT_RPC_URL` for an explicit testnet RPC. Enable `AK_RH_EVENT_INDEX_ENABLED=true` only with the existing durable database configured and after checking the real PostgreSQL migration/index reconciliation.

The existing live proof recorder uses `AK_FAIR_CHAIN_ID=46630`, `AK_FAIR_REGISTRY_ADDRESS`, `AK_FAIR_RPC_URL`, a funded `AK_FAIR_RELAYER_KEY` matching the registrar, and `AK_FAIR_ANCHOR_ENABLED=true`. The passport worker needs the matching `AK_VISA_CHAIN_ID`, `AK_VISA_CONTRACT`, RPC and minter role/key; leave delivery disabled until phase 4's end-to-end issuance gate passes. No credentials or enable flags were changed in this pass. Existing global Abstract and wallet configuration must not be repointed.

## Evidence and limits

Nine automated tests pass, covering the original passport contract, exact registry compilation, local-EVM deployment/resumption, constructor/role verification, registry receipt rehearsal, passport mint/event reconciliation, backend worker integration, source-verification API fixtures, wrong-network rejection, reorg isolation, stale writers, unconfirmed blocks and the compiled console workflow. Ganache's optional native uWS binary is unavailable on Node 24; its JavaScript fallback executes the tests successfully.

The console layout was inspected in a real browser. Native Sites publication succeeded under owner-only access; the agent browser sees its sign-in gate. Actual wallet extension approvals, explorer submissions, real PostgreSQL execution and live chain indexing are not claimed. No paid resources were created, no service secrets were retrieved, and no APK/player UI files were changed.

Reviewed sources: phase 2 source `7518800b3e81de9a079dbe9b8850f042744461c9`, live backend `0a7d45cefe8568bd1c66a9281fcd04ec28e1fa12`, and main `08b8b79c8533d9a82da32c3ea3446b91dea8495a`. Phase 3 changes are kept on a separate backend review branch.

Official references checked 12 November 2026: https://docs.robinhood.com/chain/deploy-smart-contracts/ , https://docs.robinhood.com/chain/add-network-to-wallet/ , https://robinhood.com/us/en/support/articles/robinhood-chain-testnet/ . Standard-JSON API parameter handling was checked against Blockscout's own `apps/block_scout_web/lib/block_scout_web/etherscan.ex` documentation in https://github.com/blockscout/blockscout .

A final read-only public RPC probe from this workspace returned HTTP 403. No alternate route was used and no transaction was broadcast. The wallet-operated console uses the RPC configured in the user’s wallet; deployment must still establish chain ID 46630 before any send.
