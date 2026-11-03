# Antarctic Kingdoms 4.0.0 — Teams and browser play

Package `xyz.arcticdominion.play`, version code 40. Install over the existing
APK to retain its local profile and saved games. The original signer is used.

## Result

Arctic Dominion offers Four-way and an optional modern 2v2 variant. Opposite
kingdoms form fixed alliances: Green + Pink and Red + Blue. The creator selects
their alliance and kingdom before a room is created, including invitations
started from a game, hall or postcard. Waiting players can choose an open
kingdom; changing seats clears Ready. Seats lock at match start.

Each player controls only their own army, with the existing order, dice,
promotions and royal elimination rules. Partners block movement and cannot
capture each other. Both opposing royal kingdoms must be eliminated for a team
victory. An eliminated partner shares the victory. Team-aware bots fill empty
seats when the host explicitly selects that option. Four-way play, practice,
pass-the-phone, tutorials and zero/one-move End turn remain available.

The browser edition contains the same seven games, artwork and rule workers as
the APK. Its intended route is `/arctic-play/app/` on the existing game service.
Private invitations offer Open Android app and Play in browser. Safari players
enter their name, join the same room and retain authenticated seats in that
browser's site data. Profile includes Share browser link; browser users see
Refresh browser game instead of APK-only controls. The 320px join layout is fixed.

2v2 rooms reject clients that do not advertise the team capability. The new app
checks service capabilities before creating online 2v2, preventing an older
server from silently creating a four-way room. It also checks browser hosting
before offering its general browser link. Offline 2v2 is available in the APK.

## Evidence

- Base reviewed: main `f49ccf9652b2bc1cd0e3e0a1d65c7e07568c2dcc`.
- Mobile baseline: the supplied v3.9.0 APK and its complete recovered source.
  All 97 canonical frontend source files and server/gameRules.js matched main.
- 89 mobile tests, 14 room/socket/HTTP tests and 11 company-service tests passed.
- Eight browser flow checks passed with Chromium and WebKit 27.2: creator
  selection, actual invitation, names, four seats, roll/early ending, reconnect,
  team labels at 320/390px, and original four-way practice. Android is represented
  by the native bridge in a browser context; physical Android/iPhone checks remain.
- All 318 prior artwork files remain byte-identical. Final APK assets and
  hosted browser assets are checked for equality; signature/alignment and final
  hashes are recorded in verification/teams.

## Publication status

Not deployed. Automatic approval review rejected GitHub push checks, stating
that remote publication/probing was not authorized. The connected GitHub app
verified that defiventurers/articweb3 is public and that the user has admin/push
permission; no remote write was performed. Obtain explicit publication approval
for this completed release before making another publishing attempt.

Until deployment, the public Safari route is not activated and online 2v2 stays
behind its capability check. Existing website frontend/rules and existing free
room protocols remain separate. Physical installation and real iPhone Safari
still need device checks after deployment.

## Rebuild

From the source archive root, install pinned build tools with
`npm ci --prefix mobile/arctic-play/build-deps` and point frontend/node_modules
at that directory's node_modules (or install the equivalent frontend tools).

Run `npm run build --prefix mobile/arctic-play -- --reuse-artwork recovery/baseline-art`,
then `npm test --prefix mobile/arctic-play`. The web build writes both Android
assets and server/arcticPlayWeb. Backend checks use the server dependencies.
Build the APK with scripts/build-apk.py and the existing private signing key;
no signing material is included in the source archive or proposed publication.

The browser test is tests/teams-browser.mjs. Set QA_PLAYWRIGHT to a Playwright
installation, BROWSER_PATH to Chromium, and optionally QA_WEBKIT=1 and
WEBKIT_PATH. It starts the production backend locally unless QA_BASE is given.
