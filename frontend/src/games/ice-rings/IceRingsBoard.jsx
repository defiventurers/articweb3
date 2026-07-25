import { EDGES, NODES, NODE_BY_ID } from "./rules.js";

export function IceRingsBoard({ state, legalActions = [], selectedFrom = null, onNodeClick, interactive = true }) {
  const sourceIds = new Set(legalActions.map((action) => action.from));
  const targetActions = new Map(
    legalActions
      .filter((action) => !selectedFrom || action.from === selectedFrom)
      .map((action) => [action.to, action])
  );

  return (
    <div className="ir-board" role="grid" aria-label="Ice Rings Pretwa board">
      <svg className="ir-board-lines" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="ir-ice" cx="50%" cy="42%" r="65%">
            <stop offset="0" stopColor="#dffcff" stopOpacity="0.34" />
            <stop offset="0.55" stopColor="#62c8f3" stopOpacity="0.2" />
            <stop offset="1" stopColor="#06284d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="45" className="ir-halo" />
        {EDGES.map(([from, to]) => {
          const a = NODE_BY_ID[from];
          const b = NODE_BY_ID[to];
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        <circle cx="50" cy="50" r="43" className="ir-ring-glow outer" />
        <circle cx="50" cy="50" r="30" className="ir-ring-glow middle" />
        <circle cx="50" cy="50" r="17" className="ir-ring-glow inner" />
      </svg>

      {NODES.map((node) => {
        const occupant = state.board[node.id];
        const source = sourceIds.has(node.id);
        const targetAction = targetActions.get(node.id);
        const selected = selectedFrom === node.id;
        const clickable = interactive && (source || Boolean(targetAction));
        const aria = `${node.id} ${occupant ? `occupied by ${occupant}` : "empty"}${source ? " legal source" : ""}${targetAction ? ` legal ${targetAction.type === "capture" ? "capture" : "move"} target` : ""}${selected ? " selected" : ""}`;
        return (
          <button
            key={node.id}
            type="button"
            role="gridcell"
            aria-label={aria}
            className={`ir-node ${node.id === "c" ? "centre" : `ring-${node.ring}`} ${occupant ? `occupied ${occupant}` : "empty"} ${source ? "legal-source" : ""} ${targetAction ? "legal-target" : ""} ${targetAction?.type === "capture" ? "capture-target" : ""} ${selected ? "selected" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            disabled={!clickable}
            onClick={() => clickable && onNodeClick?.(node.id, targetAction)}
          >
            <span className="ir-node-core" aria-hidden="true">
              {occupant && <i className={`ir-guard ${occupant}`}><b>{occupant === "aurora" ? "✦" : "◆"}</b></i>}
              {!occupant && <em>•</em>}
            </span>
          </button>
        );
      })}

      <div className="ir-board-caption top" aria-hidden="true">AURORA ICE ARC</div>
      <div className="ir-board-caption bottom" aria-hidden="true">EMBER ICE ARC</div>
    </div>
  );
}

export function IceRingsScore({ state, side }) {
  const onBoard = Object.values(state.board).filter((value) => value === side).length;
  const captured = Number(state.captured[side] || 0);
  const active = state.currentPlayer === side && !state.winner;
  return (
    <aside className={`ir-score ${side} ${active ? "active" : ""}`}>
      <span className="ir-score-crest" aria-hidden="true">{side === "aurora" ? "✦" : "◆"}</span>
      <div><strong>{side === "aurora" ? "Aurora Rings" : "Ember Rings"}</strong><small>{active ? (state.chainFrom ? "Compulsory chain" : "Active formation") : "Waiting formation"}</small></div>
      <dl><div><dt>On ring</dt><dd>{onBoard}</dd></div><div><dt>Captured</dt><dd>{captured}</dd></div></dl>
    </aside>
  );
}
