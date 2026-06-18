# Mainnet Preflight Import Guide

This guide imports the live backend `/mainnet/preflight` result into the deployment record.

It does not use private keys and does not change Render, Vercel, or contracts.

## Purpose

The deployment record should contain the latest observed backend readiness instead of a manually copied JSON blob.

The importer records:

- readiness
- failed gates
- chain env and chain ID
- RPC status and latest block
- vault address status
- settlement signer public address
- database readiness
- indexer run count and indexed event count

## Prerequisite

Create a deployment record first:

```bash
cp ops/mainnet/deployment-record.template.json ops/mainnet/deployment-record.json
```

Fill in the public vault deployment values or run:

```bash
node scripts/write-mainnet-deployment-record.mjs \
  --vault <MAINNET_ETH_VAULT_ADDRESS> \
  --deployTx <MAINNET_VAULT_DEPLOY_TX> \
  --owner <MAINNET_VAULT_OWNER_ADDRESS> \
  --gameServer <MAINNET_VAULT_GAME_SERVER_ADDRESS> \
  --frontendCommit <FRONTEND_COMMIT> \
  --backendCommit <BACKEND_COMMIT> \
  --contractCommit <CONTRACT_COMMIT>
```

## Import live preflight

From repo root:

```bash
node scripts/import-mainnet-preflight.mjs
```

Optional custom record or URL:

```bash
node scripts/import-mainnet-preflight.mjs ops/mainnet/deployment-record.json https://articweb3.onrender.com/mainnet/preflight
```

## Validate after import

```bash
node scripts/validate-mainnet-deployment.mjs ops/mainnet/deployment-record.json
```

## Expected before mainnet switch

While backend is still on testnet, imported readiness should remain:

```txt
HOLD
failedGates: chainIsMainnet
```

This is correct and should block mainnet rehearsal.

## Expected after mainnet switch

After Render is correctly switched to mainnet and the indexer has run:

```txt
READY_FOR_CAPPED_MAINNET_REHEARSAL
failedGates: none
chain.chainId: 2741
chain.env: mainnet
rpc.ok: true
vault.usableAddress: true
settlementSigner.valid: true
database.databaseReady: true
indexer.totalRuns >= 1
```

If the imported result is still `HOLD`, do not rehearse. Use `rollback.md` if you accidentally switched envs.

## Public launch reminder

This import only supports capped internal rehearsal. It does not approve public launch, real-money rewards, or token rewards.
