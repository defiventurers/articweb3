# Antarctic Kingdoms 4.4.0 — Three guided ways to learn

Every game card now says **Quick play (vs bot)**. **How to play** sits directly beneath the Quick play / Explore hall row, including when stories are off. It opens three large buttons with the existing mascots:

1. **Quick Rules:** the goal, then short guided board actions covering moves, captures and the game's distinctive rules.
2. **Full Rules:** the complete interactive course, with a green completion bar and percentage saved separately for each game.
3. **Learn piece movement:** a visible piece chooser and a mascot who explains the selected piece while its allowed destinations update after each move.

The old Quick start shortcut and section dropdown are removed from the learning navigation. The complete guide retains all 68 original rule paragraphs and all 52 piece types; two additional Chaturanga lessons explain the established optional 2v2 rules. There are 170 complete-guide steps across seven games. Browse rules has a searchable button list, so users can revisit any rule.

Full-rule progress advances after a validated board action or the requested inspection tap. Opening a rule or jumping ahead does not complete it. Existing per-game course progress is retained. A completed step keeps its original completion timestamp when replayed, and the bar reaches 100% only when every current step is complete.

For inspection steps, the mascot prominently says **Tap the King to continue!**, or names the actual General, Frost King or other requested piece. The piece gets a visible TAP marker. **Show me the King** scrolls to the board and does not award completion; the user still taps the marked piece. Rules that identify a board point keep their correct point-specific instruction.

## Build a practice position

The hall's practice board opens empty. Add a piece opens army buttons and a list of the game's actual pieces, with available counts. A new piece may be placed on an empty board point. Placed pieces then use the canonical movement rules, including friendly blockers, captures, palace and terrain restrictions, promotion, and Han activation. An invalid destination leaves the selected piece in place and keeps its legal highlights available. Undo, explicit removal and Clear board support building another example.

This is movement practice without a turn limit. Chaturanga supplies the matching practice die internally; the board states that dice are omitted in practice. Sanguo Yan Yi Qi practice starts after the opening round and labels that phase. Royal safety is checked when the corresponding royal piece is present. Captured pieces are removed, with the established Chaturanga royal elimination behavior retained. Match-only endings, special actions and captured-piece drops are taught in the guided rules; ordinary matches retain their existing rules.

The previous unrestricted board and its saved placements are not loaded into this mode. Each fresh practice-board visit starts empty. Match saves, accounts, mascot settings, themes, rooms and learning progress remain separate.

## Build and release

Version **4.4.0 / code 44**, package `xyz.arcticdominion.play`, signed with the original release identity. Required updates and Night mode continue through the existing controls. The Android APK and browser edition contain matching game files. Candidate release metadata is prepared locally; no remote release or live update-feed publication is performed.

Rebuild from the repository root with the pinned mobile dependencies:

```sh
node mobile/arctic-play/scripts/build-web.mjs --reuse-artwork /absolute/path/to/recovery/baseline-art
npm test --prefix mobile/arctic-play
```

Use `scripts/build-apk.py` with the existing private signing key, following `RELEASE-4.0.0.md`. Signing material is excluded from source deliverables.

## Validation

All **100 automated tests** pass, including movement equivalence with the canonical match rules for every seat, empty placement, invalid moves, blockers, Cannon screens, promotion, Han control and completion accounting. Browser checks cover all three mascot routes and practice boards for all seven games in light/dark phone layouts, full-guide persistence and a real 0-to-100% Shogi walkthrough. Existing card, mandatory-update and multiplayer checks also pass. Reports are in `verification/release-4.4`. Browser checks use desktop Chromium with phone viewports; physical Android and iPhone installation were not tested.
