# Contracts

This folder contains the Abstract testnet escrow contract for Artic Web3.

## Current scope

`GameEscrow.sol` supports:

- USDC deposits
- player available balances
- player withdrawals
- match entry locking
- server-controlled entry release
- server-controlled match settlement

High Stakes must remain locked until this contract is deployed on testnet, deposit/withdraw is tested, and server-owned gameplay result settlement is tested.

## Abstract testnet values

- Chain ID: `11124`
- RPC: `https://api.testnet.abs.xyz`
- Explorer: `https://sepolia.abscan.org/`
- USDC: `0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc`

## Deploy GameEscrow

From this folder:

```bash
npm install
npx hardhat vars set ABSTRACT_DEPLOYER_KEY
npm run compile
npm run deploy:testnet
```

The deploy script prints the two Vercel env vars you need:

```bash
VITE_TOKEN_ADDRESS=0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc
VITE_VAULT_ADDRESS=<DEPLOYED_GAME_ESCROW_ADDRESS>
```

After setting those in Vercel, redeploy the frontend.

## Important safety rule

Use a fresh deployer wallet for testnet. Do not use a wallet containing valuable assets.
