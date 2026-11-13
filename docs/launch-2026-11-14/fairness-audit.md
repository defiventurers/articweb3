# Fair Play baseline audit and replay correction

Reviewed source: `7c0cdd74f2bb4e75bf2ff38021f287273f314503`, branch `codex/incremental-v5915-launch`, November 11, 2026. This is a local source audit; it does not establish a deployed proof service, NFT delivery, or chain anchoring.

## Corrected: canonical transport changed Sannin replay

The verifier validated the published initial position, then replayed from `copy(header.initialState)`. `copy` canonicalizes object keys for signing. The historical Sannin engine includes JSON object order in repetition identities; it therefore produced a different post-move history even when the signed board's canonical hash was correct.

The verifier now replays from a freshly created engine state **after** checking both that state's hash and the signed initial state's hash against the agreed initial hash. Canonical hashing, signature formats, legacy rules manifests, trusted keys, legal moves, and compiled rules remain unchanged. A three-move Sannin proof survives canonical export/import and replays to the original position hash. Altered positions still fail the existing initial-hash checks.

The browser replay worker should also recreate `engine.create(header.gameId, header.options)` after successful verification, rather than use canonical copied initial state. This source correction must be bundled into a reviewed runtime before it affects a shipped APK/browser worker.

## Blocking: historical rules artifacts disagree

The added read-only gate, `node shared/fair-play/check-rules-integrity.mjs`, checks the manifest's own rules hash, compiled-engine digest, and every declared source digest. It exits nonzero on drift or missing source and never regenerates files or changes trusted inputs.

At the reviewed baseline:

- Pinned rules hash: `63845f4daef97f9721ccecd9cb3c7ef363842835a2566f8f48c7e515863cd952`.
- Pinned engine digest: `dab5b2df6d25e3c9572e93a0216b7d6d355493688983a959397bc40e2dad239b`.
- Checked-in engine digest: `eced69cddead21aab99e18e22b43c7b52fe37d3688d00f6b78f542cf220f6269`.
- 105 declared source files inspected. In addition to the engine mismatch, six source digests differ and two declared source files are absent. Full paths/digests are in `fairness-baseline-integrity.json`.

Do not repair this by rewriting the historical manifest to describe current files. Recover and preserve the original exact engine/source for historical proofs, or publish a separately versioned current rules adapter/manifest for new proofs with a deliberate service capability change and verification tests.

## Blocking: frozen Dominion engine ignores public dice

At this source checkpoint, `server/arcticPlayEngine.cjs` defines `apply(id,state,actionId)` and `applyDominion(state,action)` without the verified-roll context. It draws two new CSPRNG values when replaying a roll. Consequently, the test fixture's public-beacon dice and the verifier's replay may disagree despite both calls passing `{roll:{values}}`. Random coincidence can also make a broken fixture appear to pass; a green run alone would not fix this.

No randomness override, monkey-patching of global crypto, or replacement of trusted manifests was introduced. Resolving this needs an explicit correctly versioned deterministic engine, source/compiled digest agreement, the correct legacy-versus-long-dice rules profile, and tests proving replay does not sample local randomness. Existing historical records must keep their original rules authority.

## Backend/claim boundaries

The startup chain is `allGamesBackendBootstrap.js` → `injectArcticPlay` → `createArcticPlayService`; the baseline source does not contain the Fair Play service/config/share handlers described by `shared/fair-play/README.md`. This audit therefore cannot treat that README as proof those endpoints are active. Public runtime artifacts and production environment must be checked separately. A trusted signature shows a service signed a record; it does not establish unbiased service availability or independently timestamped roll requests.

`beacon.js` verifies pinned drand BLS output and uses deterministic, domain-separated dice mapping. Request timing remains service-attested until verified chain commitment evidence precedes the beacon publication. UI must say **unanchored** without checked receipts. No funded relayer, deployed registry, live signing key operation, or mint was established in this workstream.

## Executed validation

Dependencies: `npm ci --ignore-scripts` in `shared/fair-play`.

- Before changes: `node --test shared/fair-play/core.test.mjs shared/fair-play/long-dice.test.mjs` → **5 passed, 3 failed**.
- After changes: `node --test shared/fair-play/core.test.mjs shared/fair-play/long-dice.test.mjs shared/fair-play/rules-integrity.test.mjs` → **8 passed, 2 failed**. The Sannin failure is fixed. Both remaining failures use the stale Dominion dice path, including the otherwise independent pure-JS signature fallback test.
- Integrity gate → **HOLD / nonzero**, with nine artifact mismatches. It is a detected baseline limitation, not a passing release gate.
- New integrity tests verify matching fixtures, engine drift, source drift, missing source, altered manifest hash, unsafe source paths, and no manifest/file repinning by inspection.

No production deployment, release-readiness claim, or onchain activation is made.

## Shipped-runtime containment

`patch-fairness-v5915.mjs` now patches the checksum-pinned actual v5.9.15 `fair-worker.js` and `verifier.js`, plus an optional separately supplied `app.js` already patched for introductions. It corrects both initial-state restoration paths using parsed AST anchors. No game engine, bot, trusted key or rules manifest is rebuilt or replaced. The UI changes are three exact text substitutions only: a visible verification-HOLD heading, an explanatory action label, and honest onchain/setup wording.

Because the exact rules authority remains unresolved, the worker **clears any prior checked proof and fails closed** before signature/replay/chain operations. It reports `verificationStatus: hold` with the reason and keeps proof import/download/details available. General saved-game/practice replay is unaffected; only independent cryptographic proof verification/replay is on hold. `release-readiness.json` records the authority mismatch; the historical patch refuses any attempted ready status. A future release needs a separately audited exact rules build, not a readiness-flag toggle.

Integration:

```sh
node mobile/arctic-play/scripts/patch-fairness-v5915.mjs --input /path/to/verified-v5915-assets --output /path/to/fairness-overlay --app /path/to/heritage-overlay/app.js
AK_BASELINE_RUNTIME=/path/to/verified-v5915-assets node --test mobile/arctic-play/tests/fairness-runtime-v5915.test.mjs
```

Overlay `fair-worker.js`, `verifier.js` and `app.js` in the release candidate; retain `fairness-runtime-patch.json` as build evidence rather than a preloaded game asset. This test executes the actual patched worker in a VM, verifies malformed/forged inputs never report success, stale replay cannot run, and no chain/beacon request occurs. Both integration tests pass. The signed substituted-initial-position regression also passes. The original two stale-source Dominion dice tests remain unresolved and must still be reported.
