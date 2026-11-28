# Batch C2 — existing Robinhood contract provenance and compiler repair

Reviewed main: `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`. Date:
**28 November 2026 (Asia/Kolkata)**. **FIXED AND TESTED LOCALLY** for the broken
compiler API. Explorer source verification is **OWNER ACTION REQUIRED**.

## Reproduced defect and implemented repair

The existing phase-3 tests, operator builder and verification/deployment CLI
imported `compileBundle` from `contracts/launch/compile.mjs`, but that export was
missing. The original phase-3 suite failed before executing. The additive
`verification-build.mjs` restores the expected closed-source-graph compiler API;
`compile.mjs` exports it while preserving existing `compile()` outputs. Solidity,
dependency pins, constructor behavior and deployed contracts are unchanged.

The builder uses the pinned Solidity 0.8.24 compiler and OpenZeppelin 5.1.0,
optimizer enabled with 200 runs, and Paris EVM. It restricts imports to the
installed dependency, recompiles the complete input without an import callback,
and preserves the original deployable bytecode. It does not submit anything.

## Completed provenance work and publication boundary

Read-only official RPC/explorer observations independently confirmed the three
existing Registry, Passport and Mystery Egg deployments. Complete creation inputs,
constructor encodings and current runtime bytes matched exact reconstruction,
including metadata and the Egg's precise compiler-reported immutable offsets.
All three explorer source statuses remained unverified. Historical code at the
creation blocks was unavailable, so current runtime matching is distinguished
from historical-state retrieval. Two canonical L2 blocks are not Ethereum finality.

Official sources: [Robinhood network parameters](https://docs.robinhood.com/chain/connecting/)
and [deployment/verification guidance](https://docs.robinhood.com/chain/deploy-smart-contracts/).

The complete prepared source inputs, transaction evidence, constructor data,
read-only verification utilities, negative tests and approval-labelled submission
commands are retained in the **private contract-verification review package**
provided to the founder. Automatic approval review rejected uploading that full
package to this public repository because source-verification publication was
not authorized. No explorer request, contract write, signature or replacement
deployment was performed. This public PR contains only the compiler repair and
its existing regression coverage; it does not claim explorer verification.

## Validation

On Node **20.20.2** and **24.22.3**, the following existing regression gate passed
**9/9 with no skips**, including all six original phase-3 cases:

```sh
node --test contracts/launch/phase3.test.mjs \
  contracts/launch/launch.test.mjs contracts/launch/egg.test.mjs \
  contracts/launch/egg-wallet.test.mjs
```

The private verification package's additional **9/9** tests also passed on both
runtimes. They cover exact real-record reconstruction, altered artifacts,
malformed responses, read-only RPC restrictions, canonical-block changes and
saved-payload/command consistency. Local EVMs and explorer mocks were used for
writes; no live transaction or source publication occurred.

## Exact remaining owner actions

1. Review the private ZIP's `READ_FIRST.txt`, full C2 report and reproduction
   report. Confirm the three existing addresses, source/compiler hashes,
   constructor arguments and exact bytecode matches before approving publication.
2. Explicitly authorize public repository inclusion and/or explorer submission of
   that specific package. Preparation and local tests do not provide that approval.
3. After approval, recheck current chain and explorer status using the prepared
   read-only utility. Submit each exact target-specific standard input using its
   prepared command or explorer UI. Keep any required account/API credential local.
4. Confirm actual explorer success independently before recording a contract as
   source-verified. Do not deploy replacements or change ownership, supply, roles
   or metadata to obtain a verification badge.
