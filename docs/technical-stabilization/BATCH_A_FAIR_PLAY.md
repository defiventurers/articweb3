# Batch A1 — exact Fair Play rules authority

Date: 2026-11-28 (Asia/Kolkata). Reviewed `main`:
`f696f57637ec8a1433bcaeafcd0ebc494fcba96b`.
Branch: `codex/fonso-stabilization-batch-a`.

## Status and acceptance boundary

**FIXED AND TESTED LOCALLY** for the existing published `9fa0be4a…` authority.
**PRODUCTION VERIFICATION PENDING** for a reviewed deployment and matching
client/verifier delivery. The older `63845f4d…` authority is still unavailable
and remains on hold. The approved v5.10.2 and review v5.11.1 APKs were not rebuilt,
patched, signed, installed or replaced by this batch.

This is an exact artifact recovery, not a changed ruleset or a replacement
expected hash. The published manifest and both tracked game engines are unchanged.

## Reproduction and root cause

On the clean reviewed checkout:

```sh
node shared/fair-play/check-rules-integrity.mjs
```

Exit 1 reported the wrong engine plus one source mismatch. Separately, compiling
the original worker with an isolated test public key and sending a valid signed
Shogi proof reproduced its unconditional “Independent verification is paused”
response. The same worker regression passes after this patch.

| Item | Verified value / implication |
| --- | --- |
| Current manifest rules identifier | `9fa0be4a43f049957ef407ee73361a0b6a3bb24ed59f487a36190165be82c8cb` |
| Current manifest SHA-256 | `e1a7effec9213736b51d176ac9b0566c1b50caedddddac1ca64b2662cad2aedf` |
| Expected proof engine | `server/fairPlayEngine.cjs`, 299,733 bytes |
| Expected and actual proof-engine SHA-256 | `16d08120db2442814631143e6dafbeb88af40bda561f3b00a61c5c0f0cfa4c18` |
| Engine incorrectly selected by old gate/test | `server/arcticPlayEngine.cjs`, SHA-256 `647c7663c91d1fcc32300379f0d722096a49e456fc22dcda1c9751ef0cf67ebc` |
| Pinned Dominion source | SHA-256 `c8b051fcfdc027762f40f10c9db0d3f184ee6be2d8a259f41b01562c38b12bc5` |
| Current Dominion presentation source | SHA-256 `b0580901df46bbcf11f0ef72c309b83c4ec55b049228fb231857f7000f162932` |
| Historical hold identifier | `63845f4daef97f9721ccecd9cb3c7ef363842835a2566f8f48c7e515863cd952`, expecting engine `dab5b2df…` |

Four inconsistencies interacted:

1. The builder and service use `fairPlayEngine.cjs`; the integrity checker and
   core tests used `arcticPlayEngine.cjs`. The latter is a separate gameplay
   executable, not the manifest's proof authority. Passing those old core tests
   did not establish that the correct artifact was replayed.
2. The current Dominion source changes only the `pieceArt` expression and an
   adjacent presentation comment. Reconstructing that original expression makes
   the entire file match its existing manifest digest exactly. No movement,
   capture, dice, victory or board code differs in that source change.
3. The source worker compiled mutable `fairEngine.js` inputs while presenting
   the published manifest identifier, and then unconditionally applied a hold
   describing the older unavailable authority. The current recoverable authority
   and the historical unavailable authority were being treated as one release.
4. `build-fair-rules.mjs` rewrote both engines and the manifest during ordinary
   source builds. That could silently change an existing authority while leaving
   historical readiness information behind. It now verifies the published
   artifact without regenerating or repinning it.

The current rules identifier is SHA-256 of `JSON.stringify(manifest.source)` in
its published array order. Proof signatures use the separate canonical JSON
format in `core.js`. The current manifest self-hash is correct: the reproduced
failure is not a disagreement over JSON signing order. Chain anchor configuration
does not select the rules artifact or make an otherwise invalid proof valid.

## Exact recovery and immutable build guard

The archived input at
`shared/fair-play/authorities/9fa0be4a/dominion.js` is compiled under its original
module identity. Its full-file SHA-256 must match the existing manifest before
use. The current app presentation file remains byte for byte unchanged.

`provenance.json` records the existing manifest/engine pins, the reviewed
presentation-only difference, compiler version, exact options, and both pinned
dependency lockfile hashes. The new read-only reproduction command:

```sh
node shared/fair-play/reproduce-rules-authority.mjs
```

compiles in memory with **Rolldown 1.2.15** and requires all three of:

- The expected engine SHA-256.
- The expected 299,733-byte size.
- Exact equality with every byte of the unchanged tracked engine.

It also reports all 60 loaded modules and their input digests. This matters
because the historical 113-entry source list omits some transitive inputs.
The regression changing an omitted San You Qi layout input fails exact output
comparison. An unused verifier export can be tree-shaken without changing the
published engine; that does not introduce a new game authority.

The normal integrity gate now checks the correct engine, all 113 declared
sources, the archived input, and only the exact reviewed checkout presentation
difference. Its report explicitly identifies the archived source. Other source
drift, missing files, malformed metadata, traversal and escaping symlinks fail.

The three source-build entrypoints (`build-current.mjs`, `build-web.mjs`,
`build-chaturanga-modules.mjs`) invoke this guard before writing outputs. The
worker's guarded Node-crypto fallback is explicitly external only for its
browser job; unresolved-import errors remain fatal. The retained APK patcher and
its historical hold are unchanged.

## Verifier and recording behavior

- The source worker verifies with the exact pinned CJS engine. Old or unknown
  identifiers remain unsupported; failure clears any previously checked replay.
- Core verification rejects a mismatching rules version as well as a mismatching
  rules identifier. Existing signatures, trusted-key checks, legality, beacon
  verification, state hashes, closure checks and chain checks remain required.
- Server recording verifies the manifest's own hash. Restored proofs needing a
  different authority or signing key are rejected **before** a move, beacon
  operation or receipt is appended. Proof retrieval/export remains available.
- Unsupported restored bot rooms retain their state and do not enter a repeated
  550 ms choice/sign/reject cycle. Normal unsigned free rooms retain their path.
- Independent replay uses the pinned board and piece positions. Dominion sprite
  URLs are resolved through the unchanged current `pieceArt` presentation so the
  approved final-four pawn art is preserved. Presentation never changes replayed
  state or the verification result.
- Source Fair Play labels distinguish the supported current authority from an
  unavailable historical build. Successful local rule verification remains
  separate from blockchain confirmation.

## Validation

Install the existing pinned packages without running lifecycle builds:

```sh
npm ci --prefix server --ignore-scripts --no-audit --no-fund
npm ci --prefix shared/fair-play --ignore-scripts --no-audit --no-fund
npm ci --prefix mobile/arctic-play/build-deps --ignore-scripts --no-audit --no-fund
```

Run the A1 regression set:

```sh
node --test \
  shared/fair-play/core.test.mjs shared/fair-play/long-dice.test.mjs \
  shared/fair-play/rules-integrity.test.mjs \
  shared/fair-play/reproduce-rules-authority.test.mjs \
  shared/fair-play/worker.test.mjs server/tests/fair-play-authority.test.js \
  server/tests/launch-fair-play.test.js server/tests/co-tu-lenh-fair-play.test.js
```

The worker test compiles browser-targeted code and executes it in a Node VM
worker harness. Fixtures originate from the native gameplay authority and use
isolated generated game-signing keys; production trust is not changed. All eight
tables in `arcticPlayGames.GAME_LIST`, plus the paired long-dice profile, replay
independently. Co Tu Lenh and Shanshui 2v2 have separate core/service regressions;
they are not part of this worker fixture list. Mutated proof
data, unknown signers, altered hash/version and stale replay are rejected.
This is automated local evidence, not browser, emulator or physical-device
acceptance. No beacon, chain or wallet request is sent by these worker tests.

The final counts, additional existing rule suites and CI/PR state are recorded
in `CHECKPOINT.md` and its evidence file. No ordinary frontend build is treated
as evidence about the approved Android binary.

## Production and owner boundary

A public read-only request to
`https://articweb3.onrender.com/arctic-play/v3/fair/config` returned JSON HTTP 503,
code `LAUNCH_RESET_PAUSED`, on 2026-11-28. It did not expose the current live rules
identifier, so this batch does not claim production authority compatibility or
successful live verification.

Before rollout, Batch B must reconcile the actual backend artifact and intended
client/verifier delivery. Test the exact candidate in an isolated environment,
retain published proof artifacts and archives, and obtain founder approval for
production deployment. Do not repin old proofs or toggle the older hold. The
approved APK can continue to use its retained runtime until the separately
reviewed Android delivery and physical acceptance work.

Rollback: retain the existing signed APKs and historical artifacts; no data or
proof migration is required. If rolling back this candidate, stop new signed
recording if the verifier/authority pair is incompatible. Keep funded operation
off during any rollback, as described in the A2 handoff.
