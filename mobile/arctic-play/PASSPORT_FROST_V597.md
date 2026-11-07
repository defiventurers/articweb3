# Compact Frost Passport — v5.9.7

The v5.9.6 cover inherited the height of a dense four-stamp spread and stretched its illustration to half that width. This produced a tall journal. The new stage sizes from width at a fixed **176:125 spread ratio**, giving each leaf and closed cover an **88:125 ratio**. The cover image uses `object-fit: contain`; its material and logo are never stretched.

## Accepted correction

- New sapphire frost cover: crystalline cyan edges, icy spine, unchanged gold company emblem/lettering, no lantern. Its single border replaces the previous doubled frame.
- Ice-blue paper, cool ink and pale page edges replace cream paper and warm leather surfaces. Printed page imprints use the same paper treatment during the turn.
- Six compact spreads: Arrival; four lantern spreads with one game per leaf; Crown. The final lantern shares its spread with the Crown shortcut. One stamp per leaf preserves readable names and original earned date/time.
- Name/avatar editing stays in Settings. The keepsake stays in Passport extras; the Crown retains its Gathering Table link. The historical badge explanation moves to About your stamps in extras.
- The hinge, reversible opening, drag tracking, two-sided printed leaves, keyboard/swipe/native Back and reduced-motion paths remain intact.
- A versioned reading-position key migrates old spreads `[0,1,2,3]` to `[0,1,3,5]`. Milestones, Crown eligibility and earned timestamps are unchanged.

## Source and build

Reviewed and based on main `797df870bdca917c3d7f96980dd482b113b03f50`, the merge of PR #69. Baseline APK: v5.9.6, SHA-256 `c7e2ae75aa126c48e1228aae42d3c35f0d4e8c402158274264b988e7b94a1c03`. The guarded builder replaces only the Passport module, appends the Frost stylesheet, bundles one new image and increments metadata to 5.9.7/code 95.

All 398 prior art files, eight other JS/workers and native DEX remain byte-identical; account authority, game IDs/rules, saved boards and room handlers are retained. Original signing certificate, v2/v3 signatures, alignment, resource storage, ZIP and preload sizes are checked. The full source builder also copies/preloads both the prior named-stamp assets and new frost art, and includes the Frost CSS. The older whole-App discovery/Shop source discrepancy documented in v5.9.6 remains separate; this release uses the shipped APK as its guarded presentation baseline.

## Art

`frontend/public/assets/passport-frost-v1/company-passport-frost.webp` is an optimized derivative of the included generated PNG master. It is DRAFT artwork implementing the user's requested frost material. Built-in image generation edited the existing cover: preserve the exact gold mountain/star mark, words and gold border; add crystalline edge frost and a sapphire center; compact 88:125 rectangle; no lantern, crown, characters or external perspective. No character or stamp artwork was redrawn.

## Verification and limits

64 focused Node checks and five APK-layout checks pass. Chromium uses the packaged APK assets, real game workers, local account API fixtures and a simulated native bridge. It checks 72 Passport layouts (six spreads, six sizes, both themes), verifies the actual aspect ratios and unclipped leaf contents, exercises cover/leaf motion and migrated reading position, and completes a real qualifying Xiangqi lesson. Home regression adds 12 layout cases and verifies the existing catalogue, saved board, routes and settings. No page errors.

Physical Android installation/WebView, TalkBack, live sign-in and live multiplayer are unverified. No main merge, public update-feed promotion or production deployment is performed by this task.
