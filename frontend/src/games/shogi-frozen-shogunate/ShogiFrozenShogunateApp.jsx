import { useEffect, useMemo, useRef, useState } from "react";
import {
  HAND_TYPES,
  PIECE_NAMES,
  PROMOTED_NAMES,
  applyShogiAction,
  assessImpasse,
  assetRole,
  chooseShogiBotAction,
  coordinatesOf,
  createShogiState,
  displayPieceName,
  getLegalActions,
  isInCheck,
  legalActionsForSource,
  sideName
} from "./rules.js";

const ASSET_ROOT = "/assets/games/shogi-frozen-shogunate";
const BOT_SIDE = "blue";

export function ShogiFrozenShogunateApp({ onExitToLibrary }) {
  const [tab, setTab] = useState("play");
  const [mode, setMode] = useState("hotseat");
  const [state, setState] = useState(() => createShogiState());
  const [selection, setSelection] = useState(null);
  const [promotionChoice, setPromotionChoice] = useState(null);
  const [message, setMessage] = useState("Crimson moves first. Select a piece or a captured piece in hand.");
  const [undoStack, setUndoStack] = useState([]);
  const botTimer = useRef(null);

  const allActions = useMemo(() => getLegalActions(state), [state]);
  const selectedActions = useMemo(() => selection ? legalActionsForSource(state, selection.kind === "board" ? selection.from : selection.type) : [], [state, selection]);
  const destinationActions = useMemo(() => {
    const map = new Map();
    selectedActions.forEach((action) => map.set(action.to, [...(map.get(action.to) || []), action]));
    return map;
  }, [selectedActions]);

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (tab !== "play" || mode !== "bot" || state.turn !== BOT_SIDE || state.winner || state.draw || promotionChoice) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseShogiBotAction(state, BOT_SIDE);
      if (action) commit(action);
    }, 520);
    return () => window.clearTimeout(botTimer.current);
  }, [tab, mode, state, promotionChoice]);

  function restart(nextMode = mode) {
    setMode(nextMode);
    setState(createShogiState({ mode: nextMode }));
    setSelection(null);
    setPromotionChoice(null);
    setUndoStack([]);
    setMessage("Crimson moves first. Select a piece or a captured piece in hand.");
  }

  function commit(action) {
    const result = applyShogiAction(state, action);
    if (result.error) return setMessage(result.error);
    setUndoStack((history) => [...history.slice(-119), state]);
    setState(result.state);
    setSelection(null);
    setPromotionChoice(null);
    setMessage(result.state.lastAction?.text || "Move complete.");
  }

  function chooseSquare(index) {
    if (state.winner || state.draw || promotionChoice || (mode === "bot" && state.turn === BOT_SIDE)) return;
    const choices = destinationActions.get(index);
    if (choices?.length === 1) return commit(choices[0]);
    if (choices?.length > 1) return setPromotionChoice({ choices, piece: state.board[choices[0].from] });
    const occupant = state.board[index];
    if (occupant?.side === state.turn) {
      setSelection({ kind: "board", from: index });
      setMessage(`${displayPieceName(occupant)} selected. Choose a glowing square.`);
      return;
    }
    setMessage(isInCheck(state, state.turn) ? "Your king is in check. Choose a highlighted reply." : "Select one of your pieces or a captured piece in hand.");
  }

  function selectHand(type) {
    if (!state.hands[state.turn][type] || state.winner || state.draw || (mode === "bot" && state.turn === BOT_SIDE)) return;
    setSelection({ kind: "hand", type });
    setMessage(`${PIECE_NAMES[type]} in hand selected. Choose a glowing empty square.`);
  }

  function undo() {
    if (!undoStack.length || promotionChoice) return;
    const steps = mode === "bot" && state.turn === "red" && undoStack.length >= 2 ? 2 : 1;
    const previous = undoStack[undoStack.length - steps];
    setState(previous);
    setUndoStack((history) => history.slice(0, -steps));
    setSelection(null);
    setMessage(steps === 2 ? "Your move and the Frost Bot reply were undone." : "The last move was undone.");
  }

  function declareImpasse() {
    const result = assessImpasse(state);
    if (!result.eligible) return setMessage(result.message);
    setUndoStack((history) => [...history.slice(-119), state]);
    setState(result.state);
    setMessage(`Impasse assessed: Crimson ${result.points.red} points, Sapphire ${result.points.blue} points.`);
  }

  return <section className="shogi-app" aria-label="Shogi — Frozen Shogunate">
    <header className="shogi-topbar">
      <button type="button" className="shogi-back" onClick={onExitToLibrary}>← All Games</button>
      <div className="shogi-title"><span aria-hidden="true">将</span><div><p>SHOGI · JAPANESE TRADITION</p><h1>Frozen Shogunate</h1></div></div>
      <div className="shogi-badges"><span>DOCUMENTED RULES</span><span>2 PLAYERS</span><span>FREE PLAY</span></div>
    </header>

    <nav className="shogi-tabs" aria-label="Shogi sections">
      {["play", "rulebook", "research"].map((name) => <button key={name} type="button" className={tab === name ? "active" : ""} onClick={() => setTab(name)} aria-current={tab === name ? "page" : undefined}>{name === "research" ? "Research Notes" : name[0].toUpperCase() + name.slice(1)}</button>)}
    </nav>

    {tab === "play" && <PlayTable state={state} mode={mode} allActions={allActions} selection={selection} destinationActions={destinationActions} message={message} undoDisabled={!undoStack.length} onSquare={chooseSquare} onHand={selectHand} onMode={restart} onUndo={undo} onRestart={() => restart()} onHelp={() => setTab("rulebook")} onImpasse={declareImpasse} />}
    {tab === "rulebook" && <Rulebook onPlay={() => setTab("play")} />}
    {tab === "research" && <ResearchNotes />}

    {promotionChoice && <PromotionDialog choice={promotionChoice} onChoose={commit} onCancel={() => setPromotionChoice(null)} />}
  </section>;
}

function PlayTable({ state, mode, allActions, selection, destinationActions, message, undoDisabled, onSquare, onHand, onMode, onUndo, onRestart, onHelp, onImpasse }) {
  const check = !state.winner && !state.draw && isInCheck(state, state.turn);
  const selectableSquares = new Set(allActions.filter((action) => action.kind === "move").map((action) => action.from));
  const selectedIndex = selection?.kind === "board" ? selection.from : null;
  return <main className="shogi-play">
    <aside className="shogi-command">
      <section className={`shogi-turn-card ${state.turn} ${check ? "check" : ""}`}>
        <span>{state.winner || state.draw ? "MATCH COMPLETE" : check ? "KING IN CHECK" : "CURRENT PLAYER"}</span>
        <h2>{outcomeTitle(state)}</h2>
        <p>{outcomeDetail(state, check)}</p>
      </section>
      <section className="shogi-controls">
        <label>Play mode<select value={mode} onChange={(event) => onMode(event.target.value)}><option value="hotseat">Local two player</option><option value="bot">Practice vs Frost Bot</option></select></label>
        <div><button type="button" disabled={undoDisabled} onClick={onUndo}>Undo</button><button type="button" onClick={onRestart}>Restart</button><button type="button" onClick={onHelp}>Rules</button></div>
        <button type="button" className="shogi-impasse" onClick={onImpasse}>Assess mutual impasse</button>
      </section>
      <section className="shogi-key"><span><i className="selectable" /> Movable piece</span><span><i className="target" /> Legal destination</span><span><i className="capture" /> Capture</span><span><i className="zone" /> Promotion camp</span></section>
    </aside>

    <section className="shogi-board-column">
      <div className="shogi-board-caption"><span>9 × 9 ICE BOARD · 40 PIECES</span><strong>MOVE {Math.ceil(state.ply / 2)}</strong></div>
      <div className="shogi-board-shell">
        <div className="shogi-board-grid" role="grid" aria-label="Shogi board">
          {state.board.map((piece, index) => {
            const { row, col } = coordinatesOf(index);
            const targets = destinationActions.get(index);
            const capture = Boolean(targets?.length && piece?.side !== state.turn);
            return <button key={index} type="button" role="gridcell" className={`${row < 3 || row > 5 ? "promotion-zone" : ""} ${selectableSquares.has(index) ? "selectable" : ""} ${selectedIndex === index ? "selected" : ""} ${targets?.length ? "target" : ""} ${capture ? "capture" : ""}`} aria-label={squareLabel(index, piece, targets)} onClick={() => onSquare(index)}>
              {piece && <PieceTile piece={piece} />}
              {targets?.length ? <span className="shogi-target-mark" aria-hidden="true" /> : null}
            </button>;
          })}
        </div>
      </div>
      <div className="shogi-event" role="status"><span>ICE CHRONICLE</span><p>{message}</p></div>
    </section>

    <aside className="shogi-hands">
      <HandDock side="blue" state={state} active={state.turn === "blue"} selected={selection} onHand={onHand} />
      <section className="shogi-turn-order"><span>TURN ORDER</span><p>Crimson moves upward. Sapphire moves downward. Captured pieces change allegiance and may return as drops.</p></section>
      <HandDock side="red" state={state} active={state.turn === "red"} selected={selection} onHand={onHand} />
    </aside>
  </main>;
}

function HandDock({ side, state, active, selected, onHand }) {
  const entries = HAND_TYPES.filter((type) => state.hands[side][type] > 0);
  return <section className={`shogi-hand-dock ${side} ${active ? "active" : ""}`}><header><span>{side === "red" ? "CRIMSON" : "SAPPHIRE"} HAND</span><strong>{entries.reduce((sum, type) => sum + state.hands[side][type], 0)} captured</strong></header><div>{entries.length ? entries.map((type) => <button key={type} type="button" disabled={!active || state.winner || state.draw} className={active && selected?.kind === "hand" && selected.type === type ? "selected" : ""} onClick={() => onHand(type)} aria-label={`${PIECE_NAMES[type]}, ${state.hands[side][type]} in hand`}><PieceTile piece={{ side, type, promoted: false }} compact /><b>×{state.hands[side][type]}</b></button>) : <p>No captured pieces.</p>}</div></section>;
}

function PieceTile({ piece, compact = false }) {
  const role = assetRole(piece);
  return <span className={`shogi-piece ${piece.side} ${compact ? "compact" : ""}`} title={displayPieceName(piece)}><img src={`${ASSET_ROOT}/${piece.side}-${role}.webp`} alt="" draggable="false" /><span>{shortRole(piece)}</span></span>;
}

function PromotionDialog({ choice, onChoose, onCancel }) {
  const promoted = choice.choices.find((action) => action.promote);
  const plain = choice.choices.find((action) => !action.promote);
  return <div className="shogi-modal-backdrop" role="presentation"><section className="shogi-promotion-modal" role="dialog" aria-modal="true" aria-labelledby="promotion-title"><span>ENTERING THE FAR CAMP</span><h2 id="promotion-title">Promote this {PIECE_NAMES[choice.piece.type]}?</h2><p>Promotion is optional here. It cannot be reversed while the piece remains on the board.</p><div><button type="button" onClick={() => onChoose(promoted)}>Promote to {PROMOTED_NAMES[choice.piece.type]}</button><button type="button" onClick={() => onChoose(plain)}>Keep current rank</button><button type="button" className="cancel" onClick={onCancel}>Cancel move</button></div></section></div>;
}

function Rulebook({ onPlay }) {
  return <main className="shogi-scroll-page"><article className="shogi-scroll">
    <header><span className="shogi-scroll-seal">将</span><div><p>ORIGINAL WORDING · STANDARD HON-SHŌGI</p><h2>Field Guide to the Frozen Shogunate</h2></div><button type="button" onClick={onPlay}>Return to play</button></header>
    <section className="shogi-objective"><strong>Objective</strong><p>Checkmate the opposing king: threaten its capture so that no legal move can remove the threat. The game ends at mate; the king is not physically captured.</p></section>
    <div className="shogi-rule-grid">
      <Rule n="1" title="Setup">Each commander starts with 20 pieces on a 9×9 board. Crimson moves first. There is no die or other randomizer.</Rule>
      <Rule n="2" title="A turn">Either move one piece already on the board or drop one captured piece from your hand onto an empty square. You may not pass.</Rule>
      <Rule n="3" title="Capture">Move onto an enemy-occupied square to capture. The piece loses promotion, changes allegiance and enters your hand. A drop never captures.</Rule>
      <Rule n="4" title="Promotion">A Rook, Bishop, Silver, Knight, Lance or Pawn may promote when a move begins or ends in the farthest three ranks. A dropped piece starts unpromoted.</Rule>
      <Rule n="5" title="Forced promotion">A Pawn or Lance reaching the last rank must promote. A Knight reaching either of the last two ranks must promote, because otherwise it could never move again.</Rule>
      <Rule n="6" title="Check">A move may not expose your own King or leave it attacked. When checked, every legal reply must capture the attacker, block its route, or move the King safely.</Rule>
      <Rule n="7" title="Two pawns">You may not drop an unpromoted Pawn into a file already containing one of your unpromoted Pawns. Promoted Pawns do not count.</Rule>
      <Rule n="8" title="Dead drops">A Pawn or Lance cannot be dropped on the last rank; a Knight cannot be dropped on either last rank, because it would have no future move.</Rule>
      <Rule n="9" title="Pawn-drop mate">A dropped Pawn may give check, but may not deliver immediate checkmate. Mate by moving an existing Pawn—or by dropping another kind of piece—is legal.</Rule>
      <Rule n="10" title="Repetition">The fourth occurrence of the same board, hands and player-to-move is repetition. It is a draw here unless one side gave check on every turn of the cycle; that checking side loses.</Rule>
    </div>
    <section className="shogi-moves"><h3>How every piece moves</h3><dl><div><dt>King</dt><dd>One square in any direction.</dd></div><div><dt>Rook</dt><dd>Any unobstructed distance orthogonally; promoted Rook also steps one square diagonally.</dd></div><div><dt>Bishop</dt><dd>Any unobstructed distance diagonally; promoted Bishop also steps one square orthogonally.</dd></div><div><dt>Gold General</dt><dd>One forward, backward or sideways, or one diagonally forward; never diagonally backward.</dd></div><div><dt>Silver General</dt><dd>One forward or one diagonally forward/backward. After promotion it moves as Gold.</dd></div><div><dt>Knight</dt><dd>Jumps two ranks forward and one file sideways. It is the only jumping piece. After promotion it moves as Gold.</dd></div><div><dt>Lance</dt><dd>Any unobstructed distance straight forward. After promotion it moves as Gold.</dd></div><div><dt>Pawn</dt><dd>Exactly one square forward; it never moves diagonally to capture. After promotion (Tokin) it moves as Gold.</dd></div></dl></section>
    <section className="shogi-examples"><h3>Examples and edge cases</h3><p><strong>Promotion through the camp:</strong> a Bishop beginning inside the promotion zone and leaving it may still promote. Entering is not the only trigger.</p><p><strong>Captured Dragon:</strong> a promoted Rook is demoted to an ordinary Rook in the captor’s hand and returns unpromoted when dropped.</p><p><strong>Check response by drop:</strong> a held Gold may be dropped between an enemy Rook and your King if that square blocks the attack and satisfies normal drop rules.</p><p><strong>No legal move:</strong> in the unlikely non-check position with no legal action, this digital table awards the opponent a win; this is a stated implementation completion rule.</p></section>
    <section className="shogi-variant-box"><h3>Impasse and variants</h3><p>The app’s “Assess mutual impasse” control activates only when both Kings have entered the opposing camp and neither is checked. Rooks and Bishops count five points; other non-Kings count one. Both sides at 24 or more produces a draw; a side below 24 loses. This models the Japan Shogi Association’s 24-point mutual-impasse baseline but cannot judge the human requirement that mate no longer appears feasible.</p><p>Historical Heian Shogi, Sho Shogi, Chu Shogi, handicaps and modern mini-variants are documented in Research Notes but deliberately not mixed into this standard ruleset.</p></section>
  </article></main>;
}

function Rule({ n, title, children }) { return <section><b>{n} · {title}</b><p>{children}</p></section>; }

function ResearchNotes() {
  return <main className="shogi-research"><header><p>RESEARCH DOSSIER · CLAIMS LABELED BY CONFIDENCE</p><h2>Shogi: a documented modern game with medieval ancestors</h2><span>Japan · standard form consolidated by the sixteenth century · living tradition</span></header>
    <section className="shogi-research-summary"><article><b>SHORT SUMMARY</b><p>Shogi is Japan’s two-player chess-family game. The chosen implementation is present-day standard Shogi: an 81-square board, 40 pieces, promotion and captured-piece drops. Its core rules are documented rather than reconstructed.</p></article><article><b>WHY IT FITS</b><p>The abstract game and historical tradition are old and suitable for an original themed adaptation. The implementation uses independently supplied Arctic artwork and freshly written rules; it copies neither modern commercial board art nor published rulebook prose.</p></article></section>
    <div className="shogi-evidence-grid">
      <Evidence status="confirmed" title="Modern board and force">The Japan Shogi Association specifies a 9×9 board and 20 pieces of eight types per player. The standard opening position and movements are confirmed.</Evidence>
      <Evidence status="confirmed" title="Current competitive rules">JSA rules define checkmate, promotion, drops, nifu, dead-piece placements, pawn-drop mate, fourfold repetition, perpetual check and impasse.</Evidence>
      <Evidence status="confirmed" title="Eleventh-century evidence">Sixteen pentagonal pieces were excavated at Kōfuku-ji with a wooden document dated 1058. The finds include King, Gold, Silver, Knight and Pawn pieces.</Evidence>
      <Evidence status="strong" title="Textual evidence">Shin Sarugakuki (usually dated 1058–1064) mentions shogi; the early-thirteenth-century Nichūreki describes small and large Heian forms.</Evidence>
      <Evidence status="reconstructed" title="Route into Japan">A chess ancestor derived ultimately from Indian chaturanga is the leading view, but the date and route—via China/Korea or Southeast Asia—are not established.</Evidence>
      <Evidence status="strong" title="Standard form">The JSA history places removal of the Drunk Elephant and emergence of hon-shōgi, including reuse of captured pieces, around the fifteenth–sixteenth centuries.</Evidence>
      <Evidence status="uncertain" title="Why drops began">The common explanation that captured-piece reuse prevented drawn-out games is a historical hypothesis, not an evidenced founding event.</Evidence>
      <Evidence status="modern" title="Digital completion policies">Undo, a one-ply practice bot and non-check no-move loss are interface policies. They are not claims about historical play.</Evidence>
    </div>
    <section className="shogi-adaptation"><h3>Arctic Dominion adaptation</h3><div><p><strong>Sente/Gote →</strong> Crimson and Sapphire Shogunates, while move order remains first player then second player.</p><p><strong>Promotion zone →</strong> the rival’s three-rank frost camp, indicated by a quiet non-color overlay.</p><p><strong>Captured pieces →</strong> visible “hands” beside the board; selecting one reveals legal drop squares.</p><p><strong>Orientation →</strong> faction color, shape and text labels identify ownership without relying on color alone.</p><p><strong>Board and pieces →</strong> the exact user-supplied Arctic board and role sheets, mechanically cropped for runtime use.</p><p><strong>Rulebook →</strong> a pale ice-scroll panel using original wording and no reproduced modern diagram.</p></div></section>
    <section className="shogi-variants"><h3>Variants considered</h3><p><strong>Heian Shogi:</strong> ancestral and incompletely pinned down; omitted because its setup, board and drops do not equal modern Shogi. <strong>Sho Shogi:</strong> a medieval 9×9 predecessor with a Drunk Elephant; omitted. <strong>Chu/Dai Shogi:</strong> larger historical relatives with many additional pieces; omitted. <strong>Handicap Shogi:</strong> standard rules with one side removing material; suitable for a later toggle. <strong>Mini/Kyoto Shogi:</strong> modern variants; out of scope.</p><p><strong>Chosen version:</strong> standard hon-shōgi because it is authoritative, globally recognizable, fully implementable, and matches the supplied 9×9 board and fourteen illustrated piece states.</p></section>
    <section className="shogi-sources"><h3>Sources</h3>
      <a href="https://www.shogi.or.jp/match/taikyoku_rules/" target="_blank" rel="noreferrer"><strong>Japan Shogi Association</strong><span>Official Match Rules, revised 1 October 2025</span><i>PRIMARY · RULES</i></a>
      <a href="https://www.shogi.or.jp/history/story/" target="_blank" rel="noreferrer"><strong>Japan Shogi Association</strong><span>History of Japanese Shogi: origins, Kōfuku-ji finds and medieval development</span><i>INSTITUTIONAL · HISTORY</i></a>
      <a href="https://www.pref.nara.lg.jp/ikasu-nara/bunkashigen/main10693.html" target="_blank" rel="noreferrer"><strong>Nara Prefecture</strong><span>Kōfuku-ji excavated Shogi pieces, writing-practice tablets and scroll label</span><i>MUSEUM · ARCHAEOLOGY</i></a>
      <a href="https://www.shogi.or.jp/event/english-pamphlet.pdf" target="_blank" rel="noreferrer"><strong>Japan Shogi Association</strong><span>Customs of Shogi: English introduction, setup, movement and drops</span><i>PRIMARY · GUIDE</i></a>
      <a href="https://fesashogi.eu/rules/" target="_blank" rel="noreferrer"><strong>Federation of European Shogi Associations</strong><span>Laws and tournament interpretations</span><i>SECONDARY AUTHORITY</i></a>
    </section>
    <section className="shogi-uncertainties"><h3>Remaining uncertainties</h3><p>No source establishes an exact date or transmission route for Shogi’s arrival in Japan, and the 1058 pieces do not prove that the excavated game used today’s complete setup. The precise origin and motivation of captured-piece drops also remain inferential. These uncertainties affect historical framing, not the implemented modern rules.</p></section>
  </main>;
}

function Evidence({ status, title, children }) { return <article className={`shogi-evidence ${status}`}><span>{status.toUpperCase()}</span><h3>{title}</h3><p>{children}</p></article>; }
function shortRole(piece) { const name = displayPieceName(piece); return name === "Dragon King" ? "DRAGON" : name === "Dragon Horse" ? "HORSE" : name === "Tokin" ? "TOKIN" : name.replace(" General", "").replace("Promoted ", "+").toUpperCase(); }
function squareLabel(index, piece, targets) { const { row, col } = coordinatesOf(index); return `${9 - col}${String.fromCharCode(97 + row)}${piece ? `, ${sideName(piece.side)} ${displayPieceName(piece)}` : ", empty"}${targets?.length ? ", legal destination" : ""}`; }
function outcomeTitle(state) { if (state.winner) return `${sideName(state.winner)} wins`; if (state.draw) return "Drawn match"; return sideName(state.turn); }
function outcomeDetail(state, check) {
  if (!state.winner && !state.draw) return check ? "Your King is attacked. Only moves that remove check are highlighted." : state.turn === "red" ? "Crimson advances toward the top of the board." : "Sapphire advances toward the bottom of the board.";
  return ({ checkmate: "Checkmate. The opposing King has no legal escape.", "no-legal-move": "The opposing side has no legal move.", repetition: "The same complete position occurred four times without perpetual check.", "perpetual-check": "The side that continued checking through the repeated cycle loses.", impasse: "Both entered Kings retained at least 24 material points.", "impasse-points": "The side below 24 material points loses the impasse assessment." })[state.result] || "The match is complete.";
}
