# Antarctic Kingdoms v5.10.6 — v5.10.2 screen restoration + Chaturanga layout

**Status:** Original-key signed **review APK** delivered only in owner ChatGPT conversation. PR #98 remains draft. No production update-feed publication, Render changes, mainnet release or Phase 6 restart.

## Accepted visual scope
- Outside Chaturanga's MATCH view, restore exactly the pre-PR96 v5.10.2 `mobile/arctic-play/src/App.jsx` screen composition, including the Games tab, Story Adventure, Home, game setup, tutorials, rooms and result flows. Preserve all existing engine/wallet/proof code; do not revert its backend to v5.10.2.
- `approved-shell.css`, `launch.css`, `v5102-ux.css` and `browser-preview.css` are unchanged from source commit `782891d1e01c14aaa3e92f1af9d3a7222b772fdf`. Remove former v5.9.14-only lobby CSS overrides from `chaturanga-match-v2.css`.
- Only `data-game=dominion`, `data-screen=match` has the `ch-v2` art presentation. BoardGeometry for every game and every other Chaturanga context is back to the original source.

## Measured artwork alignment
The user-approved **865×1536** background is the single decorative image. Header has 248 native pixels; king-player strip 96; board surround region 892; two-dice stage 300. The live 64-cell SVG renders **without a duplicate SVG board image** and is overlaid at native x=73, y=428, width=718. Both dice and the central turn button use percentages in their dedicated 300px illustration region. Player labels are live, short YOU/BOT/HUM text with descriptive accessible labels. Pass/move guide/updates and command controls are in a real scrollable section **below y=1536**, not painted over the artwork. Header updates control moved below board, retaining its click action. On short phones scroll rather than compress the board.

## Build, signing, evidence
- Source review branch `codex/v5106-v5102-screens-fixed-chaturanga` commit **`fee8381c1ad2121b70801a8f5dd0beba104b1c28`**, source PR [#98](https://github.com/defiventurers/articweb3/pull/98). PR #97 is an earlier overlapping UI-only review; **do not merge both**.
- Original signing keystore was recovered from the owner's private Library backup and accessed locally only. The original `arctic-play` certificate matches SHA-256 **`20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`**. Signing credentials never entered repository or workflow. Temporary extracted credentials were deleted.
- Signed `AntarcticKingdoms-v5.10.6.apk`: **58,926,139 bytes**, SHA-256 **`b1bcd1e76a0d807dedaed9abbddbf289ec81e8d82932e0b94ebeafb1b821fed9`**, package `xyz.arcticdominion.play`, version **5.10.6/code110**; APK Signature Schemes **v2/v3 pass** Android SDK36 `apksigner`; ZIP CRC pass, `resources.arsc` stored/uncompressed, all **426 stored entries aligned** according to actual ZIP local headers. Higher code than signed v5.10.5/code109.
- Relative to signed v5.10.5, **441/441 common artwork files identical**; launcher icon, compiled fair-worker and verifier bytes identical; source JS/CSS intentionally changed. This does not prove parity with older v5.10.4 proof-worker.
- [Unsigned Android build run 43400781509](https://github.com/defiventurers/articweb3/actions/runs/43400781509) passed source build and all **79/79** current mobile tests. [Launch/source/proof](https://github.com/defiventurers/articweb3/actions/runs/43400789383) passed, [Shanshui Xiangqi](https://github.com/defiventurers/articweb3/actions/runs/43400789518) passed, [Chaturanga viewport screenshot/geometry](https://github.com/defiventurers/articweb3/actions/runs/43400789377) passed at **320×640, 360×800, 393×852, 430×932, 768×1024**. Capture renders actual compiled React match DOM; initial interactive roll modal was removed **only in the screenshot fixture** to inspect underlying artwork and controls.

## Remaining issues and release gate
- **No physical Android install-over-existing-data, notch/inset or back-button acceptance**; test on spare phone first and do not uninstall current version.
- **No new live Para wallet/passport or multiplayer/reconnect acceptance** on this binary.
- Independent fair-worker/verifier artifacts are byte-identical to v5.10.5, but full original v5.10.4 verification parity was never accepted and remains unresolved.
- Screenshot geometry tests are Chromium-based rather than a real Android WebView; four seated camera orientations are handled by existing rules/board geometry checks but require touch acceptance on a device.
- Public update feed was **not** changed. Do not claim Google Play release approval, production rollout or Phase 6 readiness from this artifact.

**Accepted decision:** Restore all UI screens to the v5.10.2 source composition except the approved new Chaturanga battle. No other visual refactor or game-rule change is authorized.
