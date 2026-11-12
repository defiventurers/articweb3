# v5.9.14 visual restoration + approved Chaturanga v2 — work record

**Status: INCOMPLETE REVIEW PATCH. Not a signed APK. No publication, production update-feed change, user-data reset or Phase 6 work.**

## Source provenance
- Baseline: GitHub `main` at `8a3b021d1277aa4ec1e2789daf7283d5d27fe551`, whose Android manifest is still **5.10.2/code 106**.
- Legacy baseline source: `codex/passport-wallet-v5914`. The owner-provided original `AntarcticKingdoms-v5.9.14.apk` was recovered from their private Library and its compiled JS/CSS inspected.
- Current installed candidate: signed `AntarcticKingdoms-v5.10.4.apk` (version code 108), original-signer fingerprint verified in the prior task. The v5.10.4 unminified source was **not** on GitHub. **Do not merge this patch over v5.10.4 until that source and the v5.10.3 verifier are reconciled.**
- User-provided new image `151578.png`, detected as JPEG at 865×1536. The owner explicitly approved its new header, mascot seals, gold frame, ice board and blank long dice.
- Review branch: `codex/v5914-game-views-chaturanga-v2`.

## Scope implemented at source level
- Reinstates the exact 5.9.14 Games-tab JSX block with Cờ Tư Lệnh, Shanshui and chronological seven-card catalogue, existing HallCards, favorite filtering and original quick-play handlers; avoids the later Story Adventure / All Games / Halls selector on Games.
- Restores a compact Games header without affecting other tab headers.
- Displays `Bot Practice` instead of `Practice with casual bots` in the shared match title area.
- Chaturanga: displays the four live player panels in green, blue, red and pink order to match the user art; does not change underlying seat/game order.
- Presentation-only Chaturanga background override in `boardView.js` uses rectified `grid-v2.webp` with unchanged 64 legal cell IDs, transforms and engine.
- Adds accessible, state-driven dice pip overlays for the existing values 2, 3, 4 and 5. Piece sprites come from the real current-turn army, including King and Pawn together for value 5; used state is visibly dimmed. The actual roll handler, pass controls and move-guide preference are preserved.
- Source build now includes `chaturanga-match-v2.css`, and fails closed if any required pinned artwork is missing or altered.

## IMPORTANT: What is NOT yet complete
- The six WebP files are **not in GitHub**; the owner must upload the provided pack to `frontend/public/assets/launch-v1/chaturanga-match/`. CI source builds will fail deliberately until uploaded.
- Full pixel-for-pixel 5.9.14 restoration of **every setup, How-to-Play, room and match screen across all nine games** is still unverified/incomplete. Avoid claiming that the initial Games-tab reversion accomplishes the whole requirement.
- No original v5.10.4 source snapshot/commit; current main is older. Do not downgrade verified proof, assets, passport, launch service or wallet by rebasing blindly.
- 320/360/393/430/tablet visual testing, piece-center taps under rotations, companion panel text fit, King/Pawn dice art and independent multiplayer testing must be performed with actual running app.
- No new signed APK, GitHub Actions release run or physical-device installation. The review code is not distributed, and source version is intentionally not bumped from 5.10.2.
- Actual key contents and repository Actions secret presence were not inspected. Original-key signing must remain in the secure workflow on a reviewed main commit only.

## Next gates
1. Owner uploads exactly six prepared image files to the indicated review-branch directory.
2. Recover the v5.10.4 original source, carry forward v5.10.3 independent verifier, and compare all nine 5.9.14 UI flows against the recovered APK; port additional screen-specific appearance without replacing newer engines.
3. Run clean source build, `npm run test:current` and all applicable UI/room/server regressions; device/browser viewport acceptance.
4. Release as a new higher versionCode **at least 109** (proposed 5.10.5 only after code verification); use the original signing identity in a trusted workflow. Check apksigner, zipalign, uncompressed `resources.arsc`, app ID, artwork hashes, and install-over-data continuity before offering the user an updated APK.
