# Passport and Chats · v5.9.5 / code 93

Reviewed `main` at `5bb2c978fbdc96474b2788af56f56d4b35eb35c4`. Work branch: `feature/passport-chats-v595`, based on the previous Home commit `ff45602fcd7425e9d840ca3d24e97999425fa0fc` (PR 67). This update includes that Home refresh.

## Product decision

Profile previously mixed collecting, identity, access purchases, chain delivery, settings, recovery, sharing and developer tools in a long feed. Chats also contained lessons, puzzles, memories, Camp and stories. The result obscured both the next learning action and actual room conversations.

The bottom navigation now says **Passport**, using a matching book icon while preserving the internal `profile` route ID. The first view is an expedition book with native text, a paper spine, four animated spreads, previous/next controls, horizontal swipe and arrow-key support. It remembers the last page and respects reduced motion. It shows one next-stamp action rather than multiple progression systems at once.

| Existing feature | New destination |
| --- | --- |
| Name, avatar and optional Aurora Companion badge | Arrival spread; editing also in Settings → Account |
| Seven hall lanterns, dates and hall revisits | Lanterns I and II spreads |
| Antarctic Crown | Final spread; automatic cosmetic stamp after all seven lantern milestones |
| New guided challenge | Next-stamp button or a missing stamp; existing account/hall gate remains authoritative |
| Newly earned stamp | Return directly to Passport after a challenge launched there; open its spread and announce the real stamp |
| Camp, discoveries and daily puzzle | Camp, discoveries & keepsakes below the book |
| Festival stickers, story settings/opening/guide, optional three-hall conversation | Same optional extras view |
| Existing private-table visit memory | Extras, with its original date |
| Hall keys, formations, paid access and discovery route | Extras → Game access & unlock routes; original handlers retained |
| Recovery, offline access, delivery record and logout | Settings → Account; logout still confirms |
| Theme and companion controls | Settings → Appearance |
| Updates, Fair Play, About and play-together help | Settings → App & help; duplicate About destination collapsed |
| Share APK and browser link | Settings → Sharing |
| Existing San You Qi coordinate editor | Settings → Advanced tools |
| Saved room conversations, Join and Invite | Chats; existing authenticated room callbacks retained |
| Saved friend names | Chats → Saved friends; its compact subpage links back to Chats |

Floating companion overlays are suppressed on Passport, Chats and the friends subpage. Companions remain available in Camp and their existing gameplay contexts.

## Reward semantics and accepted decisions

The seven **founding halls** are the seven already represented by `gathering.js`; the two additional catalogue games do not acquire invented learning milestones. A lantern uses the existing `learnedAt` record from an accepted guided move, including the existing legacy journal normalization. Reading stories or opening the book does not award a lantern. Paid access does not forge learning progress.

`passportSnapshot` is a read-only presentation model. Seven valid learned timestamps derive a Crown, dated to the final lantern. It writes no learning records, access flags, entitlements, chain records or story-reveal timestamps. The optional Eighth Lantern story and its Camp reward retain their separate existing completion rule. The Crown is an in-app keepsake, not a financial, NFT, tournament-rank or historical claim.

Old lanterns carry over. No daily streak, expiring stamp, paid Crown requirement or fabricated live chat is introduced. Local page/seen-stamp preferences merely decide which spread to show. Lantern records remain device-local under the existing storage policy; account recovery keeps its established coverage. New stamp artwork changes no approved character references or source-native game roles.

## Build boundary

The complete public source still predates the shipped discovery/Shop interface. Use the guarded baseline builder, not an ordinary whole-app rebuild. Exact baseline: v5.9.4, SHA-256 `c6b2e393ef099ad020944f83802ed86b4fab08d2587039de4501f4b8ec052b6a`.

`patch-passport-bundle.mjs` parses the bundle with Acorn to identify the two presentation component boundaries, compiles the new source with esbuild, and checks every remaining single-match integration anchor. The changes wrap existing Profile option nodes and room rows so their authenticated callbacks remain intact, rename the navigation item, simplify social destinations, suppress the lobby overlay, handle native Back for book subviews, and return Passport-origin lessons directly to the book. `closeHallChallenge` was traced before changing that return path; match-origin lessons keep their return screen. Backend bootstrap and transformation layers are unchanged; no server deployment is required.

```sh
python mobile/arctic-play/scripts/build-passport-update.py \
  --baseline /private/AntarcticKingdoms-v5.9.4.apk \
  --sdk /tools/android-sdk --esbuild /tools/node_modules/esbuild \
  --keystore /private/release.jks --password-file /private/password.txt \
  --output /output
```

Requirements: Node 24, esbuild and Acorn available through the same dependency tree, Java 21, Android platform/Build Tools 35, original release key. Signing material and APKs are excluded from source. `build-web.mjs` also copies/preloads the new art for eventual full-source restoration; its presence is not a claim that the full-source blocker is resolved.

## Acceptance evidence and limits

All 61 focused regression tests passed. Five APK-layout regression tests passed. Focused checks cover sign-in readiness/cancellation, recovery/passport entry, asset loading, startup, update enforcement, discovery/logout, offline licenses, all 17 canonical hall challenge paths and the new reward projection. Five APK-layout checks and JavaScript syntax validation supplement the UI checks.

The actual packaged bundle is exercised in Chromium using mocked account APIs and a simulated Android bridge. Passport testing covers 48 layout cases (four spreads × six sizes × two themes), touch targets, page persistence, arrow keys/swipe/native Back, settings/modal priority, empty/populated room lists, migrated Crown progress and the real bundled Xiangqi learning worker. A canonical accepted move awards a real persisted lantern and returns to its stamped spread. Home’s Passport shortcut also opens the book directly. The existing Home regression scenario also covers all nine catalogue entries, saved-board restoration and navigation.

The builder verifies original certificate continuity, v2/v3 signatures, ZIP integrity, aligned/uncompressed resources, all preload sizes, and byte identity of 388 existing artwork files, eight other JS/worker files and native DEX. Physical Android installation, Android WebView/TalkBack, live sign-in and live multiplayer remain unverified. Full shipped-source restoration, source merge and public update-feed promotion are separate steps.

## Further direction, not implemented

After device/beta evidence, add new expedition volumes as genuinely playable lessons become available. Preserve this founding Crown for existing collectors. Distinguish later mastery achievements from these first-discovery stamps, and validate account-backed stamp recovery before promising cross-device collection. The retention goal is a meaningful next move and a lasting memory, with a clean route back to games after the Crown.
