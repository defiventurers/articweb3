# Curated little adventures · Android 2.4.0

User direction, 17 October 2026: make the rules and How to Play cuter, more
interactive and accessible to a complete beginner; curate each game specially.
Implement and build the update. All four existing cute mascot variants are
retained, with a different guide for each discovery.

## The experience

**My adventure** is the new default How to Play section. Each game has a named
four-stop trail, a visible game objective, an optional first-turn explanation,
short mascot cues, manual hints, real board moves, a watch-then-try mode and a
separate keepsake. Every stop is available immediately. The app resumes at the
first untried discovery; replay remains available after all four are tried.

| Game | Four curated discoveries |
| --- | --- |
| Shogi | Pawn capture into hand; drop a captured helper; promote a Pawn to Tokin; answer check with a safe King move |
| Sannin Shogi | Rotate Pawn forward paths through all three homes; try its non-jumping Knight; drop onto a hex; win by reaching the safe, unallied Pleasure Garden |
| Sanguo Qi | Move a Soldier sideways beyond its home river; compare 0/1/2 Cannon screens; clear a Horse leg; move a genuinely appropriated piece using the owner ring |
| San You Qi | Fire's forward diagonal; blocked/clear two-step Flag path; Chariot-like Flag in enemy territory; compare Cannon and Chariot on the specific C3–C17 Sea edge |
| Sanguo Yan Yi Qi | A sideways Soldier at home; a Horse whose occupied leg does not block it; activate Han with Wu's Horse; distinguish a Red ally from a Green rival while playing Blue |
| Xiangqi | Soldier before/after the river; 0/1/2 Cannon screens; blocked/clear Horse leg; General palace safety and the open-file facing attack |
| Arctic Dominion | Spend fixed dice 1 and 3 across a whole two-move Green turn; diagonal Guard capture; Icebreaker two-square jump over an occupied middle; capture an original royal King and remove its kingdom |

**Rules → Try a rule** uses the same scene component and canonical worker.
The Quick guide contains four game-specific entry cards. Players can change a
setup, ask the current guide for a relevant tip, watch an example and make the
move inside the rule sheet. Opening the full adventure follows the currently
selected scene. Every original full-rule chapter and paragraph remains present.

Existing content remains under **Warm-up**, **Pieces** and **Free board**:
21 warm-ups, 52 piece examples, seven arbitrary-arrangement boards, their saved
progress, normal practice matches and private rooms. The four new adventures'
mascot sequences each use Polly, Pengu, Retsba and Abster. Off removes their
portraits and reactions while preserving every lesson. Motion controls and
reduced motion continue through the shared portrait component.

## Correctness and progress

- `src/adventures.js` owns authored snapshots and filters only canonical
  `actions`. No demonstration rewrites a move engine. Sanguo inheritance uses
  its canonical appropriation helper. The terrain example is one named edge,
  not a general permission to cross every terrain connection.
- `adventurePosition` reconstructs a scene from known game, mission and setup
  identifiers, then replays only offered canonical actions. Worker requests
  cannot inject an arbitrary state. A two-dice discovery finishes after two
  accepted moves, not after its first die.
- Watches explicitly say **Example only · no stamp earned**. The learner
  resets with **Now my turn**. Portrait taps, hints, setup comparisons, skipped
  scenes and free boards never write adventure completion.
- New completion timestamps use `little-adventures.v1` under the existing
  storage prefix. Known game/mission identifiers and positive finite timestamps
  are validated; first completion is retained. Earlier learning and practice
  keys are untouched. The keepsake describes patterns explored, not mastery of
  every rule. Game-specific reminders and complete rules remain nearby.
- Every scene is labelled as a separate, arranged teaching position. Gold rings
  identify the helper; blue destinations and orange capture rings still mean
  engine-accepted actions. Lavender numbered markers are contextual labels,
  not legal-move indicators. Keyboard activation, touch and board zoom work.
- Each scene/setup change cancels its old worker request. Stale replies cannot
  change another scene or game. There are no automatic demonstrations, audio,
  accounts, network tutor calls or leaderboard rewards.

## Build and validation

Version **2.4.0 / code 10**, package `xyz.arcticdominion.play`, with the existing
signing identity. Base source is the exact tree of
`e0a1dc1e1034858c991962d51b0a4f3dd9cc456e`
(`codex/cute-mascot-school`). The local equivalent base commit is `b5b657c`.
Source is published on `codex/curated-game-adventures`.

Acceptance checks:

1. All 28 discoveries have at least one solvable setup. Every offered action is
   canonical, blocked comparisons offer no invented move, and the unique
   promotion/Garden/Han/inheritance/alliance/royal outcomes actually occur.
2. The two-dice example stays on Green after its first move, consumes the other
   die on the second, and passes the turn only after the second accepted move.
3. Browser checks exercise all 28 discoveries and every comparison, watches,
   partial dice turns, stamps, reload, keyboard moves, rule-sheet entry points,
   full-rule chapter retention, real practice preservation, light mode and Off.
4. Run existing mobile/private-room suites, warm-up/piece/free-board checks,
   pocket-rule checks and companion/phone checks. Verify 320×640, 360×800,
   412×915 and 800×360 layouts and inspect screenshots.
5. Build and verify the signed APK, package/code, certificate continuity and
   unchanged packaged art. Final evidence belongs in
   `CURATED_ADVENTURES_VALIDATION.json`.

Browser and unit results do not establish physical-device installation,
Android soft-keyboard behaviour or native share/install handoff. Those still
need a phone. This update does not deploy the website/backend or publish an
update feed. The user's separate external practice URL remains unspecified;
all built-in free boards work offline.
