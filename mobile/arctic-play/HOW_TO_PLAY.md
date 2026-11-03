# Little Flipper School · Android 2.2.0

Accepted direction, 17 October 2026: teach every APK game as simply and warmly
as possible, with Polly, Pengu, Retsba and Abster beside the learner. Include a
space to move board pieces freely. The user mentioned an external free-move
board but has not supplied its URL. No external board URL is assumed.

## Player experience

Open **Games → choose a game → How to play**, or the learning invitation on
Games/Discover. The match menu and existing quick start/rulebook also open it.
Every game has three sections:

- **Little lessons:** a welcome and goal, an accepted first move, a capture,
  a special action, and a warm-up checklist with reminders and bot practice.
- **Meet the pieces:** all 52 starting piece types across the seven games,
  their original art, short movement descriptions, promotion/special notes,
  and repeatable examples with canonical legal highlights. The immobile Han
  Emperor has an explanation instead of invented moves.
- **Free board:** arrange any army on the original board, without turn or
  movement rules. Tap a piece and destination; occupied points swap. Undo,
  reset, removal, piece/destination selectors and the original zoom controls
  support exploration on a phone. An explicit label says normal move rules
  are off. Arrangements are saved separately per game on this device.

All seven games and every lesson remain open. Skipping or reading never
completes a challenge. Only a teaching move accepted by the canonical engine
records its first timestamp. First accepted teaching moves also contribute to
the existing Archive journal. Free-board moves never contribute progress.

| Game | First move | Capture | Special action |
| --- | --- | --- | --- |
| Shogi | Pawn | Pawn captures forward | Captured Pawn drop |
| Sannin Shogi | Pawn on the hex board | Pawn capture | Captured Pawn drop |
| Sanguo Qi | Soldier | Soldier capture | Cannon with one screen |
| San You Qi | Soldier | Soldier capture | Flag's two clear forward steps |
| Sanguo Yan Yi Qi | Wu Soldier | Soldier capture | Horse captures Emperor and activates Han |
| Xiangqi | Soldier | Soldier capture | Cannon with one screen |
| Arctic Dominion | Guard spends die 1 | Diagonal Guard capture | Unicorn spends die 3 for an L jump |

Teaching puzzles are visibly labelled as arranged examples. Dominion's example
dice are explicitly fixed, outside normal practice and online play. No tutorial
sets a real match's dice, turns, ownership, pieces or outcome.

## Character decisions

Polly welcomes; Pengu explains routes and pieces; Retsba guides captures and
Han tactics; Abster encourages replay and free-board curiosity. Keep the
existing supplied character artwork unchanged. Characters stay outside the
playable board. Quiet permits the learner's chosen lesson text without ambient
chatter. Off hides teaching portraits while retaining every instruction and
control. Motion respects the existing motion switch and reduced motion.

The user's Android interaction request supersedes the website document's
non-interactive seal direction for this Android section. The website document's
character identities and separation from source-native pieces still apply.

## Engineering and continuity

Reviewed main: `3fa3455be2b38c310b2a85da579248f6c085403f`.
Latest mascot source and feature base:
`codex/mascot-camp-android` at `4bd408b687f3b3b69e27d70698cba4392ef016fb`.
Implementation branch: `codex/mascot-how-to-play`.
Version **2.2.0 / code 8**, package `xyz.arcticdominion.play`.

`learning.js` contains the curriculum and arranged positions; `learning.worker.js`
asks the existing adapters to enumerate and apply legal actions. Calculations
stay off the UI thread. `HowToPlay.jsx` owns independent teaching/free-board
state. The board renderer optionally accepts presentation-only pieces for the
free board; normal boards retain their existing legal selection behavior.

Switching lessons cancels pending work and discards stale responses. Returning
from learning restores the previous screen. Offline bots pause while their
board is not visible; online room updates continue. Entering a tutorial does
not detach, resign, send chat or write the teaching position into a real game.
Legacy quick starts, rulebooks, saved practice, room credentials, protocol,
friend play and native sharing remain in place.

Storage keys, under the existing `arctic-play.v1.` prefix:

- `how-to-play.v1`: validated per-game challenge timestamps.
- `free-board.v1.GAME`: only original piece IDs and valid, unique board cells.
  Saved data cannot substitute external images or non-board coordinates.

`PRACTICE_LINKS` is empty pending the user's link. Once supplied and inspected,
an appropriate HTTPS resource can be added per game. The existing native shell
opens external pages outside the bridge-enabled app; the teaching system does
not require a remote website or any new permission.

## Acceptance criteria and verification

1. All seven games expose How to Play, all 21 exercises are solvable using the
   actual game engines, and all 52 starting types are explained accurately.
2. All four mascots appear in their roles; Quiet/Off, saved preferences and
   reduced motion remain effective.
3. Free boards accept arbitrary on-board rearrangements, swap occupied points,
   undo/reset/remove correctly, persist per game, and never mark lessons done.
4. Only accepted exercise moves persist progress; replay, reopening and switching
   games preserve accurate progress. A real saved game survives visiting school.
5. Run existing mobile tests, new learning tests, Android private-room tests and
   the existing phone/companion checks. `scripts/smoke-learning.mjs` exercises
   320×640, 360×800, 412×915 and 800×360: all lessons, all piece examples,
   all free boards, stored progress, practice preservation and mascot Off.
   Inspect screenshots for clipping and verify no horizontal overflow or errors.
6. Build with the original signing key; verify package, increased version code,
   signature/alignment, certificate continuity and byte equality of game art.

A physical Android installation, soft keyboard, touch pinch behavior and native
installer flow still require an actual device. Browser checks do not establish
those behaviors. The external practice link is the only missing content input.
