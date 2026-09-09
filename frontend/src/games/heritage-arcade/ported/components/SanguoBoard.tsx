/* Board artwork and approved coordinates remain in one 1280 × 1124 SVG scene. */
import { useEffect, useMemo, useState, useRef, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent, type CSSProperties } from "react";
import { ArrowLeft, BookOpen, Maximize, Minimize, PanelRightClose, PanelRightOpen, Minus, Plus, Scan, MoreHorizontal, X, Volume2, VolumeX, Flag, Undo2, RotateCcw, AlertTriangle } from "lucide-react";
import SanguoManual from "@/components/SanguoManual";
import { SANGUO_VIEWBOX, type SanguoFaction } from "@/game/sanguoTopology";
import { ARCTIC_BOARD_GRAPH, arcticBoardNode, validateArcticBoardGraph } from "@/game/sanguoArcticBoardGraph";
import {
  generalIsAttacked, legalSanguoTargets, roleLabels,
  sameNode, sanguoFactions, type SanguoNode, type SanguoPiece, type SanguoRole, type SanguoState,
} from "@/game/sanguoRules";
import "@/sanguo.css";
import "@/sanguo-reference-board.css";
import "@/sanguo-trace.css";
import { BOARD_WIDTH, BOARD_HEIGHT, FIT_CAMERA, clampCamera, zoomCamera, snapLegalTarget, coordinateLabel, kingdomLabel, type Camera, type MatchEvent } from "../game/sanguoPresentation";
import { soundManager } from "../../../../utils/soundManager.js";

type Faction = SanguoFaction;
type Role = SanguoRole;
type NodeRef = SanguoNode;
type Piece = SanguoPiece;

const heritageAsset = "/assets/heritage-arcade";
const arcticBoardImage = `${heritageAsset}/board/sanguo-arctic-board.png`;
const useRailDemo = () => new URLSearchParams(window.location.search).has("rail-demo");

const factions: Record<Faction, { name: string; short: string; color: string; base: string }> = {
  red: { name: "Retsba Legion", short: "RED · SHU", color: "#ef5750", base: `${heritageAsset}/board/ppba-retsba-token.png` },
  blue: { name: "Pengu Order", short: "BLUE · WEI", color: "#318eed", base: `${heritageAsset}/board/ppba-pengu-token.png` },
  green: { name: "Abster Tribe", short: "GREEN · WU", color: "#43b86a", base: `${heritageAsset}/board/ppba-abster-token.png` },
};

const teamCoinAssets: Record<Faction, Record<Role, string>> = {
  red: {
    king: `${heritageAsset}/tokens/token-sanguo-red-general.webp`, guard: `${heritageAsset}/tokens/token-sanguo-red-advisor.webp`, seer: `${heritageAsset}/tokens/token-sanguo-red-elephant.webp`, rider: `${heritageAsset}/tokens/token-sanguo-red-horse.webp`,
    icebreaker: `${heritageAsset}/tokens/token-sanguo-red-chariot.webp`, cannon: `${heritageAsset}/tokens/token-sanguo-red-cannon.webp`, scout: `${heritageAsset}/tokens/token-sanguo-red-soldier.webp`, runner: `${heritageAsset}/tokens/token-sanguo-red-bannerman.webp`,
  },
  green: {
    king: `${heritageAsset}/tokens/token-sanguo-green-general.webp`, guard: `${heritageAsset}/tokens/token-sanguo-green-advisor.webp`, seer: `${heritageAsset}/tokens/token-sanguo-green-elephant.webp`, rider: `${heritageAsset}/tokens/token-sanguo-green-horse.webp`,
    icebreaker: `${heritageAsset}/tokens/token-sanguo-green-chariot.webp`, cannon: `${heritageAsset}/tokens/token-sanguo-green-cannon.webp`, scout: `${heritageAsset}/tokens/token-sanguo-green-soldier.webp`, runner: `${heritageAsset}/tokens/token-sanguo-green-bannerman.webp`,
  },
  blue: {
    king: `${heritageAsset}/tokens/token-sanguo-blue-general.webp`, guard: `${heritageAsset}/tokens/token-sanguo-blue-advisor.webp`, seer: `${heritageAsset}/tokens/token-sanguo-blue-elephant.webp`, rider: `${heritageAsset}/tokens/token-sanguo-blue-horse.webp`,
    icebreaker: `${heritageAsset}/tokens/token-sanguo-blue-chariot.webp`, cannon: `${heritageAsset}/tokens/token-sanguo-blue-cannon.webp`, scout: `${heritageAsset}/tokens/token-sanguo-blue-soldier.webp`, runner: `${heritageAsset}/tokens/token-sanguo-blue-bannerman.webp`,
  },
};

const roleRules: { role: Role; copy: string }[] = [
  { role: "king", copy: "One orthogonal node inside its home palace; an open General file is illegal." },
  { role: "guard", copy: "One diagonal node inside its home palace." },
  { role: "seer", copy: "Two diagonal local steps; a blocked eye or river crossing stops it." },
  { role: "rider", copy: "An orthogonal leg, then a 45° diagonal finish; its leg must be clear." },
  { role: "icebreaker", copy: "Any distance along a clear rank or file. At the central river junction, choose one branch." },
  { role: "cannon", copy: "Slides as a Chariot; captures only beyond exactly one screen." },
  { role: "scout", copy: "Forward one local node; sideways movement unlocks after entering a foreign sector." },
  { role: "runner", copy: "Optional: two orthogonal steps, then one 45° diagonal finish, without blockers." },
];

type BoardProps = {
  onBack: () => void; state: SanguoState; bannermenEnabled: boolean; canAct: boolean;
  onMove: (pieceId: string, to: SanguoNode) => void; onResolve: () => void;
  onUndo: () => void; onNewGame: () => void; canUndo: boolean; online: boolean;
  seatLabels: Record<Faction, string>; notice: string; events: MatchEvent[]; partialHistory: boolean;
  roomCode?: string; connectionStatus?: string; seatStatuses?: Partial<Record<Faction, string>>; onResign?: () => void;
};
type Gesture = { pointerId: number; start: { x: number; y: number }; client: { x: number; y: number }; camera: Camera; piece?: Piece; moved: boolean };
const pointOnBoard = (svg: SVGSVGElement, x: number, y: number) => {
  const matrix = svg.getScreenCTM();
  return matrix ? new DOMPoint(x, y).matrixTransform(matrix.inverse()) : null;
};
const readMotion = () => { try { return localStorage.getItem("sanguo-reduced-motion") === "true"; } catch { return false; } };

export default function SanguoBoard({ onBack, state, bannermenEnabled, canAct, onMove, onResolve, onUndo, onNewGame, canUndo, online, seatLabels, notice, events, partialHistory, roomCode, connectionStatus, seatStatuses, onResign }: BoardProps) {
  const railDemo = useRailDemo();
  const [selected, setSelected] = useState<string | null>(() => railDemo ? "red-scout-0" : null);
  const [inspected, setInspected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  const [mobilePanel, setMobilePanel] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [focusView, setFocusView] = useState(false);
  const [camera, setCamera] = useState<Camera>(FIT_CAMERA);
  const cameraRef = useRef(camera); cameraRef.current = camera;
  const [fullScreen, setFullScreen] = useState(false);
  const [guide, setGuide] = useState(false);
  const [manual, setManual] = useState(() => new URLSearchParams(window.location.search).has("manual"));
  const [debug, setDebug] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [audit, setAudit] = useState(() => new URLSearchParams(window.location.search).has("audit"));
  const [reducedMotion, setReducedMotion] = useState(readMotion);
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isEnabled());
  const [feedback, setFeedback] = useState("");
  const [transfer, setTransfer] = useState<MatchEvent | null>(null);
  const [dragPoint, setDragPoint] = useState<{ id: string; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const screenRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const guideRef = useRef<HTMLDialogElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const touchPoints = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; camera: Camera; anchor: { x: number; y: number } } | null>(null);
  const suppressClick = useRef(false);
  const priorPosition = useRef(state);
  const priorEvents = useRef(events);
  const graphErrors = useMemo(() => validateArcticBoardGraph(), []);
  const picked = state.pieces.find(piece => !piece.captured && piece.id === selected);
  const inspectedPiece = state.pieces.find(piece => !piece.captured && piece.id === (hovered || inspected || selected));
  const targets = useMemo(() => picked && picked.controller === state.turn && canAct && !state.pending && !state.winner && !state.draw ? legalSanguoTargets(picked, state.pieces) : [], [picked, state, canAct]);
  const activeTarget = (node: NodeRef) => targets.some(target => sameNode(target, node));
  const checked = useMemo(() => sanguoFactions.filter(f => !state.defeated.includes(f) && generalIsAttacked(f, state.pieces)), [state.pieces, state.defeated]);
  const activeFaction = state.pending?.victor || state.turn;
  const status = state.winner ? `${kingdomLabel(state.winner)} wins the match` : state.draw ? "Match drawn" : online && connectionStatus === "Reconnecting" ? "Reconnecting… your seat is reserved." : state.pending ? `${kingdomLabel(state.pending.victor)}: resolve ${state.pending.reason}` : checked.includes(state.turn) ? `${kingdomLabel(state.turn)} is in check · protect your General` : canAct ? `${kingdomLabel(state.turn)} to move · Your turn` : notice;
  const transferable = state.pending ? state.pieces.filter(p => !p.captured && p.controller === state.pending!.defeated && p.role !== "king").length : 0;

  // Room polling returns fresh objects even when the position is identical.
  const positionKey = JSON.stringify([state.pieces, state.turn, state.pending, state.moveNumber, state.winner, state.draw]);
  useEffect(() => {
    setSelected(null); setHovered(null); setDragPoint(null); setFeedback(""); gesture.current = null;
    const previous = priorPosition.current;
    if (state.moveNumber > previous.moveNumber && state.lastMove) soundManager.play(state.lastMove.captured ? "capture" : "pieceMove", { volume: .5 });
    priorPosition.current = state;
  }, [positionKey]);
  useEffect(() => { if (!canAct) { setSelected(null); setDragPoint(null); gesture.current = null; } }, [canAct]);
  useEffect(() => {
    const event = events.at(-1);
    const isNew = event && !priorEvents.current.some(previous => previous.id === event.id);
    priorEvents.current = events;
    setTransfer(isNew && event.kind === "transfer" ? event : null);
    if (!isNew || event.kind !== "transfer") return;
    const timer = window.setTimeout(() => setTransfer(null), 6500);
    return () => window.clearTimeout(timer);
  }, [events]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => { setCompact(media.matches); setMobilePanel(false); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (mobilePanel && compact) drawerRef.current?.showModal(); else drawerRef.current?.close();
  }, [mobilePanel, compact]);
  useEffect(() => soundManager.subscribe(({ enabled }: { enabled: boolean }) => setSoundEnabled(enabled)), []);
  useEffect(() => {
    const update = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  useEffect(() => {
    if (guide || manual) guideRef.current?.showModal(); else guideRef.current?.close();
  }, [guide, manual]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelected(null); setHovered(null); setDragPoint(null); gesture.current = null;
      if (menuRef.current) menuRef.current.open = false;
    };
    const outside = (event: PointerEvent) => {
      if (menuRef.current?.open && !menuRef.current.contains(event.target as Node)) menuRef.current.open = false;
    };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("keydown", close); window.removeEventListener("pointerdown", outside); };
  }, []);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      // Preserve browser accessibility zoom and pinch gestures.
      if (event.ctrlKey || event.metaKey || gesture.current) return;
      event.preventDefault();
      const point = pointOnBoard(svg, event.clientX, event.clientY);
      if (point) setCamera(current => zoomCamera(current, current.zoom * Math.exp(-Math.max(-120, Math.min(120, event.deltaY)) * .002), point));
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, []);

  const toggleFullScreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        const target = screenRef.current?.closest(".sg-experience") as HTMLElement | null;
        if (!target?.requestFullscreen) { setFeedback("Fullscreen is unavailable here. Use your browser’s fullscreen command."); return; }
        await target.requestFullscreen();
      }
    } catch { setFeedback("Fullscreen could not open. Use your browser’s fullscreen command."); }
  };
  const choosePiece = (piece: Piece) => {
    setInspected(piece.id); setFeedback("");
    if (!canAct || piece.controller !== state.turn || state.pending || state.winner || state.draw) { setSelected(null); return; }
    setSelected(current => current === piece.id ? null : piece.id);
  };
  const move = (node: NodeRef) => {
    if (!canAct || !picked || !activeTarget(node)) return;
    onMove(picked.id, node); setSelected(null); setFeedback("");
  };
  const trackTouch = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== "touch") return;
    touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchPoints.current.size !== 2) return;
    const [a, b] = [...touchPoints.current.values()];
    const anchor = pointOnBoard(event.currentTarget, (a.x + b.x) / 2, (a.y + b.y) / 2);
    if (!anchor) return;
    pinch.current = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), camera: cameraRef.current, anchor };
    gesture.current = null; setDragPoint(null); setHovered(null); suppressClick.current = true;
    for (const id of touchPoints.current.keys()) event.currentTarget.setPointerCapture(id);
  };
  const cancelGesture = () => { gesture.current = null; pinch.current = null; touchPoints.current.clear(); setDragPoint(null); };
  const pointerDown = (event: ReactPointerEvent<SVGElement>, piece?: Piece) => {
    if (event.button !== 0 || gesture.current || pinch.current || audit) return;
    const svg = svgRef.current;
    if (!svg) return;
    if (piece && (!canAct || piece.controller !== state.turn || state.pending || state.winner || state.draw)) return;
    const point = pointOnBoard(svg, event.clientX, event.clientY);
    if (!point) return;
    gesture.current = { pointerId: event.pointerId, start: point, client: { x: event.clientX, y: event.clientY }, camera: cameraRef.current, piece, moved: false };
  };
  const pointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "touch" && touchPoints.current.has(event.pointerId)) {
      touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch.current && touchPoints.current.size >= 2) {
        const [a, b] = [...touchPoints.current.values()];
        setCamera(zoomCamera(pinch.current.camera, pinch.current.camera.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance, pinch.current.anchor));
        return;
      }
    }
    const current = gesture.current;
    const svg = svgRef.current;
    if (!current || !svg || current.pointerId !== event.pointerId) return;
    if (!current.moved && Math.hypot(event.clientX - current.client.x, event.clientY - current.client.y) < 6) return;
    if (!current.moved) {
      current.moved = true;
      svg.setPointerCapture(event.pointerId);
      if (current.piece) { setSelected(current.piece.id); setInspected(current.piece.id); }
    }
    const point = pointOnBoard(svg, event.clientX, event.clientY);
    if (!point) return;
    if (current.piece) setDragPoint({ id: current.piece.id, x: point.x, y: point.y });
    else setCamera(now => clampCamera({ ...now, x: now.x + current.start.x - point.x, y: now.y + current.start.y - point.y }));
  };
  const pointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    touchPoints.current.delete(event.pointerId);
    if (pinch.current) {
      if (!touchPoints.current.size) pinch.current = null;
      gesture.current = null; setDragPoint(null); suppressClick.current = true;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    const current = gesture.current;
    gesture.current = null;
    setDragPoint(null);
    if (!current?.moved || current.pointerId !== event.pointerId) return;
    suppressClick.current = true;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!current.piece) return;
    const point = pointOnBoard(event.currentTarget, event.clientX, event.clientY);
    // Resolve against current engine-derived targets; dropping near an illegal node never moves.
    const livePiece = state.pieces.find(piece => piece.id === current.piece!.id && !piece.captured);
    const destination = point && livePiece && sameNode(livePiece.node, current.piece.node) && snapLegalTarget(point, legalSanguoTargets(livePiece, state.pieces));
    if (destination && canAct && current.piece.controller === state.turn && !state.pending && !state.winner && !state.draw) {
      onMove(current.piece.id, destination); setSelected(null); setFeedback("");
    } else setFeedback("Move cancelled. Drop on a highlighted intersection or capture target.");
  };
  const boardKey = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    if (event.key === "+" || event.key === "=") { event.preventDefault(); setCamera(c => zoomCamera(c, c.zoom + .2)); }
    if (event.key === "-") { event.preventDefault(); setCamera(c => zoomCamera(c, c.zoom - .2)); }
    if (event.key.toLowerCase() === "f") { event.preventDefault(); setCamera(FIT_CAMERA); }
    const delta = { ArrowLeft: [-60, 0], ArrowRight: [60, 0], ArrowUp: [0, -60], ArrowDown: [0, 60] }[event.key];
    if (delta && camera.zoom > 1) { event.preventDefault(); setCamera(c => clampCamera({ ...c, x: c.x + delta[0] / c.zoom, y: c.y + delta[1] / c.zoom })); }
  };
  const action = (fn: () => void) => { if (menuRef.current) menuRef.current.open = false; fn(); };

  const matchPanel = <aside className="sg-match-panel" aria-label="Match panel" hidden={!compact && focusView}>
        <div className="sg-panel-heading"><span>THREE KINGDOMS</span><small>{roomCode ? `Room ${roomCode} · ${connectionStatus}` : "Local match"}</small></div>
        <div className="sg-kingdom-order" aria-label="Turn order">Red → Green → Blue</div>
        <div className="sg-player-list">{sanguoFactions.map(faction => {
          const count = state.pieces.filter(piece => piece.controller === faction && !piece.captured).length;
          const inherited = state.pieces.filter(piece => piece.controller === faction && piece.sector !== faction && !piece.captured).length;
          return <div key={faction} className={`sg-player ${activeFaction === faction ? "active" : ""} ${state.defeated.includes(faction) ? "defeated" : ""}`} style={{ "--kingdom": factions[faction].color } as CSSProperties}>
            <img src={factions[faction].base} alt="" /><div><b>{factions[faction].short}</b><span>{seatLabels[faction]}</span><small>{state.defeated.includes(faction) ? "Eliminated" : `${count} pieces${inherited ? ` · ${inherited} inherited` : ""}`}{seatStatuses?.[faction] ? ` · ${seatStatuses[faction]}` : ""}</small></div>
            {activeFaction === faction && !state.winner && !state.draw && <span className="sg-player-turn">TO MOVE</span>}
          </div>;
        })}</div>
        <section className="sg-piece-inspector" aria-label="Piece inspector"><h2>Piece inspector</h2>{inspectedPiece ? <><div className="sg-inspector-title"><img src={teamCoinAssets[inspectedPiece.sector][inspectedPiece.role]} alt="" /><div><strong>{roleLabels[inspectedPiece.role]}</strong><span>{coordinateLabel(inspectedPiece.node)}</span></div></div><p>{roleRules.find(row => row.role === inspectedPiece.role)?.copy}</p><small>Controlled by {kingdomLabel(inspectedPiece.controller)}{inspectedPiece.controller !== inspectedPiece.sector ? ` · Originally ${kingdomLabel(inspectedPiece.sector)}` : ""}</small></> : <p>Hover, focus or select a piece to inspect its role and movement.</p>}</section>
        {checked.length > 0 && <div className="sg-check-notice"><AlertTriangle size={18} /><span>{checked.map(kingdomLabel).join(" and ")} in check. A threatened General must be protected.</span></div>}
        <section className="sg-move-history" aria-label="Move history"><h2>Move history</h2>{partialHistory && <small>Recent observed moves; earlier history may be unavailable.</small>}{events.length ? <ol reversed>{[...events].reverse().map(event => <li key={event.id} className={event.kind}><span className="sg-history-number">{event.moveNumber}</span><div><b>{event.text}</b>{event.detail && <small>{event.detail}</small>}</div></li>)}</ol> : <p>Red opens. Moves from all three kingdoms appear here.</p>}</section>
        <div className="sg-panel-legend"><span>● Legal move</span><span>⌜ ⌟ Capture target</span><span>□ Last move</span></div>
        {graphErrors.length > 0 && <p role="alert">Board validation: {graphErrors.join(" ")}</p>}
      </aside>;

  return <main ref={screenRef} className={`sg-table-screen ${focusView ? "sg-focus" : ""} ${reducedMotion ? "sg-reduced-motion" : ""}`}>
    <header className="sg-table-toolbar">
      <div className="sg-table-brand"><button type="button" onClick={onBack} aria-label={online ? "Room details" : "Return to setup"} title={online ? "Room details" : "Setup"}><ArrowLeft size={17} /></button><div><h1>Sanguo Qi</h1><span>ARCTIC DOMINION</span></div></div>
      <div className="sg-table-turn" style={{ "--kingdom": factions[activeFaction].color } as CSSProperties} role="status" aria-live="polite"><span className="sg-turn-dot" /> <span>{status}</span><small>Turn {state.moveNumber}</small></div>
      <nav className="sg-table-tools" aria-label="Table controls">
        <button type="button" onClick={() => setGuide(true)} aria-label="Guide" title="Guide"><BookOpen size={16} /><span>Guide</span></button>
        {compact ? <button type="button" onClick={() => setMobilePanel(true)} aria-label="Open match details" title="Match details"><PanelRightOpen size={17} /></button> : <button type="button" aria-label={focusView ? "Show match panel" : "Focus view"} aria-pressed={focusView} onClick={() => setFocusView(v => !v)} title={focusView ? "Show match panel" : "Focus view"}>{focusView ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}</button>}
        <button type="button" onClick={toggleFullScreen} aria-label={fullScreen ? "Exit fullscreen" : "Fullscreen"} title={fullScreen ? "Exit fullscreen" : "Fullscreen"}>{fullScreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
        <button type="button" onClick={() => { soundManager.unlock(); soundManager.toggleMuted(); }} aria-label={soundEnabled ? "Mute sound" : "Unmute sound"} title={soundEnabled ? "Mute sound" : "Unmute sound"}>{soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
        <details className="sg-table-menu" ref={menuRef}><summary aria-label="More table options"><MoreHorizontal size={19} /></summary><div>
          {!online && <><button type="button" disabled={!canUndo} onClick={() => action(onUndo)}><Undo2 size={16} />Undo your turn</button><button type="button" onClick={() => action(onNewGame)}><RotateCcw size={16} />New game</button></>}
          {onResign && <button type="button" onClick={() => action(onResign)}><Flag size={16} />Resign kingdom</button>}
          <label><input type="checkbox" checked={reducedMotion} onChange={event => { setReducedMotion(event.target.checked); try { localStorage.setItem("sanguo-reduced-motion", String(event.target.checked)); } catch { /* Preferences are optional. */ } }} />Reduced motion</label>
          {new URLSearchParams(window.location.search).has("audit") && <><button type="button" onClick={() => setDebug(v => !v)}>Toggle node IDs</button><button type="button" onClick={() => setShowConnections(v => !v)}>Toggle graph</button><button type="button" onClick={() => setAudit(v => !v)}>Toggle audit nodes</button></>}
        </div></details>
      </nav>
    </header>
    <section className="sg-table-body">
      <div className="sg-battlefield-column">
        {(state.pending || state.winner || state.draw || transfer) && <div className="sg-table-event" role="status">
          <span>{state.pending ? `${kingdomLabel(state.pending.defeated)} has no legal reply (${state.pending.reason}). ${kingdomLabel(state.pending.victor)} will take control of ${transferable} remaining pieces.` : transfer?.text || state.note}</span>
          {state.pending && <button type="button" className="sg-primary" disabled={!canAct} onClick={onResolve}>Resolve army</button>}
        </div>}
        <div className="sg-battlefield-stage">
          <svg ref={svgRef} className="sanguo-board arctic-board" viewBox={camera.zoom === 1 ? SANGUO_VIEWBOX : `${camera.x} ${camera.y} ${BOARD_WIDTH / camera.zoom} ${BOARD_HEIGHT / camera.zoom}`} preserveAspectRatio="xMidYMid meet" role="group" tabIndex={0} aria-label="Interactive Arctic Sanguo Qi board" aria-describedby="sg-board-controls-help"
            onKeyDown={boardKey} onPointerDownCapture={trackTouch} onPointerDown={event => { suppressClick.current = false; pointerDown(event); }} onPointerMove={pointerMove} onPointerUp={pointerUp}
            onPointerCancel={cancelGesture} onLostPointerCapture={() => { gesture.current = null; setDragPoint(null); }}
            onClickCapture={event => { if (suppressClick.current) { event.stopPropagation(); suppressClick.current = false; } }}
            onClick={event => { if (event.target === event.currentTarget) setSelected(null); }}>
            <defs><clipPath id="arctic-piece-clip"><circle cx="0" cy="0" r="31" /></clipPath></defs>
            <image href={arcticBoardImage} x="0" y="0" width="1280" height="1124" preserveAspectRatio="none" pointerEvents="none" />
            {(debug || showConnections) && <g className="arctic-debug-connections" pointerEvents="none">{Object.values(ARCTIC_BOARD_GRAPH.nodes).flatMap(node => node.connections.filter(target => node.id < target).map(target => { const end = ARCTIC_BOARD_GRAPH.nodes[target]; return <line key={`${node.id}-${target}`} x1={node.x * 1280} y1={node.y * 1124} x2={end.x * 1280} y2={end.y * 1124} />; }))}</g>}
            {state.lastMove && !audit && <g className="sg-last-move" pointerEvents="none">{[state.lastMove.from, state.lastMove.to].map((ref, index) => { const node = arcticBoardNode(ref.sector, ref.rank, ref.file); return <rect key={index} className={index ? "sg-last-destination" : "sg-last-source"} x={node.x * 1280 - 34} y={node.y * 1124 - 34} width="68" height="68" rx="12" />; })}</g>}
            {Object.values(ARCTIC_BOARD_GRAPH.nodes).map(node => {
              const [sector, rank, file] = node.id.split("-");
              const ref = { sector: sector as Faction, rank: Number(rank), file: Number(file) };
              const occupied = state.pieces.some(piece => !piece.captured && sameNode(piece.node, ref));
              const active = activeTarget(ref) && !audit && !occupied;
              return <g key={node.id}>
                <circle className={`arctic-node-hitbox ${active ? "active" : ""}`} role={active ? "button" : undefined} tabIndex={active ? 0 : -1} aria-label={`Move to ${coordinateLabel(ref)}`} onKeyDown={event => { if (active && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); move(ref); } }} cx={node.x * 1280} cy={node.y * 1124} r={active ? 28 : 0} pointerEvents={active ? "all" : "none"} onPointerDown={event => { event.stopPropagation(); suppressClick.current = false; }} onClick={event => { event.stopPropagation(); move(ref); }} />
                <circle className={`arctic-node ${active ? "legal" : ""} ${debug || audit ? "visible" : ""}`} cx={node.x * 1280} cy={node.y * 1124} r={active ? 10 : 5} pointerEvents="none" />
                {(debug || audit) && <text className="arctic-node-id" x={node.x * 1280 + 9} y={node.y * 1124 - 9}>{node.coordinate}</text>}
              </g>;
            })}
            {!audit && state.pieces.filter(piece => !piece.captured).map(piece => {
              const node = arcticBoardNode(piece.node.sector, piece.node.rank, piece.node.file);
              const isTarget = activeTarget(piece.node);
              const isCheck = piece.role === "king" && checked.includes(piece.controller) && !state.defeated.includes(piece.sector);
              const dragging = dragPoint?.id === piece.id;
              return <g key={piece.id} data-piece-id={piece.id} className={`fan-piece supplied-role-coin arctic-piece ${piece.id === selected ? "selected" : ""} ${piece.controller !== piece.sector ? "appropriated" : ""} ${isTarget ? "sg-capture-target" : ""} ${isCheck ? "sg-in-check" : ""} ${transfer?.pieceIds.includes(piece.id) ? "sg-transferred" : ""} ${dragging ? "sg-dragging" : ""}`}
                style={{ "--piece-color": factions[piece.controller].color, transform: `translate(${node.x * 1280}px, ${node.y * 1124}px)` } as CSSProperties}
                onPointerDown={event => { event.stopPropagation(); suppressClick.current = false; pointerDown(event, piece); }}
                onPointerEnter={() => { if (!gesture.current?.moved) setHovered(piece.id); }} onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(piece.id)} onBlur={() => setHovered(null)}
                onClick={event => { event.stopPropagation(); if (isTarget && picked) move(piece.node); else choosePiece(piece); }} role="button" tabIndex={0}
                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (isTarget && picked) move(piece.node); else choosePiece(piece); } }}
                aria-label={`${isTarget ? "Capture" : "Inspect"} ${kingdomLabel(piece.sector)} ${roleLabels[piece.role]} at ${coordinateLabel(piece.node)}; controlled by ${kingdomLabel(piece.controller)}${isCheck ? "; General in check" : ""}`}>
                <title>{`${kingdomLabel(piece.sector)} ${roleLabels[piece.role]} · ${coordinateLabel(piece.node)} · Controlled by ${kingdomLabel(piece.controller)}`}</title>
                <circle className="coin-art-mask" r="31" />
                <foreignObject x="-31" y="-31" width="62" height="62" className="arctic-piece-art-frame"><div xmlns="http://www.w3.org/1999/xhtml" className="arctic-piece-art-html-wrap"><img className="supplied-coin-art-html" src={teamCoinAssets[piece.sector][piece.role]} width="62" height="62" alt="" draggable="false" /></div></foreignObject>
                <circle className="coin-state-ring" r="33" />
                {isTarget && <path className="sg-capture-brackets" d="M-23-39H-39V-23 M23-39H39V-23 M-23 39H-39V23 M23 39H39V23" pointerEvents="none" />}
                {isCheck && <g className="sg-check-symbol" pointerEvents="none"><path d="M0-62L17-36H-17Z" /><text y="-42" textAnchor="middle">!</text></g>}
              </g>;
            })}
            {dragPoint && picked && <g className="sg-drag-preview" transform={`translate(${dragPoint.x} ${dragPoint.y})`} pointerEvents="none"><image href={teamCoinAssets[picked.sector][picked.role]} x="-31" y="-31" width="62" height="62" /><circle r="34" /></g>}
          </svg>
        </div>
        <footer className="sg-board-footer">
          <span className="sg-board-feedback" role="status">{feedback || ((focusView || compact) && inspectedPiece ? `${kingdomLabel(inspectedPiece.controller)} · ${roleLabels[inspectedPiece.role]} — ${roleRules.find(r => r.role === inspectedPiece.role)?.copy}` : picked ? `${roleLabels[picked.role]} · ${targets.length} legal ${targets.length === 1 ? "move" : "moves"}` : "Select a piece · click or drag to move")}</span>
          <div className="sg-camera-controls" aria-label="Board camera"><button type="button" onClick={() => setCamera(c => zoomCamera(c, c.zoom - .2))} disabled={camera.zoom <= 1} aria-label="Zoom out"><Minus size={15} /></button><output aria-label="Board zoom">{Math.round(camera.zoom * 100)}%</output><button type="button" onClick={() => setCamera(c => zoomCamera(c, c.zoom + .2))} disabled={camera.zoom >= 2.5} aria-label="Zoom in"><Plus size={15} /></button><button type="button" onClick={() => setCamera(FIT_CAMERA)}><Scan size={15} />Fit board</button></div>
        </footer>
        {compact && <div className="sg-phone-players" aria-label="Kingdom status">{sanguoFactions.map(faction => <button type="button" key={faction} onClick={() => setMobilePanel(true)} className={faction === activeFaction ? "active" : ""} style={{ "--kingdom": factions[faction].color } as CSSProperties}><span>{kingdomLabel(faction)}{faction === activeFaction ? " · Turn" : ""}</span><small>{state.defeated.includes(faction) ? "Out" : `${state.pieces.filter(p => !p.captured && p.controller === faction).length} pieces`}</small></button>)}</div>}
        {!compact && focusView && <div className="sg-focus-order">{sanguoFactions.map((f, i) => <span key={f} className={f === activeFaction ? "active" : ""}>{i > 0 ? " → " : ""}{kingdomLabel(f)}{state.defeated.includes(f) ? " (out)" : ""}</span>)}</div>}
      </div>
      {compact ? <dialog ref={drawerRef} className="sg-mobile-drawer" aria-labelledby="sg-drawer-title" onCancel={event => { event.preventDefault(); setMobilePanel(false); }}>
        <header><h2 id="sg-drawer-title">Match details</h2><button type="button" autoFocus aria-label="Close match details" onClick={() => setMobilePanel(false)}><X size={20} /></button></header>
        {matchPanel}
      </dialog> : matchPanel}
    </section>
    <p id="sg-board-controls-help" className="sg-sr-only">Select a piece, then a highlighted intersection. Dragging snaps only to legal targets. Pinch on a touch screen, scroll over the board or use plus and minus to zoom; drag the background or use arrow keys to pan when zoomed. F fits the board. Escape cancels selection.</p>
    <dialog ref={guideRef} className="sg-guide-dialog" aria-labelledby="sg-guide-title" onCancel={event => { event.preventDefault(); setGuide(false); setManual(false); }}>
      <header><h2 id="sg-guide-title">{manual ? "Field manual" : "Sanguo Qi · Move guide"}</h2><button autoFocus type="button" aria-label="Close guide" onClick={() => { setGuide(false); setManual(false); }}><X size={20} /></button></header>
      {manual ? <SanguoManual onBack={() => { setManual(false); setGuide(true); }} /> : <div className="sg-guide-content"><p>Red → Green → Blue. Select a piece, then a highlighted intersection. Protect your General and defeat both opposing kingdoms.</p><div className="sg-guide-roles">{roleRules.filter(row => bannermenEnabled || row.role !== "runner").map(row => <div key={row.role}><img src={teamCoinAssets[activeFaction][row.role]} alt="" /><div><b>{roleLabels[row.role]}</b><p>{row.copy}</p></div></div>)}</div><h3>Army transfers</h3><p>After checkmate or stalemate, use Resolve army. The victor takes control of the defeated kingdom’s surviving army. Original artwork stays; a dashed ring shows its new controller.</p><h3>Board controls</h3><p>Click or drag pieces to highlighted targets. Pinch or scroll to zoom; drag the background to pan. On phones, open Match details for the inspector and history. Keyboard: + / − zoom, arrow keys pan, F fits the board, Escape cancels selection. Fullscreen and Focus view keep more of the battlefield in view.</p><button type="button" onClick={() => setManual(true)}>Open full field manual</button></div>}
    </dialog>
  </main>;
}
