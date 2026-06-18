# Mainnet Vault Deploy + Record Writer

This guide intentionally avoids storing deployer secrets in the repo.

The actual deployment must be run from your secure wallet/deployment environment. The repo records the public output afterward.

## Hard safety rules

- Do not commit deployer secrets.
- Do not put backend signer secrets into Vercel.
- Do not start a public launch from this script.
- Keep this phase to capped internal mainnet rehearsal.
- Keep public paid launch blocked until compliance review.

## Step 1: Deploy vault from secure tooling

Use the audited vault contract commit and your secure deploy setup.

Record these public values:

```txt
MAINNET_ETH_VAULT_ADDRESS=<deployed vault address>
MAINNET_VAULT_DEPLOY_TX=<deploy tx hash>
MAINNET_VAULT_OWNER_ADDRESS=<owner/operator AGW or owner address>
MAINNET_VAULT_GAME_SERVER_ADDRESS=<backend settlement signer address>
FRONTEND_COMMIT=<frontend commit planned for Vercel>
BACKEND_COMMIT=<backend commit planned for Render>
CONTRACT_COMMIT=<contract source commit used for deploy>
```

## Step 2: Write deployment record

From repo root:

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

Optional fields:

```bash
--operator "name or handle"
--reviewer "name or handle"
--verificationUrl "https://abscan.org/address/..."
--verified true
--compiler "solc-x.y.z"
--constructorArgs '["0x...", "0x..."]'
--status READY_FOR_REHEARSAL
```

The writer updates:

```txt
ops/mainnet/deployment-record.json
```

It uses only public deployment values and never asks for a private key.

## Step 3: Validate deployment record

From repo root:

```bash
node scripts/validate-mainnet-deployment.mjs ops/mainnet/deployment-record.json
```

Errors must be fixed before any mainnet rehearsal.

Warnings may be accepted only for tiny-value internal rehearsal. Public launch cannot proceed with verification/compliance warnings.

## Step 4: Switch Render env only after record passes

Use `ops/mainnet/env-comparison.md` as the checklist.

Confirm Render env matches:

```txt
CHAIN_ENV=mainnet
ABSTRACT_CHAIN_ID=2741
ABSTRACT_RPC_URL=https://api.mainnet.abs.xyz
ABSTRACT_WS_URL=wss://api.mainnet.abs.xyz/ws
ABSTRACT_EXPLORER_URL=https://abscan.org
ETH_VAULT_ADDRESS=<MAINNET_ETH_VAULT_ADDRESS>
HIGH_STAKES_ENABLED=true
```

Keep `ETH_SETTLEMENT_SIGNER` only in Render.

## Step 5: Switch Vercel env only after backend is ready

Confirm Vercel env matches:

```txt
VITE_CHAIN_ENV=mainnet
VITE_ABSTRACT_CHAIN_ID=2741
VITE_ABSTRACT_RPC_URL=https://api.mainnet.abs.xyz
VITE_ABSTRACT_RPC=https://api.mainnet.abs.xyz
VITE_ABSTRACT_WS=wss://api.mainnet.abs.xyz/ws
VITE_ABSTRACT_EXPLORER_URL=https://abscan.org
VITE_ABSTRACT_EXPLORER=https://abscan.org
VITE_ABSTRACT_VERIFY_URL=https://api.abscan.org/api
VITE_ETH_VAULT_ADDRESS=<MAINNET_ETH_VAULT_ADDRESS>
VITE_ENABLE_HIGH_STAKES=true
VITE_ENABLE_VAULT_DEPLOYER=false
VITE_ENABLE_SETTLEMENT_ADMIN=true
```

## Step 6: Check backend preflight

Open:

```txt
https://articweb3.onrender.com/mainnet/preflight
```

Do not rehearse unless it returns:

```txt
READY_FOR_CAPPED_MAINNET_REHEARSAL
```

## Step 7: Tiny-value internal rehearsal only

Run one room only.

- tester count: 2 to 4
- max entry: value in deployment record
- no rewards
- no public invite
- no public announcement

Record:

- room code
- lock tx
- settlement tx if any
- indexed `EntryLocked`
- match history visibility
- RUN snapshot

## Step 8: Update record after rehearsal

If the tiny-value internal rehearsal passes, update:

```txt
status = REHEARSAL_PASSED
rehearsal.entryLockedTx
rehearsal.settlementTx
rehearsal.indexedEntryLocked = true
rehearsal.matchHistoryVisible = true
```

Run the validator again.
