/** Visual contract: a separate ivory Xiangqi field uses the user-supplied Red and Blue role coins on standard intersections; it does not alter Sanguo Qi. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, RotateCcw, Undo2, Maximize2, PanelRight, Menu, X as Close, Crosshair, Expand, Minimize2 } from "lucide-react";
import {
  applyXiangqiMove, demoXiangqiState, initialXiangqiState, isInCheck, legalTargets, pieceAt, ROLE_LABELS,
  squareKey, type XiangqiMove, type XiangqiPiece, type XiangqiRole, type XiangqiSide, type XiangqiSquare, type XiangqiState,
} from "@/game/xiangqiRules";
import "@/xiangqi.css";
import { XiangqiLobby } from "../../../xiangqi/XiangqiLobby.jsx";
import XiangqiBotWorker from "../../../xiangqi/bot.worker.ts?worker";
import "../../../xiangqi/xiangqiLobby.css";
import "../../../xiangqi/xiangqiBattle.css";
import { xiangqiBattleLayout } from "../../../xiangqi/battleLayout.js";

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

const BOARD_LEFT = 40;
const BOARD_TOP = 35;
const BOARD_RIGHT = 872;
const BOARD_BOTTOM = 905;
const XIANGQI_X = [105.6842, 187.2919, 269.563, 353.8246, 453.3461, 556.8485, 641.11, 723.3812, 804.3254];
const XIANGQI_Y = [87.0335, 169.5933, 256.3158, 337.488, 416.5789, 507.4641, 584.4737, 662.177, 746.1244, 831.4593];
const point = ({ row, col }: XiangqiSquare) => ({ x: XIANGQI_X[col], y: XIANGQI_Y[row] });
const hitArea = ({ row, col }: XiangqiSquare) => {
  const left = col === 0 ? BOARD_LEFT : (XIANGQI_X[col - 1] + XIANGQI_X[col]) / 2;
  const right = col === 8 ? BOARD_RIGHT : (XIANGQI_X[col] + XIANGQI_X[col + 1]) / 2;
  const top = row === 0 ? BOARD_TOP : (XIANGQI_Y[row - 1] + XIANGQI_Y[row]) / 2;
  const bottom = row === 9 ? BOARD_BOTTOM : (XIANGQI_Y[row] + XIANGQI_Y[row + 1]) / 2;
  return { x: left, y: top, width: right - left, height: bottom - top };
};
const allSquares = Array.from({ length: 90 }, (_, index) => ({ row: Math.floor(index / 9), col: index % 9 }));

const armyName = (side: XiangqiSide) => side === "red" ? "Red / Shu" : "Blue / Wei";
const count = (pieces: XiangqiPiece[], side: XiangqiSide) => pieces.filter((piece) => piece.side === side).length;

type MatchConfig = { humans: XiangqiSide[]; difficulty: string };
export default function XiangqiBoard({ onBack }: { onBack: () => void }) {
  const [rules, setRules] = useState(false);
  if (rules) return <main className="xiangqi-screen xiangqi-rules-page"><button className="xiangqi-back" onClick={() => setRules(false)}>Back to setup</button><h1>Xiangqi field guide</h1><p>Red moves first. Protect your General; checkmate and stalemate both award the opponent a win.</p><div className="xiangqi-rule-list">{ROLE_GUIDE.map(({role,move}) => <article key={role}><img src={ROLE_ASSETS.red[role]} alt="" /><div><strong>{ROLE_LABELS[role]}</strong><span>{move}</span></div></article>)}</div><p>Moves must answer check and cannot expose facing Generals. Tournament repetition and perpetual chase are not adjudicated by this table.</p></main>;
  return <XiangqiLobby onExit={onBack} onRules={() => setRules(true)} renderMatch={(props: any) => <XiangqiMatch {...props} />} />;
}

export function XiangqiMatch({ config, onSetup, onExitToLibrary, online }: { config: MatchConfig; onSetup: () => void; onExitToLibrary: () => void; online?: any }) {
  const demoMode = new URLSearchParams(window.location.search).has("demo");
  const [localState, setState] = useState<XiangqiState>(() => demoMode ? demoXiangqiState() : initialXiangqiState());
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<XiangqiState[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const rulesRef = useRef<HTMLDialogElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const layoutRef = useRef<HTMLElement>(null);
  const [dimensions, setDimensions] = useState(() => ({ width: window.innerWidth, height: window.innerHeight-64 }));
  const [fullscreen, setFullscreen] = useState(false);
  const [observedMoves, setObservedMoves] = useState<{ number: number; move: XiangqiMove }[]>([]);
  const state: XiangqiState = online?.room.gameState ?? localState;
  const [focused, setFocused] = useState(false);
  const [botError, setBotError] = useState("");
  const layout = xiangqiBattleLayout(dimensions.width, dimensions.height, focused);
  const compact = layout.mode === "compact";
  const checked = !state.winner && isInCheck(state.turn,state.pieces);
  const humanTurn = config.humans.includes(state.turn);
  const notice = online?.notice || botError || (!humanTurn && !state.winner ? "Bot is thinking…" : state.note);
  useEffect(() => {
    const measure = () => {
      const box = layoutRef.current?.getBoundingClientRect();
      if (box?.width && box.height) setDimensions({ width: box.width, height: box.height });
    };
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    if (layoutRef.current) observer?.observe(layoutRef.current);
    window.addEventListener("resize",measure);
    window.visualViewport?.addEventListener("resize",measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize",measure); window.visualViewport?.removeEventListener("resize",measure); };
  }, []);
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange",update);
    return () => document.removeEventListener("fullscreenchange",update);
  }, []);
  useEffect(() => {
    if (!state.lastMove) { setObservedMoves([]); return; }
    setObservedMoves(moves => [...moves.filter(entry => entry.number < state.moveNumber), { number: state.moveNumber, move: state.lastMove! }].slice(-24));
  }, [state]);
  useEffect(() => {
    const dialog = drawerRef.current;
    if (drawerOpen && dialog && !dialog.open) dialog.showModal?.();
    else if (!drawerOpen && dialog?.open) dialog.close?.();
  }, [drawerOpen]);
  useEffect(() => {
    const dialog = rulesRef.current;
    if (rulesOpen && dialog && !dialog.open) dialog.showModal?.();
    else if (!rulesOpen && dialog?.open) dialog.close?.();
  }, [rulesOpen]);
  const toggleFullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await shellRef.current?.requestFullscreen(); }
    catch { setFocused(value => !value); }
  };

  const canAct = online ? online.canAct : humanTurn && !state.winner;
  useEffect(() => {
    setSelected(null);
  }, [state]);
  useEffect(() => {
    if (online || humanTurn || state.winner || botError) return;
    const worker = new XiangqiBotWorker();
    const timer = setTimeout(() => worker.postMessage({ state, difficulty: config.difficulty }), 350);
    worker.onmessage = ({ data }) => {
      if (data.error || !data.action) { setBotError("The bot could not finish its turn. Retry to continue."); return; }
      const next = applyXiangqiMove(state,data.action.pieceId,data.action.to);
      if (!next) { setBotError("The bot could not finish its turn. Retry to continue."); return; }
      setHistory(past => [...past.slice(-80),state]); setState(next);
    };
    worker.onerror = () => setBotError("The bot could not finish its turn. Retry to continue.");
    return () => { clearTimeout(timer); worker.terminate(); };
  }, [state, config.difficulty, humanTurn, online, botError]);
  const selectedPiece = state.pieces.find((piece) => piece.id === selected);
  const targets = useMemo(() => selectedPiece ? legalTargets(selectedPiece, state.pieces) : [], [selectedPiece, state.pieces]);
  const targetKeys = useMemo(() => new Set(targets.map(squareKey)), [targets]);

  const reset = () => { setState(initialXiangqiState()); setSelected(null); setHistory([]); setBotError(""); };
  const undo = () => {
    if (online) return;
    // Return to the previous human decision, including its bot reply.
    let index = history.length-1;
    while (index > 0 && !config.humans.includes(history[index].turn)) index--;
    const snapshot = history[index];
    if (!snapshot) return;
    setState(snapshot); setHistory(past => past.slice(0,index)); setSelected(null); setBotError("");
  };
  const chooseSquare = (square: XiangqiSquare) => {
    if (state.winner || !canAct) return;
    const piece = pieceAt(state.pieces, square);
    if (piece?.side === state.turn) { setSelected((current) => current === piece.id ? null : piece.id); return; }
    if (!selectedPiece || !targetKeys.has(squareKey(square))) return;
    if (online) { online.onAction({ pieceId: selectedPiece.id, to: square }); setSelected(null); return; }
    const next = applyXiangqiMove(state, selectedPiece.id, square);
    if (!next) return;
    setHistory((past) => [...past.slice(-80), state]); setState(next); setSelected(null);
  };

  const squareName = (square: XiangqiSquare) => `${String.fromCharCode(97+square.col)}${10-square.row}`;
  const moveText = (move: XiangqiMove) => `${ROLE_LABELS[move.role]} ${squareName(move.from)} → ${squareName(move.to)}${move.captured ? ` · ${ROLE_LABELS[move.captured]} captured` : ""}`;
  const selectionText = selectedPiece ? `${armyName(selectedPiece.side)} ${ROLE_LABELS[selectedPiece.role]} · ${targets.length} legal destinations` : state.winner ? `${armyName(state.winner)} wins by ${state.result}.` : canAct ? "Select a piece to see its legal destinations." : notice;
  const armies = <section className="xiangqi-armies" aria-label="Army overview">{(["red","black"] as XiangqiSide[]).map(side => <article key={side} className={`xiangqi-army-card ${state.turn === side ? "active" : ""}`} style={{ "--army": side === "red" ? "#ef6a70" : "#65b6ff" } as React.CSSProperties}><img src={ROLE_ASSETS[side].general} alt="" /><div><strong>{armyName(side)}</strong><span>{count(state.pieces,side)} pieces · {config.humans.includes(side) ? "Human" : `${config.difficulty} bot`}</span></div><b>{state.winner === side ? "WON" : state.turn === side && !state.winner ? "TURN" : ""}</b></article>)}</section>;
  const controls = <section className="xiangqi-panel-card xiangqi-controls"><span className="xiangqi-eyebrow">MATCH CONTROLS</span><p>{online ? `Online room ${online.room.roomCode}` : config.humans.length === 2 ? "2 players · All human" : `1 player · ${config.difficulty} bot`}</p><button onClick={onSetup}>{online ? "Room details" : "Match setup"}</button><div><button disabled={Boolean(online) || !history.length} onClick={undo}><Undo2 size={15} /> Undo</button><button disabled={Boolean(online)} onClick={reset}><RotateCcw size={15} /> Reset</button></div>{botError && <button onClick={() => setBotError("")}>Retry bot</button>}</section>;
  const command = <>
    <section className={`xiangqi-panel-card xiangqi-turn-card ${checked ? "in-check" : ""}`}><span className="xiangqi-eyebrow">{state.winner ? "MATCH COMPLETE" : checked ? "GENERAL IN CHECK" : "CURRENT PLAYER"}</span><h2>{armyName(state.winner || state.turn)} {state.winner ? "wins" : "to move"}</h2><p>{state.note}</p></section>
    {armies}
    <section className={`xiangqi-panel-card xiangqi-inspector ${selectedPiece ? "has-selection" : ""}`} aria-label="Piece guidance"><span className="xiangqi-eyebrow">PIECE COMMAND</span>{selectedPiece ? <><div className="xiangqi-selected-piece"><img src={ROLE_ASSETS[selectedPiece.side][selectedPiece.role]} alt="" /><div><strong>{ROLE_LABELS[selectedPiece.role]}</strong><small>{armyName(selectedPiece.side)} · {squareName(selectedPiece)}</small></div></div><p>{ROLE_GUIDE.find(guide => guide.role === selectedPiece.role)?.move}</p><div className="xiangqi-destinations">{targets.map(target => <button key={squareKey(target)} disabled={!canAct} onClick={() => { chooseSquare(target); setDrawerOpen(false); }}>{pieceAt(state.pieces,target) ? "Capture " : "Move "}{squareName(target)}</button>)}</div>{!targets.length && <p>This piece has no legal destination.</p>}</> : <div className="xiangqi-guide-empty"><Crosshair size={32} /><strong>Command the river</strong><p>Choose one of your pieces. Its movement and legal destinations appear here.</p><small>Turquoise marks legal moves. Amber marks captures.</small></div>}</section>
  </>;
  const captures = <section className="xiangqi-panel-card xiangqi-captures" aria-label="Captured pieces"><span className="xiangqi-eyebrow">CAPTURED PIECES</span>{(["red","black"] as XiangqiSide[]).map(side => {
    const missing = initialXiangqiState().pieces.filter(piece => piece.side === side && !state.pieces.some(current => current.id === piece.id));
    return <div key={side}><header><strong>{armyName(side)}</strong><small>{missing.length} lost</small></header>{missing.length ? <div className="xiangqi-capture-shelf">{missing.map(piece => <img key={piece.id} src={ROLE_ASSETS[side][piece.role]} alt={ROLE_LABELS[piece.role]} title={ROLE_LABELS[piece.role]} />)}</div> : <p>Full army on the field.</p>}</div>;
  })}</section>;
  const recent = <section className="xiangqi-panel-card xiangqi-recent"><span className="xiangqi-eyebrow">RECENT COMMANDS</span>{observedMoves.length ? <ol>{[...observedMoves].reverse().map(entry => <li key={entry.number}><span className={entry.move.side}>{armyName(entry.move.side)}</span><small>#{entry.number-1}</small><p>{moveText(entry.move)}</p></li>)}</ol> : <div className="xiangqi-empty-history"><Undo2 size={24} /><p>Your moves appear here as the battle develops.</p></div>}</section>;
  const intel = <>{controls}{captures}{recent}</>;

  return <main ref={shellRef} className={`xiangqi-screen xiangqi-battle ${focused ? "is-focused" : ""}`} data-layout={layout.mode} style={{ "--xiangqi-board-width": `${layout.boardWidth}px`, "--xiangqi-board-height": `${layout.boardHeight}px` } as React.CSSProperties}>
    <header className="xiangqi-battle-bar">
      <button className="xiangqi-icon-button" aria-label="Match setup" title="Match setup" onClick={onSetup}><ArrowLeft size={19} /></button>
      <div className="xiangqi-battle-brand"><span>ARCTIC DOMINION</span><h1>Xiangqi <small>Polar Command</small></h1></div>
      <div className={`xiangqi-battle-status ${state.turn} ${checked ? "in-check" : ""}`}><i /><div><strong>{armyName(state.winner || state.turn)} {state.winner ? "wins" : checked ? "in check" : "to move"}</strong><small>Command {state.moveNumber}</small></div></div>
      <nav aria-label="Battle controls">
        <button className="xiangqi-icon-button" aria-label={focused ? "Full table" : "Focus board"} title={focused ? "Full table" : "Focus board"} aria-pressed={focused} onClick={() => setFocused(value => !value)}><Maximize2 size={18} /></button>
        <button className="xiangqi-icon-button" aria-label="Match panel" title="Match panel" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><PanelRight size={18} /></button>
        <button className="xiangqi-icon-button xiangqi-fullscreen-button" aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} title={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>{fullscreen ? <Minimize2 size={18} /> : <Expand size={18} />}</button>
        <details className="xiangqi-match-menu"><summary aria-label="Table menu"><Menu size={19} /></summary><div><button onClick={() => setRulesOpen(true)}><BookOpen size={15} /> Rules guide</button><button disabled={Boolean(online) || !history.length} onClick={undo}><Undo2 size={15} /> Undo</button><button disabled={Boolean(online)} onClick={reset}><RotateCcw size={15} /> Reset</button><button onClick={onSetup}>Match setup</button><button onClick={onExitToLibrary}>All Games</button></div></details>
      </nav>
    </header>
    <section ref={layoutRef} className="xiangqi-layout">
      {!focused && !compact && <aside className="xiangqi-match-rail">{command}{layout.mode === "single" && intel}</aside>}
      <section className="xiangqi-board-panel">
        {!focused && compact && <div className="xiangqi-phone-armies">{armies}</div>}
        <div className="xiangqi-board-viewport">
        <svg className="xiangqi-board" viewBox="40 35 832 870" aria-label="Standard Xiangqi board with 90 intersections">
          <image
            href="/assets/heritage-arcade/board/xiangqi-arctic-board.png"
            x="40"
            y="35"
            width="832"
            height="870"
            preserveAspectRatio="none"
            pointerEvents="none"
          />
          {allSquares.map((square) => { const location = point(square); const hit = hitArea(square); const occupied = pieceAt(state.pieces, square); const target = targetKeys.has(squareKey(square)); const wasMoved = state.lastMove && (squareKey(state.lastMove.from) === squareKey(square) || squareKey(state.lastMove.to) === squareKey(square)); return <g key={squareKey(square)} className="xiangqi-point-group" onClick={() => chooseSquare(square)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseSquare(square); } }} role="button" tabIndex={canAct && (target || occupied?.side === state.turn) ? 0 : -1} aria-disabled={!canAct} aria-label={`rank ${10 - square.row}, file ${String.fromCharCode(97 + square.col)}`}><rect className="xiangqi-hit-area" x={hit.x} y={hit.y} width={hit.width} height={hit.height} fill="transparent" pointerEvents="all" /><circle className={`xiangqi-point ${target ? "legal" : ""} ${target && occupied ? "capture" : ""} ${wasMoved ? "last" : ""}`} cx={location.x} cy={location.y} r={target ? 15 : 5} />{occupied && <g className={`xiangqi-piece ${selected === occupied.id ? "selected" : ""}`} transform={`translate(${location.x} ${location.y})`}><circle className="xiangqi-piece-pad" r="38" /><image className="xiangqi-piece-art" href={ROLE_ASSETS[occupied.side][occupied.role]} x="-38" y="-38" width="76" height="76" preserveAspectRatio="xMidYMid meet" /><circle className="xiangqi-piece-ring" r="38" /></g>}</g>; })}
        </svg>
        </div>
        {!focused && compact && layout.briefingHeight >= 90 && <section className="xiangqi-phone-briefing"><span className="xiangqi-eyebrow">{selectedPiece ? "PIECE COMMAND" : state.lastMove ? "LAST COMMAND" : "OPENING FORMATION"}</span><div className="xiangqi-phone-shelf">{ROLE_GUIDE.map(({role}) => { const pieces = state.pieces.filter(piece => piece.side === state.turn && piece.role === role); return <button key={role} disabled={!canAct || !pieces.length} aria-label={`Select ${ROLE_LABELS[role]}`} aria-pressed={selectedPiece?.role === role} onClick={() => setSelected((pieces.find(piece => legalTargets(piece,state.pieces).length) || pieces[0]).id)}><img src={ROLE_ASSETS[state.turn][role]} alt="" /><small>{ROLE_LABELS[role]}</small></button>; })}</div><p>{selectedPiece ? ROLE_GUIDE.find(guide => guide.role === selectedPiece.role)?.move : "Choose a piece on the board, or use the command shelf above."}</p>{selectedPiece && <div className="xiangqi-destinations">{targets.map(target => <button key={squareKey(target)} disabled={!canAct} onClick={() => chooseSquare(target)}>{pieceAt(state.pieces,target) ? "Capture " : "Move "}{squareName(target)}</button>)}</div>}<div className="xiangqi-phone-last"><span>{state.lastMove ? moveText(state.lastMove) : "Red opens · Both armies at full strength"}</span><button onClick={() => setDrawerOpen(true)} aria-label="View match details"><PanelRight size={15} /></button></div></section>}
        <footer className="xiangqi-battle-footer"><span>{selectionText}</span>{selectedPiece && <button onClick={() => setSelected(null)}>Clear</button>}<div className="xiangqi-board-key"><span><i className="legal" /> Move</span><span><i className="capture" /> Capture</span><span><i className="last" /> Last</span></div></footer>
      </section>
      {!focused && layout.mode === "wide" && <aside className="xiangqi-guide-rail">{intel}</aside>}
    </section>
    <p className="xiangqi-live-notice" role="status">{notice}</p>
    <dialog ref={drawerRef} className="xiangqi-drawer" aria-labelledby="xiangqi-drawer-title" onCancel={() => setDrawerOpen(false)} onClick={event => { if (event.target === event.currentTarget) setDrawerOpen(false); }}><header><h2 id="xiangqi-drawer-title">Match panel</h2><button className="xiangqi-icon-button" aria-label="Close match panel" onClick={() => setDrawerOpen(false)}><Close size={18} /></button></header><div>{command}{intel}</div></dialog>
    <dialog ref={rulesRef} className="xiangqi-rules-dialog" aria-labelledby="xiangqi-rules-title" onCancel={() => setRulesOpen(false)}><header><h2 id="xiangqi-rules-title">Xiangqi field guide</h2><button className="xiangqi-icon-button" aria-label="Close rules guide" onClick={() => setRulesOpen(false)}><Close size={18} /></button></header><p>Red opens. Checkmate and stalemate both award the opponent a win. Your General cannot remain in check or face the opposing General on an open file.</p><div className="xiangqi-rule-list">{ROLE_GUIDE.map(({role,move}) => <article key={role}><img src={ROLE_ASSETS.red[role]} alt="" /><div><strong>{ROLE_LABELS[role]}</strong><span>{move}</span></div></article>)}</div><p>Tournament repetition, perpetual check and perpetual chase are not adjudicated by this table.</p></dialog>
  </main>;
}
