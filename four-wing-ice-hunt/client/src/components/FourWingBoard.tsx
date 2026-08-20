/** Design reference: Arctic heritage-console board with a mechanically exact four-wing lattice. */
import { useMemo } from "react";
import { EDGES, NODE_BY_ID, NODES, getLegalActions, type FourWingState } from "../game/fourWingRules";

const BOARD_TEXTURE = "/manus-storage/four-wing-ice-board-surface_8640107b.png";
const LEOPARD_TOKEN = "/manus-storage/snow-leopard-game-token_8c2a4c7b.png";
const PENGUIN_TOKEN = "/manus-storage/penguin-coloniser-game-token_02682a2e.png";

interface FourWingBoardProps {
  state: FourWingState;
  selectedNode: string | null;
  onNode: (nodeId: string) => void;
  interactive?: boolean;
}

export function FourWingBoard({ state, selectedNode, onNode, interactive = true }: FourWingBoardProps) {
  const legalActions = useMemo(() => interactive ? getLegalActions(state) : [], [interactive, state]);
  const legalTargets = new Set(legalActions.map((action) => action.type === "place" ? action.nodeId : action.to));
  const legalOrigins = new Set(legalActions.filter((action) => action.type !== "place").map((action) => action.from));
  const captureTargets = new Set(legalActions.filter((action) => action.type === "capture").map((action) => action.to));

  return (
    <div className="four-wing-board" style={{ backgroundImage: `linear-gradient(rgba(3, 20, 37, .36), rgba(3, 20, 37, .36)), url(${BOARD_TEXTURE})` }} role="grid" aria-label="Four-Wing Hunt board">
      <svg className="four-wing-lines" viewBox="0 0 100 100" aria-hidden="true">
        <defs><filter id="fourWingGlow"><feGaussianBlur stdDeviation="0.55" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {EDGES.map(([from, to]) => {
          const a = NODE_BY_ID[from];
          const b = NODE_BY_ID[to];
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} filter="url(#fourWingGlow)" />;
        })}
      </svg>
      <div className="board-aurora-core" aria-hidden="true" />
      {NODES.map((node) => {
        const piece = state.board[node.id];
        const selected = selectedNode === node.id;
        const legal = legalTargets.has(node.id) || legalOrigins.has(node.id);
        const capture = captureTargets.has(node.id);
        return (
          <button
            key={node.id}
            type="button"
            role="gridcell"
            className={`four-wing-node ${piece ? `piece-${piece}` : "empty"} ${selected ? "selected" : ""} ${legal ? "legal" : ""} ${capture ? "capture" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => onNode(node.id)}
            disabled={!interactive}
            aria-label={`${node.id}, ${piece ?? "open"}${selected ? ", selected" : ""}`}
          >
            {piece === "leopards" && <span className="piece-art leopard-art"><img src={LEOPARD_TOKEN} alt="Snow leopard" /></span>}
            {piece === "colony" && <span className="piece-art penguin-art"><img src={PENGUIN_TOKEN} alt="Penguin coloniser" /></span>}
          </button>
        );
      })}
    </div>
  );
}
