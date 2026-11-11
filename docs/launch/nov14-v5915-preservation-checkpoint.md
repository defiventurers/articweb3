# v5.9.15 preservation checkpoint — 11 November 2026 (Asia/Kolkata)

DO NOT PUBLISH OR DEPLOY FROM THIS BRANCH. It is an evidence and QA checkpoint based on pre-v5.10.0 source. The rejected v5.10.0 UI/icon/navigation are NOT approved.

## Verified provenance
- Approved binary: AntarcticKingdoms-v5.9.15(2).apk; SHA-256 27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488.
- Version 5.9.15, versionCode 103, nine game entries including Shanshui Xiangqi; ZIP CRC and v1 JAR verification passed.
- Original certificate SHA-256 20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37.
- Protected native icons, loading art and game artwork: 415 resources inventoried. Nonfunctional replaced icons are disallowed.
- Source checkpoint: 7c0cdd74f2bb4e75bf2ff38021f287273f314503. Prior v5.9.15 release verification records a bundle-patching build; exact clean source-to-binary reproducibility is not established.
- Current main: 0a7d45cefe8568bd1c66a9281fcd04ec28e1fa12, with rejected v5.10.0 / code 104. Render articweb3 follows main and latest deploy dep-dbq45bbncjis73cm4ql0 is live. This does not establish approved UI parity.

## Scope and acceptance matrix
| Priority | Outcome | Evidence | Required acceptance | Status |
|---|---|---|---|---|
| P0 | Android update | Verified uploaded 5.9.15 and signer | Preserve icon, loading, nine games, data; code >=105; install in place | Gate added, no new APK |
| P0 | Web/PWA | Shared source builder exists | Visual parity, browser gameplay, login, rooms, cache update | QA pending |
| P0 | Para sign-in | Para wallet integration present | Production identity and supported providers verified, wallet ownership/retries | External dependency |
| P0 | Passport | ERC721/queue later source | Deployed chain 46630 receipt, idempotent verified mint, correct wallet | Not confirmed live |
| P0 | Render fresh start | Render service inventoried, no managed PG/KV | Exact external DB, backup, restore dry run, owner approval | NOT authorised |
| P1 | Chaturanga | Long-dice version in baseline | Two dice only, 2/3/4/5, pass one/both, legal guide, geometry | Targeted QA pending |
| P1 | All nine engines | APK routes and rule assets | Local/bot/practice/online/learn and reconnect tests | End-to-end pending |
| P1 | Fair play | Signed replay and drand later source | Tamper tests, chain isolation, truthful unanchored labels | Needs isolated QA |
| P1 | Halls, stories, mascots | Later source includes content | Approved images and 3-screen controls, reduced motion, no fake activity | Visual selection pending |
| P1 | Growth dashboard | Later source contains metrics | Protect operator controls; reconcile chain event mints | Deployment pending |
| P1 | Play Store | 5.10.0 AAB on rejected line | Verified account eligibility, accepted AAB, testing, device QA | Unverified account |
| P2 | Social/identity | Nova pink, Rocco red, Piko blue, Ziggy green direction recorded | Four approved visual refs, claim-safe scripts | Drafted, not published |
| P2 | Physical editions | San You Qi print-model handoff in project files | Recover source, accurate board topology and mesh/print tests | Not manufacturing-ready |
| P2 | Umbrella app | Naming undecided | Legal collision and chosen identity before rename | Decision pending |

## Gate and release procedure
Run: python mobile/arctic-play/scripts/verify-v5915-art-parity.py APPROVED_5.9.15.apk CANDIDATE.apk --min-version-code 105
Then run Android SDK apksigner verify --verbose --print-certs, aapt2 dump badging, zipalign -c -p 4, and install candidate over existing 5.9.15 with data preserved. Compare screenshots and smoke-test every game/mode.
Never equate passing this guard with complete Android signature, UI, gameplay, authentication, or on-device approval.

## Hold decisions and rollback
No Play publication, new app name, production keys, Render reset or paid/wagering launch is authorised by this checkpoint. Preserve all public and private signing identities. External user DB scope and backup require specific owner approval. Onchain history survives backend resets.
Do not deploy a lower versionCode as a downgrade; withdraw a faulty update feed, build a higher-code corrected release, and rollback backend only with a compatible migration plan.

## Progress ledger
- COMPLETE: baseline checksum, signing fingerprint, resource inventory, nine entry evidence, rejected-branch separation, Render inventory and release safety script.
- PENDING: source-matched clean Android build, real-device install, 9-game tests, signed updated APK/AAB, Play account state, testnet passport mint, Reset dry-run, approved physical meshes and print samples.
- This branch is a baseline checkpoint; a PR into main only adds documentation/guard. It does not revert v5.10.0 or deliver a new APK.