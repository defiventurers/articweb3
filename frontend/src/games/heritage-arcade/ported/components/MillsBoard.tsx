/** Icebound Strategy Atlas: tactile ice-board presentation for the deterministic Penguin Mills engine. */
import { useMemo, useState } from "react";
import {
  BOARD_EDGES, BOARD_NODES, CLANS, ClanId, createInitialMillsState, capturePiece, demoMillsState,
  legalMoves, MillsState, movePiece, occupancy, placePiece, piecesFor,
} from "@/game/millsRules";

type Props = { roster: ClanId[]; onBack: () => void; demoMode?: boolean };
const boardTexture = "/assets/heritage-arcade/board/ppba-board-ice-texture.png";

export default function MillsBoard({ roster, onBack, demoMode = false }: Props) {
  const [game, setGame] = useState<MillsState>(() => demoMode ? demoMillsState(roster) : createInitialMillsState(roster));
  const [history, setHistory] = useState<MillsState[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const selectedMoves = useMemo(() => selectedNode ? legalMoves(game, selectedNode) : [], [game, selectedNode]);
  const activeClan = CLANS[game.turn];
  const commit = (next: MillsState | null) => { if (!next) return; setHistory((past) => [...past.slice(-24), game]); setGame(next); setSelectedNode(null); };
  const handleNode = (nodeId: string) => {
    if (game.phase === "finished") return;
    const piece = occupancy(game, nodeId);
    if (game.phase === "placing") return commit(placePiece(game, nodeId));
    if (game.phase === "capture") return piece && commit(capturePiece(game, piece.id));
    if (piece?.owner === game.turn) return setSelectedNode(selectedNode === nodeId ? null : nodeId);
    if (selectedNode && selectedMoves.includes(nodeId)) return commit(movePiece(game, selectedNode, nodeId));
  };
  const reset = () => { setGame(createInitialMillsState(roster)); setHistory([]); setSelectedNode(null); };
  const demo = () => { setGame(demoMillsState(roster)); setHistory([]); setSelectedNode(null); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setHistory((past) => past.slice(0, -1)); setGame(previous); setSelectedNode(null); };
  const phaseCopy = game.phase === "placing" ? "Place a penguin on any open ice marker." : game.phase === "capture" ? "A new mill formed — remove one permitted rival." : game.phase === "moving" ? "Select one of your penguins, then follow a glowing route." : "The expedition is complete.";

  return <main className="mills-screen">
    <header className="table-header">
      <button type="button" className="text-button" onClick={onBack}>← Return to atlas</button>
      <div className="table-title"><span className="eyebrow">FEATURED ICE TABLE · #12</span><h1>Penguin Mills</h1><p>Three-player Merels on the long winter route.</p></div>
      <div className="table-actions"><button type="button" onClick={demo}>Demo position</button><button type="button" onClick={undo} disabled={!history.length}>Undo</button><button type="button" onClick={reset}>Restart</button></div>
    </header>
    <section className="game-table">
      <aside className="match-rail" aria-label="Match status">
        <div className="compass-status"><span className="pulse-dot" style={{ background: activeClan.color }} /> <span>{game.phase.toUpperCase()}</span></div>
        <h2>{game.winner ? (game.winner === "shared" ? "Shared expedition" : `${CLANS[game.winner].name} prevails`) : `${activeClan.name}'s turn`}</h2><p>{phaseCopy}</p>
        <div className="match-player-stack">{roster.map((clan) => { const player = game.players[clan]; const isTurn = game.turn === clan && !player.eliminated; return <article key={clan} className={`match-player ${isTurn ? "is-turn" : ""} ${player.eliminated ? "is-out" : ""}`} style={{ "--clan": CLANS[clan].color } as React.CSSProperties}><img src={CLANS[clan].portrait} alt="" /><div><strong>{CLANS[clan].name}</strong><span>{player.eliminated ? "Eliminated" : `${piecesFor(game, clan).length} on ice · ${game.reserves[clan]} reserve`}</span></div><em>{player.mills}M</em></article>; })}</div>
        <div className="rules-ledger"><strong>Implemented rules</strong><span>24 nodes · 16 mill lines</span><span>7 tokens per clan · protected mills</span><span>Flying at 3 · 300-action limit</span></div>
      </aside>
      <section className="board-panel" aria-label="Penguin Mills board">
        <div className="board-caption"><span>Ice route lattice</span><strong>Action {game.actionCount} / 300</strong></div>
        <div className="mills-board" style={{ backgroundImage: `linear-gradient(rgba(234,250,255,.53), rgba(186,229,247,.66)), url(${boardTexture})` }}>
          <svg viewBox="0 0 760 760" aria-hidden="true" className="route-svg">{BOARD_EDGES.map(([from, to]) => { const a = BOARD_NODES.find((node) => node.id === from)!; const b = BOARD_NODES.find((node) => node.id === to)!; return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />; })}<rect x="111" y="111" width="537" height="537" /><rect x="197" y="197" width="365" height="365" /><rect x="283" y="283" width="193" height="193" /></svg>
          {BOARD_NODES.map((node) => { const piece = occupancy(game, node.id); const isSelected = selectedNode === node.id; const legal = game.phase === "placing" ? !piece : selectedMoves.includes(node.id); const capturable = game.phase === "capture" && !!piece && game.pendingCaptureTargets.includes(piece.id); return <button key={node.id} type="button" aria-label={`${node.id}${piece ? `, ${CLANS[piece.owner].name}` : ", empty"}`} onClick={() => handleNode(node.id)} className={`board-node ${piece ? "occupied" : ""} ${legal ? "legal" : ""} ${capturable ? "capture-target" : ""} ${isSelected ? "selected" : ""}`} style={{ left: `${(node.x / 760) * 100}%`, top: `${(node.y / 760) * 100}%`, ...(piece ? { "--piece": CLANS[piece.owner].color, backgroundImage: `url(${CLANS[piece.owner].portrait})` } : {}) } as React.CSSProperties}><span /></button>; })}
        </div>
        <div className="event-tape"><span>FIELD NOTE</span><p>{game.lastEvent}</p></div>
      </section>
      <aside className="rules-panel"><span className="eyebrow">PLAYER AID</span><h2>Three ice laws</h2><ol><li><b>Deploy.</b> Each clan places seven penguins on empty nodes.</li><li><b>Align.</b> A newly completed row of three grants one removal.</li><li><b>Adapt.</b> At exactly three penguins, fly to any unoccupied node.</li></ol><div className="debug-box"><strong>Debug reading</strong><span>Selected: {selectedNode?.toUpperCase() ?? "—"}</span><span>Legal routes: {selectedMoves.length}</span><span>Capture targets: {game.pendingCaptureTargets.length}</span></div><p className="history-note">Move History remains visible through the field-note tape; undo returns one complete rules-state snapshot.</p></aside>
    </section>
  </main>;
}
