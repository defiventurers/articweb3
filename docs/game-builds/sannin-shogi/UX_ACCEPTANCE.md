# Sannin Shogi UX acceptance plan

This is the executable post-build acceptance contract for Worker 4. It is read-only
QA guidance and does not replace the lead-owned canonical specification. Historical
rules and product behavior must agree with `CANONICAL_SPEC.md`.

## Severity and release policy

- **P0 — launch blocker:** wrong game/topology, blocked primary flow, unusable phone
  interaction, inaccessible core board operation, lost/corrupted match state, or a
  material rule/presentation contradiction. Every P0 must pass before integration.
- **P1 — high impact:** a common task is confusing, error-prone, materially cramped,
  or unavailable to a supported input mode. Every P1 should pass before release; an
  exception requires the coordinator's explicit acceptance.
- **P2 — polish/resilience:** non-blocking inconsistency, degraded fallback, or edge-
  environment issue. Record and fix when practical before release.

For each failure, report route, viewport/browser, preconditions, exact steps, actual
result, expected result, severity, screenshot or semantic snapshot, and console error
when relevant.

## P0 acceptance checks

### UX-P0-01 — dedicated route and identity

**Procedure**

1. Cold-load `?game=sannin-shogi`.
2. Cold-load `?game=heritage-arcade&table=sannin-shogi`.
3. Enter table 24 from the Heritage Arcade roster.

**Pass criteria**

- All entries render the dedicated Sannin Shogi application, not `CompactBoard` or
  the legacy 61-cell march/scoring placeholder.
- Heritage still identifies the game as table 24 and does not add another outer-world
  catalog tile or change catalog counts.
- The game is described as deterministic client-local three-seat/hot-seat play. No
  wallet, room, wager, transaction, online, or bot claim appears unless separately
  approved and implemented.

### UX-P0-02 — exact visible board geometry

**Procedure**

1. Inspect the initial board at desktop and phone widths.
2. Count rendered gridcells programmatically and inspect each horizontal row.
3. Pan/fit to inspect all six corners and shared edges at device-pixel ratios 1 and 2.

**Pass criteria**

- The board exposes exactly 127 unique pointy-top regular hexagonal cells.
- Horizontal rows contain `7/8/9/10/11/12/13/12/11/10/9/8/7` cells.
- The silhouette is one complete regular hexagon; no cell is cropped, duplicated,
  overlapped, separated by visible gaps, or arranged on a rectangular substitute.
- The center Pleasure Garden is visibly associated with axial cell `(0,0)` without
  raster art defining the legal topology.
- Shared-edge antialiasing creates no distracting “snow gaps” at DPR 1 or 2.

### UX-P0-03 — usable narrow-phone board

**Procedure**

1. Open Play at 320×568, 360×800, and 390×844.
2. Fit the whole board, then zoom and pan to each corner.
3. Measure gridcell hitboxes and inspect document overflow.

**Pass criteria**

- The board and active-turn strip precede setup details, history, and expanded player
  panels in visual order.
- A cell hitbox never falls below 24×24 CSS px. At widths where full-board fit would
  make radius-6 cells smaller, the rendered board keeps a minimum width near 338–344
  px inside a clipped, pannable board viewport.
- Horizontal overflow is contained by the board viewport; the document/body has no
  horizontal scrollbar.
- Fit, zoom in, and zoom out are explicit controls. The board is operable without a
  pinch gesture, and Fit restores a complete six-corner overview.
- Selection, active cell, logical focus, and pending action survive zoom, pan,
  orientation change, and responsive reflow.

### UX-P0-04 — core pointer interaction

**Procedure**

1. With mouse and coarse touch emulation, select, cancel, and reselect pieces.
2. Attempt legal and illegal moves, captures, drops, castling, promotion choices, and
   illumination when those states are available.
3. Scroll the page starting both inside and outside the board.

**Pass criteria**

- Tap/click selection is the primary complete interaction; drag is never required.
- Legal destinations, captures, and mandatory pending actions are unambiguous.
- Illegal actions do not mutate state and produce a short visible explanation.
- Ordinary vertical page scrolling does not make a move. Board pan/zoom does not trap
  the page or trigger accidental moves/double activations.
- Every non-board interactive control is at least 44×44 CSS px.

### UX-P0-05 — keyboard-operable board

**Procedure**

1. Enter the game using only Tab/Shift+Tab and keyboard activation.
2. Traverse cells in all six hex directions; select a piece and destination.
3. Cancel a selection/pending drop and complete a promotion or other modal choice.

**Pass criteria**

- The board is one normal tab stop using roving `tabindex` or `aria-activedescendant`;
  127 gridcells do not enter the page-wide tab sequence.
- Arrow keys map predictably to visible directions, with two additional documented
  bindings (for example Q/E or Shift+Left/Right) covering all six neighbors.
- Enter/Space activates, Escape cancels or closes, and keyboard-only users can complete
  every core action.
- Focus is always visible and is restored to a sensible cell/control after a move,
  modal, drawer, reflow, or result screen.

### UX-P0-06 — board semantics and announcements

**Procedure**

1. Inspect the accessibility tree before selection, during a pending action, after a
   move, while checked, and at a terminal result.
2. Spot-check NVDA with Chrome/Firefox and VoiceOver with Safari when available.

**Pass criteria**

- The board has `role="grid"`; all 127 cells expose `role="gridcell"`.
- Each cell's accessible name includes a stable coordinate, territory/zone, occupant
  and owner, plus relevant current state such as selected, legal, capture, promotion,
  drop, or check. Names remain concise and current.
- Active player/phase, mandatory action, invalid action, promotion/drop, check, and
  outcome are announced once. Routine changes use a polite live region; urgent errors
  or outcomes may use an alert.
- Hidden panels are absent from the accessibility tree. Icon buttons, toggles, menus,
  drawers, and close controls have explicit names and correct expanded/pressed state.

### UX-P0-07 — non-color state differentiation

**Procedure**

1. Inspect empty legal, legal capture, selected, last move from/to, promotion zone,
   pending drop, check/threat, and each faction in color and grayscale.
2. Repeat with forced-colors/high-contrast mode.

**Pass criteria**

- No faction or interaction state relies on color alone; each uses a second cue such
  as ring, shape, pattern, stroke, or icon.
- Essential text contrast is at least 4.5:1 and meaningful control/focus boundaries
  are at least 3:1 in the supported presentation.
- Forced-colors mode retains visible cell boundaries, selection, legal/capture cues,
  focus, and readable player identity.

### UX-P0-08 — state continuity and terminal flow

**Procedure**

1. Start a match, make moves, open Rulebook and Research Notes, then return to Play.
2. Exercise Back/Forward navigation, resize/orientation change, and in-app drawers.
3. Reach at least one canonical ending and use Rematch/Return to setup.

**Pass criteria**

- Section changes and responsive reflow preserve the exact match state.
- Returning from rules restores a useful focus position without replaying onboarding.
- A canonical ending has an explicit winner/draw explanation and offers Rematch,
  Return to setup, and All Games/Heritage return without a dead end.
- Restart or resign is confirmed; cancel leaves state untouched.

## P1 acceptance checks

### UX-P1-01 — desktop battlefield allocation

**Procedure**

Inspect Play at 1024×768, 1280×800, 1366×768, 1440×900, and 1920×1080 with maximum
material and an open hand/status panel.

**Pass criteria**

- At ≥1180 px, the layout uses a stable three-column composition: approximately
  260–285 px controls, a 620–720 px preferred board, and 260–290 px status/hands.
- Radius-6 cells are approximately 47 px or larger across at 1280×800 when space
  permits. Panels do not push the board off center or cause it to jump when content
  changes.
- At 900–1179 px, the board remains primary beside one 230–260 px rail; secondary
  information moves below or into a drawer.

### UX-P1-02 — responsive composition and short landscape

**Procedure**

Inspect 600–899 px portrait/tablet, ≤599 px phone, and ≤900 px wide landscape with
height ≤520 px, including 844×390.

**Pass criteria**

- At 600–899 px the layout is board-first, single-column, with a compact three-seat
  summary and details/hands available in labeled drawers.
- At ≤599 px the header/tabs are compact, the board viewport is primary, and a 44–52
  px action/status bar remains reachable without obscuring cells.
- Short landscape uses one compact toolbar, gives remaining height to the board, and
  exposes panels as overlays/drawers with keyboard- and touch-accessible dismissal.
- Safe-area insets, sticky controls, and browser chrome do not cover actions.

### UX-P1-03 — three-seat orientation and status hierarchy

**Procedure**

View each player's turn and inspect all three home territories and player summaries.

**Pass criteria**

- Every seat's owner-relative “forward” direction is persistently indicated by an
  arrow or territory marker; no player must infer it only from rotated artwork.
- Labels, tooltips, dialogs, and the selected-piece inspector stay upright. If pieces
  rotate by owner, the supplied art remains recognizable and the inspector provides
  an upright name/movement summary.
- A compact persistent strip identifies active faction, turn/phase, check/threat, and
  mandatory pending action. Three faction chips distinguish name, symbol, status, and
  relevant material without requiring expanded panels.

### UX-P1-04 — supplied-piece readability

**Procedure**

Inspect all 42 piece images in initial and maximum-material states at 320, 390, 768,
and 1280 px widths, including promoted pieces and three faction colors.

**Pass criteria**

- Art is sharp, transparent, not clipped, and has no neighboring composite pixels or
  background corners.
- Fine raster detail is not the sole identifier. High-contrast faction rims and an
  upright selected-piece magnifier/inspector provide identity at phone scale.
- Cells contain no persistent coordinate text or stacked badges that obscure pieces.
  Edge labels or the inspector communicate coordinates.
- Decorative territory/Pleasure Garden art remains subordinate to cell edges, pieces,
  focus, legal moves, captures, and check.

### UX-P1-05 — hands, drops, promotion, and special actions

**Procedure**

1. Capture pieces into each player's hand and inspect full/empty hands.
2. Select and cancel a drop, complete a legal drop, and attempt prohibited drops.
3. Exercise optional and mandatory promotion, castling, alliance transitions, and
   promoted-King illumination when reachable.

**Pass criteria**

- The active hand is adjacent to the board; rival hands may collapse to labeled
  counts on phone. Hand selection clearly changes the board to “choose drop cell” and
  exposes Cancel.
- Promotion uses a named, focus-trapped choice with Promote/Do not promote; mandatory
  promotion is communicated without presenting a false choice.
- Special-action affordances state prerequisites and unavailable reasons without
  exposing controls that imply unsupported behavior.
- Canonical alliance and elimination status is understandable for all three players
  and never conflicts with the engine's active side or legal-action set.

### UX-P1-06 — controls and recoverability

**Procedure**

Exercise Rules/Guide, Undo when present, Restart, Fit, zoom +/−, focus/fullscreen,
drawers, and menus using pointer and keyboard.

**Pass criteria**

- Primary controls remain reachable and have text or accessible names; overflow menus
  contain no unnamed items.
- Undo appears only where the local rules/product policy honestly supports it.
- Destructive actions require confirmation and return focus to their opener on cancel.
- Fullscreen/focus modes have an obvious, keyboard-accessible exit and never hide the
  active turn or mandatory-action status.

### UX-P1-07 — beginner onboarding

**Procedure**

Cold-load Play as a first-time user, complete/dismiss onboarding, and reload.

**Pass criteria**

- A short optional onboarding sequence explains: (1) seat and forward direction,
  (2) tap piece then destination, and (3) captured pieces/drop and promotion.
- It never blocks access to the board, is dismissible and replayable, and does not
  recur every visit after completion.
- Chapter/pill navigation, if used, has explicit scroll affordance and keeps the
  current step visible; it does not reproduce Frost Academy's clipped horizontal nav
  or nested-scroll trap.
- A first-time tester can identify the current player, forward direction, legal next
  action, capture/drop/promotion meaning, and primary win condition after onboarding
  or the beginner rulebook.

### UX-P1-08 — rulebook and provenance

**Procedure**

Inspect Play, Rulebook, and Research Notes at desktop and 320/390 px phone widths.

**Pass criteria**

- Persistent section tabs and Return to play follow the dedicated Agon/Frozen
  Shogunate pattern and preserve match state.
- Rulebook is a compact, readable scroll article that becomes one column on phone.
- It includes objective, exact board/setup diagram, seat directions/turn order, every
  piece's normal/promoted movement, capture/drop/promotion, check, castling,
  illumination, alliance/elimination, endings, repetition/draw, and worked edge cases.
- Historical/documented rules, reconstruction, variants, and digital-only policies
  are explicitly labeled. Research Notes contain source reconciliation without
  burdening the beginner path.
- Diagrams remain legible at 320 px, 200% zoom, and forced colors.

## P2 acceptance checks

### UX-P2-01 — typography and offline resilience

**Procedure**

Block remote font requests and throttle image/network delivery, then cold-load both
routes.

**Pass criteria**

- Local/system fallbacks remain readable and do not materially shift layout, hide
  controls, or turn essential status into illegible decorative text.
- No essential label depends on tiny all-caps copy. Delayed piece images reserve
  space and do not cause harmful cumulative layout shift.

### UX-P2-02 — motion and visual stability

**Procedure**

Enable `prefers-reduced-motion`, then move, select, pan, resize, and open dialogs.

**Pass criteria**

- Decorative motion is disabled or substantially reduced; no flashing legal moves,
  auto-rotation, parallax, or animated background impairs board reading.
- Selection, focus, and battlefield position remain visually stable during state
  changes.

### UX-P2-03 — console, asset, and performance hygiene

**Procedure**

Cold-load each route, exercise a representative multi-turn sequence with maximum
pieces/hands, and inspect console/network/performance behavior.

**Pass criteria**

- No application console errors, missing Sannin assets, texture 404s, duplicate-key
  warnings, or runaway live-region announcements occur.
- Selection and destination highlighting feel immediate with all 127 cells and maximum
  material. No repeated input, modal, or resizing causes escalating lag.
- All supplied WebPs decode cleanly and remain sharp at common DPR values.

## Required viewport, input, and assistive-technology matrix

Run every P0 check at the **required** combinations below. Run P1/P2 checks at the
relevant rows and record any unavailable physical platform explicitly.

| Class | Viewport | Required input/AT | Primary assertions |
| --- | ---: | --- | --- |
| Narrow phone | 320×568 | touch emulation; keyboard | min cell target, contained pan, no body overflow, board-first |
| Phone | 360×800 | touch emulation; keyboard | sticky controls, drawers, safe areas, readable pieces |
| Phone | 390×844 | touch emulation; keyboard | complete common flow, promotion/drop, rulebook |
| Large phone | 412×915 | touch emulation | fit/zoom, hands, onboarding |
| Short landscape | 844×390 | touch emulation; keyboard | compact toolbar, board height, overlay dismissal |
| Tablet portrait | 768×1024 | touch emulation; keyboard | board-first reflow, drawers, diagrams |
| Tablet landscape | 1024×768 | mouse; keyboard | two-column threshold, no board compression |
| Laptop | 1280×800 | mouse; keyboard; NVDA spot-check | tri-column layout, grid semantics, full flow |
| Laptop | 1366×768 | mouse; keyboard | short desktop height, panels and dialogs |
| Desktop | 1440×900 | mouse; keyboard | preferred board scale, max-material readability |
| Large desktop | 1920×1080 | mouse; keyboard | max-width discipline, stable centerline |

Cross-browser targets are current Chrome and Firefox on desktop plus Safari/VoiceOver
and Android Chrome when available. At minimum, run NVDA with Chrome or Firefox and
VoiceOver with Safari as platform access permits. Repeat the core flow at 200% browser
zoom; inspect critical board/rulebook reflow at 400% and record any exception that
requires the board's dedicated pan viewport.

## Final acceptance record

Before recommending shared integration, Worker 4 must provide:

1. A pass/fail result for every P0 check and every applicable P1/P2 check.
2. Screenshots or semantic snapshots for 320×568, 390×844, 844×390, 768×1024,
   1024×768, 1280×800, and 1440×900.
3. Measured minimum board-cell and non-board control hitboxes.
4. Keyboard traversal and screen-reader findings, including focus-return behavior.
5. Severity-ranked reproducible defects with ownership recommendation.
6. A final verdict of **blocked**, **conditionally acceptable**, or **acceptable for
   shared integration**. Any open P0 requires **blocked**.
