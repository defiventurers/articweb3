import { useEffect, useMemo, useRef, useState } from "react";
import {
  FACTION_LABELS,
  FACTIONS,
  TYPE_LABELS,
  TYPES,
  applyAction,
  assetRole,
  createInitialState,
  getBoardPiece,
  getHand,
  getLegalActions,
  isHomeTerritory,
  isInCheck
} from "./rules.js";
import { HEX_CELLS, neighbor, pointyTopCorners, projectPointyTop } from "./hex.js";
import "./sanninShogi.css";

const SIZE = 30;
const BOARD_ART = "/assets/games/sannin-shogi/board.webp";
const BOARD_VIEW_SIZE = 1179;
const BOARD_WIDTH = 1334;
const BOARD_HEIGHT = 1179;
// New hexagonal grid background: centred at (667, 590) in the 1334×1179 image.
// Pointy-top 127-cell radius-6 board measures 623.54×540 at size=30; scaled to
// fit within the visible grid area (approx 800×800) centred on image centre.
const GRID_SCALE = 1.32;
const GRID_TRANSFORM = "translate(667 590) scale(1.32 1.32)";
const ROTATION = { red: 120, green: 0, blue: -120 };
const SHORT = { king: "K", rook: "R", bishop: "B", gold: "G", silver: "S", knight: "N", lance: "L", pawn: "P" };
const ALLIANCE_OPTIONS = [
  { value: "none", label: "No opening alliance" },
  { value: "green-blue", label: "Middle + Last allied" }
];

function assetUrl(piece) {
  return `/assets/games/sannin-shogi/${piece.owner}-${assetRole(piece)}.webp`;
}

function pieceLabel(piece) {
  const promoted = piece.promoted ? (piece.type === "king" ? "Illuminated " : "Promoted ") : "";
  return `${FACTION_LABELS[piece.owner]} ${promoted}${TYPE_LABELS[piece.type]}`;
}

function BoardPiece({ piece, center }) {
  const PIECE_SIZE = 63;
  const halfPiece = PIECE_SIZE / 2;
  return (
    <>
      <g className={`sannin-piece sannin-piece--${piece.owner}`} transform={`rotate(${ROTATION[piece.owner]} ${center.x} ${center.y})`}>
        <image href={assetUrl(piece)} x={center.x - halfPiece} y={center.y - halfPiece} width={PIECE_SIZE} height={PIECE_SIZE} preserveAspectRatio="xMidYMid meet" />
      </g>
      {piece.promoted && piece.type === "king" && <g className="sannin-piece__plus" aria-hidden="true"><circle cx={center.x + 21} cy={center.y - 19} r="13" /><text x={center.x + 21} y={center.y - 15}>+K</text></g>}
    </>
  );
}

export function SanninBoard({ state, selected, legalActions, onCell, onCancel, zoom }) {
  const destinations = new Set(legalActions.map((action) => action.to).filter(Boolean));
  const illuminatedCells = new Set(legalActions.filter((action) => action.type === "illuminate").flatMap((action) => action.targets)
    .map((id) => state.pieces.find((piece) => piece.id === id)?.cell).filter(Boolean));
  const selectedPiece = selected?.kind === "piece" ? state.pieces.find((piece) => piece.id === selected.id) : null;
  const [focusCell, setFocusCell] = useState("0,0");
  const cellRefs = useRef({});
  const keyDirections = { ArrowRight: 0, q: 1, Q: 1, ArrowUp: 2, ArrowLeft: 3, e: 4, E: 4, ArrowDown: 5 };

  function handleKey(event, cell) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCell(cell.id);
      return;
    }
    const direction = keyDirections[event.key];
    if (direction === undefined) return;
    event.preventDefault();
    const next = neighbor(cell, direction);
    if (!next) return;
    const id = `${next.q},${next.r}`;
    setFocusCell(id);
    requestAnimationFrame(() => cellRefs.current[id]?.focus());
  }

  return (
    <div className="sannin-board-scroll" aria-label="Sannin Shogi board region">
      <p id="sannin-key-help" className="sannin-visually-hidden">Use arrow keys for four hex directions, Q for upper-right, E for lower-left, Enter or Space to select, and Escape to cancel.</p>
      <svg className="sannin-board" style={{ "--sannin-board-scale": zoom / 100 }} viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} role="grid" aria-rowcount="13" aria-label="127-cell pointy-top hex board" aria-describedby="sannin-key-help">
        <image className="sannin-board-art" href={BOARD_ART} x="0" y="0" width={BOARD_WIDTH} height={BOARD_HEIGHT} preserveAspectRatio="xMinYMin meet" aria-hidden="true" />
        <defs>
          <radialGradient id="sannin-garden" cx="50%" cy="42%" r="70%"><stop offset="0" stopColor="#ffe49a" /><stop offset="1" stopColor="#57cae8" /></radialGradient>
          <linearGradient id="sannin-ice" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#dff8ff" /><stop offset="1" stopColor="#77bad8" /></linearGradient>
          <filter id="sannin-glow"><feGaussianBlur stdDeviation="2.8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g className="sannin-grid-layer" transform={GRID_TRANSFORM}>
        {HEX_CELLS.map((cell) => {
          const center = projectPointyTop(cell, SIZE);
          const points = pointyTopCorners(cell, SIZE).map((point) => `${point.x},${point.y}`).join(" ");
          const piece = getBoardPiece(state, cell.id);
          const home = FACTIONS.find((faction) => isHomeTerritory(cell.id, faction));
          const isSelected = selectedPiece?.cell === cell.id;
          const target = destinations.has(cell.id);
          const illuminationTarget = illuminatedCells.has(cell.id);
          const lastFrom = state.lastAction?.from === cell.id;
          const lastTo = state.lastAction?.to === cell.id;
          const checked = piece?.type === "king" && isInCheck(state, piece.owner);
          const classes = ["sannin-cell", home && `sannin-cell--${home}`, cell.id === "0,0" && "sannin-cell--garden", isSelected && "is-selected", target && "is-target", illuminationTarget && "is-illumination-target", lastFrom && "was-from", lastTo && "was-to", checked && "is-check"].filter(Boolean).join(" ");
          const territory = cell.id === "0,0" ? "Pleasure Garden" : home ? `${FACTION_LABELS[home]} home territory` : "international ground";
          const stateLabel = [isSelected && "selected", target && (piece ? "legal capture" : selected?.kind === "hand" ? "legal drop" : "legal destination"), illuminationTarget && "illumination target", lastFrom && "last move origin", lastTo && "last move destination", checked && "King in check"].filter(Boolean).join(", ");
          return (
            <g key={cell.id} ref={(node) => { cellRefs.current[cell.id] = node; }} role="gridcell" tabIndex={focusCell === cell.id ? 0 : -1} aria-selected={isSelected || undefined} aria-label={`${cell.id}, ${territory}, ${piece ? pieceLabel(piece) : "empty"}${stateLabel ? `, ${stateLabel}` : ""}`} onFocus={() => setFocusCell(cell.id)} onClick={() => onCell(cell.id)} onKeyDown={(event) => handleKey(event, cell)} className="sannin-square">
              <polygon points={points} className={classes} />
              {target && <circle className="sannin-target" cx={center.x} cy={center.y} r={piece ? 22 : 6} />}
              {illuminationTarget && <path className="sannin-illumination-mark" d={`M ${center.x - 10} ${center.y} H ${center.x + 10} M ${center.x} ${center.y - 10} V ${center.y + 10}`} />}
              {cell.id === "0,0" && !piece && <text className="sannin-garden-mark" x={center.x} y={center.y + 4}>PG</text>}
              {piece && <BoardPiece piece={piece} center={center} />}
            </g>
          );
        })}
        </g>
      </svg>
    </div>
  );
}

function Hand({ state, faction, active, selected, onSelect }) {
  const hand = getHand(state, faction);
  const groups = TYPES.map((type) => ({ type, pieces: hand.filter((piece) => piece.type === type) })).filter((group) => group.pieces.length);
  return (
    <section className={`sannin-hand sannin-hand--${faction} ${active ? "is-active" : ""}`} aria-label={`${FACTION_LABELS[faction]} captured pieces`}>
      <header><span className="sannin-faction-dot" /> <strong>{FACTION_LABELS[faction]}</strong><span className="sannin-forward" style={{ transform: `rotate(${ROTATION[faction]}deg)` }} aria-label={`${FACTION_LABELS[faction]} forward direction`}>↑</span>{isInCheck(state, faction) && <b className="sannin-check">Check</b>}</header>
      <div className="sannin-hand__pieces">
        {groups.length ? groups.map(({ type, pieces }) => (
          <button key={type} disabled={!active} aria-pressed={selected?.kind === "hand" && selected.id === pieces[0].id} aria-label={`${active ? "Choose drop: " : "Captured "}${TYPE_LABELS[type]}, ${pieces.length}`} className={selected?.kind === "hand" && selected.id === pieces[0].id ? "is-selected" : ""} onClick={() => onSelect(pieces[0].id)} title={`Drop ${TYPE_LABELS[type]}`}>
            <img src={`/assets/games/sannin-shogi/${faction}-${type}.webp`} alt="" /><span>{SHORT[type]} ×{pieces.length}</span>
          </button>
        )) : <span className="sannin-empty-hand">No pieces in hand</span>}
      </div>
    </section>
  );
}

function useModalFocus(containerRef, onClose) {
  useEffect(() => {
    const previous = document.activeElement;
    const container = containerRef.current;
    const focusable = () => [...container.querySelectorAll("button:not(:disabled), a[href], select:not(:disabled), [tabindex]:not([tabindex='-1'])")];
    (focusable()[0] || container).focus();
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [containerRef, onClose]);
}

function Rulebook({ onClose }) {
  const [tab, setTab] = useState("play");
  const dialogRef = useRef(null);
  useModalFocus(dialogRef, onClose);
  return (
    <div className="sannin-modal" role="dialog" aria-modal="true" aria-labelledby="sannin-rules-title">
      <article className="sannin-scroll" ref={dialogRef} tabIndex={-1}>
        <button className="sannin-close" onClick={onClose} aria-label="Close rulebook">×</button>
        <p className="sannin-kicker">Heritage rule scroll</p>
        <h2 id="sannin-rules-title">Sannin Shogi</h2>
        <div className="sannin-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "play"} className={tab === "play" ? "is-active" : ""} onClick={() => setTab("play")}>How to play</button>
          <button role="tab" aria-selected={tab === "research"} className={tab === "research" ? "is-active" : ""} onClick={() => setTab("research")}>Research notes</button>
        </div>
        {tab === "play" ? <div className="sannin-prose">
          <h3>Object</h3>
          <p>Win by safely moving your King into the central Pleasure Garden, or by becoming the final surviving player. Checkmate normally eliminates one army; alliance mate has special consequences.</p>
          <h3>Board and turns</h3>
          <p>The board is a regular radius-6 hex: 127 pointy-top cells in 13 rows. First, Middle, then Last move clockwise. Each starts with 18 pieces on the nearest three ranks.</p>
          <div className="sannin-setup-diagram" aria-label="Relative setup: back rank Lance Silver Gold King Gold Silver Lance; second rank Bishop and Rook; front rank eight Pawns around one Knight">
            <span>L · S · G · K · G · S · L</span><span>B · · · · · R</span><span>P · P · P · P · N · P · P · P · P</span>
          </div>
          <p>On the board, use the arrow keys for four directions and Q/E for the remaining two hex directions. Enter or Space activates a cell; Escape cancels selection.</p>
          <h3>Movement</h3>
          <ul>
            <li><b>King:</b> one adjacent hex; illuminated +K ranges on all twelve orthogonal and radian lines.</li>
            <li><b>Rook:</b> four main lines plus the directly rear radian; promoted Rook ranges on all six main lines.</li>
            <li><b>Bishop:</b> all six radian lines; promoted Bishop also steps to all adjacent cells.</li>
            <li><b>Gold:</b> six steps: four main and forward/rear radian. It does not promote.</li>
            <li><b>Silver:</b> four diagonal-forward/rear main steps and two forward radian steps; promoted Silver also ranges directly forward/rear on radian lines.</li>
            <li><b>Knight:</b> two sideways main steps and four sideways radian steps. It does not jump or promote.</li>
            <li><b>Lance:</b> ranges on two forward main lines; promoted Lance also ranges on the two rear main lines.</li>
            <li><b>Pawn:</b> steps on either forward main line; promoted Pawn moves as Gold.</li>
          </ul>
          <p className="sannin-note"><b>Radian lines:</b> their landing cells are hex-distance two apart. They pass between the two flanking cells, so those flanking pieces do not block the ray.</p>
          <h3>Capture, drops and promotion</h3>
          <p>Capture by displacement. The captive changes allegiance, demotes, and enters your hand. A drop uses your turn. There is no two-pawns-on-a-file rule; dead Pawn/Lance drops and immediate pawn-drop mate are forbidden.</p>
          <p>K, R, B, S, L and P may promote when a move enters, leaves, or stays within an opponent territory, or enters/leaves the Garden. Promotion is optional except when an unpromoted Pawn or Lance would have no future move.</p>
          <h3>Royal powers</h3>
          <p>Before it has moved or ever been checked, a King may castle-jump anywhere in its own three-rank territory. +K may instead illuminate: on each of twelve rays it captures the first enemy encountered only if neither opponent protects it; every eligible ray resolves together.</p>
          <h3>Alliances</h3>
          <p>Two players may begin allied, and certain consecutive material-winning attacks compel an alliance. Allies may capture each other's nonroyal pieces but may never check one another. They lose promotion and Garden rights; all unused castling ends, while the lone King illuminates. Mating either ally defeats both. If allies mate the lone player, that army leaves and the alliance dissolves.</p>
          <h3>Draw and repetition</h3>
          <p>A move that recreates an earlier full position is illegal; the initiator must vary. A player with no legal action while not checked causes a draw.</p>
        </div> : <div className="sannin-prose">
          <h3>Historical edition</h3>
          <p>This implementation follows the Kokusai Sannin Shogi rules attributed to Tanigasaki Jisuke, devised around 1930–31 and published in 1932. It is a modern historical Japanese variant, not an ancient folk game.</p>
          <h3>Evidence baseline</h3>
          <p>Rules use John Fairbairn's English Shogi Magazine transcription, cross-checked against Kapitan Revival no. 40 and Shogi Geppo material. The setup was checked against the surviving diagram and museum records.</p>
          <ul className="sannin-sources">
            <li><a href="https://sanko-bunka-kenkyujo.or.jp/untitled56.html" target="_blank" rel="noreferrer">Sanko Culture Research Institute — 1932 book record</a></li>
            <li><a href="https://www.ne.jp/asahi/tetsu/toybox/kapitan/kp040.htm" target="_blank" rel="noreferrer">Kapitan Revival no. 40 — Japanese rules/history</a></li>
            <li><a href="https://jpsearch.go.jp/item/tokyomuseumcolection-edo_tokyo_museumjbD03000508" target="_blank" rel="noreferrer">Japan Search / Edo-Tokyo Museum record</a></li>
            <li><a href="https://commons.wikimedia.org/wiki/File:Sannin_setup.svg" target="_blank" rel="noreferrer">Historical setup diagram</a></li>
          </ul>
          <h3>Transparent digital policies</h3>
          <p>The source passage for illumination is ambiguous; this edition deterministically removes all eligible first targets, one per ray. Position identity also records turn, pieces, hands, alliance and royal rights so prohibited repetition can be enforced. The compulsory-alliance detector applies the documented consecutive material-winning attack test.</p>
          <p>The supplied art includes a promoted Knight although this ruleset does not promote Knights. That image is preserved as archival art but is never used in play. Because no +K image was supplied, +K retains the original King art with a visible halo and “+K” marker.</p>
        </div>}
      </article>
    </div>
  );
}

function PromotionDialog({ choices, onChoose, onClose }) {
  const dialogRef = useRef(null);
  useModalFocus(dialogRef, onClose);
  return <div className="sannin-modal" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
    <article className="sannin-choice" ref={dialogRef} tabIndex={-1}>
      <p className="sannin-kicker">Territory crossing</p><h2 id="promotion-title">Promote this piece?</h2>
      <p>Promotion changes its movement from this landing onward.</p>
      <div><button onClick={() => onChoose(choices.find((action) => action.promote))} className="sannin-primary">Promote</button><button onClick={() => onChoose(choices.find((action) => !action.promote))}>Do not promote</button><button onClick={onClose}>Cancel</button></div>
    </article>
  </div>;
}

export default function SanninShogiApp({ onExit }) {
  const [allianceChoice, setAllianceChoice] = useState("none");
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [promotionChoice, setPromotionChoice] = useState(null);
  const [notice, setNotice] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const legal = useMemo(() => state ? getLegalActions(state) : [], [state]);
  const selectedActions = useMemo(() => {
    if (!selected) return [];
    return legal.filter((action) => action.pieceId === selected.id);
  }, [legal, selected]);

  function resetDocumentScroll() {
    requestAnimationFrame(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }

  function begin() {
    const alliance = allianceChoice === "none" ? null : allianceChoice.split("-");
    setState(createInitialState({ alliance }));
    setHistory([]);
    setSelected(null);
    setNotice("");
    resetDocumentScroll();
  }

  function commit(action) {
    const result = applyAction(state, action);
    if (result.error) {
      setNotice(result.error.message);
      return;
    }
    setHistory((past) => [...past, state]);
    setState(result.state);
    setSelected(null);
    setPromotionChoice(null);
    setNotice("");
  }

  function chooseCell(cell) {
    if (!state || state.outcome) return;
    const choices = selectedActions.filter((action) => action.to === cell);
    if (choices.length === 1) return commit(choices[0]);
    if (choices.length > 1) {
      setPromotionChoice(choices);
      return;
    }
    const piece = getBoardPiece(state, cell);
    if (piece?.owner === state.turn) {
      setSelected({ kind: "piece", id: piece.id });
      setNotice("");
    } else {
      if (selected) setNotice("Choose a highlighted legal destination, or press Escape to cancel.");
      else setNotice(piece ? "Select a piece belonging to the active player." : "Select one of the active player's pieces first.");
    }
  }

  function undo() {
    if (!history.length) return;
    setState(history[history.length - 1]);
    setHistory((past) => past.slice(0, -1));
    setSelected(null);
    setNotice("Move undone.");
  }

  function returnToSetup() {
    if (state?.ply && !window.confirm("Leave this match and return to setup?")) return;
    setState(null);
    setHistory([]);
    setSelected(null);
    setNotice("");
    resetDocumentScroll();
  }

  if (!state) return (
    <main className="sannin-shell sannin-setup">
      <div className="sannin-aurora" />
      <section className="sannin-setup-card">
        <p className="sannin-kicker">Arctic Dominion Heritage Table 24</p>
        <h1>Sannin Shogi</h1>
        <p className="sannin-subtitle">Three Homes, One Pleasure Garden</p>
        <div className="sannin-board-seal" aria-hidden="true"><span>127</span><small>ice cells</small></div>
        <p>Seat three players around a faithful radius-6 hex board. This release is deterministic local hot-seat play.</p>
        <label>Opening pact
          <select value={allianceChoice} onChange={(event) => setAllianceChoice(event.target.value)}>
            {ALLIANCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <p className="sannin-setup-note">With an alliance, the lone player moves First and begins with an illuminated King. Seat assignment is explicit for transparent local play.</p>
        <ol className="sannin-onboarding" aria-label="Three quick steps">
          <li><b>Find your seat.</b><span>Each player follows the persistent forward arrow.</span></li>
          <li><b>Tap, then land.</b><span>Select a piece and one highlighted destination.</span></li>
          <li><b>Capture and return.</b><span>Captured pieces join your hand; tap one to drop it.</span></li>
        </ol>
        <div className="sannin-setup-actions">
          <button className="sannin-primary" onClick={begin}>Begin match</button>
          <button onClick={() => setRulesOpen(true)}>Open rule scroll</button>
          {onExit && <button onClick={onExit}>Back to Arcade</button>}
        </div>
      </section>
      {rulesOpen && <Rulebook onClose={() => setRulesOpen(false)} />}
    </main>
  );

  const illumination = selectedActions.find((action) => action.type === "illuminate");
  return (
    <main className="sannin-shell">
      <div className="sannin-aurora" />
      <header className="sannin-topbar">
        <div><p className="sannin-kicker">Heritage Table 24</p><h1>Sannin Shogi</h1></div>
        <div className="sannin-topbar__actions">
          <button onClick={undo} disabled={!history.length}>Undo</button>
          <button onClick={() => setRulesOpen(true)}>Rules & research</button>
          <button onClick={returnToSetup}>New match</button>
          {onExit && <button onClick={onExit}>Exit</button>}
        </div>
      </header>
      <div className="sannin-status" aria-live="polite">
        {state.outcome ? <strong>{state.outcome.message}</strong> : <><span className={`sannin-turn sannin-turn--${state.turn}`} /> <strong>{FACTION_LABELS[state.turn]} to move</strong>{isInCheck(state, state.turn) && <b className="sannin-check">Answer check</b>}<span>Turn {state.ply + 1}</span></>}
        <span>{state.alliance ? `${FACTIONS.filter((faction) => state.alliance.includes(faction)).map((faction) => FACTION_LABELS[faction]).join(" + ")} allied` : "No alliance"}</span>
      </div>
      {notice && <div className="sannin-notice" role="alert">{notice}</div>}
      <div className="sannin-play-layout">
        <aside className="sannin-roster">
          {FACTIONS.map((faction) => <Hand key={faction} state={state} faction={faction} active={state.turn === faction && !state.outcome} selected={selected} onSelect={(id) => setSelected({ kind: "hand", id })} />)}
          <div className="sannin-legend"><b>Pleasure Garden</b><span>The glowing central cell grants an immediate safe-King victory unless that King is allied.</span></div>
        </aside>
        <section className="sannin-board-panel">
          <SanninBoard state={state} selected={selected} legalActions={selectedActions} onCell={chooseCell} onCancel={() => { setSelected(null); setPromotionChoice(null); setNotice("Selection cancelled."); }} zoom={zoom} />
          <div className="sannin-board-actions">
            <span>{selected ? `${selectedActions.length} legal action${selectedActions.length === 1 ? "" : "s"} selected` : "Select one of your pieces or a captured piece."}</span>
            <div className="sannin-zoom" aria-label="Board zoom controls"><button onClick={() => setZoom(100)}>Fit</button><button aria-label="Zoom board out" onClick={() => setZoom((value) => Math.max(100, value - 25))}>−</button><button aria-label="Zoom board in" onClick={() => setZoom((value) => Math.min(200, value + 25))}>+</button></div>
            {illumination && <button className="sannin-illuminate" onClick={() => commit(illumination)}>Illuminate {illumination.targets.length} target{illumination.targets.length === 1 ? "" : "s"}</button>}
            {selected && <button onClick={() => setSelected(null)}>Clear</button>}
          </div>
          {selected && <div className="sannin-inspector" aria-live="polite">{(() => { const piece = state.pieces.find((item) => item.id === selected.id); return piece ? <><img src={assetUrl(piece)} alt="" /><span><b>{pieceLabel(piece)}</b><small>{piece.status === "hand" ? "Captured and ready to drop" : `${piece.cell} · ${selectedActions.length} legal actions`}</small></span></> : null; })()}</div>}
          {state.outcome && <div className="sannin-result"><strong>{state.outcome.message}</strong><button className="sannin-primary" onClick={begin}>Rematch</button><button onClick={returnToSetup}>Return to setup</button>{onExit && <button onClick={onExit}>All Games</button>}</div>}
        </section>
      </div>
      {promotionChoice && <PromotionDialog choices={promotionChoice} onChoose={commit} onClose={() => setPromotionChoice(null)} />}
      {rulesOpen && <Rulebook onClose={() => setRulesOpen(false)} />}
    </main>
  );
}
