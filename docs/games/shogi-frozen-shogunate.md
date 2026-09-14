# Shogi — Frozen Shogunate

## 1. Short Summary

**Selected game:** standard Shogi, also called *hon-shōgi* (“standard/main Shogi”) and commonly described in English as Japanese chess.

**Players:** two. **Randomizer:** none. **Board:** 9×9 squares. **Starting force:** 20 pieces per player, 40 total. **Objective:** checkmate the opposing King. The defining mechanism is that most captured pieces change allegiance and can later be dropped back onto an empty square.

The Arctic Dominion adaptation is titled **Shogi — Frozen Shogunate**. It uses the supplied 9×9 ice board and supplied Crimson/Sapphire penguin piece sheets. No replacement board, newly generated character art, modern commercial diagram, or copied rulebook wording is used. The selected rules are current standard Shogi, not a speculative attempt to turn the eleventh-century archaeological evidence into a complete ruleset.

This distinction matters. Shogi has medieval ancestors and a long Japanese tradition, but the earliest evidence does not prove that people in 1058 played the exact modern 9×9, 40-piece game with captured-piece drops. The current standard game is nevertheless fully documented and therefore much safer to implement than a reconstructed Heian form.

## 2. Historical Research

### Identity, region and period

- **Confirmed — Identity:** Shogi is a Japanese two-player board game in the wider chess family. The Japan Shogi Association (JSA) defines the current standard game as alternating play on a rectangular 9×9 board, with the first player moving first and checkmate as the goal.[^1]
- **Confirmed — Living form:** Standard Shogi uses 40 pieces, 20 per player, in eight unpromoted types: King, Rook, Bishop, Gold General, Silver General, Knight, Lance and Pawn.[^1]
- **Confirmed — Earliest dated physical context:** Sixteen pentagonal Shogi pieces were excavated in 1993 from the former grounds of Kōfuku-ji in Nara alongside a wooden document dated 1058. The reported piece types include King, Gold, Silver, Knight and Pawn.[^2][^3]
- **Strongly supported — Early textual evidence:** The JSA identifies *Shin Sarugakuki*, usually dated around 1058–1064, as the oldest known written reference to Shogi. The early-thirteenth-century encyclopedic compilation *Nichūreki* describes small and large Heian Shogi forms.[^2]
- **Strongly supported — Consolidation:** The JSA historical account places the development of standard *hon-shōgi*—including removal of the Drunk Elephant and use of captured pieces—around the fifteenth and sixteenth centuries.[^2]
- **Reconstructed — Deeper ancestry:** A derivation ultimately from Indian chaturanga is the leading theory, but the date and route by which a chess-family game reached Japan are not known. Routes through China and Korea and through Southeast Asia have both been proposed.[^2]

### Why it fits an ancient/traditional public-domain-style project

Shogi is a traditional rule system with centuries of history, and the abstract concepts of a 9×9 board, movements, promotion, capture and drops are not proprietary visual assets. A fresh implementation may use those mechanics while avoiding copying protected expression. The project therefore:

- writes every explanation in original wording;
- cites institutional and federation sources instead of reproducing their prose;
- uses the supplied original Arctic artwork rather than a commercial board or photographed set;
- does not reproduce a modern publisher’s layout, notation diagram or rulebook page;
- labels historical inferences and modern platform policies instead of presenting them as ancient facts.

This is an engineering and editorial risk-control approach, not a jurisdiction-specific legal opinion.

### Archaeological and museum evidence

The Kōfuku-ji assemblage is evidence that recognizable pentagonal pieces carrying Shogi ranks existed in the eleventh century. It is not sufficient evidence for every modern rule. In particular, the assemblage does not by itself prove the complete modern setup, the exact board dimensions, the modern promotion zone, fourfold repetition, or the reuse of captured pieces. Nara Prefecture’s cultural-resource record is the preferred object-level source; the JSA history supplies contextual synthesis.[^2][^3]

### Development and variants

Historical Shogi is a family, not a single unchanged game:

- **Heian Shogi — historical, partly reconstructed:** an early small form described in medieval texts. Its exact board and complete practice are not identical to modern standard Shogi.
- **Heian Dai Shogi / Dai Shogi — historical:** larger forms with additional ranks and pieces.
- **Sho Shogi — historical predecessor:** a 9×9 form close to modern setup but with a Drunk Elephant and without assuming the complete current drop rules.
- **Chu Shogi — historical living specialist variant:** a 12×12 large-board game with many additional pieces.
- **Handicap Shogi — documented standard-play family:** one side removes specified starting material; normal movement, promotion and drops otherwise apply.
- **Mini Shogi and Kyoto Shogi — modern variants:** useful compact games, but not the selected historical baseline.

## 3. Source Reliability Notes

| Source | Type | Reliability and use | Limits |
|---|---|---|---|
| Japan Shogi Association, Official Match Rules, revised 1 October 2025[^1] | Primary governing rules | Highest-priority source for the current game: equipment, setup, movement, promotion, drops, repetition, impasse and fouls | Japanese-language professional/tournament framing includes procedures unnecessary for casual local play |
| Japan Shogi Association, History of Japanese Shogi[^2] | Institutional historical synthesis | Preferred overview for Kōfuku-ji, early texts, variants and the uncertain transmission story | A synthesis, not the excavation report itself; some developmental explanations are explicitly hypotheses |
| Nara Prefecture, Kōfuku-ji excavated Shogi pieces[^3] | Government cultural-resource record | Preferred evidence for the actual archaeological objects and their provenance | Does not establish a complete playable rule system |
| Japan Shogi Association, *Customs of Shogi*[^4] | Primary introductory guide | Cross-check for English naming, basic setup, promotion and drop restrictions | Introductory rather than exhaustive; tournament edge cases require the official rules |
| Federation of European Shogi Associations, Laws/Rules[^5] | Recognized federation rules | Independent cross-check for international interpretation, illegal moves and tournament handling | Secondary to the JSA for Japanese professional rules; tournament procedure exceeds app scope |

Confidence labels used throughout:

- **Confirmed:** directly stated by an authoritative rules body or directly supported by an institutional object record.
- **Strongly supported:** supported by multiple credible sources or by an authoritative historical synthesis, with modest residual uncertainty.
- **Reconstructed:** a reasoned historical interpretation filling evidence gaps.
- **Uncertain:** evidence does not resolve competing accounts or exact details.
- **Modern variant:** a later alternative or explicit digital product policy, not represented as historical standard play.

## 4. Original Board Description

### Board and coordinates

- **Confirmed:** a rectangular grid of **9 files × 9 ranks = 81 square cells**.[^1]
- Pieces occupy squares, not intersections.
- Traditional coordinates identify files 9 through 1 from the first player’s left-to-right screen view and ranks *a* through *i* from top to bottom. The implementation exposes these labels to assistive technology even though the supplied board art does not print them.
- The farthest three ranks from each player are that player’s promotion zone.
- The four dots commonly seen on boards aid visual orientation. They are not safe spaces, powers or movement nodes.

### Starting position

Viewed with the first player at the bottom:

```text
Top / second player (Sapphire)
L  N  S  G  K  G  S  N  L
.  R  .  .  .  .  .  B  .
P  P  P  P  P  P  P  P  P
.  .  .  .  .  .  .  .  .
.  .  .  .  .  .  .  .  .
.  .  .  .  .  .  .  .  .
P  P  P  P  P  P  P  P  P
.  B  .  .  .  .  .  R  .
L  N  S  G  K  G  S  N  L
Bottom / first player (Crimson)
```

Each side has one King, one Rook, one Bishop, two Gold Generals, two Silver Generals, two Knights, two Lances and nine Pawns.

### Direction and interactions

- Crimson moves toward decreasing screen rows (upward); Sapphire moves toward increasing screen rows (downward).
- A piece captures by moving legally onto an enemy-occupied cell. It cannot jump over intervening pieces except for the Knight.
- Captured pieces are demoted, change allegiance and enter the captor’s visible hand.
- A later turn can be used to drop one held piece unpromoted onto a legal empty square.
- There are no randomizers, blocking “safe” spaces, terrain effects or special marked cells.

## 5. Arctic Dominion Adaptation

The visual adaptation is deliberately conservative because the board and pieces were supplied as finished artwork.

| Standard element | Arctic Dominion presentation |
|---|---|
| First player / *sente* | Crimson Shogunate |
| Second player / *gote* | Sapphire Shogunate |
| King | Crowned penguin ruler tile |
| Rook | Ice citadel tile |
| Bishop | Crystal compass tile |
| Gold General | Armored crown guard tile |
| Silver General | Scarfed penguin tile |
| Knight | Mounted penguin tile |
| Lance | Winged crystal spear tile |
| Pawn | Young penguin scout tile |
| Promoted Rook | Dragon tile |
| Promoted Bishop | Radiant crystal/horse-state tile |
| Other promotions | Supplied promoted character tiles, including Tokin |
| Captured-piece stand | Faction “hand” dock beside/below the board |
| Promotion zone | Quiet UI overlay across the far three ranks; no invented terrain rule |

The supplied green sheet is retained as source material but not used in two-player standard Shogi. Red and blue are sufficient and match the board’s two-sided interaction. Original role names remain visible in labels so the fantasy reskin never obscures the underlying rules.

## 6. Final Playable Rules

### Objective and setup

Arrange all 40 pieces in the standard position above. Crimson takes the first turn. Win by checkmating the opposing King: the King is attacked and the defender has no legal move that removes the threat. Play stops at checkmate; the app does not require a King capture.

### Turn order

Players alternate. A turn consists of exactly one of:

1. moving one on-board piece to a legal destination, possibly capturing and/or promoting; or
2. dropping one captured piece from the player’s hand onto a legal empty cell.

Passing and taking two actions are illegal.

### Piece movement

- **King:** one cell in any orthogonal or diagonal direction.
- **Rook:** any unobstructed distance orthogonally.
- **Bishop:** any unobstructed distance diagonally.
- **Gold General:** one cell forward, backward or sideways, or one cell diagonally forward; it cannot move diagonally backward.
- **Silver General:** one cell straight forward or one cell diagonally forward/backward; it cannot move sideways or straight backward.
- **Knight:** jumps two ranks forward and one file sideways. It is the only piece that can jump.
- **Lance:** any unobstructed distance straight forward.
- **Pawn:** exactly one cell straight forward, including when capturing. It does not capture diagonally and has no initial two-step move.

No piece may land on a friendly piece. Rooks, Bishops and Lances stop at the first occupied cell; an enemy there may be captured.

### Promotion

A Rook, Bishop, Silver, Knight, Lance or Pawn becomes eligible when a move starts in or ends in the farthest three ranks. Promotion is normally optional:

- Rook → Dragon King: retains Rook movement and gains a one-cell diagonal step.
- Bishop → Dragon Horse: retains Bishop movement and gains a one-cell orthogonal step.
- Silver, Knight, Lance and Pawn → Gold-style movement.
- A promoted Pawn is called a Tokin.
- King and Gold do not promote.

Promotion is mandatory when declining it would leave the piece permanently unable to move: Pawn or Lance on the last rank, and Knight on either of the last two ranks. Promotion persists while a piece remains on the board. Capture removes it.

### Captures and drops

On capture, remove the target, clear any promotion, change it to the captor’s side and add its unpromoted type to the captor’s hand. On a later turn it may be dropped onto an empty cell. A drop cannot capture and cannot enter already promoted.

Drop restrictions:

- **Nifu / two pawns:** do not drop a Pawn into a file that already contains one of your unpromoted Pawns. Your promoted Pawns do not count.
- **Dead destination:** do not drop a Pawn or Lance on the last rank or a Knight on either last rank.
- **Pawn-drop mate:** a dropped Pawn may give check but may not create immediate checkmate. Dropping another piece to mate is legal, as is mating with a Pawn that was already on the board.

### Check, legal and illegal moves

A King is in check when an enemy could capture it on the next action. The defender must move the King safely, capture the checking piece, or block the attack when the attacker is a sliding piece. A player may never move into check, expose their King by moving a pinned blocker, or ignore an existing check.

The interface generates movement and drop candidates, simulates each, then rejects any candidate leaving the acting King attacked. Highlights therefore represent complete legal actions rather than geometric movement alone.

### End game, repetition and impasse

- **Checkmate:** attacker wins.
- **Resignation:** standard over-the-board play permits resignation. The first implementation focuses on local board resolution and restart; a dedicated resign confirmation can be added before online matchmaking.
- **Fourfold repetition:** when the same board, captured-piece hands and player to move occur for the fourth time, the app declares a draw.
- **Continuous checking repetition:** if one side gave check on every one of its turns throughout the repeating cycle, that checker loses instead of drawing.[^1]
- **Mutual impasse:** when both Kings have entered the opposing camp, neither is checked and players judge mate no longer feasible, material can be counted. Each Rook/Bishop is five points and every other non-King piece is one. At 24 points each the result is a draw; a side below 24 loses.[^1] The app offers a manual assessment because “mate is no longer feasible” is not a simple purely geometric condition.
- **No legal action without check:** the digital completion policy awards the opponent a win. This is clearly labeled as a platform rule rather than historical evidence.

### Play examples

1. **Optional promotion:** a Crimson Silver moves from rank 4 into rank 3. The interface offers ordinary Silver or promoted Gold-style movement.
2. **Promotion while leaving:** a Bishop already in the far camp moves out of it and may still promote because the move began inside the zone.
3. **Captured Dragon:** Sapphire captures a Crimson promoted Rook. Sapphire receives an ordinary Rook in hand and later drops the unpromoted citadel tile.
4. **Blocking check by drop:** a held Gold can be dropped between a Rook and King if the cell is empty and the resulting position is safe.
5. **Nifu:** Crimson has an unpromoted Pawn anywhere in file 7. Crimson cannot drop another Pawn in file 7, even if separated by many empty cells.
6. **Legal Pawn check:** dropping a Pawn immediately in front of the enemy King is allowed if the King has a legal response.
7. **Illegal Pawn-drop mate:** the same drop is rejected if it is checkmate. Moving an existing Pawn into that mating cell remains legal.

## 7. Rule Variants and Chosen Version

**Chosen:** current standard *hon-shōgi* under the JSA baseline. It is best supported, completely playable, compatible with the supplied 9×9 board, and exactly matches the fourteen illustrated visual states: eight base roles plus six promotions.

Variants are not blended into the default game:

- **Historical Heian/Sho/Chu/Dai games:** separate games with changed boards or forces, not toggles.
- **Handicap setup:** useful future toggle. It removes starting material from the stronger side but needs a deliberate handicap menu and documented presets.
- **Tournament clocks/byō-yomi:** useful future mode, not part of untimed local rules correctness.
- **27-point declaration systems:** tournament-specific alternatives exist. The current manual mutual-impasse control uses the JSA 24-point baseline and states its limits.
- **Beginner leniency:** this local app disables illegal actions instead of treating an attempted screen tap as immediate forfeit. That is a usability policy; legal resulting positions remain standard.

## 8. Game Logic Specification

### Coordinate model

- Flat array of 81 cells; `index = row * 9 + col`.
- `row` and `col` are integers 0–8.
- Red/Crimson forward delta is `-1`; Blue/Sapphire forward delta is `+1`.
- Promotion zone predicate: Red `row <= 2`; Blue `row >= 6`.

### Piece and board model

```js
piece = {
  id: string,                       // stable for on-board movement
  side: "red" | "blue",
  type: "king" | "rook" | "bishop" | "gold" |
        "silver" | "knight" | "lance" | "pawn",
  promoted: boolean
}

board = Array<piece | null>(81)
```

Promotion is a flag, not a separate capturable type. That guarantees capture demotion and reduces impossible-state risk.

### Player and turn state

```js
hands = {
  red:  { rook, bishop, gold, silver, knight, lance, pawn },
  blue: { rook, bishop, gold, silver, knight, lance, pawn }
}

state = {
  board,
  hands,
  turn,
  ply,
  mode,
  winner,
  draw,
  result,
  lastAction,
  positionHistory
}
```

There is no randomizer state. Bot selection may use a random tie break between equally scored moves, but this does not change game rules or legal outcomes.

### Actions

```js
{ kind: "move", from: number, to: number, promote: boolean }
{ kind: "drop", type: HandPieceType, to: number }
```

Optional promotion creates two distinct legal actions with the same origin/destination. The UI pauses for a promotion choice. Forced promotion creates only the promoted action.

### Legal move generation

1. Generate pseudo-targets from role geometry and board blockers.
2. Expand eligible movements into promoted/non-promoted action variants.
3. Generate drop candidates for every held type on every empty cell.
4. Reject nifu and dead-destination drops.
5. Apply each action to a cloned state.
6. Reject any result in which the acting King is attacked.
7. For Pawn drops giving check, generate the defender’s legal replies; reject the drop when no reply exists.

The Knight alone ignores intermediate cells. Sliding pieces terminate on the first blocker. A friendly blocker cannot be entered; an enemy blocker can be captured and ends the ray.

### Capture and promotion processing

- Read destination occupant before replacement.
- If captured and not a King, increment the captor’s hand count for `captured.type`; ignore `captured.promoted`.
- Clear origin; place a copy of the mover at destination with `promoted ||= action.promote`.
- For a drop, decrement the hand count and create an unpromoted piece owned by the dropper.

### Check and win detection

- Locate the tested side’s King.
- Generate enemy pseudo-attacks, including sliding rays and promoted movement.
- Checkmate is `isInCheck(defender) && legalActions(defender).length === 0`.
- The game stops at checkmate; capturing the King is never the expected UI action.

### Repetition

The position signature contains:

1. all 81 cells with side, base type and promotion;
2. both seven-type hand counts; and
3. player to move.

On the fourth signature occurrence, inspect the moves in the repeating interval. If every move by one side gave check, that side loses for perpetual check. Otherwise mark a draw.

### Impasse

Manual assessment first checks:

- both Kings exist;
- Red King is in rows 0–2 and Blue King in rows 6–8;
- neither King is checked.

Then total board plus hand material by owner: Rook/Bishop five, other non-Kings one. Both at least 24 produces a draw; one below 24 loses. UI copy discloses that the engine cannot prove the human “no prospect of mate” judgment.

### Undo, reset and bot

- **Undo:** immutable snapshots, capped in UI at 120 states. In bot mode an undo after the bot response rolls back both plies.
- **Reset:** reconstruct the canonical initial state and clears history/selection.
- **Bot:** a clearly labeled practice opponent. It evaluates captures, promotion, check, threatened material and central/forward development with a one-ply heuristic. It is intentionally not represented as a strong Shogi engine.

## 9. UI/UX Plan for Phone and PC

### Shared information architecture

The first loaded section is **Play**, not a marketing cover. Three tabs remain present:

1. **Play** — active board, hands, player state and controls.
2. **Rulebook** — original-wording ice-scroll guide.
3. **Research Notes** — evidence labels, variants, adaptation notes and linked sources.

Shared behavior includes full-cell touch targets, selected-piece emphasis, legal destination dots, red capture rings, current-player text, check state, accessible square names, visible hands, restart, undo, rules access, practice-bot mode and impasse assessment.

### Desktop

- Three columns: command/status; square board; captured-piece hands.
- Board remains the dominant element, approximately 520–730 CSS pixels wide.
- Current player, mode and controls remain visible while the board is in view.
- Both hands are visible at once, which is strategically important in Shogi.
- The artwork is rendered as a board background with a mathematically aligned 9×9 interactive overlay.

### Phone

- Board appears first and uses nearly the full viewport width.
- Every square is the full touch target; the visible piece itself is never the only tappable area.
- The move chronicle follows the board, then current-player controls, then the two hand docks.
- Role abbreviations are hidden at the smallest breakpoint because the supplied movement icons remain visible and accessible names retain exact piece identities.
- Rulebook and Research Notes collapse to one column with large tab targets.
- No horizontal scroll is required at supported phone widths.

## 10. Art Direction

The board and pieces are locked supplied assets. Implementation work is limited to integration and legibility:

- dark navy ice, pale frost, cyan aurora and warm gold retain union with the existing Arctic Dominion world;
- Crimson and Sapphire are the two active factions; the supplied green set is reserved;
- cropped runtime tiles preserve the supplied source artwork and are clipped to the Shogi pentagonal silhouette;
- an understated dark label names each role on desktop, while assistive labels carry the same information on mobile;
- promotion uses the matching supplied promoted tile—no recoloring or generative replacement;
- movement feedback uses ring/dot overlays rather than altering the board image;
- animation is limited to soft selection/check pulses and respects reduced-motion settings;
- recommended sound cues are existing quiet UI tap, ice chime on promotion, low alert for check and warm bell for checkmate, with the global mute control retained.

Accessibility uses side names, text role labels and distinct target shapes so color is never the sole signal. Focus and interactive cells should remain keyboard-operable. The board’s decorative center penguin, dots and snowflakes have no rules meaning.

## 11. Test Cases

### Implemented automated tests

1. Initial state has 81 cells and exactly 40 pieces.
2. Standard initial state has 30 legal first moves.
3. Silver entry into the promotion zone offers both promotion choices.
4. Pawn reaching last rank must promote.
5. Captured promoted Silver becomes unpromoted Silver in hand.
6. Pawn drop is rejected in a file containing a friendly unpromoted Pawn.
7. Pawn is rejected on last-rank drop.
8. Knight is rejected on either dead final rank.
9. A pinned blocker cannot move away and expose its King.
10. Immediate Pawn-drop mate is rejected.
11. A legal mating move ends in checkmate before King capture.
12. Mutual-impasse scoring counts major and minor pieces correctly.
13. Desktop and mobile routes load directly into Play.
14. The board exposes 81 accessible grid cells.
15. Selecting and moving an opening Pawn transfers the turn to Sapphire.
16. Rulebook and Research Notes are reachable as tabs.
17. Research source links are present.

### Required regression cases

18. Bishop and Rook rays stop at friendly blockers and may capture the first enemy only.
19. Knight jumps over occupied intervening cells.
20. A move beginning inside but ending outside the promotion zone still offers promotion.
21. Promoted Pawn in a file does not trigger nifu.
22. Pawn drop giving non-mating check remains legal.
23. Non-Pawn drop delivering mate remains legal.
24. A checking sliding piece can be answered by a legal drop block.
25. Capturing a Dragon returns a Rook, not Dragon, to hand.
26. Capturing a Tokin returns a Pawn.
27. A King cannot capture a protected attacker.
28. Fourth identical complete position produces a draw.
29. Fourth repetition caused by one side’s uninterrupted checks makes that checker lose.
30. Same board with different hands is not repetition.
31. Same board/hands with a different player to move is not repetition.
32. Impasse assessment is rejected if either King is not in the enemy camp.
33. Impasse assessment is rejected while either King is checked.
34. Bot never selects an action outside the legal-action set.
35. Undo after a bot response restores the state before the human move.
36. Restart clears hands, promotion, winner, draw and repetition history.
37. At 320–430 CSS pixels the board fits without horizontal overflow and cells remain tappable.

## 12. Improvements Applied

The pre-final critique identified and resolved these issues:

- **Historical accuracy:** reframed the game as a documented living standard with medieval ancestors, not “unchanged ancient Shogi.”
- **Rules clarity:** separated ordinary movement, promotion, capture, drops, check, repetition and impasse instead of compressing them into a chess analogy.
- **Implementation completeness:** added self-check simulation, mandatory promotion, nifu, dead drops, Pawn-drop mate, capture demotion, fourfold repetition, perpetual-check loss and manual impasse scoring.
- **Mobile usability:** made the board first, used the full square as the touch target, placed current-player status before hand details, and removed tiny visual labels at narrow widths while retaining accessible names.
- **Desktop usability:** kept both hands and current-turn controls alongside the board.
- **Visual originality and unity:** used only supplied Shogi art plus existing Arctic Dominion UI primitives; generated no substitute art.
- **Copyright safety:** did not reproduce modern commercial images, diagrams or rulebook language; added original explanatory text and direct citations.
- **Replay value:** included hot-seat and a modest practice bot without presenting the bot as historically meaningful or competitively strong.
- **Ambiguity:** labeled the non-check no-move resolution and automated impasse limitations as digital policies.

## 13. Remaining Uncertainties

1. **Transmission:** the exact date and route by which a chess-family ancestor reached Japan remain unknown.
2. **1058 play:** the Kōfuku-ji pieces do not prove the complete modern board, setup or captured-piece drop rule.
3. **Origin of drops:** the date and motivation for reusing captured pieces are not securely documented as a single event; causal stories remain hypotheses.
4. **Impasse judgment:** software can verify camps, check status and points, but cannot perfectly determine the official human premise that neither player has a reasonable prospect of mating. The control is therefore manual and explanatory.
5. **Tournament detail:** clocks, time forfeits, touch/release procedure, adjudication and specific 27-point declaration systems are intentionally excluded from untimed local play.
6. **Artwork convention:** traditional Shogi distinguishes ownership by piece orientation and normally uses the same piece color. The supplied adaptation distinguishes factions by red/blue artwork; text and state labels preserve clarity, but this is an intentional visual departure rather than a historical claim.

## Sources

[^1]: Japan Shogi Association. “[Official Match Rules](https://www.shogi.or.jp/match/taikyoku_rules/).” Revised 1 October 2025. Used for the 9×9 board, setup, movement, drops, promotion, repetition, perpetual check, impasse and prohibited actions.
[^2]: Japan Shogi Association. “[History of Japanese Shogi](https://www.shogi.or.jp/history/story/).” Used for uncertain transmission, the Kōfuku-ji find, *Shin Sarugakuki*, *Nichūreki*, historical variants and consolidation of standard Shogi.
[^3]: Nara Prefecture. “[Shogi Pieces, Writing-Practice Wooden Tablets and Scroll Label Excavated from the Former Precinct of Kōfuku-ji](https://www.pref.nara.lg.jp/ikasu-nara/bunkashigen/main10693.html).” Cultural-resource record used for archaeological provenance.
[^4]: Japan Shogi Association. “[Customs of Shogi](https://www.shogi.or.jp/event/english-pamphlet.pdf).” English introductory pamphlet used to cross-check setup, movement, promotion and basic drop restrictions.
[^5]: Federation of European Shogi Associations. “[Rules](https://fesashogi.eu/rules/).” Used as an international federation cross-check for laws and tournament interpretation.
