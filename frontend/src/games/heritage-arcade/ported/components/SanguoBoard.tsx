/* Visual contract: preserve the approved white source field, black trace rails, fixed node coordinates, and supplied role coins; only the rules engine changes. */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, BookOpen, Bug, RotateCcw, Undo2 } from "lucide-react";
import SanguoManual from "@/components/SanguoManual";
import { SANGUO_VIEWBOX, type SanguoFaction } from "@/game/sanguoTopology";
import { ARCTIC_BOARD_GRAPH, arcticBoardNode, validateArcticBoardGraph } from "@/game/sanguoArcticBoardGraph";
import {
  legalSanguoTargets, roleLabels,
  sameNode, sanguoFactions, type SanguoNode, type SanguoPiece, type SanguoRole, type SanguoState,
} from "@/game/sanguoRules";
import "@/sanguo.css";
import "@/sanguo-reference-board.css";
import "@/sanguo-trace.css";

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
  { role: "scout", copy: "Forward one local node; side nodes unlock at the far river boundary." },
  { role: "runner", copy: "Optional: two orthogonal steps, then one 45° diagonal finish, without blockers." },
];

type BoardProps = {
  onBack: () => void; state: SanguoState; bannermenEnabled: boolean; canAct: boolean;
  onMove: (pieceId: string, to: SanguoNode) => void; onResolve: () => void;
  onUndo: () => void; onNewGame: () => void; canUndo: boolean; online: boolean;
  seatLabels: Record<Faction, string>; notice: string;
};
export default function SanguoBoard({ onBack, state, bannermenEnabled, canAct, onMove, onResolve, onUndo, onNewGame, canUndo, online, seatLabels, notice }: BoardProps) {
  const railDemo = useRailDemo();
  const [selected, setSelected] = useState<string | null>(() => railDemo ? "red-scout-0" : null);
  const [debug, setDebug] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const graphErrors = useMemo(() => validateArcticBoardGraph(), []);
  const [audit, setAudit] = useState(() => new URLSearchParams(window.location.search).has("audit"));
  const [manual, setManual] = useState(() => new URLSearchParams(window.location.search).has("manual"));
  const picked = state.pieces.find((piece) => piece.id === selected);
  useEffect(() => { setSelected(null); }, [state.moveNumber, state.turn, state.pending, state.winner, state.draw]);
  const targets = useMemo(() => picked && canAct && !state.pending && !state.winner && !state.draw ? legalSanguoTargets(picked, state.pieces) : [], [picked, state.pieces, canAct, state.pending, state.winner, state.draw]);
  const activeTarget = (node: NodeRef) => targets.some((target) => sameNode(target, node));
  const choosePiece = (piece: Piece) => {
    if (!canAct || piece.captured || piece.controller !== state.turn || state.winner || state.draw || state.pending) return;
    setSelected((current) => current === piece.id ? null : piece.id);
  };
  const move = (node: NodeRef) => {
    if (!canAct || !picked || !activeTarget(node)) return;
    onMove(picked.id, node); setSelected(null);
  };
  const tokenCount = state.pieces.filter((piece) => !piece.captured).length;

  if (manual) return <SanguoManual onBack={() => setManual(false)} />;
  return <main className="sanguo-screen">
    <header className="sanguo-header">
      <button type="button" onClick={onBack}><ArrowLeft size={15} /> {online ? "Room" : "Setup"}</button>
      <div><div className="sanguo-brand"><img src={`${heritageAsset}/board/ppba-compass-mark.png`} alt="" /><span>PUDGY PENGUINS BOARD ARCADE</span></div><span>ARCTIC FIELD · 135 INTERSECTIONS · {bannermenEnabled ? 54 : 48} OPENING COINS</span><h1>Sanguo Qi</h1><p>{state.winner ? `${factions[state.winner].name} has claimed the field.` : state.draw ? "The match is a draw." : "Three kingdoms. One surviving General."}</p></div>
      <div>{new URLSearchParams(window.location.search).has("audit") && <><button type="button" onClick={() => setDebug((value) => !value)}><Bug size={14} /> {debug ? "Hide IDs" : "Node IDs"}</button><button type="button" onClick={() => setShowConnections((value) => !value)}><Bug size={14} /> {showConnections ? "Hide graph" : "Show graph"}</button><button type="button" onClick={() => setAudit((value) => !value)}><Bug size={14} /> {audit ? "Show pieces" : "Audit nodes"}</button></>}<button type="button" onClick={() => setManual(true)}><BookOpen size={14} /> Field manual</button><button type="button" onClick={onResolve} disabled={!canAct || !state.pending}>Resolve army</button>{!online && <><button type="button" onClick={onUndo} disabled={!canUndo}><Undo2 size={14} /> Undo your turn</button><button type="button" onClick={onNewGame}><RotateCcw size={14} /> New game</button></>}</div>
    </header>
    <p className="sg-turn-notice" role="status" aria-live="polite">{notice}</p><section className="sanguo-layout">
      <aside className="sanguo-ledger"><span className="sanguo-kicker">KINGDOMS</span><h2>{state.draw ? "Draw" : state.winner ? `${factions[state.winner].name} wins` : factions[state.turn].name}</h2><p>{state.note}</p>{sanguoFactions.map((faction) => <div key={faction} className={`sanguo-faction ${state.turn === faction ? "active" : ""} ${state.defeated.includes(faction) ? "defeated" : ""}`} style={{ "--faction": factions[faction].color } as CSSProperties}><img src={factions[faction].base} alt="" /><span><b>{factions[faction].short}</b><small>{seatLabels[faction]}</small><small>{state.defeated.includes(faction) ? "army appropriated" : `${state.pieces.filter((piece) => piece.controller === faction && !piece.captured).length} controlled coins`}</small></span></div>)}<div className="sanguo-note"><b>HOW TO PLAY</b><p>Select your piece, then a highlighted intersection. You must answer check and keep your General safe.</p></div><div className="sanguo-note"><b>ARMIES</b><p>{tokenCount} of {bannermenEnabled ? 54 : 48} remain. After appropriation, the new controller’s color outlines captured armies.</p></div></aside>
      <section className="sanguo-board-wrap reference-board-wrap">
        <div className="sanguo-caption"><span>{railDemo ? "SOURCE THREE-KINGDOMS · LEGAL-TARGET DEMO" : "ARCTIC THREE-KINGDOMS CONFIGURATION"}</span><b>TURN {state.moveNumber}</b></div>
        <svg className="sanguo-board arctic-board" viewBox={SANGUO_VIEWBOX} aria-label="Interactive Arctic Sanguo Qi board">
          <defs><clipPath id="arctic-piece-clip"><circle cx="0" cy="0" r="31" /></clipPath></defs>
          <image href={arcticBoardImage} x="0" y="0" width="1280" height="1124" preserveAspectRatio="none" pointerEvents="none" />
          {(debug || showConnections) && <g className="arctic-debug-connections" pointerEvents="none">{Object.values(ARCTIC_BOARD_GRAPH.nodes).flatMap((node) => node.connections.filter((target) => node.id < target).map((target) => { const end = ARCTIC_BOARD_GRAPH.nodes[target]; return <line key={`${node.id}-${target}`} x1={node.x * 1280} y1={node.y * 1124} x2={end.x * 1280} y2={end.y * 1124} />; }))}</g>}
          {Object.values(ARCTIC_BOARD_GRAPH.nodes).map((node) => { const [sector, rank, file] = node.id.split("-"); const ref = { sector: sector as Faction, rank: Number(rank), file: Number(file) }; const active = activeTarget(ref); return <g key={node.id}><circle className={`arctic-node-hitbox ${active && !audit ? "active" : ""}`} role={active && !audit ? "button" : undefined} tabIndex={active && !audit ? 0 : -1} aria-label={`Move to ${node.coordinate}`} onKeyDown={(event) => { if (active && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); move(ref); } }} cx={node.x * 1280} cy={node.y * 1124} r={active && !audit ? 28 : 0} pointerEvents={active && !audit ? "all" : "none"} onClick={(event) => { event.stopPropagation(); move(ref); }} /><circle className={`arctic-node ${active && !audit ? "legal" : ""} ${debug || audit ? "visible" : ""}`} cx={node.x * 1280} cy={node.y * 1124} r={active && !audit ? 11 : 5} pointerEvents="none" />{(debug || audit) && <text className="arctic-node-id" x={node.x * 1280 + 9} y={node.y * 1124 - 9}>{node.coordinate}</text>}</g>; })}
          {!audit && state.pieces.filter((piece) => !piece.captured).map((piece) => { const node = arcticBoardNode(piece.node.sector, piece.node.rank, piece.node.file); const isTarget = activeTarget(piece.node); return <g key={piece.id} className={`fan-piece source-character supplied-role-coin arctic-piece ${piece.id === selected ? "selected" : ""} ${piece.controller !== piece.sector ? "appropriated" : ""}`} style={{ "--piece-color": factions[piece.controller].color } as CSSProperties} transform={`translate(${node.x * 1280} ${node.y * 1124})`} onClick={(event) => { event.stopPropagation(); if (isTarget && picked) move(piece.node); else choosePiece(piece); }} role="button" tabIndex={canAct && (piece.controller === state.turn || isTarget) ? 0 : -1} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (isTarget && picked) move(piece.node); else choosePiece(piece); } }} aria-disabled={!canAct || (piece.controller !== state.turn && !isTarget)} aria-label={`${factions[piece.controller].name} controls ${factions[piece.sector].name}'s ${roleLabels[piece.role]}`}><circle className="coin-art-mask" r="31" /><foreignObject x="-31" y="-31" width="62" height="62" className="arctic-piece-art-frame"><div xmlns="http://www.w3.org/1999/xhtml" className="arctic-piece-art-html-wrap"><img className="supplied-coin-art-html" src={teamCoinAssets[piece.sector][piece.role]} width="62" height="62" alt="" draggable="false" /></div></foreignObject><circle className="coin-state-ring" r="31" /></g>; })}
        </svg>
        <div className="sanguo-legend"><span><i className="legal" /> legal move</span><span><i className="capture" /> capture target</span><span>{graphErrors.length ? `Graph validation: ${graphErrors.join(" ")}` : audit ? "Node audit: pieces hidden · Arctic normalized coordinates" : debug || showConnections ? "Debug graph: node IDs, normalized intersections, and declared rail connections." : "Select your piece to show its legal moves."}</span></div>
      </section>
      <aside className="sanguo-rules"><span className="sanguo-kicker">MOVE GUIDE</span><h2>Command your army</h2><p>Defeat both opposing Generals. A defeated kingdom’s remaining army joins the victor.</p><div className="sanguo-status">{state.draw ? state.note : state.pending ? `${factions[state.pending.victor].name} must resolve ${state.pending.reason} appropriation.` : state.winner ? `${factions[state.winner].name} is the final kingdom.` : `${factions[state.turn].name}: to move.`}</div><div className="sanguo-role-list">{roleRules.filter(({ role }) => bannermenEnabled || role !== "runner").map(({ role, copy }) => <div key={role} className={picked?.role === role ? "focused" : ""}><img src={teamCoinAssets.red[role]} alt="" /><span><b>{roleLabels[role]}</b><small>{copy}</small></span></div>)}</div></aside>
    </section>
  </main>;
}
