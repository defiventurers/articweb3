# Batch D1 — retained runtime and physical acceptance

Reviewed main: `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`. Batch D branch:
`codex/fonso-stabilization-batch-d`, based on
`75328370f0703ab7907dda9dc833f8aab93c21f9`. Checked 28 November 2026 UTC.

**Outcome:** the exact retained v5.10.2 and v5.11.1 JavaScript and workers pass
the bounded acceptance scenarios below. A review-only regression in those
scenarios is **NOT REPRODUCIBLE**. The new test harness is **FIXED AND TESTED
LOCALLY**; no application defect is called fixed by adding this harness.
Physical acceptance of v5.11.1 remains **OWNER ACTION REQUIRED**. Fresh local
Chromium rendering is **BLOCKED BY ACCESS**; no Android emulator or physical
device was run. Production compatibility and deployment remain **PRODUCTION
VERIFICATION PENDING**.

See [BATCH_D_ANDROID.md](BATCH_D_ANDROID.md) for independent APK integrity,
signature, package, version and complete payload evidence. This document covers
runtime observations and the exact outstanding founder test. It does not
replace the binary verification or imply that a source build reproduces an APK.

## Which runtime was tested

[PR #118](https://github.com/defiventurers/articweb3/pull/118) is merged as
`da71f5b8c665400beb7541b10af91ede2217fc48`. It guards the retained v5.10.2
`GamesAdventure` declaration and applies the approved review presentation/CSS
work. [PR #119](https://github.com/defiventurers/articweb3/pull/119) is merged as
the reviewed main commit above. It corrects test expectations, state
normalization and bounded rasterization tolerance; it does not replace the
retained runtime or game engines. Their history and the existing
[reference review](../launch-2026-11-14/games-adventure-reference-review.md)
were checked before running the tests.

The baseline assets were extracted from the exact approved APK; the review
assets were extracted from the exact retained signed review APK. Neither input
was modified. The new harness refuses any other `app.js` digest and verifies
both worker digests before executing them. The asset identities are recorded in
[BATCH_D_ACCEPTANCE_EVIDENCE.json](BATCH_D_ACCEPTANCE_EVIDENCE.json) and the
binary verifier's protected-entry evidence.

The retained catalogue IDs are `dominion`, `xiangqi`, `shogi`, `sanguo`,
`sanyou`, `sannin`, `yanyi`, `co-tu-lenh` and `shanshui`. The original catalogue
callbacks, saved-game entry and direct game routes remain in the guarded
runtime. The tracked mobile source follows a later, separate build path; for
example, a later source test expects a `data-faces` attribute absent from both
retained APKs. Passing a current-source test cannot establish retained-APK
acceptance, and this mismatch is not a reason to change the approved APK.

The original v5.10.2 signing checkout remains unresolved. The retained native
code, bot, learning and fair-play scripts are byte-identical between these two
APKs, as established by the binary comparison. A/B/C source fixes are therefore
not automatically included in the retained mobile binaries. Backend deployment,
client compatibility and any future mobile update require their own gates.

## Automated observations

All local DOM/worker commands below used Node **24.22.3** and the repository's
existing mobile `build-deps` JSDOM dependency. They are executable tests, with
real extracted JavaScript and workers, synthetic account data and no live
authentication, wallet signatures, collectible delivery or gameplay traffic.

| Test input and command | Observed result | What the result establishes |
| --- | --- | --- |
| Baseline `heritage-runtime-ui.mjs` | 4 scenario groups passed | Original Home entry, all nine three-screen stories, hall filtering and original navigation/art references |
| Signed review `storybook-runtime.mjs` | 9 scenario groups passed | Reviewed Home/Adventure/All Games UI, nine story entries, preserved setup callbacks, crown gate fixtures, filters and keyboard/swipe navigation |
| Baseline `retained-apk-acceptance.mjs` | 6 scenario groups passed | Exact retained UI/worker/save/auth behavior listed below |
| Signed review `retained-apk-acceptance.mjs` | Same 6 scenario groups passed | The same bounded behavior on the actual signed review payload |
| Later-source `chaturanga-release-ui.test.mjs`, each retained version | Same early assertion failed on both | The later-source fixture expects `data-faces="2,3,4,5"`; actual retained long-die SVG lacks that attribute. This does not isolate a review regression |
| Fresh local `storybook-browser.mjs` rendering | Blocked before browser launch | `/usr/bin/chromium` points to a missing executable; the official Playwright headless Chromium download returned HTTP 403 `SiteUnavailable` |

The six retained-runtime scenarios assert:

1. Original Home opens Chaturanga setup, its Learn tab opens How-to-Play, and
   the original return callback reaches Home.
2. Local Chaturanga keeps all four human seats and the existing long-dice
   ruleset, rolls two valid values, accepts a board click matching the actual
   bundled worker's legal action and rejects an invented action in that worker.
3. The JavaScript `arcticBack` bridge closes Match options, returns to Games,
   then Home, preserving the save. A fresh JavaScript realm restores the same
   board, turn, history and match identity from that synthetic save.
4. The actual bot worker selects a legal action without changing the UI save;
   all five bundled single-piece practice lessons return legal moves.
5. Unsigned entry stays gated. A mocked Para/Android PKCE handoff uses its
   recorded verifier, and two concurrent native callbacks exchange exactly one
   fixture session before Home opens.
6. A failed account-service capability check shows its unavailable message,
   leaves Home closed and opens no authentication browser.

These are **six scenario groups per artifact**, not six Node unit tests or six
physical scenarios completed by the founder. Images are mocked and not decoded.
JSDOM supplies no Android WebView, raster layout, safe-area behavior or TalkBack.
The bot check establishes one legal action and practice-worker output, not a
complete human-versus-bot match. Auth is fully mocked and does not establish
actual Para consent, secure native storage or Android intent behavior.

The browser harness now accepts an optional `STORYBOOK_REVIEW_ROOT` while
preserving its existing default. It blocks non-local requests, disables
WebSockets and blocks service workers during visual fixtures. No app/runtime
source was changed. Historical PR119 screenshots are historical evidence only.
A successful fresh CI rendering run, if recorded in the checkpoint, uses the
public baseline plus reproduced guarded patch; it must be labelled separately
from the local tests of the original signed review binary.

The first Batch D rendered CI run on `d72be7` did execute Chromium, but failed
the existing Home pixel gate. Its 360×800 dark pair differed at 110 pixels,
all within the profile portrait (`x=303..336`, `y=14..47`); 104 pixels had a
maximum channel delta of 1 and six a delta of 2. Every other Home pixel was
identical. An independent existing-storybook job also failed, with 77 changed
pixels, a maximum delta of 7 and nine pixels exceeding delta 2. These are failed
render checks, not accepted visual results. The retained avatar is a static
image; inspection found no avatar animation or timed portrait substitution.

The follow-up fixture isolates each version in a fresh seeded context, awaits
loaded fonts and decoded visible images, resets the pointer and waits two
render frames. It also saves a same-version reload control, avatar geometry and
pixel bounds/histograms before any assertion failure. The original cross-version
thresholds remain unchanged; no avatar mask, pixel averaging or favorable-frame
selection was added. Its rendered outcome must be taken from the subsequent CI
record, not inferred from local syntax checks.

### Reproduction

Supply unchanged extracted asset directories. The retained harness needs
`app.js`, `bot.js` and `learn.js`; it verifies their pinned hashes before use.

```sh
node mobile/arctic-play/tests/heritage-runtime-ui.mjs "$BASELINE_ASSETS/app.js"
node mobile/arctic-play/tests/storybook-runtime.mjs "$REVIEW_ASSETS/app.js"
node mobile/arctic-play/tests/retained-apk-acceptance.mjs "$BASELINE_ASSETS"
node mobile/arctic-play/tests/retained-apk-acceptance.mjs "$REVIEW_ASSETS"
```

For visual testing on a host with an installed compatible Chromium, the existing
browser harness expects `before/` and `after/` asset trees below its fixture root:

```sh
STORYBOOK_REVIEW_ROOT=/path/to/isolated-fixtures \
PLAYWRIGHT_PACKAGE=/path/to/package.json \
CHROME_BIN=/path/to/chromium \
node mobile/arctic-play/tests/storybook-browser.mjs
```

The package argument resolves an installed Playwright dependency. This command
does not install or sign an APK. The local failure above is preserved rather
than represented as a successful render.

## Physical-device checklist — preserve the existing save first

Use this table as a record: **PASS / FAIL / NOT TESTED**, observation, device and
time for each row. Do not put account IDs, session tokens, wallet signatures,
recovery material or private saved-game data in public issue attachments.

### Preparation and installation

1. Record phone model, Android version, Android System WebView version, navigation
   mode, app version and available space. On the primary phone, record the
   existing saved game's game/mode, current board, active player, turn and
   visible history privately. Confirm it resumes **before** the upgrade.
2. Keep the existing app installed. Use an already available approved backup or
   account-sync mechanism if the founder normally uses one; this work does not
   establish a new native-vault export or backup method. Do not clear app data,
   delete the save, switch accounts or create a replacement match in its slot.
3. Verify the review filename, package `xyz.arcticdominion.play`, version
   **5.11.1 / 111**, SHA-256
   `91fbc8cd0578462511356888e8fab5e6008f9008e555571dbf93473783488f3e`
   and the original signing certificate in the binary report.
4. **Test the upgrade with the existing save first.** Install over the current
   approved v5.10.2/v5.11.0 installation using Android's update flow. If Android
   reports a signing conflict, incompatible package or version refusal, stop and
   record the message. If a newer version is already installed, stop; do not
   force a downgrade or uninstall to satisfy this checklist.
5. Immediately resume the preserved save and compare the recorded board, turn,
   history and identity. If any differ, preserve both observations and stop
   gameplay on that save pending review.
6. Test a clean installation only on a **spare device or separate empty Android
   test profile**. Do not delete the primary installation to produce a clean
   test. Use the same verified artifact and record the separate result.

### Functional and accessibility acceptance

| Area | Exact physical check and pass condition |
| --- | --- |
| Loading and Home | Cold-launch, then warm-launch. Compare loading screen, original artwork, colors, character proportions, Home layout and touch targets with the founder-approved v5.10.2 experience. No replacement art, stuck loading, flashing error or hidden navigation. |
| Adventure | Open Games/Adventure, inspect all nine entries and their three story screens, then follow each available setup/How-to-Play callback. Back returns to the expected previous screen; a locked feature explains its existing gate. |
| All Games | Switch to All Games; exercise existing search/filter/favorite controls, open several entries including Chaturanga and return. Existing catalogue identity and direct routes remain usable. Do not treat later source catalogue labels as the retained baseline. |
| Chaturanga and local play | On an unused save slot or spare profile, start local play, select each human side, roll the paired dice, make legal moves, attempt a clearly illegal destination and confirm the turn/guide behavior. Check board geometry and original piece artwork. Do not replace the preserved primary save. |
| How-to-Play and practice | Enter from Home/setup and from available game controls; exercise Quick/Full instructions, all five Chaturanga piece lessons, hints and return navigation. Text remains readable with no trapped overlay or accidental new match. |
| Bot play | On a spare/unused slot, complete several human and bot turns and a short game where practical. Confirm bot progress, legal moves, turn labels and save/resume while the bot is thinking. A full bot match remains a physical test requirement, not a claim from the worker smoke check. |
| Saved game | Verify the preserved save immediately after upgrade, after background/foreground, after normal exit and after force-stop/relaunch. Board, current player, history and game identity agree; no silent fresh game. |
| Real Para return | Perform only the separately approved controlled C3 live test below. Check browser open, consent/cancel, app return, restart during handoff and safe retry. The correct existing account appears; cancel/failure does not grant access or erase the save. |
| Safe areas | Test gesture navigation and three-button navigation if available, portrait and landscape where supported, cutout/status bar, keyboard open and large system text. Important controls remain visible and tappable, with no board geometry corruption. |
| Android Back | In a match, open options and press native Back: the modal closes first. Continue Back to Games, then Home; at Home the existing native behavior may background the app. Return and confirm the save. Repeat in How-to-Play and sign-in/cancel flows. |
| TalkBack | Enable TalkBack and traverse Home, Adventure, All Games, setup, instructions and a local board. Verify useful control names, focus order, selected states, board coordinates/available moves, turn announcements, reachable dismiss controls and focus return from dialogs. Record inaccessible actions exactly; DOM label assertions alone cannot accept this. |
| Restart and offline recovery | Launch/relaunch online, temporarily disconnect networking, background and return, then reconnect. Display a truthful service/connection state; no fake successful sign-in, stale-user display or lost save. Avoid forcing a live transaction. |
| Performance | Record cold/warm launch and first-board timings on the same phone for baseline/review if safely available; observe touch response, scrolling, bot turn delay, memory pressure, heat, crash and ANR behavior. No invented numerical release threshold is asserted here. |
| Crash recovery | On the spare profile first, force-stop and reopen during a saved local match and during a non-sensitive loading screen. Resume the saved game correctly. Record any crash/ANR and redact logs before sharing. Do not clear storage as a recovery step. |

### Controlled live sign-in boundary

Follow [BATCH_C_SIGNUP.md](BATCH_C_SIGNUP.md) and the C rollout controls before
using a real account. The retained APK may contact the existing live backend;
an automatic Passport/Egg flow must not be triggered incidentally by this
checklist. The founder must approve the exact existing-account test, confirm
the applicable sender/registration/eligibility hold and perform consent or
signatures personally. Do not create a live account, re-enroll an eligible user
or mint a collectible merely to complete Android QA. Record the actual result
as live only after it occurs; the mocked handoff above is not live acceptance.

### Stop conditions and rollback

A save mismatch, certificate/version refusal, persistent blank screen, broken
legal move, incorrect account, inaccessible essential control, crash or ANR is
a failed observation to preserve. Record the smallest reproducible sequence
and stop any action that would overwrite the affected save.

Do not uninstall, clear storage, use a forced downgrade or re-sign the APK as an
automatic rollback. Keep the current app and data, and review a data-preserving
recovery or compatible approved artifact first. A lower versionCode may not be
an installable rollback on the existing phone. Backend rollback follows the
[Batch D rollout runbook](BATCH_D_ROLLOUT.md), including inherited A/B/C guards;
it is not authorized by completion of this checklist.

## Acceptance record and continuation

Required owner evidence: actual upgrade and save retention, isolated clean
installation, full bot/local exercise, Android Back/native auth return,
safe-area/TalkBack observations, restart/performance/crash behavior, and an
explicit acceptance or rejection of the signed review's Adventure/All Games
presentation. Until recorded, v5.11.1 remains a signed **review build**.

Continue from this document and [CHECKPOINT.md](CHECKPOINT.md), retaining the
exact approved binary inputs. Do not restart A/B/C audits or substitute a new
frontend build for the physical acceptance candidate.
