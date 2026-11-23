# Games storybook review — retained v5.10.2

Base main reviewed: `8324ff30f355f0e2b7b08d1d776b502ea8e822b2`.
Feature branch: `codex/games-storybook-v5102`; PR #118. No merge or production deployment.

## Runtime and preservation

The approved APK SHA-256 is `275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd`. Its native shell loads assets/index.html, startup.js and app.js. The bundled BC adapter renders AKAdventureUI.GamesAdventure with the actual PC catalogue and original callbacks. GamesViews.jsx, LaunchExperience.jsx and the later tracked App.jsx are not this APK's active render authority. Rebuilding them would replace the preferred UI. The retained Home is window.AKChaturangaRelease.HomeLanding.

The hash-guarded patch replaces only the GamesAdventure declaration and injects its presentation factory within the same closure. Original catalogue, query/filter/favorite state, access predicate, expedition order, authenticated play and learning callbacks, three-screen story component, conquest cleanup and crown predicate are retained. The final game ID is **shanshui**, not the later source's shanshui-xiangqi. Play Now and Game Setup both open the real existing chooser, including its available team, seat, local/bot/online/resume controls; no duplicate setup state is created. Standalone Commander and Shanshui retain their native entry paths.

The Games header changes use CSS scoped to .app[data-tab=games]. There is no original Home, engine, board, bot, worker, auth, wallet, backend or contract edit. The APK has 438 byte-identical original payload entries. Only app.js, appended app.css and four version/cache metadata entries change. Original certificate, package, v2/v3 signing, CRC, alignment and uncompressed resources verify. Physical Android installation and retained-device data are not claimed.

## Implementation files

- src/storybookGames.js: responsive Adventure and four-card catalogue, existing stories/callbacks, global search and access/player/favorite filters, chapter/page navigation, keyboard/swipe isolation and saved page.
- src/storybook-games.css: scoped navy/gold styling, responsive hero/actions/crown, two-column cards and contained large-text/short-height fallback.
- scripts/patch-storybook-v5102.mjs: SHA-pinned, parsed, presentation-only runtime splice.
- scripts/prepare-storybook-review.py: reconstruct/verify the existing committed APK chunks and extract genuine before/after assets for Chromium.
- scripts/build-storybook-apk.py: original-key-only v5.11.1/code111 review packaging, preserving native identity and protected payloads.
- tests/storybook-runtime.mjs and tests/storybook-browser.mjs: full-app DOM regression and real Chromium viewport evidence.
- .github/workflows/storybook-review.yml: isolated PR evidence job; no deployment step.

## Artwork and references

Reference A/B govern layout, framing, density and responsive interactions. Existing approved v5.10.2 artwork is reused without screenshots, flattened UI, redraws, recoloring, substitutions or new claims of commercial permission. Each game retains its own illustration. The four original colored characters remain in the Chaturanga cover; the crown uses the original runtime SVG and harbor artwork. All buttons, text, filters and progression controls are real UI.

The exact concept image's towering South Indian gopuram and staircase composition are not present in the retained artwork. This review preserves the approved scene instead of inventing an approval for replacement character art. Literal scene matching remains an art-direction follow-up; the screenshots show the implemented fidelity honestly. A separate Home reference C was not attached in this turn, so the verified APK Home itself is the preservation reference.

## Validation and limits

Local full-retained-app regression: 9 groups pass: Home entry, all nine three-part stories and return, Home art retained, invalid versus recorded crown fixtures, original Chaturanga team/setup chooser, locked Sanguo unlock action, catalogue reachability, filter versus page swipe isolation, and keyboard chapter navigation. Existing heritage-intro suite: 1 pass, 1 optional supplied-runtime case skipped. No real wins, unlocks, purchases, provider logins or player activity are fabricated in the product. Fixtures are isolated test data only.

Rendered evidence is collected from Chromium at 360×800, 393×852 and 393×960 in both themes. The job checks action bounds, viewport overflow, nine stories, nine-card paging, search, empty recovery, player filters, favorite persistence, Home pixel comparison after deferred artwork settles, and 24px root-text action reachability. Consult the attached results.json for the final outcome, not earlier interrupted runs.

The broad existing launch workflow rebuilds the later source and has two pre-existing failures: the Chaturanga grid-v2.webp assertion disagrees with existing approved-151658.jpg; the later dominion story lacks the historicalNote expected by a legacy test. These are unchanged by this presentation patch. The review does not claim broad launch readiness.

Real Android safe-area/gesture behavior, TalkBack, live Para callback, physical install-over and resuming a real saved device game remain owner acceptance. Native code and save formats are byte-identical, but that is not a device resume test.

## Reproduce and owner test

Run `python3 mobile/arctic-play/scripts/prepare-storybook-review.py` after installing mobile/arctic-play/build-deps. This produces the actual before/after retained-runtime asset trees. Use build-storybook-apk.py with --baseline, --sdk, --output, --keystore and --password-file for the signed review; no key is checked in or included in deliverables.

Install the signed v5.11.1 review over v5.11.0/v5.10.2, without uninstalling. Use an existing registered account. Inspect both Games views, visit all pages and stories, try a locked game and setup, then resume an existing saved game. Confirm Home matches before upgrading further. Production and its registration hold are unchanged by this task.

## Final rendered result

All 6 viewport/theme cases passed (24 recorded check groups), with zero browser errors, at 360×800, 393×852 and 393×960 in dark and light modes. All Adventure actions stay visible without page scrolling; catalogue action bounds pass on every page. The 24px root-text case retains reachable setup controls in its contained scrolling fallback. All nine stories, catalogue pagination, search/empty recovery, player filters and favorite persistence pass. Home is pixel-identical in five cases; the remaining light 360×800 case differs in 22 color channels by at most 1/255. The comparison allows at most 2/255 for border antialiasing. The source and original CSS prefix remain byte-identical.

42 real Chrome PNG captures and results.json are provided in Games-Rendered-Evidence.zip. Evidence workflow: the green Retained APK Games visual review check on PR #118. Artifact ID: 14872869119. No generated mockups are presented as test screenshots.

The separately triggered source rules-and-rooms job fails with `Shanshui server engine is stale. Run npm run build:shanshui-engine.` Engine/source files are untouched and no game-engine regeneration was performed. This remains a repository-wide blocker outside this presentation review, alongside the later-source launch assertions described above.
