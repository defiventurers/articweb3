# Antarctic Kingdoms — companion director update 2.8.0 / 14

The mascot now responds to actions on the board. The learning screen presents
one clear cue, the board and its next action, with secondary tools in Help and
Options. The update covers all seven existing games.

## Delivered behavior

- A short first-game route takes four steps for most games, five for Yan Yi and
  three for Dominion (four accepted moves because both dice are required).
  Practice follows immediately. Every step requires an actual manual action.
- The complete guide retains every sentence of all 68 rule paragraphs in 168
  interactive cards, including all 52 starting piece types. Movement rules use
  actual canonical moves or the single-piece explorer. Other facts use a relevant
  board or royal inspection. Full paragraphs are available in Rule help.
- The one-piece explorer has exactly one physical piece, legal destinations
  recalculated after each move, persistent paths, promotions, undo and reset.
  It has no turn limit. The neutral Han Emperor remains immobile. Full-game
  captures, checks, alliances and other pieces are demonstrated in separate
  rule scenes; no invisible blocking pieces are placed in the free explorer.
- Red is at the bottom of each teaching board; Yan Yi teaches Shu/Red by default.
  Actual opening turns are retained. The original 28 discoveries, all setup
  comparisons, 21 warm-ups, 52 examples, searchable rules and seven arrangement
  boards are reachable through Options. Arrangement boards explicitly say that
  move rules are off; the main free explorer enforces piece movement.
- All four supplied characters have six transparent expressions: listening,
  waving, curious, thinking, pleased and celebrating. Polly welcomes, Pengu
  clarifies rules, Retsba encourages focused play, and Abster explores patterns.
  The new mascot art contains no dice. Actual Dominion dice rules are retained.
- Selection, mistakes, hints and accepted moves select the mascot's expression.
  Two missed taps reveal a hint cue. The portrait selects the focus piece; drops
  and Illuminate instead keep their clear action control. Quiet, Off, reduced
  motion and background pauses are respected. Mascots never replace game pieces.
- Shared memories preserve first completion timestamps. Reading, watching and
  inspection do not invent move memories. Milestones build friendship and unlock
  free scarf, beanie and medal outfits. Camp keepsakes open earned postcards.
  Time away does not remove these rewards. Completed losses and games ending
  while the learning screen is open count as memories, with deduplicated results.
- Abster rotates through 40 verified one-move daily puzzles. Merely opening or
  replaying today's puzzle does not add another daily completion. A weekly goal
  asks for three discoveries at the player's pace, with no streak punishment.
- A collapsed reaction tray sends an authored penguin reaction only after a tap,
  using the existing authenticated private-room chat. Postcards render locally
  and preview the exact image. An invitation can be explicitly added or removed;
  an existing active table is reused. Android's chooser opens after Share.
  The private PNG provider grants temporary read-only access and adds no new
  permission. During testing, no invitation or reaction was sent to a real person.
- Local counters help later product analysis. `postcard_shared` measures a share
  handoff rather than confirmed recipient delivery. There is no new telemetry
  service, model call, purchase, paid outfit, energy limit or wallet flow.

## Continuity and verification

The resumed workspace contained the v2.5 source, so the complete-rule and
single-piece work was restored from the accepted behavior before this update.
Durable source checkpoints and the signed APK were saved during restoration.

The package is `xyz.arcticdominion.play`. VersionCode is 14. The original signer
SHA-256 is `20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37`.
The 221 reused artwork files remain byte-identical, and the seven canonical
engine implementations are unchanged. The generated server bundle differs only
in explanatory rule text. Saved profiles, favorites, room credentials, practice
positions and previous lesson progress retain their existing storage keys.

Verification is recorded in the recovery package's JSON reports. It includes
57 mobile tests and 15 server tests, first-game routes, every full-guide card,
every explorer choice, daily puzzles, outfits, Off, persistence, private sharing,
native compilation, APK signature/alignment and a byte comparison between the
packaged assets and the tested release. Legacy learning checks cover nested
focus, keyboard/Android Back, comparisons, watching versus earning, rule search,
light mode and preserving an active practice position.

The recovery archive was also extracted into a separate clean project folder.
Rebuilding from its included source and artwork reproduced all 251 release
asset files byte for byte, using the already installed frontend dependencies.

Physical Android installation, soft keyboard behavior and a receiving app's
handling of the PNG share grant still require a phone check. Automated native
compilation and browser testing do not substitute for that check.

## Rebuild from the source recovery archive

The archive contains the mobile project, original artwork, bundled web assets,
canonical rule dependencies, dependency manifests and validation records.
It excludes private signing material, installed dependencies, SDK/JDK tools,
browser screenshots and unrelated website files.

After extracting at a project root:

```
python3 mobile/arctic-play/scripts/prepare-recovery-artwork.py
npm ci --prefix frontend --ignore-scripts
npm run build --prefix mobile/arctic-play -- --reuse-artwork recovery/artwork
npm test --prefix mobile/arctic-play
```

Then use `mobile/arctic-play/scripts/build-apk.py` with the Android 35 platform,
build tools 35.0.0, a JDK and the original private signing files. Do not generate
a replacement signing key. The official build-tools archive SHA-1 used here is
`2cfaa0bbb2336e9ec18ed3ecea84fa2e2af607bc`.

The website and public update feed were not deployed by this update. The APK
continues to use the existing private-room service and unchanged wire protocol.
