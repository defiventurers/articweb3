# Incremental launch execution — November 11, 2026

## Accepted decisions

- Build on the actual approved v5.9.15 APK, not the rejected v5.10.0 UI.
- Baseline SHA-256: `27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488`, code 103; source milestone `7c0cdd74f2bb4e75bf2ff38021f287273f314503`. The milestone describes incremental transformations of v5.9.14; it does not prove a full source rebuild matches the shipped APK.
- Preserve loading screen, launcher, native code, original assets, all nine games, modes, and routes. Runtime additions use exact guarded transformations of the approved bundle.
- v5.10.1/code105 is an existing unapproved candidate. A new native candidate uses a higher code106, preserving package `xyz.arcticdominion.play` and requiring original certificate `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37` for signing.
- Preserve baseline mascot names and imagery until the supplied Polly/Retsba/Pengu/Abster references versus later Nova/Rocco/Piko/Ziggy authority conflict is resolved. Do not rename or replace character identities during functional additions.
- No Render deletion, testnet mint, public update-feed change, real-money activation, social publication, or vendor purchase is part of this checkpoint.

## Scope and acceptance

| Workstream | Acceptance | Current status |
|---|---|---|
| Baseline and update identity | APK hash/signature verified; exact preservation checks | Baseline verified with aapt2 and apksigner; release signing key unavailable |
| Cinematic introductions | Nine games, <=4 pages, largest-image entry, skip/proceed, reduced motion | Implementing additive shipped-runtime patch |
| Halls | Cultural grouping with routes/modes retained; no fabricated live counts | Implementing with introductions |
| Chaturanga | Retain paired long dice and move guide from v5.9.15 | Already in protected baseline; outward spear art still requires reference review |
| Fairness | Replay accurate or reject mismatched engine; no false blockchain guarantees | Reproduced baseline replay/digest problems; safe fixes in progress |
| Passport/dashboard | Registration distinct from confirmed NFTs; chain isolation; retries and aggregate privacy | Backend fixes in progress; no live mint proof |
| Web/PWA | Approved experience, install path, coherent cache updates, no Android-only update gate | Building from same runtime |
| Android | Original signer, code>105, in-place install and data retained | Native tools available; signing key/device unavailable |
| Play Store | Eligible account, API36 AAB, accurate testing/review timeline | Account access required; direct APK is distinct from Play approval |
| Marketing/naming/cover | Accurate draft content and references, no posting/rename without decision | Existing saved launch content recovered; new claims require review |
| Physical nine editions | Continue actual sculpts; measured topology/fit; printable prototypes honestly labelled | Existing packages and prior locator reports recovered; sculpt inspection underway |
| Fresh start | Exact datastore scope, verified backup, dry run, explicit destructive approval | No records deleted; preserve existing scoped reset plan |

## Verification policy

Run meaningful existing tests and targeted regressions. Record exact results and limits. Syntax, static assets, and local tests do not establish a successful Android install, live sign-in, onchain mint, or launch readiness. Keep each change reviewable; checkpoint commits promptly so a runtime restart does not lose work.
