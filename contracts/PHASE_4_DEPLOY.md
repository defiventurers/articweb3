# Phase 4: Abstract Testnet Deployment

This phase prepares deployment, but it does not deploy automatically.

You need:

- A local machine or cloud dev environment
- A deployer wallet private key
- Abstract testnet ETH for gas

## Contracts

- `TestToken.sol`: test USDC-style token with 6 decimals
- `GameEscrow.sol`: player deposit and withdraw vault

## Safe deploy order

1. Deploy `TestToken.sol`
2. Copy the deployed test token address
3. Deploy `GameEscrow.sol` using the test token address constructor argument
4. Copy the deployed escrow address
5. Add both addresses to Vercel frontend env vars

## Vercel env vars

Frontend Phase 3 expects these names:

```txt
VITE_TOKEN_ADDRESS=<deployed TestToken address>
VITE_VAULT_ADDRESS=<deployed GameEscrow address>
```

## Important

Do not use mainnet USDC.
Do not use real player funds.
Do not unlock High Stakes rooms yet.

The current escrow contract only supports:

- deposit
- withdraw
- available balance reading

It does not support match locking or settlement yet.
