import { ADJACENCY, EDGES, POINTS, occupantAt } from "./rules.js";

// Arctic Do Guti treatment: distinct physical glacial stones sit over the documented five-point blockade graph.
const DOGUTI_STICKERS = Object.freeze({
  blue: "/manus-storage/doguti-aurora-stone-sticker_fb998e42.png",
  coral: "/manus-storage/doguti-coral-stone-sticker_2cc85007.png"
});

export function TwoStonesBoard({ state, legalActions = [], selectedPieceId = null, onSelectPiece, onAction, interactive = true }) {
  const placementByPoint = new Map(legalActions.filter((action) => action.type === "place").map((action) => [action.to, action]));
  const movesByPiece = new Map();
  for (const action of legalActions.filter((candidate) => candidate.type === "move")) {
    movesByPiece.set(action.pieceId, [...(movesByPiece.get(action.pieceId) || []), action]);
  }
  const selectedMoves = new Map((movesByPiece.get(selectedPieceId) || []).map((action) => [action.to, action]));

  return (
    <div className="ts-board" role="grid" aria-label="Two Stones five-point Do-guti board">
      <svg viewBox="0 0 100 100" aria-hidden="true" className="ts-lines">
        {EDGES.map(([a, b]) => {
          const from = POINTS.find((point) => point.id === a);
          const to = POINTS.find((point) => point.id === b);
          return <line key={`${a}-${b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
      </svg>
      <div className="ts-open-side" aria-hidden="true">OPEN ICE</div>
      {POINTS.map((point) => {
        const piece = occupantAt(state, point.id);
        const placement = placementByPoint.get(point.id);
        const move = selectedMoves.get(point.id);
        const selectable = piece && movesByPiece.has(piece.id);
        const legal = placement || move || selectable;
        const label = piece
          ? `${point.label}, occupied by ${piece.side === "blue" ? "Aurora" : "Coral"} stone ${piece.id.split("-").at(-1)}${selectable ? ", selectable" : ""}`
          : `${point.label}, empty${placement ? ", legal placement" : move ? `, legal destination from ${move.from}` : ""}`;
        return (
          <button
            key={point.id}
            role="gridcell"
            aria-label={label}
            type="button"
            className={`ts-point ${piece ? `occupied ${piece.side}` : "empty"} ${legal ? "legal" : ""} ${piece?.id === selectedPieceId ? "selected" : ""}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            disabled={!interactive || !legal}
            onClick={() => {
              if (placement) return onAction?.(placement);
              if (move) return onAction?.(move);
              if (selectable) return onSelectPiece?.(piece.id);
            }}
          >
            {piece ? <><img className="ts-stone-sticker" src={DOGUTI_STICKERS[piece.side]} alt="" aria-hidden="true" /><small>{piece.id.split("-").at(-1)}</small></> : <span className="ts-empty-core" />}
          </button>
        );
      })}
      {selectedPieceId && <div className="ts-selection-note">Selected {selectedPieceId.replace("-", " stone ")} · choose a connected glowing point</div>}
    </div>
  );
}

export function StoneDock({ side, state }) {
  const stones = state.pieces[side];
  const placed = stones.filter((piece) => piece.point).length;
  const mobility = state.phase === "movement" && state.currentPlayer === side
    ? stones.reduce((sum, piece) => sum + (ADJACENCY[piece.point] || []).filter((point) => !occupantAt(state, point)).length, 0)
    : null;
  return (
    <aside className={`ts-dock ${side}`}>
      <span className="ts-tribe-mark">{side === "blue" ? "❄" : "◆"}</span>
      <div><strong>{side === "blue" ? "Aurora Stones" : "Coral Stones"}</strong><small>{placed}/2 placed{mobility === null ? "" : ` · ${mobility} moves`}</small></div>
      <div className="ts-dock-stones">{stones.map((piece) => <img key={piece.id} className={piece.point ? "on-board" : "waiting"} src={DOGUTI_STICKERS[side]} alt="" aria-hidden="true" />)}</div>
    </aside>
  );
}
