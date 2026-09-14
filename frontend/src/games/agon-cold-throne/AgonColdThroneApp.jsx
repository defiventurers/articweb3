import { useEffect, useMemo, useRef, useState } from "react";
import {
  AGON_RULESET,
  CELLS,
  CELL_BY_ID,
  SIDES,
  actionSummary,
  applyAction,
  chooseAgonBotAction,
  createAgonState,
  describeTurn,
  getActingSide,
  getLegalActions,
  getPendingPieces,
  pieceAt,
  resultDetail,
  resultTitle
} from "./rules.js";

const BOT_SIDE = "coral";

// Reuse the established Arctic Dominion artwork instead of drawing a parallel
// HTML/SVG penguin set. Blue and pink map to Sapphire and Coral courts.
const ARCTIC_PIECE_ART = Object.freeze({
  blue: {
    queen: "/assets/artic/pieces/blue-frost-king.png",
    guard: "/assets/artic/pieces/blue-snow-guard.png"
  },
  coral: {
    queen: "/assets/artic/pieces/pink-frost-king.png",
    guard: "/assets/artic/pieces/pink-snow-guard.png"
  }
});

export function AgonColdThroneApp({ onExitToLibrary }) {
  const [tab, setTab] = useState("play");
  const [mode, setMode] = useState("hotseat");
  const [variant, setVariant] = useState("owner-choice");
  const [state, setState] = useState(() => createAgonState());
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [message, setMessage] = useState("");
  const [undoStack, setUndoStack] = useState([]);
  const botTimer = useRef(null);

  const actions = useMemo(() => getLegalActions(state), [state]);
  const actingSide = getActingSide(state);
  const forcedPieces = getPendingPieces(state, state.currentPlayer);
  const selectableIds = useMemo(() => new Set(actions.map((action) => action.pieceId)), [actions]);
  const impliedSelection = actions.length && actions.every((action) => action.pieceId === actions[0].pieceId) ? actions[0].pieceId : null;
  const activeSelection = selectableIds.has(selectedPieceId) ? selectedPieceId : impliedSelection;
  const targetActions = useMemo(() => new Map(actions.filter((action) => action.pieceId === activeSelection).map((action) => [action.to, action])), [actions, activeSelection]);

  useEffect(() => () => window.clearTimeout(botTimer.current), []);
  useEffect(() => {
    window.clearTimeout(botTimer.current);
    if (tab !== "play" || mode !== "bot" || state.winner || state.isDraw || actingSide !== BOT_SIDE) return;
    botTimer.current = window.setTimeout(() => {
      const action = chooseAgonBotAction(state, BOT_SIDE);
      if (action) commitAction(action, BOT_SIDE);
    }, 620);
    return () => window.clearTimeout(botTimer.current);
  }, [tab, mode, state, actingSide]);

  function restart(next = {}) {
    const nextMode = next.mode || mode;
    const nextVariant = next.variant || variant;
    setMode(nextMode);
    setVariant(nextVariant);
    setState(createAgonState({ mode: nextMode, variant: nextVariant }));
    setSelectedPieceId(null);
    setMessage("");
    setUndoStack([]);
  }

  function commitAction(action, actor = actingSide) {
    const result = applyAction(state, action, actor);
    if (result.error) return setMessage(result.error);
    setUndoStack((history) => [...history.slice(-79), state]);
    setState(result.state);
    setSelectedPieceId(null);
    setMessage(actionSummary(result.state.lastAction));
  }

  function handleCell(cellId) {
    if (state.winner || state.isDraw || (mode === "bot" && actingSide === BOT_SIDE)) return;
    const targetAction = targetActions.get(cellId);
    if (targetAction) return commitAction(targetAction);
    const occupant = pieceAt(state, cellId);
    if (occupant && selectableIds.has(occupant.id)) {
      setSelectedPieceId(occupant.id === selectedPieceId ? null : occupant.id);
      setMessage(occupant.kind === "queen" ? "Queen selected. Choose a glowing inward or lateral hex." : "Guard selected. Choose a glowing inward or lateral hex.");
      return;
    }
    setMessage(forcedPieces.length ? "Select a displaced piece in the return dock, then choose a highlighted hex." : "Choose a glowing piece, then one of its highlighted destinations.");
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setState(previous);
    setUndoStack((history) => history.slice(0, -1));
    setSelectedPieceId(null);
    setMessage("The last action was undone.");
  }

  return (
    <section className="agon-app" aria-label="Agon — The Queen's Cold Throne">
      <header className="agon-topbar">
        <button type="button" className="agon-back" onClick={onExitToLibrary}>← All Games</button>
        <div className="agon-title-lockup"><span className="agon-sigil" aria-hidden="true">✦</span><div><p>AGON · 1842</p><h1>The Queen’s Cold Throne</h1></div></div>
        <div className="agon-badges"><span>DOCUMENTED RULES</span><span>2 PLAYERS</span><span>FREE PLAY · NO TRANSACTION</span></div>
      </header>

      <nav className="agon-tabs" aria-label="Game sections">
        {["play", "rulebook", "research"].map((name) => <button key={name} type="button" className={tab === name ? "active" : ""} onClick={() => setTab(name)} aria-current={tab === name ? "page" : undefined}>{name === "research" ? "Research Notes" : name[0].toUpperCase() + name.slice(1)}</button>)}
      </nav>

      {tab === "play" && <PlayTable
        state={state}
        mode={mode}
        variant={variant}
        actions={actions}
        actingSide={actingSide}
        selectableIds={selectableIds}
        activeSelection={activeSelection}
        targetActions={targetActions}
        message={message}
        undoDisabled={!undoStack.length || (mode === "bot" && actingSide === BOT_SIDE)}
        onCell={handleCell}
        onSelectPiece={setSelectedPieceId}
        onUndo={undo}
        onRestart={() => restart()}
        onMode={(nextMode) => restart({ mode: nextMode })}
        onVariant={(nextVariant) => restart({ variant: nextVariant })}
        onHelp={() => setTab("rulebook")}
      />}
      {tab === "rulebook" && <Rulebook onPlay={() => setTab("play")} />}
      {tab === "research" && <ResearchNotes />}
    </section>
  );
}

function PlayTable({ state, mode, variant, actions, actingSide, selectableIds, activeSelection, targetActions, message, undoDisabled, onCell, onSelectPiece, onUndo, onRestart, onMode, onVariant, onHelp }) {
  const pending = getPendingPieces(state, state.currentPlayer);
  const progress = Object.fromEntries(SIDES.map((side) => [side, courtProgress(state, side)]));
  return (
    <main className="agon-play">
      <aside className="agon-command-panel">
        <section className="agon-turn-card" data-side={actingSide}>
          <span>{state.winner || state.isDraw ? "CONTEST COMPLETE" : actingSide === state.currentPlayer ? "ACTIVE COURT" : "RIVAL DECREE"}</span>
          <h2>{state.winner || state.isDraw ? resultTitle(state) : courtName(actingSide)}</h2>
          <p>{state.winner || state.isDraw ? resultDetail(state) : describeTurn(state)}</p>
        </section>
        <div className="agon-controls">
          <label>Play mode<select value={mode} onChange={(event) => onMode(event.target.value)}><option value="hotseat">Local two player</option><option value="bot">Practice vs Frost Bot</option></select></label>
          <label>Queen return<select value={variant} onChange={(event) => onVariant(event.target.value)}><option value="owner-choice">Owner chooses · documented</option><option value="rival-decree">Rival chooses · 1975 variant</option></select></label>
          <div className="agon-button-row"><button type="button" onClick={onUndo} disabled={undoDisabled}>Undo</button><button type="button" onClick={onRestart}>Restart</button><button type="button" onClick={onHelp}>Rules</button></div>
        </div>
        <div className="agon-legend"><span><i className="inward" /> Inward move</span><span><i className="sideways" /> Same-ring move</span><span><i className="capture" /> Sandwich displacement</span></div>
      </aside>

      <section className="agon-board-column">
        <div className="agon-board-caption"><span>SIX RINGS · 91 HEXES</span><strong>TURN {state.turn}</strong></div>
        <div className="agon-board-shell">
          <div className="agon-board" role="grid" aria-label="Agon hexagonal board">
            {CELLS.map((cell) => {
              const occupant = pieceAt(state, cell.id);
              const selectable = occupant && selectableIds.has(occupant.id);
              const selected = occupant?.id === activeSelection;
              const target = targetActions.get(cell.id);
              const pendingCapture = occupant && state.pendingRelocations.includes(occupant.id);
              return <button
                key={cell.id}
                type="button"
                role="gridcell"
                aria-label={cellAria(cell, occupant, selectable, target)}
                className={`agon-hex ring-${cell.ring} ${cell.ring === 0 ? "throne" : ""} ${selectable ? "selectable" : ""} ${selected ? "selected" : ""} ${target ? "target" : ""} ${pendingCapture ? "displaced" : ""}`}
                style={{ left: `${cell.x}%`, top: `${cell.y}%`, "--ring": cell.ring }}
                disabled={!selectable && !target}
                onClick={() => onCell(cell.id)}
              >
                {cell.ring === 0 && !occupant && <span className="agon-throne-mark" aria-hidden="true">♛</span>}
                {occupant && <PieceToken piece={occupant} />}
                {target && <span className="agon-target-dot" aria-hidden="true" />}
              </button>;
            })}
          </div>
        </div>
        <div className="agon-event" role={message ? "status" : undefined}><span>ICE CHRONICLE</span><p>{message || describeTurn(state)}</p></div>
        {(state.winner || state.isDraw) && <div className="agon-result"><strong>{resultTitle(state)}</strong><span>{resultDetail(state)}</span><button type="button" onClick={onRestart}>Play again</button></div>}
      </section>

      <aside className="agon-courts">
        {SIDES.map((side) => <CourtCard key={side} side={side} state={state} progress={progress[side]} active={state.currentPlayer === side} />)}
        <section className={`agon-return-dock ${pending.length ? "active" : ""}`}>
          <header><span>RETURN DOCK</span><strong>{pending.length ? `${pending.length} displaced` : "The ice is calm"}</strong></header>
          <p>{pending.length ? "Queen first; otherwise choose any displaced Guard." : "Sandwiched pieces wait here until their owner's next turn."}</p>
          <div>{pending.map((piece) => {
            const selectable = actions.some((action) => action.pieceId === piece.id);
            return <button key={piece.id} type="button" className={activeSelection === piece.id ? "selected" : ""} disabled={!selectable} onClick={() => onSelectPiece(piece.id)} aria-label={`Select displaced ${courtName(piece.side)} ${piece.kind}`}><PieceToken piece={piece} compact /></button>;
          })}</div>
        </section>
      </aside>
    </main>
  );
}

function PieceToken({ piece, compact = false }) {
  const art = ARCTIC_PIECE_ART[piece.side][piece.kind];
  return <span className={`agon-piece ${piece.side} ${piece.kind} ${compact ? "compact" : ""}`} aria-hidden="true">
    <img src={art} alt="" draggable="false" />
    <b>{piece.kind === "queen" ? "♛" : "◆"}</b>
  </span>;
}

function CourtCard({ side, state, progress, active }) {
  const displaced = state.pendingRelocations.filter((pieceId) => pieceId.startsWith(side)).length;
  return <section className={`agon-court-card ${side} ${active ? "active" : ""}`}><header><PieceToken piece={{ side, kind: "queen" }} compact /><div><span>{side === "blue" ? "NORTH AURORA" : "ROSE AURORA"}</span><strong>{courtName(side)}</strong></div></header><div className="agon-progress"><i style={{ width: `${progress.percent}%` }} /></div><footer><span>Queen ring {progress.queenRing}</span><span>{progress.guardsAtCrown}/6 Guards at crown</span>{displaced > 0 && <span>{displaced} displaced</span>}</footer></section>;
}

function Rulebook({ onPlay }) {
  return <main className="agon-scroll-page"><article className="agon-scroll">
    <header><span className="agon-scroll-seal">♛</span><p>ORIGINAL WORDING · DOCUMENTED CORE</p><h2>Field Guide to the Cold Throne</h2><button type="button" onClick={onPlay}>Return to play</button></header>
    <section className="agon-rule-lead"><strong>Objective</strong><p>Win by placing your Queen on the central throne and your six Guards on all six hexes immediately around her.</p></section>
    <div className="agon-rule-grid">
      <section><b>1 · Setup</b><p>Each court begins with one Queen and six Guards in the documented symmetric pattern on the 30-cell outer ring. Sapphire moves first. There is no randomizer.</p></section>
      <section><b>2 · Turn</b><p>On a normal turn, move one piece exactly one adjacent hex. A move may stay on the same numbered ring or enter the next ring toward the throne.</p></section>
      <section><b>3 · No retreat</b><p>A piece may never voluntarily move to a ring farther from the throne. Pieces do not jump. A Guard may not enter the central throne.</p></section>
      <section><b>4 · Sandwich</b><p>If your moved piece and another of your pieces stand on opposite sides of an adjacent enemy in one straight hex-axis, that enemy is displaced.</p></section>
      <section><b>5 · Forced return</b><p>On its owner’s next turn, a displaced Guard must return to any safe vacant hex on the outer ring. A displaced Queen may return to any safe vacant hex. Returning consumes the turn.</p></section>
      <section><b>6 · Several displaced</b><p>If a side has several displaced pieces, return one on each of that side’s turns. The Queen must return before Guards; Guards may return in any order.</p></section>
      <section><b>7 · Unsafe entry</b><p>You may not voluntarily move or return a piece directly between two enemy pieces aligned on opposite sides of that destination.</p></section>
      <section><b>8 · Empty-throne forfeit</b><p>If your six Guards completely surround an empty throne while your Queen remains elsewhere, you lose immediately.</p></section>
    </div>
    <section className="agon-examples"><h3>Examples and edge cases</h3><dl><div><dt>Lateral progress</dt><dd>A Guard on ring 4 may step to an adjacent ring-4 hex or an adjacent ring-3 hex, but never back to ring 5.</dd></div><div><dt>Double displacement</dt><dd>One move can complete two straight sandwiches. Both enemy pieces enter the return queue; a Queen in that queue returns first.</dd></div><div><dt>Return can interact</dt><dd>A returned piece is placed as the turn’s move. It may create a sandwich, but it may not be returned into an enemy sandwich.</dd></div><div><dt>Queen on throne</dt><dd>The Queen may enter the throne before every Guard is ready. Victory waits until the entire seven-piece formation is present.</dd></div><div><dt>No legal move</dt><dd>The app awards the rival a blockade win. This is an explicit digital completion policy, not a claim about Peacock’s printed laws.</dd></div><div><dt>Long repetition</dt><dd>Threefold repetition or 160 capture-free plies ends in a draw. Both limits are modern safeguards and are shown in Research Notes.</dd></div></dl></section>
    <section className="agon-variant-box"><h3>Variant selector</h3><p><strong>Owner chooses</strong> follows the early documented rule: the owner chooses a captured Queen’s vacant return hex. <strong>Rival’s decree</strong> follows a later published variant in which the opponent chooses it. Changing the selector restarts the match so no rule changes mid-game.</p></section>
  </article></main>;
}

function ResearchNotes() {
  return <main className="agon-research"><header><p>RESEARCH DOSSIER · CLAIMS LABELED BY CONFIDENCE</p><h2>Agon, not an ancient game</h2><span>The name is Greek for “contest,” but the documented game is Victorian British.</span></header>
    <section className="agon-research-summary"><article><b>SHORT SUMMARY</b><p>Agon is a deterministic two-player race-and-interference game credited to London inventor Anthony Peacock and documented from 1842. Its unusually early hex-cell board, inward-only movement and non-destructive sandwich displacement make it an excellent heritage-style Arctic Dominion adaptation.</p></article><article><b>ORIGINAL BOARD</b><p>A six-cells-per-side hexagon contains 91 smaller hexes: one throne plus rings of 6, 12, 18, 24 and 30. Each side has one Queen and six Guards; all begin on the outer ring in a half-turn-symmetric arrangement.</p></article></section>
    <div className="agon-evidence-grid">
      <Evidence status="confirmed" title="Date, place and inventor">The British Library catalogue records Thomas Sherwin’s 1842 rule publication; the 1851 Great Exhibition catalogue names A. Peacock of Islington as inventor and exhibitor of the board, pieces and instructions.</Evidence>
      <Evidence status="confirmed" title="Documented rules">Mid-century public-domain rulebooks agree on the Queen-and-six-Guard objective, inward/lateral one-step movement, sandwich displacement, return destinations, Queen-first priority and the empty-throne forfeit.</Evidence>
      <Evidence status="strong" title="First hex-cell board game">Board-game scholarship commonly describes Agon as the earliest known published board game played on hexagonal cells. “Earliest known” is safer than claiming it was the first ever made.</Evidence>
      <Evidence status="uncertain" title="Eighteenth-century French origin">Older accounts linked similar boards on French game tables to Agon. Later chronology research argues those boards were probably later additions, so this project does not use an eighteenth-century or French origin claim.</Evidence>
      <Evidence status="reconstructed" title="Digital stalemate handling">The early rules do not supply a robust draw protocol. Blockade loss, threefold repetition and the 160-ply limit are implementation safeguards, visibly labeled as modern.</Evidence>
      <Evidence status="modern" title="Rival chooses Queen return">A 1975 rules compilation gives the opponent control of the captured Queen’s return square. It is implemented only as an optional toggle; the owner-choice rule remains default.</Evidence>
    </div>
    <section className="agon-adaptation"><h3>Arctic Dominion adaptation</h3><div><p><strong>Throne →</strong> a luminous Crown Crystal in the calm center of a frozen sea.</p><p><strong>Queen →</strong> one crowned pudgy penguin ruler per court.</p><p><strong>Guards →</strong> six jeweled penguin Wardens marked with a diamond, preserving instant role recognition.</p><p><strong>Rings →</strong> alternating ice-pressure bands with numeric tone changes, not copied historical decoration.</p><p><strong>Capture →</strong> “displacement”: a harmless gust carries the sandwiched penguin to a visible return dock.</p><p><strong>Accessibility →</strong> color plus crown/diamond symbols, text turn announcements, strong focus rings and non-color move markers.</p></div></section>
    <section className="agon-implementation"><h3>Implementation specification</h3><ul><li><strong>Board:</strong> axial hex coordinates <code>{`{q,r}`}</code>, radius 5; a cell’s ring is <code>max(|q|, |r|, |q+r|)</code>.</li><li><strong>Pieces:</strong> 14 records with stable id, side, kind, cell and status. A null cell plus “relocating” status means off-board pending return.</li><li><strong>Turn state:</strong> current owner, acting side, pending relocation queue, variant, ply, no-progress counter, history and repetition map.</li><li><strong>Legal moves:</strong> inspect six axial neighbors; destination must be empty, adjacent and on the same or a lower ring. The center rejects Guards and a simulated destination rejects self-sandwich.</li><li><strong>Capture:</strong> from the moved destination, test all six rays for adjacent enemy plus friendly support one cell farther; queue and remove every qualifying enemy simultaneously.</li><li><strong>Outcomes:</strong> check royal formation, forbidden empty ring, repetition, no-progress limit and next-side mobility after every completed action.</li><li><strong>Undo/reset:</strong> immutable snapshots back every action; rule or mode changes create a clean documented setup.</li><li><strong>Bot:</strong> deterministic one-ply heuristic favors inward progress, crown formation and multi-captures; it is a practice opponent, not a solved-game engine.</li></ul></section>
    <section className="agon-improvements"><h3>Rigorous review and improvements applied</h3><p>The first draft risked calling Agon ancient, hiding captured pieces, and leaving stalemates undefined. The final design corrects the period to Victorian, shows a dedicated return dock and queued priority, labels every later policy, prevents mid-match variant changes, keeps the full board above the fold on desktop, and turns side panels into a vertical flow below the board on phones. The board and tokens are code-drawn for crisp scaling; the generated cover is original and used only in the collection.</p></section>
    <section className="agon-sources"><h3>Source reliability notes</h3><a href="https://books.google.com/books?id=sD4CAAAAQAAJ" target="_blank" rel="noreferrer"><strong>Family Pastimes; or, Homes Made Happy</strong><span>R. K. Philp, 1852 · near-contemporary public-domain rules and strategic advice</span><i>PRIMARY RULE TEXT ↗</i></a><a href="https://upload.wikimedia.org/wikipedia/commons/2/2c/Fireside_games%3B_for_winter_evening_amusement_%28IA_firesidegamesfor00frik%29.pdf" target="_blank" rel="noreferrer"><strong>Fireside Games for Winter Evening Amusement</strong><span>1866 scan · independent period restatement with diagrams and numbered laws</span><i>PRIMARY RULE TEXT ↗</i></a><a href="https://www.e-rara.ch/download/pdf/22342354.pdf" target="_blank" rel="noreferrer"><strong>Great Exhibition catalogue</strong><span>1851 · entry 193 identifies A. Peacock as inventor and displays Agon apparatus</span><i>PRIMARY CATALOGUE ↗</i></a><a href="https://www.giochidelloca.it/storia/depaulis_12.pdf" target="_blank" rel="noreferrer"><strong>Board Game Studies Colloquium XIII proceedings</strong><span>2010 · Edward Copisarow’s archival chronology is the strongest corrective to older origin stories</span><i>SCHOLARLY ↗</i></a><a href="https://commons.wikimedia.org/wiki/File:Agon_board_1.svg" target="_blank" rel="noreferrer"><strong>Wikimedia Commons setup diagram</strong><span>Modern CC BY-SA reference used to cross-check geometry and starting placement, not copied into the artwork</span><i>LICENSED REFERENCE ↗</i></a></section>
    <section className="agon-uncertainties"><h3>Remaining uncertainties</h3><p>The surviving sources do not fully standardize who chooses a captured Queen’s destination, whether a return placement may itself trigger displacement, or formal draw/stalemate treatment. This build defaults to the near-contemporary owner-choice wording, treats return as a full move capable of capture, and isolates digital completion rules as modern. The alternative free-placement opening described in period sources is documented but not enabled in v1 to keep onboarding and bot play consistent.</p></section>
  </main>;
}

function Evidence({ status, title, children }) { return <article className={`agon-evidence ${status}`}><span>{status.replace("-", " ").toUpperCase()}</span><h3>{title}</h3><p>{children}</p></article>; }
function courtName(side) { return side === "blue" ? "Sapphire Court" : "Coral Court"; }
function courtProgress(state, side) { const queen = state.pieces.find((piece) => piece.side === side && piece.kind === "queen"); const queenRing = queen?.cell ? CELL_BY_ID[queen.cell].ring : "off"; const guardsAtCrown = state.pieces.filter((piece) => piece.side === side && piece.kind === "guard" && CELL_BY_ID[piece.cell]?.ring === 1).length; const progress = (queenRing === 0 ? 3 : Math.max(0, 2 - Number(queenRing))) + guardsAtCrown; return { queenRing, guardsAtCrown, percent: Math.max(4, Math.min(100, (progress / 9) * 100)) }; }
function cellAria(cell, occupant, selectable, target) { const where = cell.ring === 0 ? "central throne" : `ring ${cell.ring}, axial ${cell.id}`; if (target) return `${where}, legal destination`; if (occupant) return `${where}, ${courtName(occupant.side)} ${occupant.kind}${selectable ? ", selectable" : ""}`; return `${where}, empty`; }
