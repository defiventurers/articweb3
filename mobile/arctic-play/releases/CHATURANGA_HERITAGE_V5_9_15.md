# Chaturanga: Indian court and Antarctic ice — 5.9.15 / 103

## Outcome and acceptance

Home's default game entry opens Chaturanga. Its Home card, Games/Hall cover, setup trim and match surround combine Indian-inspired carved stone, lotus details and brass-gold ornament with Antarctic ice. Two new bundled art plates retain the four established character identities. The playable board image, geometry, sprite identities and catalogue ID `dominion` remain unchanged.

New bot and shared-phone matches select `chaturanga-long-dice-v1`: paired four-sided long dice, no one-die UI, correct role activations, manual passing, an optional post-roll legal-move guide, and the requested royal freeze/return behavior. Existing saved matches remain on their recorded edition. Online creation requires the matching service capability; it never silently creates an older-rules table.

Reviewed `main`: `7267d327c714a33601f1a599aaaea6efa7982dac`. Parent source: `04c686b1c9208cbfc0670e9dff01b04b291ef55a` (Passport Wallet PR #75, stacked on compact menus #74). APK baseline: signed v5.9.14. Live free-game service checked 9 November 2026 reported commit `be6d1cbfe124105dae2a53c3d2fda9542f8cb797` and did not advertise this new edition.

## Research and decisions

- [Mats Winther's four-handed interpretation](https://mats-winther.github.io/bg/4chaturanga.htm) is the source of the user's excerpt. Its final missing sentence limits the return to a royal King captured once. This is a published interpretation, not proof of one universal medieval ruleset.
- [The Indian Heritage Centre's gaming-piece collection](https://www.roots.gov.sg/Collection-Landing/listing/1321154) identifies Indian *pasa* as oblong, four-sided dice. [National Museums Scotland's South Asian game history](https://www.nms.ac.uk/discover-catalogue/chess-and-ludo-board-games-with-south-asian-origins) provide broader material/cultural context. Early two-player Chaturanga and later four-player traditions are distinguished in the app's origins text.
- The architecture is a fictional blend of Indian court ornament and Antarctic scenery. It is not described as a reconstruction of a specific dynasty or a scene from 574 AD. No religious figures or copied monument are used.
- Keep the current 8 × 8 topology, Green → Red → Blue → Pink order, rotated movement directions, promotion map and icy miniatures. Preserve `ship`/`horse`/`elephant` IDs; display their traditional roles as Boat/Knight/Rook beside their Icebreaker/Unicorn/Mammoth artwork.
- Retain the app's restriction against capturing a partner's pieces. Winther allows some allied captures; the app's difference is explicitly labelled as an adaptation. Preserve Four-way play alongside 2v2; only 2v2 has partner exchange.

| Long die | Activated role | Existing miniature |
| --- | --- | --- |
| 2 | Boat | Icebreaker; two-square diagonal jump |
| 3 | Knight | Aurora Unicorn; L-shaped jump |
| 4 | Rook | War Mammoth; clear orthogonal slide |
| 5 | King or Pawn | Frost King or Snow Guard |

Each die permits one move; either may go first. Doubles can activate the same piece twice. Pass one die or all remaining dice manually, including when no matching piece remains. Passing an unrolled turn asks for confirmation. A captured royal freezes its surviving army, whose turns are skipped. A partner's enemy-royal capture can release that player once; place the returning King on any empty square and then manually pass the second move. A second royal capture is permanent. Promoted fighter Kings are not royal. The 2v2 goal is capturing both opposing royals; Four-way ends with one royal kingdom.

## Implementation

- `chaturangaLongDice.js` is a separate versioned authority. Movement queries reuse canonical targets with explicit face translation. Rolls use unbiased four-face CSPRNG sampling, with validated two-value bounds for externally verified rolls. Legacy creation without `rulesProfile` and legacy actions remain compatible.
- The live app gets an unconditional post-roll hook plus the existing focus-trapped Sheet. It waits for legal moves before opening the guide. The guide shows actual available pieces, not merely a die legend; selecting one highlights it on the board. Its persistent switch remains accessible beside the dice.
- The left die and Roll both controls share the guarded action path. Buttons wait for a ready turn and reject duplicate rolls. An adaptive board-space container reserves the remaining viewport after the actual dice-tray height.
- Source and incremental runtime paths both include the feature. The APK patcher pins all four v5.9.14 JS inputs and changes only Chaturanga authority, presentation, teaching dice and the new controls. Other games' worker paths are retained, rather than replaced by an older full App build.
- The backend composition adds `chaturangaLongDice.cjs` to `arcticPlayGames.cjs`; `arcticPlayService.js` validates rules profile, client capability, seat and revision. Bootstrap was traced through `allGamesBackendBootstrap.js` → `arcticPlayBackendBootstrap.js` → service → worker pool. Existing protocol/version and old rooms are preserved. No chain deployment, paid entry, wallet configuration or settlement is changed.
- The new public-randomness mapping is selected by the signed `roll-long` action, so six-face legacy mapping stays unchanged. Existing pinned Fair Play trust/manifest records are not relabelled as a new production rules attestation.

## Validation and limits

- 34 targeted new/legacy rule, team, passing, server-worker and randomness tests pass.
- 11 learning/adventure tests pass, including every existing game's lessons and the updated freeze expectation.
- 5 shipped-runtime UI groups pass: themed Home/setup, paired roll, actual move selection, assistance preference, passing and light-theme King return.
- 9 worker groups compare all seven legacy engines' legal actions/move outputs before and after patching and check all five Chaturanga piece studies plus current teaching dice.
- 13 existing compact-menu/Hall/saved-position groups and 5 Passport Wallet UI groups pass.
- Existing online service regression suite: 11 pass. Full source App compiles with imports resolved.
- The pre-existing Fair Play core suite has three failures on both the untouched parent and this branch (legacy replay hashes after moves). They are recorded as a baseline limitation; this task does not claim that suite passes or alter its trusted legacy engine/manifest.
- APK: original signing certificate, v2/v3 verification, uncompressed/aligned resource table and ZIP integrity are checked in the accompanying JSON. Existing art and native DEX are preserved. New artwork is inspected visually; interaction tests mock image loading and do not prove Android pixels or physical installation.
- **Online activation remains a deployment step.** The existing server does not advertise `chaturanga-long-dice-v1`; new online creation explains that the service needs its update. The implemented server path is tested locally. Existing legacy room access remains available. Browser clients also need the matching release before joining new-profile tables. No production server, web-client or update-feed deployment is claimed.

## Artwork provenance

Built-in image generation produced `court.webp` and `cover.webp` from the user's requested Indian/Antarctic direction. The cover edit uses the shipped v5.9.14 Chaturanga cover as the identity/board reference and the new empty court as architectural reference. The prompts request preserved host identities and board composition; replace white cubes with oblong ice dice; add lotus-carved ivory stone, restrained gold inlay, lanterns, glacier mountains and aurora; no text, extra characters or religious figures. The original high-resolution generated PNGs remain separate. Project assets are saved in `frontend/public/assets/chaturanga-heritage-v1/` and packaged under `assets/art/chaturanga-heritage-v1/`.

## Rebuild

```sh
node mobile/arctic-play/scripts/build-chaturanga-modules.mjs
node --test mobile/arctic-play/tests/chaturanga-long-dice.test.mjs server/tests/chaturanga-long-dice.test.js shared/fair-play/long-dice.test.mjs
python3 mobile/arctic-play/scripts/build-chaturanga-v5915.py --baseline /path/to/AntarcticKingdoms-v5.9.14.apk --sdk /path/to/android-tools --output /path/to/output --keystore /private/ArcticPlay-release.jks --password-file /private/signing-password.txt
node mobile/arctic-play/tests/chaturanga-release-ui.test.mjs /path/to/output/app.js /path/to/output/bot.js /path/to/output/learn.js
```

The incremental packager's patched JS files are also available under `mobile/arctic-play/build/chaturanga-v5915/`. Do not commit private signing material or APK binaries. Full source builds retain their documented approved-art baseline requirement.
