# Batch C1 — existing Passport metadata recovery

Date: **2026-11-28 (Asia/Kolkata)**. Reviewed main:
`f696f57637ec8a1433bcaeafcd0ebc494fcba96b`; implementation begins from the final
Batch B checkpoint `30ab0a5d346bb6087da13ea0322e08c8b24a1a80`.

**FIXED AND TESTED LOCALLY.** A local company HTTP candidate also returned valid
metadata using read-only current chain evidence. **PRODUCTION VERIFICATION
PENDING.** The live endpoint was not deployed or repaired during this session.

## Reproduced issue and exact cause

At 2026-11-28T03:10:31Z the intended live URL returned **404, application/json**:

`https://articweb3.onrender.com/arctic-play/v3/passport/metadata/46630/3.json`

```json
{"error":"This passport has no confirmed delivery yet."}
```

That response comes from `antarcticPassport.js` after
`store.confirmedToken(chainId, tokenId)` returns no row. The query requires a
confirmed Visa delivery joined to its same-chain Passport record. Consequently,
the public metadata route treated a missing backend association as a missing NFT.
The route remains public during the registration pause; neither Para consent nor
the pause caused this 404.

Independent chain reads establish that the NFT exists:

| Field | Observed value |
| --- | --- |
| Chain | Robinhood Chain Testnet, 46630 |
| Collection | `0xF059141A4e21eF5786e66e96F1c4357858a0De11` |
| Token | 3 |
| Mint transaction | `0x34d933e7fef4c5217c1cee78d82cf1acf9352e74eaef134edbce88b6e76e9d75` |
| Receipt / canonical block | Successful; block 152322755, `0xf590d89f6062712d5c8efbca8af759359f08382404a16ad765c14d9c0d97e9e5` |
| Mint event / current owner | Zero-address Transfer to, and current owner, `0x018F99aA2506BF7C1Ced7Eef4A84155744f36d7b` |
| Current tokenURI | The exact failing URL above |
| Collection total issued | 20 at the captured read block |
| Existing image | HTTP 200, `image/webp`, at the unchanged `company-passport-cover.webp` URL |

Full raw public receipts, canonical block and source/runtime evidence are in
[BATCH_C_CHAIN_OBSERVATIONS.json](BATCH_C_CHAIN_OBSERVATIONS.json). The connected
Neon branch has zero confirmed Passport #3 associations. Its 12 confirmed
Passports are exactly token IDs 9–20; that is a different scope from 20 lifetime
chain mints. See [delivery evidence](BATCH_C_DELIVERY_EVIDENCE.json). Batch B did
not prove that Render is bound to this branch. The exact historical event that
removed or failed to retain the runtime association is **unresolved**; a reset,
wrong database or lost write is not asserted without evidence.

## Implemented behavior

`server/passportMetadataReader.js` provides a signer-free, bounded reader for the
reviewed existing testnet collection. A successful configured database lookup
keeps the existing metadata, including its original registration time and
service-verified achievements. Only an absent association invokes the reader.
A configured database outage remains 503; it is not converted to missing data.

The fallback checks the RPC chain, the pinned reviewed runtime digest, token
supply, current and prior-block ownership, the exact current and prior-block
tokenURI, and that the checked block remains canonical. This uses the existing
two-L2-block policy, **not Ethereum finality**. Other chains receive no automatic
fallback. A different configured collection fails closed.

An existing token receives the same name, description, network, image and
external URL. It does not receive an invented Arrival date, account link or
achievement. The response contains no wallet or account identity. A nonexistent
token returns 404. Wrong chain/code/URI, unstable ownership, insufficient
confirmations, RPC failure or reorganization returns a safe 503.

Identical requests coalesce. There are at most four in-flight verifications and
128 cached results; successful results expire after 30 seconds, absent tokens
after five seconds, and failures impose a two-second retry cooldown. RPC requests
use a 12-second deadline and each verification has a 15-second total bound.
Owned providers are destroyed after each verification. Existing HTTP rate limits
and `Cache-Control: no-store` remain in effect.

No sender is constructed and no mint key is read. Existing scoped RPC/collection
settings are preferred. If no testnet reader settings are configured, the reader
uses the reviewed existing address and the official public testnet RPC already
listed in `gameWalletChains.json`. Unscoped settings for another active chain
are not borrowed. Public-RPC availability/rate limits remain a deployment check;
no new paid provider was introduced.

A separate narrow regression also reproduced the Egg acceptance route accepting
otherwise matching evidence from another chain. Its final confirmation now
requires `evidence.chainId === passport.chainId`, as Passport acceptance already
does. This changes no eligibility, supply or wallet ownership.

## Verification

Before the fix, the four metadata route regressions produced **three failures
and one pass**; the existing-collection case returned 404. The separate Egg
wrong-chain regression failed with `confirmed: true`. After the fixes:

```sh
node --test server/tests/passport-metadata-reader.test.js \
  server/tests/passport-metadata-recovery.test.js \
  server/tests/passport-acceptance-network.test.js \
  server/tests/launch-incremental.test.js \
  server/tests/egg-metadata-paused.test.js
```

The selected gate contains **32 tests**, including negative code/chain/URI/owner,
reorganization, timeout, cache, database-outage, privacy, existing-association,
missing-token and actual paused-company-HTTP cases. Final runtime results are
recorded in [BATCH_C_EVIDENCE.json](BATCH_C_EVIDENCE.json).

[BATCH_C_METADATA_EVIDENCE.json](BATCH_C_METADATA_EVIDENCE.json) records an actual
local HTTP candidate with an empty fixture association store: Passport #3
returned 200 and #999 returned 404 using live, read-only official RPC responses.
The workspace's default ethers HTTPS transport did not complete successfully;
this diagnostic used a test-only native-fetch transport adapter. That adapter is
not included in production code. The default production transport still requires
verification on the approved candidate environment. A local success does not
claim that the live URL is fixed or that the account association was recovered.

## Exact remaining owner actions

1. Review the stacked A/B/C candidate and separately authorize its deployment.
   Preserve launch/funded holds and the approved APK. Render automatically deploys
   main; a main merge is a production action, not merely review bookkeeping.
2. On an approved isolated candidate, verify the reader settings privately:
   `AK_VISA_CONTRACT_46630` must be the existing address above;
   `AK_VISA_RPC_URL_46630`, if used, must be an approved HTTPS endpoint for 46630.
   Metadata requires no signer or delivery flag. Keep sender workers disabled.
3. Request the intended metadata path on that candidate with redirects disabled.
   Require status 200, JSON content type, `name: Antarctic Passport #3`, chain
   46630, token ID 3 and the existing image. Verify #999 remains 404 while it is
   above the independently read collection supply. Check the image is 200 and
   an image type. Repeat with the default production RPC transport.
4. After a separately approved production deployment, repeat those exact checks
   against the on-chain tokenURI. Record deployment SHA, timestamp and sanitized
   response. Do not change tokenURI, ownership or supply to make this pass.
5. If personalized achievements for token #3 must be restored, obtain authorized
   historical association evidence and use a separately reviewed reconciliation.
   The public metadata fix intentionally does not guess that association. Existing
   artwork is preserved; no new artwork decision is implemented.

For rollback, keep the backend-first safeguards in Batch B. Rolling back this
reader can reintroduce the 404; it does not reverse or require any on-chain write.
Do not substitute the old pre-A Render artifact as a safe automatic rollback.
