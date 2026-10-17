# Cuter companions and pocket rules · Android 2.3.0

The next update, 2.4.0, adds four curated discoveries per game and interactive
rule labs. See [CURATED_ADVENTURES.md](CURATED_ADVENTURES.md).

User direction, 17 October 2026: use cuter versions of all four mascots and make
the rules and How to Play experience sleek, cute and simple. Implement the
changes and produce the APK. This explicitly permits new mascot proportions
and styling for this update; the earlier reference files remain unchanged.

## Implemented experience

- Four matching full-body transparent mascot cutouts, with rounded faces,
  expressive eyes, small flippers and clear silhouettes. Polly stays pink and
  welcoming; Pengu blue and calm; Retsba red, focused and kind with his blue
  beak; Abster green, patient and curious.
- Pengu's pocket guide opens every game’s rules in three views: **Quick guide**,
  **Pieces**, **Full rules**. The quick view explains the goal, three turn steps
  and small glossary terms. Piece cards open the corresponding real movement
  example. Full rules retain every chapter and paragraph and support search,
  empty-result recovery and edition context.
- All five lesson steps fit on a narrow screen. Active challenges use a short
  cue and a compact guide beside the board. Extra explanations and piece notes
  expand on demand. Shogi and Sannin drop lessons offer four nearby legal spots
  so a first lesson does not flood the board with dots; normal game move lists
  and rules are unchanged.
- Tap a teaching portrait for a tiny tip, or a flipper five after a move. Welcome
  and result-side guides offer manual encouragement too. These reactions never
  complete challenges or change a game. All four retain their existing camp
  conversations, preferred-guide choice and game-event reactions. **Learn
  together** in camp opens the school directly.
- The Curious Flipper badge appears only after the three engine-accepted
  challenges for that game. No reading, skipping, portrait tap or sandbox move
  earns it. Existing learning timestamps and free-board setups are retained.
- Quiet stays learner-directed. Off removes teaching portraits and reactions
  while keeping rules and lesson controls. Reduced motion and the saved motion
  switch remain effective. No audio, notification, account or AI service is added.

## Artwork and source

Generated with the built-in Image Generation tool, one identity-reference edit
per mascot. The user requested cuter variants; the outputs are implemented
designs, not a claim of separate visual approval or third-party affiliation.

`art/brand/hosts-cute-v3/` contains the four optimized WebP assets, SHA-256
manifest and exact `prompt-set.json`. The originals remain under
`art/brand/hosts/`. Generated PNG masters remain available as the generated
images; the APK consumes the optimized transparent assets.

The package contains all original game artwork and reference images plus four
new cutouts. The icon, boards, playing pieces, colours and geometry of the seven
games are retained. The native shell and signing identity are retained.

Base source: `codex/mascot-how-to-play`,
`fd7142009b0712ab85cffd224c2e9e9a74abc5fb`.
Current main inspected: `3fa3455be2b38c310b2a85da579248f6c085403f`.
Implementation: `codex/cute-mascot-school`.
Version **2.3.0 / code 9**, package `xyz.arcticdominion.play`.

## Acceptance criteria and evidence

1. Inspect all four generated cutouts for identity, distinct colours, clean alpha,
   complete anatomy, matching style and small-size readability. Packaged bytes
   match the versioned assets; original references remain available.
2. Every game opens all three rule views. Searches return complete matching
   chapters; clearing search restores every canonical chapter. Every piece type
   can open its own learning example. No rules are deleted or rewritten.
3. All five steps fit at 320 px. Manual tips and flipper fives neither complete
   a lesson nor change a saved or live game. The existing 21 exercises, 52 piece
   examples, seven free boards, saved progress and room behaviors still pass.
4. Test dark/light, Quiet/Off and reduced motion. Inspect 320×640, 360×800,
   412×915 and 800×360 screenshots for clipping and horizontal overflow.
5. Run mobile, private-room, learning, companion, phone and pocket-rule checks.
   `scripts/smoke-pocket-rules.mjs` covers all seven rulebooks, full-text search,
   piece-to-lesson links, step visibility, manual mascot reactions, light mode
   and mascot Off across the four sizes.
6. Verify the signed APK, package/code, certificate continuity and unchanged
   original game-art bytes. Record final results in `CUTE_SCHOOL_VALIDATION.json`.

Browser and unit checks do not establish physical-device installation, soft
keyboard, native sharing or installer handoff. Those still need a phone check.
The additional external free-move URL remains unspecified; built-in free boards
work independently. Source publication does not publish a new update feed or
deploy the website/backend.
