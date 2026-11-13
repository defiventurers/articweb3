# Account-bound Passport testnet contracts

These free game-identity contracts are additive to the existing Abstract escrow folder. They do not receive funds, settle matches, charge entry fees, or promise rewards.

`AntarcticPassport` is an ERC-721 with one passport per wallet, idempotent claim IDs, nontransferable ownership and a configurable metadata URL. A metadata role can announce revisions using ERC-4906 events. Metadata is authored by the game service; this does not independently prove an achievement or prevent operator edits. `AntarcticKeepsakes` is an optional ERC-1155 arrival/achievement collection that requires an existing passport and refreshes its metadata revision. Contract owner/admin/minter privileges remain trusted operational roles.

Contracts are selectively reused from repository source `0a7d45c`, using pinned OpenZeppelin 5.1.0, Solidity 0.8.24 and ethers 6.15.0. They are local test candidates, not audited/deployed contracts.

## Reproduce local checks

```
npm ci --ignore-scripts --omit=optional
npm test
node deploy.mjs --offline
```

The lockfile explicitly marks the bundled Darwin-only fsevents dependency optional, matching chokidar's package declaration, so Linux clean installs do not fail its platform check. Ganache uses its JavaScript fallback when its optional native uWS build is unavailable on Node 24; local EVM assertions still execute.

The deploy adapter permits **Robinhood testnet 46630 only**. Without `--broadcast`, a configured private testnet key is used only to simulate a deployment estimate. `--offline` needs no key or RPC and explicitly reports that the network was not checked. No deploy command has been run against an actual network here.

Private environment variables: `AK_LAUNCH_DEPLOYER_KEY`, optional `AK_LAUNCH_MINTER_ADDRESS`, `AK_LAUNCH_RPC_URL`, `AK_PASSPORT_METADATA_BASE`, and `AK_LAUNCH_DEPLOYMENT_RECORD`. Keep the key private and out of CLI arguments, source, logs and deliverables. The selected RPC's chain ID is verified before simulation/broadcast. Mainnet IDs are rejected; existing Abstract deployment tooling remains separate.

With explicit deployment authorization, `--broadcast` deploys the passport. `--with-keepsakes` also deploys the optional collection and grants its metadata role. A deployment record is reserved with exclusive creation, then updated after transaction submission and confirmation so partial deployments remain reviewable. Do not set backend delivery enabled until source verification, correct admin/minter roles, a funded worker, actual wallet receipt/retry tests, and chain event reconciliation pass. Keep explorer/source verification evidence and transaction links in the final deployment record.

Official deployment source checked November 11, 2026: https://docs.robinhood.com/chain/deploy-smart-contracts/ confirms standard EVM tools and testnet chain ID 46630. OpenZeppelin ERC-721 behavior: https://docs.openzeppelin.com/contracts/5.x/api/token/erc721 . No claim is made that Abstract AGW or zkSync deployment tools work unchanged on Robinhood.

A testnet token does not automatically become a mainnet token. Separate contracts, explicit account/achievement mapping and a reviewed backend storage migration are needed. The baseline storage currently prevents silently issuing a second-chain passport for an existing account.
