# Antarctic Kingdoms — v5.9.14 Games restoration and approved Chaturanga v2

**Release status: REVIEW ONLY. Not an APK upgrade. Phase 6 paused; no production publication, install, Render reset, update-feed, or user-data mutation.**

## Source and release provenance

- Current review branch: `codex/v5914-game-views-chaturanga-v2`; draft PR #95. Started from `main` `8a3b021d1277aa4ec1e2789daf7283d5d27fe551`; subsequently merged current `main` at `782891d1e01c14aaa3e92f1af9d3a7222b772fdf` into the review branch to preserve the independently merged v5.10.4 signing/recovery documentation.
- Exact v5.9.14 visual reference: the recovered owner Library APK `AntarcticKingdoms-v5.9.14.apk`, plus the prior source branch `codex/passport-wallet-v5914`.
- Latest previously **signed** candidate: v5.10.4, Android code 108. Its original approved signing certificate was cryptographically confirmed in the earlier task. It does **not** include the changes in this PR and is **not** presented as the requested update.
- Current GitHub mobile source manifest on main is still v5.10.2/code 106; the original **unminified v5.10.4 Chaturanga release source** has not been found on any remote review branch. Do not replace or reconstruct signed v5.10.4 assets by directly editing compiled/minified APK code.
- The new user-supplied artwork is `151578.png`, actually JPEG-encoded 865×1536. Derivative WebP artwork was prepared without changing its visual identity.

## Implementation delivered in this branch

1. Restores the v5.9.14 Games-tab JSX: Cờ Tư Lệnh and Shanshui entries, seven chronological HallCard entries, favourites, original hall and How-to-Play actions, and quick bot-play. The Games header now uses the earlier avatar-left, centered Games title and header controls; the newer Home and Passport headers are kept.
2. Moves later Story Adventure / All Games / cultural Halls galleries behind **Home → The story of Lantern Harbor → Story Adventure**, so original v5.9.14 Games layout is not crowded and later nine sourced introductions remain accessible.
3. Uses `Bot Practice` instead of `Practice with casual bots` on the shared match title.
4. Integrates the user-approved full Chaturanga frame as a non-interactive plate with live board and text layered above it; four player panels match the artwork's green/blue/red/pink order and use compact **YOU / BOT / HUM** text based on actual seat ownership. Does not change canonical seat order or engine state. No highlighted player rectangle; current-turn information remains accessible.
5. Keeps the central Chaturanga mode capsule concise (`2v2` or `Four-way`) with a descriptive accessible label. Places the source-native current-turn piece sprites on the two decorated dice faces and renders actual die results **2/3/4/5 as pips**; RNG, two-dice roll, pass actions and optional move guide are unchanged.
6. Uses `grid-v2.webp` inside the original board renderer without altering 64 square cell IDs, taps, piece ownership or rotations. Board wrapper derives from the supplied image's grid bounds. The 44px header hit targets are preserved over the baked-in icons.
7. The Android/browser build pipeline includes scoped `chaturanga-match-v2.css` and checksum-pins all six artwork files, failing closed if they are missing or changed.
8. Carries forward the manual-only, main-branch-only signing review workflow (no automatic publication), with a minimum new versionCode **109** to avoid accidental downgrades.

## Artwork upload verified

Six files were uploaded by the owner into `frontend/public/assets/launch-v1/chaturanga-match/` on the review branch:
`approved-v2.webp`, `header-v2.webp`, `players-v2.webp`, `board-surround-v2.webp`, `grid-v2.webp`, `dice-panel-v2.webp`.

The checksum-pinned GitHub Actions source build accepted the upload and reported **443 artwork files** with v5.10.2 source. No more image upload is required.

## CI evidence (review source only)

- The launch/source/proof workflow **passed at `1d8da45495f944a3cf5adde34c20dfc45224ef17`**; see https://github.com/defiventurers/articweb3/actions/runs/43316124324 . This includes the restored Games catalogue, nine introduction access tests, existing six non-dice interactive engine flows, original legal move checks, and new board geometry tests.
- Shanshui independent GitHub check passed on that same source revision: https://github.com/defiventurers/articweb3/actions/runs/43316124412 .
- A malformed literal `\\n` inside a JS source comment originally caused an `angle is not defined` screen crash. Fixed with an actual newline, then confirmed by the six-engine interface test. The geometry test was corrected for normal floating-point rotation epsilon rather than demanding bit-exact square dimensions.
- Source build is only v5.10.2/code 106 on this branch; this CI pass **is not a signed APK**. Post-check changes to the Games header and signing workflow still require CI against final review head, plus visual acceptance.

## Still blocked / not yet accepted

- **Full pixel-accurate v5.9.14 restoration of every game setup, How-to-Play, room, results and match screen** has not been visually accepted. Existing newer result overlays and some surrounding launch UI remain deliberately unchanged until reviewed; do not claim full parity.
- The uncompiled v5.10.4 source and v5.10.3 verifier must be reconciled with current `main` before creating a new app source release. Avoid overwriting existing wallet, passport, launcher, Fair Play, online rooms, rules or update logic.
- Test actual Android installation and saved-game/passport retention; verify multiplayer reconnection, nine engines, 320/360/393/430 and tablet layouts, four Chaturanga rotations, and dice/King-Pawn touch targets. Browser smoke is not device acceptance.
- Original signing credentials were **not accessed**. Secret presence in GitHub Actions could not be inspected with the connected read API. Never create a new keystore for an update.
- Do not dispatch the signing workflow from stale 5.10.2 source. When exact newer source is integrated, prepare version name 5.10.5 (proposed) and code >=109, run the manual original-key action from trusted main, independently verify its artifact and install in place. Only then deliver a new signed APK.

**Accepted decisions:** v5.9.14 Games catalogue/header is the visual baseline, approved Chaturanga v2 image supersedes the previous match artwork, live text only and pip dice (not numeric faces), newer engines/security/modes remain intact, and Phase 6 stays paused.
