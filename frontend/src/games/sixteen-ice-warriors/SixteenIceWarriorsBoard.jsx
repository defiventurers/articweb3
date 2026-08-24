import { useMemo } from "react";
import { EDGES, NODES, getLegalActions } from "./rules.js";
import { HeritageSticker } from "../../components/HeritageSticker.jsx";

// Arctic Hewakam treatment: readable physical soldier stickers replace decorative lettered helmets without altering the line-board rules.
const NODE_BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node]));
const SOLDIER_STICKERS = Object.freeze({
  aurora: null,
  ember: null
});

export function SixteenIceWarriorsBoard({ state, selectedNode, onNode, interactive = true, viewerSide = state.currentPlayer }) {
  const legalActions = useMemo(
    () => interactive && viewerSide === state.currentPlayer ? getLegalActions(state, viewerSide) : [],
    [interactive, state, viewerSide]
  );
  const legalOrigins = new Set(legalActions.filter((action) => action.from && action.type !== "end-chain").map((action) => action.from));
  const legalTargets = new Set(legalActions.filter((action) => action.to).map((action) => action.to));
  const captureTargets = new Set(legalActions.filter((action) => action.type === "capture").map((action) => action.to));

  return (
    <div className="siw-board" role="grid" aria-label="Sixteen Ice Warriors board">
      <svg className="siw-board-lines" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <filter id="siwGlow"><feGaussianBlur stdDeviation="0.65" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {EDGES.map(([from, to]) => {
          const a = NODE_BY_ID[from];
          const b = NODE_BY_ID[to];
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </svg>
      <div className="siw-board-core" aria-hidden="true" />
      {NODES.map((node) => {
        const piece = state.board[node.id];
        const selected = selectedNode === node.id || state.chainFrom === node.id;
        const legal = interactive && (legalOrigins.has(node.id) || legalTargets.has(node.id));
        const capture = captureTargets.has(node.id);
        const actionHint = capture ? " capture target" : legal ? " legal move" : "";
        return (
          <button
            key={node.id}
            type="button"
            role="gridcell"
            disabled={!interactive}
            aria-pressed={selected}
            className={`siw-node ${piece ? `piece-${piece}` : "empty"} ${selected ? "selected" : ""} ${legal ? "legal" : ""} ${capture ? "capture" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => onNode(node.id)}
            aria-label={`${node.id}${piece ? ` occupied by ${piece}` : " empty"}${selected ? " selected" : ""}${actionHint}`}
          >
            {piece && <HeritageSticker className={`siw-piece-sticker ${piece}`} fallbackClassName={`${piece} soldier`} src={SOLDIER_STICKERS[piece]} alt="" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
