import { useMemo } from "react";
import { EDGES, NODES, getLegalActions } from "./rules.js";

const NODE_BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node]));

export function FourWingBoard({ state, selectedNode, onNode, interactive = true, viewerRole = state.currentPlayer }) {
  const legalActions = useMemo(
    () => interactive && viewerRole === state.currentPlayer ? getLegalActions(state, viewerRole) : [],
    [interactive, state, viewerRole]
  );
  const legalTargets = new Set(legalActions.map((action) => action.nodeId || action.to));
  const legalOrigins = new Set(legalActions.filter((action) => action.from).map((action) => action.from));
  const captureTargets = new Set(legalActions.filter((action) => action.type === "capture").map((action) => action.to));

  return (
    <div className="fwh-board" role="grid" aria-label="Four-Wing Ice Hunt board">
      <svg className="fwh-board-lines" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <filter id="fwhGlow"><feGaussianBlur stdDeviation="0.65" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {EDGES.map(([from, to]) => {
          const a = NODE_BY_ID[from];
          const b = NODE_BY_ID[to];
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </svg>
      <div className="fwh-aurora-core" aria-hidden="true" />
      {NODES.map((node) => {
        const piece = state.board[node.id];
        const selected = selectedNode === node.id;
        const legal = interactive && (legalTargets.has(node.id) || legalOrigins.has(node.id));
        const capture = captureTargets.has(node.id);
        return (
          <button
            key={node.id}
            type="button"
            role="gridcell"
            disabled={!interactive}
            className={`fwh-node ${piece ? `piece-${piece}` : "empty"} ${selected ? "selected" : ""} ${legal ? "legal" : ""} ${capture ? "capture" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => onNode(node.id)}
            aria-label={`${node.id}${piece ? ` occupied by ${piece}` : " empty"}${selected ? " selected" : ""}`}
          >
            {piece === "leopards" && <span className="fwh-piece fwh-leopard"><i className="ear left" /><i className="ear right" /><b>✦</b></span>}
            {piece === "cattle" && <span className="fwh-piece fwh-cattle"><i /><b>●</b></span>}
          </button>
        );
      })}
    </div>
  );
}
