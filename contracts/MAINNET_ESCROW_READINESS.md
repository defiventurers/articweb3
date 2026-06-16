# Mainnet Escrow Readiness

This checklist is mandatory before enabling `HIGH_STAKES_ENABLED=true` or `VITE_ENABLE_HIGH_STAKES=true` on Abstract mainnet.

## Contract safety gates

- ETH escrow compiles with `zksolc` for Abstract testnet and mainnet.
- `npm run safety:audit` passes.
- Contract source is verified on Abscan.
- No owner drain / sweep / arbitrary admin payout path exists.
- Withdrawals are pull-based from `availableBalance`.
- `deposit`, `depositAndLock`, `withdraw`, `lockEntry`, `releaseEntry`, `refundExpiredEntry`, and `settleMatch` are tested on testnet.
- `settleMatch` rejects invalid payout totals.
- `settleMatch` rejects duplicate or zero player addresses.
- `refundExpiredEntry` returns expired locks to available balance.
- Pause flags are tested separately:
  - deposits
  - new locks
  - settlement
  - withdrawals
- Withdrawals must remain unpaused during normal incidents unless there is a direct exploit requiring emergency pause.

## Mainnet launch gates

- Deploy a fresh hardened `EthGameEscrow`.
- Set `gameServer` to a dedicated backend settlement wallet, not a personal wallet.
- Store settlement private key only in server secrets.
- Set small mainnet caps first:
  - small `maxEntryAmount`
  - small `maxActiveLocks`
  - conservative `defaultLockTimeout`
- Run a closed beta before public access.
- Keep public language as Locked Match / Entry Lock Mode, not gambling language.

## Required env after deployment

Frontend:

```env
VITE_ENABLE_HIGH_STAKES=true
VITE_ETH_VAULT_ADDRESS=0x...
```

Server:

```env
HIGH_STAKES_ENABLED=true
ETH_VAULT_ADDRESS=0x...
ETH_SETTLEMENT_SIGNER=<backend settlement wallet private key>
```

Do not enable these until the contract address is verified and the backend settlement wallet is set on-chain.
