# Mainnet Environment Comparison Checklist

Use this checklist before changing Render or Vercel to mainnet.

## Source of truth

The source of truth for a mainnet rehearsal is:

```txt
ops/mainnet/deployment-record.json
```

Do not rely on memory, screenshots, or copied chat messages during cutover.

## Frontend Vercel env must match

| Vercel env | Expected source |
|---|---|
| `VITE_CHAIN_ENV` | `frontendEnv.VITE_CHAIN_ENV` |
| `VITE_ABSTRACT_CHAIN_ID` | `frontendEnv.VITE_ABSTRACT_CHAIN_ID` |
| `VITE_ABSTRACT_RPC_URL` | `frontendEnv.VITE_ABSTRACT_RPC_URL` |
| `VITE_ABSTRACT_RPC` | `frontendEnv.VITE_ABSTRACT_RPC` |
| `VITE_ABSTRACT_WS` | `frontendEnv.VITE_ABSTRACT_WS` |
| `VITE_ABSTRACT_EXPLORER_URL` | `frontendEnv.VITE_ABSTRACT_EXPLORER_URL` |
| `VITE_ABSTRACT_EXPLORER` | `frontendEnv.VITE_ABSTRACT_EXPLORER` |
| `VITE_ABSTRACT_VERIFY_URL` | `frontendEnv.VITE_ABSTRACT_VERIFY_URL` |
| `VITE_ETH_VAULT_ADDRESS` | `contracts.ethVaultAddress` and `frontendEnv.VITE_ETH_VAULT_ADDRESS` |
| `VITE_ENABLE_HIGH_STAKES` | `frontendEnv.VITE_ENABLE_HIGH_STAKES` |
| `VITE_ENABLE_VAULT_DEPLOYER` | `frontendEnv.VITE_ENABLE_VAULT_DEPLOYER` |
| `VITE_ENABLE_SETTLEMENT_ADMIN` | `frontendEnv.VITE_ENABLE_SETTLEMENT_ADMIN` |

Never set backend secrets in Vercel.

## Backend Render env must match

| Render env | Expected source |
|---|---|
| `CHAIN_ENV` | `backendEnv.CHAIN_ENV` |
| `ABSTRACT_CHAIN_ID` | `backendEnv.ABSTRACT_CHAIN_ID` |
| `ABSTRACT_RPC_URL` | `backendEnv.ABSTRACT_RPC_URL` |
| `ABSTRACT_WS_URL` | `backendEnv.ABSTRACT_WS_URL` |
| `ABSTRACT_EXPLORER_URL` | `backendEnv.ABSTRACT_EXPLORER_URL` |
| `ETH_VAULT_ADDRESS` | `contracts.ethVaultAddress` and `backendEnv.ETH_VAULT_ADDRESS` |
| `HIGH_STAKES_ENABLED` | `backendEnv.HIGH_STAKES_ENABLED` |
| `ETH_INDEXER_AUTO_RUN` | `backendEnv.ETH_INDEXER_AUTO_RUN` |
| `ETH_INDEXER_SCHEDULED_RUN` | `backendEnv.ETH_INDEXER_SCHEDULED_RUN` |
| `ETH_INDEXER_HEARTBEAT` | `backendEnv.ETH_INDEXER_HEARTBEAT` |

`ETH_SETTLEMENT_SIGNER` must be set in Render but must never be committed to the deployment record.

## Required commands

Before Vercel deploy:

```bash
cd frontend
npm run check:mainnet
npm run build:mainnet
```

Before Render deploy:

```bash
cd server
npm run check:mainnet
```

Before rehearsal:

```bash
node scripts/validate-mainnet-deployment.mjs ops/mainnet/deployment-record.json
```

## Post-cutover checks

Open:

```txt
https://articweb3.onrender.com/mainnet/preflight
```

Confirm:

- `readiness` is `READY_FOR_CAPPED_MAINNET_REHEARSAL`
- `chain.env` is `mainnet`
- `chain.chainId` is `2741`
- `rpc.ok` is `true`
- `vault.usableAddress` is `true`
- `settlementSigner.valid` is `true`
- `database.databaseReady` is `true`
- `indexerHasRun` is `true`

If any of these fail, stop and use `rollback.md`.
