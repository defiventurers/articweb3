# Evidence Packet Generator

This folder stores generated readiness evidence for Arctic Dominion / Open Ice.

The generator uses public backend endpoints only. It does not use private keys and does not change Render, Vercel, database, or contracts.

## Generate testnet evidence

From repo root:

```bash
node scripts/generate-testnet-evidence-packet.mjs \
  --cleanCycles 3 \
  --uiPassed true \
  --frontendCommit <FRONTEND_COMMIT> \
  --backendCommit <BACKEND_COMMIT> \
  --notes "Three locked testnet matches passed after dice recovery fix."
```

Default backend:

```txt
https://articweb3.onrender.com
```

Default output folder:

```txt
ops/evidence/testnet/YYYY-MM-DD/
```

Generated files:

```txt
testnet-evidence.json
testnet-evidence.md
```

## Custom backend or output

```bash
node scripts/generate-testnet-evidence-packet.mjs \
  --backend https://articweb3.onrender.com \
  --out ops/evidence/testnet/run-001 \
  --eventLimit 100 \
  --cleanCycles 3 \
  --uiPassed true
```

## What it fetches

- `/health`
- `/mainnet/preflight`
- `/indexer/stats`
- `/indexer/events?limit=<eventLimit>`

## What it proves

The report checks:

- backend health
- database readiness
- Abstract testnet chain ID
- mainnet correctly blocked while on testnet
- indexer event count
- EntryLocked event presence
- MatchSettled event presence
- detected locked cycles from fetched event window
- manual clean cycle count
- manual UI pass flag

## What it does not prove

It does not prove public launch readiness.

It does not replace:

- mainnet vault deployment
- contract verification
- Render mainnet env switch
- Vercel mainnet env switch
- `/mainnet/preflight` returning `READY_FOR_CAPPED_MAINNET_REHEARSAL`
- tiny-value internal mainnet rehearsal
- legal/compliance review for public paid launch or rewards

## Evidence packet rule

Attach the generated Markdown and JSON to your mainnet rehearsal issue or deployment record.

Do not rely only on screenshots or chat logs.
