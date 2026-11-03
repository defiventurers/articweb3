# Antarctic Kingdoms 3.9.0 — Your turn, your choice

Arctic Dominion’s dice show the current team’s actual piece images. Rolls 1
and 5 show both Snow Guard and Frost King; 2 shows War Mammoth, 3 Aurora
Unicorn, and 4/6 Icebreaker. Used dice remain dimmed and explicitly marked Used.
Accessible die descriptions retain the piece names.

After rolling, **End turn** is available with zero moves or after the first move,
even when a legal move remains. Ending keeps accepted board moves, advances to
the next surviving kingdom and resets the dice. Normal two-move completion and
automatic passing of unusable dice still work. Casual bots use playable dice.

Package `xyz.arcticdominion.play`, version 3.9.0, version code 39. Android 7.0 or
newer. Install over the existing app to retain data; do not uninstall first.
The original signing certificate and sporty launcher icon are retained.

Validation completed: 82 mobile tests, 12 room/socket tests, the same 12 server
tests against the narrow production bundle patch, and 30 Chromium checks. The
browser checks cover every die face and all four teams in both themes at 320px,
390px phone and 800×360 landscape, zero/one-move ending, used dice, nonacting
players, accessible labels, actual decoded art, touch targets and overflow.
All 318 packaged art files and all eight launcher image resources match 3.8.0.
The complete source retains all canonical frontend rules and server/gameRules.js.

The Android-room server fix is commit
`f49ccf9652b2bc1cd0e3e0a1d65c7e07568c2dcc` on the existing main branch. It
changes the Android room engine, adds a regression test and a technical note.
Website rules, protocol version and authentication remain compatible.
Live deployment status is recorded in verification/end-turn/live-room-report.json
when verified. The public APK update feed was not changed by this release.

The source archive contains the full newer mobile app, all artwork, pinned build
dependency manifests, shared rules, build scripts and machine-readable reports.
It excludes installed dependencies, toolchains, signing secrets and QA screenshots.
Follow README.md for rebuilding and tests/dominion-turn-browser.mjs for UI QA.
Real Android installation and TalkBack remain physical-device checks.
