/** Visual contract: a separate ivory Xiangqi field uses the user-supplied Red and Blue role coins on standard intersections; it does not alter Sanguo Qi. */
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, RotateCcw, Undo2 } from "lucide-react";
import {
  applyXiangqiMove, demoXiangqiState, initialXiangqiState, legalTargets, pieceAt, ROLE_LABELS, SIDE_LABELS,
  squareKey, type XiangqiPiece, type XiangqiRole, type XiangqiSide, type XiangqiSquare, type XiangqiState,
} from "@/game/xiangqiRules";
import "@/xiangqi.css";

const ROLE_ASSETS: Record<XiangqiSide, Record<XiangqiRole, string>> = {
  red: {
    general: "/assets/heritage-arcade/tokens/token-sanguo-red-general.webp", advisor: "/assets/heritage-arcade/tokens/token-sanguo-red-advisor.webp",
    elephant: "/assets/heritage-arcade/tokens/token-sanguo-red-elephant.webp", horse: "/assets/heritage-arcade/tokens/token-sanguo-red-horse.webp",
    chariot: "/assets/heritage-arcade/tokens/token-sanguo-red-chariot.webp", cannon: "/assets/heritage-arcade/tokens/token-sanguo-red-cannon.webp",
    soldier: "/assets/heritage-arcade/tokens/token-sanguo-red-soldier.webp",
  },
  black: {
    general: "/assets/heritage-arcade/tokens/token-sanguo-blue-general.webp", advisor: "/assets/heritage-arcade/tokens/token-sanguo-blue-advisor.webp",
    elephant: "/assets/heritage-arcade/tokens/token-sanguo-blue-elephant.webp", horse: "/assets/heritage-arcade/tokens/token-sanguo-blue-horse.webp",
    chariot: "/assets/heritage-arcade/tokens/token-sanguo-blue-chariot.webp", cannon: "/assets/heritage-arcade/tokens/token-sanguo-blue-cannon.webp",
    soldier: "/assets/heritage-arcade/tokens/token-sanguo-blue-soldier.webp",
  },
};

const ROLE_GUIDE: { role: XiangqiRole; move: string }[] = [
  { role: "general", move: "One orthogonal point inside the palace. The two Generals may never face on an open file." },
  { role: "advisor", move: "One diagonal point, always inside its palace." },
  { role: "elephant", move: "Exactly two diagonal points; a filled eye blocks it and it cannot cross the river." },
  { role: "horse", move: "One orthogonal leg then one diagonal point outward; the leg cannot be occupied." },
  { role: "chariot", move: "Any unobstructed distance along a file or rank." },
  { role: "cannon", move: "Slides without capture; captures only by jumping exactly one screen." },
  { role: "soldier", move: "One point forward; after crossing the river, may also move one point sideways, never backward." },
];

const X = 88; const Y = 78; const COL = 92; const ROW = 86;
const point = ({ row, col }: XiangqiSquare) => ({ x: X + col * COL, y: Y + row * ROW });
const allSquares = Array.from({ length: 90 }, (_, index) => ({ row: Math.floor(index / 9), col: index % 9 }));
const palaceDiagonals = [
  [{ row: 0, col: 3 }, { row: 2, col: 5 }], [{ row: 0, col: 5 }, { row: 2, col: 3 }],
  [{ row: 9, col: 3 }, { row: 7, col: 5 }], [{ row: 9, col: 5 }, { row: 7, col: 3 }],
] as const;

const armyName = (side: XiangqiSide) => side === "red" ? "Red / Shu" : "Blue / Wei · Black army";
const count = (pieces: XiangqiPiece[], side: XiangqiSide) => pieces.filter((piece) => piece.side === side).length;

export default function XiangqiBoard({ onBack }: { onBack: () => void }) {
  const demoMode = new URLSearchParams(window.location.search).has("demo");
  const [state, setState] = useState<XiangqiState>(() => demoMode ? demoXiangqiState() : initialXiangqiState());
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<XiangqiState[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const selectedPiece = state.pieces.find((piece) => piece.id === selected);
  const targets = useMemo(() => selectedPiece ? legalTargets(selectedPiece, state.pieces) : [], [selectedPiece, state.pieces]);
  const targetKeys = useMemo(() => new Set(targets.map(squareKey)), [targets]);

  const reset = () => { setState(initialXiangqiState()); setSelected(null); setHistory([]); };
  const undo = () => {
    const snapshot = history.at(-1);
    if (!snapshot) return;
    setState(snapshot); setHistory((past) => past.slice(0, -1)); setSelected(null);
  };
  const chooseSquare = (square: XiangqiSquare) => {
    if (state.winner) return;
    const piece = pieceAt(state.pieces, square);
    if (piece?.side === state.turn) { setSelected((current) => current === piece.id ? null : piece.id); return; }
    if (!selectedPiece || !targetKeys.has(squareKey(square))) return;
    const next = applyXiangqiMove(state, selectedPiece.id, square);
    if (!next) return;
    setHistory((past) => [...past.slice(-80), state]); setState(next); setSelected(null);
  };

  return <main className="xiangqi-screen">
    <header className="xiangqi-header">
      <button className="xiangqi-back" type="button" onClick={onBack}><ArrowLeft size={15} /> Atlas</button>
      <div className="xiangqi-title"><span>DOCUMENTED RULES · TWO-PLAYER TABLE</span><h1>Xiangqi <em>— Polar Command</em></h1><p>90 intersections · 32 supplied role coins · palace, river, and flying-General protection</p></div>
      <div className="xiangqi-actions"><button type="button" onClick={() => setGuideOpen((open) => !open)}><BookOpen size={14} /> {guideOpen ? "Hide guide" : "Rules guide"}</button><button type="button" disabled={!history.length} onClick={undo}><Undo2 size={14} /> Undo</button><button type="button" onClick={reset}><RotateCcw size={14} /> Reset</button></div>
    </header>

    <section className="xiangqi-layout">
      <aside className="xiangqi-match-rail">
        <span className="xiangqi-eyebrow">COMMAND STATE</span><h2>{state.winner ? `${armyName(state.winner)} wins` : `${armyName(state.turn)} to move`}</h2><p>{state.note}</p>
        {(["red", "black"] as XiangqiSide[]).map((side) => <article key={side} className={`xiangqi-army-card ${state.turn === side ? "active" : ""} ${state.winner === side ? "winner" : ""}`} style={{ "--army": side === "red" ? "#ef5a4d" : "#398ecf" } as React.CSSProperties}><img src={ROLE_ASSETS[side].general} alt="" /><div><strong>{armyName(side)}</strong><span>{count(state.pieces, side)} field coins</span></div><b>{state.turn === side && !state.winner ? "TURN" : state.winner === side ? "WON" : ""}</b></article>)}
        <div className="xiangqi-rule-pulse"><b>STANDARD XIANGQI</b><p>Red opens. Your General can never remain in check or on an open file facing the opposing General.</p></div>
        <div className="xiangqi-last-move"><b>LAST COMMAND</b><span>{state.lastMove ? `${SIDE_LABELS[state.lastMove.side]} ${ROLE_LABELS[state.lastMove.role]} · ${String.fromCharCode(97 + state.lastMove.to.col)}${10 - state.lastMove.to.row}` : "Opening formation deployed."}</span></div>
      </aside>

      <section className="xiangqi-board-panel">
        <div className="xiangqi-caption"><span>{demoMode ? "ICE RIVER BATTLEFIELD · DEMO POSITION" : "ICE RIVER BATTLEFIELD"}</span><strong>COMMAND {state.moveNumber}</strong></div>
        <svg className="xiangqi-board" viewBox="0 0 910 930" aria-label="Standard Xiangqi board with 90 intersections">
          <rect className="xiangqi-board-base" x="22" y="22" width="866" height="886" rx="8" />
          <rect className="xiangqi-river" x={X} y={point({ row: 4, col: 0 }).y + 3} width={COL * 8} height={ROW - 6} />
          {Array.from({ length: 10 }, (_, row) => <line key={`rank-${row}`} className="xiangqi-rail" x1={X} y1={point({ row, col: 0 }).y} x2={X + COL * 8} y2={point({ row, col: 0 }).y} />)}
          {Array.from({ length: 9 }, (_, col) => <g key={`file-${col}`}><line className="xiangqi-rail" x1={point({ row: 0, col }).x} y1={Y} x2={point({ row: 4, col }).x} y2={point({ row: 4, col }).y} /><line className="xiangqi-rail" x1={point({ row: 5, col }).x} y1={point({ row: 5, col }).y} x2={point({ row: 9, col }).x} y2={point({ row: 9, col }).y} /></g>)}
          {palaceDiagonals.map(([start, end], index) => <line key={`palace-${index}`} className="xiangqi-rail xiangqi-palace-line" x1={point(start).x} y1={point(start).y} x2={point(end).x} y2={point(end).y} />)}
          <text className="xiangqi-river-label" x="258" y="493">ICE RIVER</text><text className="xiangqi-river-label xiangqi-river-label-right" x="655" y="493">FROST BOUNDARY</text>
          {allSquares.map((square) => { const location = point(square); const occupied = pieceAt(state.pieces, square); const target = targetKeys.has(squareKey(square)); const wasMoved = state.lastMove && (squareKey(state.lastMove.from) === squareKey(square) || squareKey(state.lastMove.to) === squareKey(square)); return <g key={squareKey(square)} className="xiangqi-point-group" onClick={() => chooseSquare(square)} role="button" tabIndex={0} aria-label={`rank ${10 - square.row}, file ${String.fromCharCode(97 + square.col)}`}><circle className={`xiangqi-point ${target ? "legal" : ""} ${target && occupied ? "capture" : ""} ${wasMoved ? "last" : ""}`} cx={location.x} cy={location.y} r={target ? 15 : 5} />{occupied && <g className={`xiangqi-piece ${selected === occupied.id ? "selected" : ""}`} transform={`translate(${location.x} ${location.y})`}><circle className="xiangqi-piece-pad" r="34" /><image className="xiangqi-piece-art" href={ROLE_ASSETS[occupied.side][occupied.role]} x="-34" y="-34" width="68" height="68" preserveAspectRatio="xMidYMid meet" /><circle className="xiangqi-piece-ring" r="34" /></g>}</g>; })}
          <text className="xiangqi-side-label" x="104" y="62">BLUE / WEI · BLACK ARMY</text><text className="xiangqi-side-label" x="104" y="888">RED / SHU ARMY</text>
        </svg>
        <div className="xiangqi-board-key"><span><i className="legal" /> legal intersection</span><span><i className="capture" /> capture target</span><span><i className="last" /> last command</span><span>Coins sit on intersections, never inside squares.</span></div>
      </section>

      <aside className="xiangqi-guide-rail">
        <span className="xiangqi-eyebrow">FIELD DOCTRINE</span><h2>Every rule is live.</h2><p>Choose an active coin. Turquoise targets are already filtered for blockers, river and palace limits, check, and flying-General exposure.</p>
        <div className="xiangqi-rule-list">{ROLE_GUIDE.map(({ role, move }) => <article key={role} className={selectedPiece?.role === role ? "focused" : ""}><img src={ROLE_ASSETS.red[role]} alt="" /><div><strong>{ROLE_LABELS[role]}</strong><span>{move}</span></div></article>)}</div>
        {guideOpen && <div className="xiangqi-source-note"><b>LOCAL TABLE SCOPE</b><p>Checkmate and stalemate award the game. This hot-seat release records move history but does not yet adjudicate tournament repetition, perpetual check, or perpetual chase.</p><a href="https://en.wikipedia.org/wiki/Xiangqi" target="_blank" rel="noreferrer">Read the researched source notes ↗</a></div>}
      </aside>
    </section>
  </main>;
}
