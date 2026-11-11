# Historical rules-authority recovery — bounded result

Reviewed November 12, 2026 (India time). **Result: the exact published historical rules artifact was not recovered. Verification HOLD remains justified.** No game engine, historical manifest, trusted key, worker or readiness setting was changed by this investigation.

The preserved `ak-fair-play-v1` manifest expects compiled engine SHA-256 `dab5b2df6d25e3c9572e93a0216b7d6d355493688983a959397bc40e2dad239b`. Read-only Git history of `server/arcticPlayEngine.cjs` exposes four distinct committed revisions:

| Commit | Engine bytes | SHA-256 |
|---|---:|---|
| `839479a0a3b30a108bac573ef3084c352fa98ed7` | 235383 | `647c7663c91d1fcc32300379f0d722096a49e456fc22dcda1c9751ef0cf67ebc` |
| `f49ccf9652b2bc1cd0e3e0a1d65c7e07568c2dcc` | 207291 | `eced69cddead21aab99e18e22b43c7b52fe37d3688d00f6b78f542cf220f6269` |
| `cfd01cb9949d5006f86251f4cb477c68a2936575` | 207181 | `282ed3e92451750cc34720aff339c832b35db868e14abc852df6ed1c9c56df26` |
| `50d17832bcf913ef8703263640360e431ed95b7b` | 186024 | `f5b1411665cd9cb12eedf3d7412310abbdad99f757a5c5e492e2eae41f87a94e` |

None matches the expected digest. The manifest first appears in `09ca49e` and is updated in `839479a`. The original build script uses rolldown `1.2.15`, matching the pinned build dependency; this alone cannot establish missing build inputs.

## Source reconstruction check

Each of the 105 manifest entries was compared with the current checkout. For a mismatch, the historical source at `09ca49e` was fetched and its exact SHA-256 compared with the manifest. **102 entries match; three remain unresolved:**

| Manifest path | Result |
|---|---|
| `frontend/src/games/san-you-qi/sanyouArtwork.js` | Absent from `09ca49e` and no recorded history for that exact path. |
| `frontend/src/games/san-you-qi/sanyouFinalPositions.json` | Absent from `09ca49e` and no recorded history for that exact path. |
| `frontend/src/games/sannin-shogi/rules.js` | Expected `a1977c7894544d51040dfd17499b255ded166b3048bee0edb983049bc33f126c`; none of the three recorded variants matches. |

Sannin variants are `2c028881ea71f0469fdc6e4ac81d80f8adfe1ebcb59800edeaf03097261e9e8a` (`839479a`), `3bcb6c150bbdd60ed37e41442d8ddba4dace6b0c9e930784862a57346e5c04d0` (`9c9d515`) and `d62c868d4b79a97ea148435362d1ae26cfd8b4e6ccbfac8d31edf331eed1b49f` (`4eca523`).

The hash-matching historical `mobile/arctic-play/src/games.ts` accepts `context={}` and forwards `context.roll` to Dominion. Its corresponding hash-matching `dominion.js` accepts an externally verified roll, validates values and uses those values. The current committed CJS engine does not have that interface. This supports the stale-compiled-engine diagnosis; it does **not** establish that a freshly synthesized engine is the original published artifact.

An incomplete reconstructed source tree was kept only in scratch for this check. No speculative engine was copied into the product or signed as a historical authority. There is no useful all-nine-core-tests result against an exact engine because no exact engine was found. Existing two dice-replay failures therefore remain unresolved rather than being hidden by an unpinned adapter.

## Safe next paths

1. Recover the exact original engine/release worker from a preserved build archive and verify its expected digest before adding an immutable legacy-verifier adapter.
2. Alternatively, publish a **new, separately versioned rules authority** whose complete transitive inputs and generated output are recorded and tested. It must use a new rules identifier for new records and explicitly reject records requiring unavailable historical builds. It must not relabel current paired-long-dice Chaturanga, Cờ Tư Lệnh, Shanshui or other later editions as the old seven-game rules build.

Neither path is accomplished by changing `release-readiness.json` or repinning the old manifest. Until one is completed, keep the current honest HOLD and retain players' proof files for later verification.
