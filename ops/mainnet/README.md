# Arctic Dominion Mainnet Deployment Pack

This pack is for a **capped internal mainnet rehearsal**, not a public paid launch.

Public launch remains blocked until legal/compliance review, closed beta evidence, rollback proof, and monitoring are complete.

## Readiness rule

- `/mainnet/preflight` returns `HOLD`: do not run a mainnet rehearsal.
- `/mainnet/preflight` returns `READY_FOR_CAPPED_MAINNET_REHEARSAL`: run one tiny-value internal rehearsal only.
- Tiny rehearsal passes with indexed events and settlement visibility: consider closed capped mainnet beta.
- Legal/compliance incomplete: no public paid launch, no real-money rewards, no token reward promises.

## Phase 22 assets

- `deployment-record.template.json`: copy this to `deployment-record.json` for the actual mainnet run.
- `../../scripts/validate-mainnet-deployment.mjs`: validates the filled deployment record.
- `verify-contract.md`: source verification checklist.
- `rollback.md`: rollback and abort procedure.

## Step 1: Create the deployment record

```bash
cp ops/mainnet/deployment-record.template.json ops/mainnet/deployment-record.json
```

Fill in:

- frontend commit
- backend commit
- contract commit
- deployed ETH vault address
- deployment transaction
- owner address
- game server address
- explorer verification URL
- expected Vercel env values
- expected Render env values
- rollback commit values

Do not put private keys in this file.

## Step 2: Validate the record

```bash
node scripts/validate-mainnet-deployment.mjs ops/mainnet/deployment-record.json
```

A valid record can still return warnings. Warnings are allowed for an internal rehearsal only if the operator explicitly accepts them. Errors must be fixed.

## Step 3: Build frontend mainnet locally

From `frontend/`:

```bash
npm run check:mainnet
npm run build:mainnet
```

The existing frontend checker enforces mainnet chain ID `2741`, mainnet RPC/WS/explorer, disabled session keys, and non-zero ETH vault address when High Stakes is enabled.

## Step 4: Check backend mainnet locally

From `server/`:

```bash
npm run check:mainnet
```

The existing backend checker enforces mainnet chain ID `2741`, mainnet RPC/WS/explorer, non-zero ETH vault address, and settlement signer presence when High Stakes is enabled.

## Step 5: Deploy mainnet vault

Deploy only from the audited contract commit recorded in `deployment-record.json`.

Minimum post-deploy checks:

- owner is the intended AGW/operator owner
- game server is the backend settlement signer address
- entry caps and pause controls are correct
- no public rewards or wagering language is introduced
- deploy transaction is recorded
- contract address is copied to both frontend and backend env records

## Step 6: Verify contract source

Follow `verify-contract.md`.

Do not move to public launch without explorer verification or a documented source-review exception for internal rehearsal only.

## Step 7: Switch Render backend env

Render mainnet values:

```txt
CHAIN_ENV=mainnet
ABSTRACT_CHAIN_ID=2741
ABSTRACT_RPC_URL=https://api.mainnet.abs.xyz
ABSTRACT_WS_URL=wss://api.mainnet.abs.xyz/ws
ABSTRACT_EXPLORER_URL=https://abscan.org
ETH_VAULT_ADDRESS=<mainnet vault>
HIGH_STAKES_ENABLED=true
ETH_SETTLEMENT_SIGNER=<server signer private key; never commit this>
ETH_INDEXER_AUTO_RUN=true
ETH_INDEXER_SCHEDULED_RUN=true
ETH_INDEXER_HEARTBEAT=true
```

Keep `ETH_SETTLEMENT_SIGNER` only in Render.

## Step 8: Switch Vercel frontend env

Vercel mainnet values:

```txt
VITE_CHAIN_ENV=mainnet
VITE_ABSTRACT_CHAIN_ID=2741
VITE_ABSTRACT_RPC_URL=https://api.mainnet.abs.xyz
VITE_ABSTRACT_RPC=https://api.mainnet.abs.xyz
VITE_ABSTRACT_WS=wss://api.mainnet.abs.xyz/ws
VITE_ABSTRACT_EXPLORER_URL=https://abscan.org
VITE_ABSTRACT_EXPLORER=https://abscan.org
VITE_ABSTRACT_VERIFY_URL=https://api.abscan.org/api
VITE_ETH_VAULT_ADDRESS=<mainnet vault>
VITE_ENABLE_HIGH_STAKES=true
VITE_ENABLE_VAULT_DEPLOYER=false
VITE_ENABLE_SETTLEMENT_ADMIN=true
```

Never put backend private keys in Vercel.

## Step 9: Confirm backend preflight

Open:

```txt
https://articweb3.onrender.com/mainnet/preflight
```

Expected before rehearsal:

```txt
readiness = READY_FOR_CAPPED_MAINNET_REHEARSAL
chain.chainId = 2741
chain.env = mainnet
gates.chainIsMainnet = true
gates.rpcReachable = true
gates.vaultConfigured = true
gates.settlementSignerConfigured = true
gates.databaseReady = true
gates.indexerHasRun = true
```

If readiness is `HOLD`, abort the mainnet rehearsal.

## Step 10: Tiny-value internal rehearsal

Run one room only:

- tester count: 2 to 4
- entry: minimum test amount only
- no public invite
- no rewards
- no marketing
- no public launch announcement

Required evidence:

- room code
- lock transaction
- settlement transaction if applicable
- `/indexer/events` shows `EntryLocked`
- match history shows settlement visibility
- RUN snapshot copied
- rollback drill still available

## Step 11: Decision

Only after the internal rehearsal passes:

- update `deployment-record.json` status to `REHEARSAL_PASSED`
- run validator again
- create a closed capped beta issue/checklist
- keep public launch blocked until compliance review
