import { useMemo } from "react";
import { EDGES, NODES, getLegalActions } from "./rules.js";

export function NineIceFortsBoard({ state, selectedNode, onNode, interactive = true }) {
  const legalActions = useMemo(() => getLegalActions(state), [state]);
  const legalNodeIds = new Set(legalActions.flatMap((action) => action.type === "move" ? [action.to] : [action.nodeId]));
  const movableFrom = new Set(legalActions.filter((action) => action.type === "move").map((action) => action.from));

  return (
    <div className="nif-board" role="grid" aria-label="Nine Ice Forts board">
      <svg className="nif-board-lines" viewBox="0 0 100 100" aria-hidden="true">
        {EDGES.map(([from, to]) => {
          const a = NODES.find((node) => node.id === from);
          const b = NODES.find((node) => node.id === to);
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </svg>
      {NODES.map((node) => {
        const piece = state.board[node.id];
        const selected = selectedNode === node.id;
        const legal = interactive && (legalNodeIds.has(node.id) || movableFrom.has(node.id));
        return (
          <button
            key={node.id}
            type="button"
            disabled={!interactive}
            className={`nif-node ${piece ? `piece-${piece}` : "empty"} ${selected ? "selected" : ""} ${legal ? "legal" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => onNode(node.id)}
            aria-label={`${node.id}${piece ? ` occupied by ${piece}` : " empty"}${selected ? " selected" : ""}`}
            role="gridcell"
          >
            {piece && <span className="nif-piece"><i /></span>}
          </button>
        );
      })}
    </div>
  );
}
