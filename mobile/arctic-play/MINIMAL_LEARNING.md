# Focused beginner learning · Android 2.5.0

Accepted direction, 17 October 2026: make the app friendlier and more direct,
especially during learning. Show only what the current task needs. Keep the
four mascots and the individual game's curated content. Monetization is a
separate next step.

Base reviewed: `codex/curated-game-adventures` at remote commit
`1ca2581697521f779ab7b83ef5c8381c8226742b`, equivalent to local `946d2af`.
Both have root tree `43fa7a051ca2a098aa5251e23cf29100679ead12`.
Implementation branch: `codex/minimal-learning`.

## Decisions implemented

- Start with the game's objective and one **Start learning** button. After
  introduction, resume the first untried discovery; show one lesson at a time.
- Keep the lesson title, one mascot cue, playable board and **Need help?** in
  view. Reveal **Next lesson** only after the accepted move. A two-dice turn
  still requires both moves. Four discoveries remain curated for each game.
- Open actionable setups first. Blocked paths and other comparisons remain
  under **Help → Compare setups**, with their game-specific explanations.
- Move hints, watch-once examples, replay and detailed explanations into Help.
  Watching never grants completion; **Now my turn** starts a fresh learner try.
- Put game/section choices, the lesson list, pieces, free boards, warm-ups and
  rules in **Options**. Use one piece selector instead of a simultaneous grid.
- Collapse board zoom controls into **Zoom**. Keep touch, keyboard moves,
  pinch, panning and the underlying board geometry.
- Show a small goal and three turn steps in rules. One selector opens **Try a
  rule**, **Pieces** or searchable **Full rules**; chapter text is retained.
- Offer three main game-entry choices. A saved practice replaces the new
  practice action. Seat choice, joining, pass-the-phone and additional reading
  remain in **More options**.
- Retain the existing cute Polly, Pengu, Retsba and Abster art. Teaching
  portraits do not add extra tap controls; Quiet, Off and reduced motion remain
  respected. Off preserves the written instructions and all teaching tools.

## Preservation and accessibility

Learning still uses independent rule workers and the existing canonical
actions. This update does not change game rules, board topology, source-native
pieces, multiplayer validation, storage keys or private-room protocol.
Existing online tables can keep receiving moves while learning is open.

Optional panels are dialogs with an initial close-button focus, trapped Tab,
Escape and Android Back handling. The top panel makes background layers inert;
closing nested panels restores the remaining layer and then the original
focus/scroll state. Opening Options or Help preserves an unfinished lesson.

The short completion cue does not imply mastery of all rules. The full rules,
21 warm-ups, 52 piece examples, seven saved free boards and 28 discoveries
remain reachable. The separately requested external practice URL has not
been supplied; the built-in free boards continue to work offline.

## Acceptance criteria and evidence

1. Each discovery starts with a legal, actionable setup. Comparisons still use
   the real engine, including blocked examples.
2. At 320×640, 360×800 and 412×915, the lesson board starts within 300px of
   the top and its full playing area is visible. Also check 800×360 landscape.
3. A focused discovery has at most five visible surrounding controls; the
   welcome/ready view has at most three. Board cells are counted separately.
4. Exercise all 28 discoveries, 42 comparison setups, 21 warm-ups, 52 piece
   examples, seven free boards and seven rulebooks at each viewport.
5. Check exact full-rule text retention, watch-versus-play completion,
   unfinished dice turns, saved practice, nested panel focus, keyboard/Back,
   progress after reload, light mode and mascot Off.
6. Run the 50 existing mobile tests and 10 private-room tests, plus the phone
   and companion browser checks. Record results in
   `MINIMAL_LEARNING_VALIDATION.json`.
7. Verify APK v2/v3 signatures, original certificate continuity, package
   `xyz.arcticdominion.play`, version 2.5.0 / code 11 and unchanged art bytes.

Build this presentation update with the documented `--reuse-artwork` option
using the prior signed APK's `assets/art` tree. This checkout omits a large
canonical board source; reusing the verified tree preserves all 221 packaged
art files without a new rendering or asset change.

Browser checks do not establish physical Android installation, system-keyboard
layout or native pinch/share/install behaviour. These still require a phone.
This source branch does not deploy the website or backend.
