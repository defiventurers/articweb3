import { useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { ARCTIC_BOARD_GRAPH, arcticBoardNode } from "@/game/sanguoArcticBoardGraph";
import { initialSanguoPieces, roleLabels, type SanguoFaction, type SanguoNode, type SanguoPiece, type SanguoRole } from "@/game/sanguoRules";
import { SANGUO_VIEWBOX } from "@/game/sanguoTopology";
import "@/sanguo.css";
import "@/sanguo-reference-board.css";
import "@/sanguo-trace.css";

const heritageAsset = "/assets/heritage-arcade";
const arcticBoardImage = `${heritageAsset}/board/sanguo-arctic-board.png`;

const factions: Record<SanguoFaction, { name: string; color: string }> = {
  red: { name: "Red", color: "#ef5750" },
  green: { name: "Green", color: "#43b86a" },
  blue: { name: "Blue", color: "#318eed" },
};

const tokenAssets: Record<SanguoFaction, Record<SanguoRole, string>> = {
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

const nodeKey = (node: SanguoNode) => `${node.sector}-${node.rank}-${node.file}`;

export default function SanguoPiecePlacement({ onBack }: { onBack: () => void }) {
  const includeBannermen = new URLSearchParams(window.location.search).has("banners");
  const [pieces, setPieces] = useState<SanguoPiece[]>(() => initialSanguoPieces(includeBannermen));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [faction, setFaction] = useState<SanguoFaction>("red");
  const selected = pieces.find((piece) => piece.id === selectedId) ?? null;
  const occupied = useMemo(() => new Map(pieces.filter((piece) => !piece.captured).map((piece) => [nodeKey(piece.node), piece.id])), [pieces]);

  const placeAt = (node: SanguoNode) => {
    if (!selected) return;
    const otherId = occupied.get(nodeKey(node));
    setPieces((current) => current.map((piece) => {
      if (piece.id === selected.id) return { ...piece, node };
      if (otherId && piece.id === otherId) return { ...piece, node: selected.node };
      return piece;
    }));
  };

  const reset = () => {
    setPieces(initialSanguoPieces(includeBannermen));
    setSelectedId(null);
  };

  const exportText = useMemo(() => JSON.stringify({
    pieces: pieces.map((piece) => {
      const point = arcticBoardNode(piece.node.sector, piece.node.rank, piece.node.file);
      return { id: piece.id, faction: piece.sector, role: piece.role, node: piece.node, x: Number(point.x.toFixed(6)), y: Number(point.y.toFixed(6)) };
    }),
  }, null, 2), [pieces]);

  const copySetup = async () => {
    try { await navigator.clipboard.writeText(exportText); }
    catch { window.prompt("Copy this setup JSON", exportText); }
  };

  return <main className="sanguo-screen">
    <header className="sanguo-header">
      <button type="button" onClick={onBack}><ArrowLeft size={15} /> Back</button>
      <div><span>ARCTIC SAN GUO QI</span><h1>Piece placement</h1><p>Select a token, then click any marked node. Occupied nodes swap pieces automatically.</p></div>
      <div><button type="button" onClick={reset}><RotateCcw size={14} /> Reset opening</button><button type="button" onClick={copySetup}>Copy setup JSON</button></div>
    </header>

    <section className="sanguo-layout">
      <aside className="sanguo-ledger">
        <span className="sanguo-kicker">PLACE TOKENS</span>
        <h2>{factions[faction].name} army</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {(["red", "green", "blue"] as SanguoFaction[]).map((item) => <button key={item} type="button" onClick={() => setFaction(item)} style={{ borderColor: faction === item ? factions[item].color : undefined }}>{factions[item].name}</button>)}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {pieces.filter((piece) => piece.sector === faction).map((piece) => <button key={piece.id} type="button" onClick={() => setSelectedId(piece.id)} style={{ display: "grid", gridTemplateColumns: "42px 1fr", alignItems: "center", gap: 8, textAlign: "left", borderColor: selectedId === piece.id ? factions[faction].color : undefined }}>
            <img src={tokenAssets[piece.sector][piece.role]} width="38" height="38" alt="" />
            <span><b>{roleLabels[piece.role]}</b><small style={{ display: "block", opacity: .7 }}>{piece.id}</small></span>
          </button>)}
        </div>
      </aside>

      <section className="sanguo-board-wrap reference-board-wrap">
        <div className="sanguo-caption"><span>135 FIXED INTERSECTIONS</span><b>{selected ? `PLACE ${roleLabels[selected.role].toUpperCase()}` : "SELECT A TOKEN"}</b></div>
        <svg className="sanguo-board arctic-board" viewBox={SANGUO_VIEWBOX} aria-label="San Guo Qi piece placement board">
          <image href={arcticBoardImage} x="0" y="0" width="1280" height="1124" preserveAspectRatio="none" pointerEvents="none" />
          {Object.values(ARCTIC_BOARD_GRAPH.nodes).map((node) => {
            const [sector, rank, file] = node.id.split("-");
            const ref = { sector: sector as SanguoFaction, rank: Number(rank), file: Number(file) };
            const isOccupied = occupied.has(node.id);
            return <g key={node.id} onClick={() => placeAt(ref)} style={{ cursor: selected ? "pointer" : "default" }}>
              <circle cx={node.x * 1280} cy={node.y * 1124} r={18} fill="transparent" pointerEvents="all" />
              <circle cx={node.x * 1280} cy={node.y * 1124} r={isOccupied ? 5 : 7} fill={isOccupied ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.72)"} stroke="rgba(0,0,0,.55)" strokeWidth="1.5" pointerEvents="none" />
            </g>;
          })}
          {pieces.map((piece) => {
            const node = arcticBoardNode(piece.node.sector, piece.node.rank, piece.node.file);
            return <g key={piece.id} className={`fan-piece source-character supplied-role-coin arctic-piece ${piece.id === selectedId ? "selected" : ""}`} style={{ "--piece-color": factions[piece.sector].color } as CSSProperties} transform={`translate(${node.x * 1280} ${node.y * 1124})`} onClick={(event) => { event.stopPropagation(); setSelectedId(piece.id); setFaction(piece.sector); }} role="button" tabIndex={0} aria-label={`${factions[piece.sector].name} ${roleLabels[piece.role]}`}>
              <circle className="coin-art-mask" r="31" />
              <foreignObject x="-31" y="-31" width="62" height="62" className="arctic-piece-art-frame"><div xmlns="http://www.w3.org/1999/xhtml" className="arctic-piece-art-html-wrap"><img className="supplied-coin-art-html" src={tokenAssets[piece.sector][piece.role]} width="62" height="62" alt="" draggable="false" /></div></foreignObject>
              <circle className="coin-state-ring" r="31" />
            </g>;
          })}
        </svg>
        <div className="sanguo-legend"><span>Click token → click node</span><span>Occupied destination = swap</span><span>Uses the finalized Arctic board coordinates and production token assets.</span></div>
      </section>

      <aside className="sanguo-rules">
        <span className="sanguo-kicker">EXPORT</span>
        <h2>Opening setup</h2>
        <p>When the pieces are correct, copy the JSON and send it back to me. I can then make that exact arrangement the game’s permanent opening state.</p>
        <textarea readOnly value={exportText} style={{ width: "100%", minHeight: 420, resize: "vertical", fontFamily: "monospace", fontSize: 11 }} />
      </aside>
    </section>
  </main>;
}
