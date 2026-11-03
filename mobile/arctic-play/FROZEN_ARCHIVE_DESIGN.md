# Antarctic Kingdoms 3.5.0 — The Frozen Archive

The design now ties Antarctica, the four familiar companions and the actual
heritage-game collection together. The existing glacier and night-ice world
remains the foundation; a restrained champagne inlay and heritage headings
provide a shared identity. Reading surfaces are calmer than the scenery.

## Implemented changes

- **Launcher:** a compact four-mascot kingdom crest with distinct expressions,
  an ice crown and a small ivory game-tile/book base. Legacy, adaptive and
  in-app icon resources are rebuilt from the new transparent foreground. A separate
  code-native monochrome crest keeps four clear face interiors when tinted.
- **Home:** a transparent carved-ice Archive stage with the four guides. The
  displayed Shogi King, Han Emperor and War Mammoth are the unchanged actual
  game assets, overlaid in code on three plinths. The artwork does not invent
  playable board geometry. The motto is unchanged; **Find a game** and
  **Join friends** retain their routes.
- **Catalogue:** all seven games use compact equal cards, with two columns on
  phones and three on larger layouts. Artwork fades into theme-aware reading
  surfaces. The repeated Join row is removed; joining remains in the header,
  Home and Profile. The beginner learning entry stays prominent; returning
  players see their extra puzzle after the games. Games has a clear page title.
- **Friends/Chats:** small, transparent mascot welcomes replace generic empty
  illustrations. The local friends list remains explicitly a name list.
  Empty Chats now offers **Find a game**. Off hides the new mascot welcomes.
- **Profile:** a smaller explorer card and more compact option rows reduce the
  space before useful settings. The companion dock is shorter, keeps two lines
  of its current cue and retains its tap/dismiss/settings controls.
- **Camp:** the free classic room uses the same ice world and a restrained ice
  pedestal. Purchased and preview scenery retains its own artwork and existing
  entitlement checks. The preview cannot be saved as an unowned item.
- **Shared surfaces:** headers, dialogs, input fields, learning panels and
  match controls share the Archive inlay and reading palette. Blue selection,
  seat colours, legal markers and board geometry keep their meaning.

No game rule, game edition, captured-piece behaviour, online protocol or
progress schema was changed. The Yan Yi board, boundary dots and non-overlapping
piece spacing, and the Xiangqi transparency fix remain intact. No website
deployment or public update-feed change was made.

## Source artwork and prompts

Both new masters were created with the built-in Image Generation tool. They
have real alpha and are preserved under `art/brand/archive-v1/`:

- `masters/icon-foreground.png`: 1254 × 1254 pixels.
- `masters/home-archive.png`: 1774 × 887 pixels.
- `home-archive.webp`: 1200 × 600 runtime illustration.
- `generation.json`: exact prompts, generation method and reference locations.
- `monochrome.svg`: code-native themed-icon crest with four open face interiors.

The four supplied reference images remain in
`art/brand/frostbound-v1/references/`. Earlier branding masters are retained.
The Home relics are `art/shogi/red-king.webp`,
`art/yanyi/pieces/han-emperor.webp` and
`art/dominion/blue-war-mammoth.webp` in the bundled assets; their bytes are
unchanged. `HomeLanding.jsx` places them over the generated ledge. The fictional
Archive is a brand setting; the game-specific origin and edition descriptions
remain the authority for historical claims.

`src/archive-world.css` is the final shared layer. `scripts/build-brand.mjs`
packages the new crest and stage after artwork reuse; `build-web.mjs` installs
the shared styling after the previous theme layers. Runtime backgrounds and
the new illustration are bundled for offline use. No particles, audio or
additional navigation are introduced.

## Build and verification

Use the dependency-lock, artwork-reuse and signing instructions in
`ICE_THEME.md`. The same build commands install the new artwork and styling.
Release 3.5.0/code 25 uses the original package `xyz.arcticdominion.play` and
release certificate, minimum API 24 and target API 35. Signing material stays
outside the source archive.

The mobile suite passes all **72 tests**, covering rules, saved state, all
interactive lessons, transparency, Yan Yi spacing and native icon crop safety.
The added art tests verify transparent surroundings, the open Archive arch and
readable face interiors/crop safety for the monochrome launcher.
The earlier rebrand test now checks the brand on Home and the clear Games title.

**35 browser check groups** pass:

- 16 shared-theme groups cover startup appearance, main tabs, Camp, dialogs,
  interactive learning/options, Xiangqi/rules, offline assets and persisted theme.
- Nine control/Home groups cover the main action above navigation at
  320/375/430/834px, keyboard discovery, control states and learning menus.
- Ten Archive groups cover decoded genuine Home pieces, all seven decoded
  game covers, card-text contrast, local friends, the empty Chats route,
  classic Camp styling, paid-preview gates, mascot Off and runtime errors.

The browser checks reported no runtime errors. Internal screenshots of Home,
Games, Friends, Profile, Camp, learning and match controls were inspected in
both appearances. Native resource pixels, APK alignment and the original
signing certificate are verified separately in `verification-3.5.0.json`.
Physical-device installation was not available for testing; UI checks use
headless Chromium and local bundled assets.

To repeat the checks, build the web assets, run
`node --test mobile/arctic-play/tests/*.test.mjs`, then run
`ice-theme-browser.mjs`, `frostbound-browser.mjs` and `archive-browser.mjs` under
`mobile/arctic-play/tests/` from the project root. Browser checks require
Playwright and `AK_CHROME` pointing to an installed Chromium executable.
`AK_QA_DIR` and `AK_RESULTS` optionally write local inspection files.
