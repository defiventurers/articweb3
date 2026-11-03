# Antarctic Kingdoms 3.4.0 — One frozen world

## Design

Home no longer presents its characters as a rectangular picture above a separate
opaque text card. A transparent five-character illustration puts Polly, Pengu,
Retsba and Abster around a translucent ice game table. The existing Frost King
royal piece is the fifth character, not an additional guide. The glacier and
night-ice environments show around the cast and through its fading reflection.

“Timeless games. New adventures.” leads into the unchanged motto: “Ancient lost
wisdom, found and revived in Antarctica.” A prominent **Find a game** action
opens the seven-game collection; **Join friends** remains secondary. Camp and
discoveries retain their existing routes. The redundant header statue is
replaced by a small ice glint. No new navigation buttons were added.

The touch-control system uses the same ice texture as the background, translucent
reading faces, thin crystal rims, restrained inset highlights and soft corners.
Primary actions have stronger sapphire colour; secondary actions and menu rows
use quieter glass. Background textures align with the viewport instead of
creating a separate miniature landscape inside each button. Familiar icons,
live text, selection states, disabled states, keyboard focus, reduced motion
and system high-contrast preferences remain supported. Image-only interactions
such as mascot high-fives remain transparent within their scenes.

The launcher foreground combines all four mascots in a compact, excited huddle
around an ice board. Five legacy Android sizes, adaptive foreground/background
and the in-app brand mark are rebuilt from that generated master. Substantial
foreground pixels fit within the circular adaptive safe region, keeping the
cast visible through common launcher masks.

## Assets and implementation

Generated with the built-in Image Generation tool:

- `art/brand/frostbound-v1/masters/icon-foreground.png` — 1254 × 1254, true alpha.
- `art/brand/frostbound-v1/masters/home-party.png` — 1774 × 887, true alpha.
- `art/brand/frostbound-v1/home-party.webp` — 1200 × 600 runtime Home illustration.
- `art/brand/frostbound-v1/icon-foreground.webp` — reusable 768px foreground.
- `art/brand/frostbound-v1/generation.json` — both exact prompts and generation provenance.
- `art/brand/frostbound-v1/references/` — the four supplied identity references.

`scripts/build-brand.mjs` builds launcher resources and copies the new Home art
into `art/brand/frostbound-v1` in the packaged web assets. It retains the earlier
single Frost King artwork as source/reference. `src/HomeLanding.jsx` supplies
the borderless Home composition and live copy; `src/frostbound.css` is the final
shared control layer, appended after the existing theme styles by `build-web.mjs`.

The original glacier/night-ice backgrounds, all seven canonical rule engines,
game boards, game covers, piece sprites, Xiangqi cutouts and Yan Yi geometry are
preserved. Existing progress, preferences and online protocol keep their IDs.
Website source is unchanged; no website deployment or public feed change was made.

## Build and validation

Use the dependency-lock, artwork-reuse and signing instructions in `ICE_THEME.md`;
the new files are installed automatically by the same web/native build scripts.
Release configuration is 3.4.0 / code 24, package `xyz.arcticdominion.play`,
minimum API 24 and target API 35. Keep the existing release keystore outside
the source tree and supply both signing flags when building an update.

Validation for this release:

- 70 mobile tests pass, including all game rules/learning regressions, prior
  Yan Yi spacing/dot checks and Xiangqi transparency checks.
- Two of those tests check true-alpha Home surroundings, adaptive-icon crop
  safety and preservation of all four mascot colours at the smallest launcher size.
- 16 shared-theme browser groups cover both appearances, startup preference,
  all five tabs, Camp, dialogs, interactive learning/options, Xiangqi/rules,
  offline images, saved appearance and phone/tablet overflow.
- Nine additional browser groups cover the borderless Home, a main action
  above navigation at 320/375/430/834px widths, keyboard discovery, dialog
  enabled/disabled states and shared materials in Camp, game entry and learning.
- The browser audit sampled 238 visible button instances across the two themes.
  Image-only mascot/cover interactions deliberately remain transparent.
- Internal screenshots were inspected for Home, Camp, learning and game controls
  in both appearances. No browser runtime errors were reported.

Run `node --test mobile/arctic-play/tests/*.test.mjs` after building the web
assets. For browser checks, install Playwright and set `AK_CHROME` to an installed
Chromium executable, then run `tests/ice-theme-browser.mjs` and
`tests/frostbound-browser.mjs` from the project root using Node. Optional
`AK_QA_DIR` and `AK_RESULTS` keep local inspection images and JSON results.

The final APK is aligned and verified with the original signing certificate.
Physical-device installation was not available in this environment; browser
checks use headless Chromium. Install over the previous app to retain data.
