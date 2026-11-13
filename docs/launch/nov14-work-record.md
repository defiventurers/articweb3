# November 14 release work

## Scope and acceptance

User request: implement every item in the branched launch checklist, not only the Render reset. Target is November 14, 2026 (Asia/Kolkata). This record distinguishes implementation from verified deployment.

| Work | Acceptance criteria | Evidence/state |
|---|---|---|
| Chaturanga presentation | Indian subcontinent + Antarctic court, period-inspired spear pawns for all four teams, legal geometry/roles retained | v5.9.15 court and paired long dice retained; 20 new minis use only the four final references; UI flows pass |
| Game introductions | Largest tile opens cinematic piece welcome and sourced story, at most 3 screens, Skip/Proceed always reachable | Nine sourced three-screen stories implemented; Skip/Continue and phone layout reviewed |
| Play Store | Current official account, DUNS, testers, review timing and submission checklist; no unverified review claim | Research complete; Console access absent |
| Fairness | Signed legal action replay, public beacon rolls, receipts and final result; honest pending/unanchored labels | Signed replay integrated for all nine games (Commander standard untimed); beacon and tamper tests pass; onchain anchoring awaits funded signer |
| Robinhood | Explicit testnet chain adapter/deployment, chain-scoped contracts/state; keep Abstract AGW intact | Official network 46630 verified; signer/gas/deployment outstanding |
| Web/APK | Same React game source and artwork, installable PWA, download link only for verified artifact | Same source builds Android and browser; signed API 36 APK/AAB verified, PWA and versioned download configured; publication pending |
| Passport | ERC721 with mutable metadata, passport first, optional achievement NFTs, mint counts from confirmations | ERC721 + ERC1155 contracts pass local EVM checks; passport-first queue and nine achievements implemented; live minting awaits deployment |
| Dashboard | Real visits, signups, registrations, confirmed mints; anonymous public totals only, owner controls outside player flow | Implemented and checked locally; deployment pending |
| Social | Launch status variants, four faithful character introductions, scripts and evidence-safe cognitive wording | Four final-reference posters, reel scripts and status copy complete; no posts published |
| Halls | Group cultural families, premium art, factual labels, genuine activity only | Implemented and checked locally; deployment pending |
| Mascot roles | Pink practice/welcome, red tactics, blue rules/fairness navigation, green puzzles/reflection | Final user references govern: Nova, Rocco, Piko, Ziggy; stable IDs retained |
| Fresh start | Exact account/progress/passport/room scope, preview counts and backup, reset at launch with audit evidence | Render service identified; no deletions executed |

## Accepted implementation decisions

- Reviewed `main` at `7267d327c714a33601f1a599aaaea6efa7982dac`.
- Working branch: `codex/nov14-launch-completion`.
- Fast-forwarded this branch (not main) to `7c0cdd74f2bb4e75bf2ff38021f287273f314503`, the source for the delivered v5.9.15 work. This preserves Passport Wallet, compact menus and the versioned Chaturanga long-dice edition.
- Restored proof-service/registry source from `31632181cf69dbeff103810785683e692b24e0fa`; audit and tests required before activation.
- Latest verified APK SHA256: `27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488`. Recover public artwork byte for byte; normal builds must not patch minified application bundles.
- The latest user follow-up explicitly supersedes older character instructions. Only the four supplied plush 3D references govern: Nova (pink), Rocco (red), Piko (blue), Ziggy (green). Existing internal IDs and historical chat parsing remain compatible.
- Chaturanga costumes and piece equipment are an explicitly requested modern character adaptation. They do not authorise changing source-native roles in other heritage games. Spear evidence supports a period-inspired prop, not a reconstructed military uniform.
- Avoid exact “574 AD”, invented royal players, universal “ancient Indian” claims, fake crowds, guaranteed virality, and unsupported neurological benefits.
- Para production identity environment and blockchain testnet are separate settings. Production Para can use Robinhood testnet; never default production identity to mainnet.
- No public paid-entry or settlement gates are enabled by this work.
- Live checks: passport registration configured; NFT delivery disabled on Abstract Sepolia. Browser app version endpoint returned 404. No claim of active Robinhood delivery is supported by those observations.
- Render workspace `My Workspace` (`tea-d510hcf5r7bs73aulbp0`) is the previously user-selected workspace. Relevant service: `articweb3`, `srv-d8knkism0tmc73ct2t3g`, root `server`, auto-deploy main. Other unrelated workspace services are outside reset scope. No managed Postgres/Key Value instances were returned; account database may be external.

## Latest steering — final character references

The user supplied four final plush 3D character images and explicitly superseded older references. Names remain the app's Nova (pink), Rocco (red), Piko (blue), Ziggy (green); stable IDs remain unchanged. Newest images are the sole visual references. Older-reference social drafts and sprite generation are superseded and must not ship. All new character artwork must use these final identities.

## Verified release and remaining gates

- API 36, version 5.10.0 (104), package xyz.arcticdominion.play. APK and AAB use the original Android signing identity. Device installation has not been tested.
- Source build, Vite testnet build, native Commander regression suite, Sannin rules, proof replay, launch/passport/Para checks and five Chaturanga UI flows pass. Exact checks and hashes are in `mobile/arctic-play/releases/launch-v5.10.0-verification.json`.
- Reviewed 390px story and home layouts. Story actions remain visible while long copy scrolls.
- Public launch still needs a Para production project, a funded Robinhood testnet signer and confirmed contract deployments, Play Console verification/testing/submission, and access to execute the scoped Render database reset after its November 14 IST cutoff. No live minting, mainnet activation, Play Store review or deletion is claimed.
- Publication and deployment evidence will be recorded separately after remote verification.
