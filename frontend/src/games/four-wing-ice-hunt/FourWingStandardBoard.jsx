import { useMemo } from "react";
import { EDGES, NODES, getLegalActions } from "./standardRules.js";

const NODE_BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node]));

export function FourWingStandardBoard({ state, selectedNode, onNode, interactive = true }) {
  const legalActions = useMemo(() => interactive ? getLegalActions(state) : [], [interactive, state]);
  const legalTargets = new Set(legalActions.map((action) => action.type === "place" ? action.nodeId : action.to));
  const legalOrigins = new Set(legalActions.filter((action) => action.type !== "place").map((action) => action.from));
  const captureTargets = new Set(legalActions.filter((action) => action.type === "capture").map((action) => action.to));
  return (
    <div className="fwh-board fwh-standard-board" role="grid" aria-label="Four-Wing Hunt board">
      <svg className="fwh-board-lines" viewBox="0 0 100 100" aria-hidden="true">
        <defs><filter id="fwhStandardGlow"><feGaussianBlur stdDeviation="0.65" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {EDGES.map(([from, to]) => { const a = NODE_BY_ID[from]; const b = NODE_BY_ID[to]; return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} filter="url(#fwhStandardGlow)" />; })}
      </svg>
      <div className="fwh-aurora-core" aria-hidden="true" />
      {NODES.map((node) => {
        const piece = state.board[node.id];
        if (node.outside && !piece) return null;
        const selected = selectedNode === node.id;
        const legal = legalTargets.has(node.id) || legalOrigins.has(node.id);
        const capture = captureTargets.has(node.id);
        return <button key={node.id} type="button" role="gridcell" disabled={!interactive} className={`fwh-node ${node.outside ? "outside-start" : ""} ${piece ? `piece-${piece}` : "empty"} ${selected ? "selected" : ""} ${legal ? "legal" : ""} ${capture ? "capture" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => onNode(node.id)} aria-label={`${node.outside ? "outside leopard entry" : node.id}${piece ? ` occupied by ${piece}` : " open"}${selected ? " selected" : ""}`}>
          {piece === "leopards" && <span className="fwh-piece fwh-leopard"><img src="/assets/four-wing/refined-snow-leopard.png" alt="" /></span>}
          {piece === "cattle" && <span className="fwh-piece fwh-cattle"><img src="/assets/four-wing/retba-coloniser.png" alt="" /></span>}
        </button>;
      })}
    </div>
  );
}
