# Antarctic Kingdoms · interactive companions

For the v2.3 cuter-art and pocket-guide update, see CUTE_SCHOOL.md. The original
references below are retained; the new variants follow the user’s later request.

Accepted direction, 16 October 2026: make Polly, Retsba, Pengu and Abster feel
alive through ongoing, optional interaction. Implement this in the separate
Android app; work on the full How to Play section follows later.

## Character and experience decisions

- Keep all four supplied reference images unchanged. Use gentle body motion,
  a curious tilt, a welcoming waddle and a high-five celebration around those
  images. Do not repaint faces, proportions, colours, outfits or game pieces.
- Polly welcomes and reassures; Retsba brings focused, respectful encouragement;
  Pengu brings calm clarity; Abster brings patience, curiosity and patterns.
- A companion stays beside navigation and below the board controls. Tap its
  portrait to visit the four-flipper camp, meet each guide, share a high five,
  choose a conversation prompt or keep a favourite beside you. The default
  lets the four guides take turns according to their roles.
- Use the saved display name and the actual Archive journal to personalise
  greetings and discovery responses. No invented achievements or win streaks.
- Lively is the default. Space routine automatic lines at least 22 seconds
  apart. Meaningful captures/checks can respond after six seconds; actual
  results, a new journal discovery or a lost connection can replace a line.
  A dismissal pauses automatic lines for one minute.
- An occasional lobby/room line follows 75 seconds without interaction.
  There are no idle prompts during a match. Background tabs, open dialogs,
  player chat, promotion choices and focused text inputs suppress automatic
  messages. Suppressed messages are not queued for a later burst.
- Quiet keeps the companion available with conversations initiated by a tap.
  Off hides the dock and mascot teaching portraits and stops proactive lines.
  Static character introductions in Discover remain available by choice.
  Snooze pauses proactive interaction until the app is reopened or manually
  woken. Motion has its own switch and always respects reduced motion.

## Scope and integrity

The shared `docs/PENGUIN_HOSTS_DIRECTION.md` describes non-interactive website
seals. The user's explicit request supersedes that behaviour for this Android
feature only. The host identities, roles and prohibition on replacing playing
pieces still apply. The website is not modified.

These are authored, offline character conversations selected by buttons, not
open-ended AI chat. Their small session history stays in memory; preferences
are saved locally under the existing `arctic-play.v1.` storage namespace.
Companions never post table chat, analyse an opponent, select moves, add Android
permissions, play sounds, schedule notifications or require a network service.

Reactions read accepted state changes. Repeated room snapshots and finished
positions do not repeat celebrations. Win/loss messages use the current user's
seat; a shared-phone result salutes everyone. Undo/restart reset observation
without presenting a reverse move as a capture. Turning companions off does not
remove legal highlights, rules, quick starts, dice, hand controls or game modes.

## Source and release

Base app: `a979553738be4e986043cfa77c23097e5e3157ec` (v2.0.0 rebrand).
Current main inspected: `3fa3455be2b38c310b2a85da579248f6c085403f`.
Version 2.1.0 / versionCode 7 retains `xyz.arcticdominion.play`, the original
signing identity, protocol, rules, artwork and update-feed URL.

## Acceptance criteria and checks

1. All four mascots can be met and respond in their own voice; tapping their
   portraits and conversation buttons gives immediate, visible feedback.
2. Preferred guide, Quiet/Off and motion preferences survive an app restart
   without replacing profile, favourites, rooms or saved practice positions.
3. Game reactions use confirmed events; online wins are personal to the user's
   seat. Camp conversations preserve the board and remain outside player chat.
4. Off retains teaching controls. Quiet, snooze, foreground/input gates,
   dismissal, rate limits and reduced motion work as described above.
5. Existing mobile and private-room tests pass, together with companion tests.
   `scripts/smoke-phone.mjs` and `scripts/smoke-companions.mjs` exercise
   320×640, 360×800, 412×915 and 800×360 layouts, with no horizontal overflow
   or browser errors. Check camp, game and settings screenshots visually.
6. Verify APK signature/alignment, package/certificate continuity, increased
   versionCode and byte equality for the preserved assets. Publish the signed
   APK and matching feed atomically and download them back to verify checksums.

A physical Android install, launcher display, soft keyboard, native share and
browser-to-installer handoff still need a device check. Browser simulations of
the Android bridge do not establish those behaviours.
