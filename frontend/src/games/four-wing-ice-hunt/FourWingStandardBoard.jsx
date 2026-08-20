// Reference-board renderer: RAILS is the single source for both legal graph edges and visible SVG rails.
import { useMemo } from "react";
import { EDGES, NODES, RAILS, getLegalActions } from "./standardRules.js";

const NODE_BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node]));

export function FourWingStandardBoard({ state, selectedNode, onNode, interactive = true }) {
  const legalActions = useMemo(() => interactive ? getLegalActions(state) : [], [interactive, state]);
  const legalTargets = new Set(legalActions.map((action) => action.type === "place" ? action.nodeId : action.to));
  const legalOrigins = new Set(legalActions.filter((action) => action.type !== "place").map((action) => action.from));
  const captureTargets = new Set(legalActions.filter((action) => action.type === "capture").map((action) => action.to));
  return (
    <div className="fwh-board fwh-standard-board" role="grid" aria-label="Four-Wing Hunt board">
      <svg className="fwh-board-lines" viewBox="0 0 100 100" aria-hidden="true">
        <defs><filter id="fwhReferenceGlow"><feGaussianBlur stdDeviation="0.48" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {RAILS.map((rail) => <BoardRail key={`${rail.from}-${rail.to}`} rail={rail} filter="url(#fwhReferenceGlow)" />)}
      </svg>
      <div className="fwh-aurora-core" aria-hidden="true" />
      {NODES.map((node) => {
        const piece = state.board[node.id];
        if (node.outside && !piece) return null;
        const selected = selectedNode === node.id;
        const legal = legalTargets.has(node.id) || legalOrigins.has(node.id);
        const capture = captureTargets.has(node.id);
        return <button key={node.id} type="button" role="gridcell" disabled={!interactive} className={`fwh-node ${node.outside ? "outside-start" : ""} ${piece ? `piece-${piece}` : "empty"} ${selected ? "selected" : ""} ${legal ? "legal" : ""} ${capture ? "capture" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => onNode(node.id)} aria-label={`${node.outside ? "outside leopard entry" : node.id}${piece ? ` occupied by ${piece}` : " open"}${selected ? " selected" : ""}`}>
          {piece === "leopards" && <span className="fwh-piece fwh-leopard"><img src="/assets/four-wing/snow-leopard.png" alt="" /></span>}
          {piece === "cattle" && <span className="fwh-piece fwh-cattle"><img src="/assets/four-wing/penguin-coloniser.png" alt="" /></span>}
        </button>;
      })}
    </div>
  );
}

function BoardRail({ rail, filter }) {
  const a = NODE_BY_ID[rail.from];
  const b = NODE_BY_ID[rail.to];
  if (rail.kind === "entry") return null;
  if (rail.kind !== "curve") return <line className={`fwh-rail fwh-rail-${rail.kind}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} filter={filter} />;
  return <path className={`fwh-rail fwh-rail-curve fwh-rail-${rail.curve}`} d={curvePath(a, b, rail.curve)} filter={filter} />;
}

function curvePath(a, b, curve) {
  const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const outer = curve.endsWith("outer") ? 3.4 : 1.7;
  if (curve.startsWith("north")) midpoint.y -= outer;
  if (curve.startsWith("south")) midpoint.y += outer;
  if (curve.startsWith("west")) midpoint.x -= outer;
  if (curve.startsWith("east")) midpoint.x += outer;
  return `M ${a.x} ${a.y} Q ${midpoint.x} ${midpoint.y} ${b.x} ${b.y}`;
}
