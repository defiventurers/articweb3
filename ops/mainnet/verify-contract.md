# Mainnet Contract Verification Checklist

This checklist applies to the ETH vault used by Locked Match Mode on Abstract mainnet.

## Hard rule

Public mainnet launch is blocked until contract verification is complete or a documented legal/security exception exists for internal rehearsal only.

## Inputs to collect

- contract address
- deploy transaction hash
- deployer/owner address
- game server address
- compiler version
- optimizer settings
- constructor arguments
- source commit SHA
- ABI commit SHA
- explorer verification URL

## Verification steps

1. Confirm the contract address is the same in:
   - `deployment-record.json -> contracts.ethVaultAddress`
   - Render `ETH_VAULT_ADDRESS`
   - Vercel `VITE_ETH_VAULT_ADDRESS`
2. Confirm deploy transaction targets Abstract mainnet.
3. Confirm owner and game server are expected addresses.
4. Verify source on the Abstract mainnet explorer.
5. Record the verification URL in `deployment-record.json`.
6. Set `contracts.verifiedOnExplorer=true` only after source is visible on the explorer.
7. Run:

```bash
node scripts/validate-mainnet-deployment.mjs ops/mainnet/deployment-record.json
```

## Minimum ABI checks

Confirm the deployed contract exposes the expected locked-match functions/events:

- deposit
- withdraw
- lockEntry / entry lock equivalent
- settle / settlement equivalent
- refund or timeout refund equivalent
- availableBalance
- lockedBalance
- EntryLocked event
- MatchSettled or settlement event
- refund event

## Rehearsal-only exception

If explorer verification is delayed but the team proceeds with a tiny-value internal rehearsal:

- keep `publicLaunchApproved=false`
- keep `cappedInternalOnly=true`
- keep max tester count <= 4
- keep tiny value entry only
- document the exception in `deployment-record.json -> notes`
- do not announce public launch
