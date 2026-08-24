import { EDGES, POINTS, getLegalActions, occupantAt } from "./rules.js";

export function AuroraVultureBoard({
  state,
  legalActions = [],
  selectedPieceId,
  onSelectPiece,
  onAction,
  interactive = true
}) {
  const pointMap = new Map(POINTS.map((point) => [point.id, point]));

  return (
    <div className="av-board-shell">
      <div className="av-aurora-ring" aria-hidden="true" />
      <div className="av-board" role="grid" aria-label="Aurora Vulture ten-point pentagram board">
        <svg className="av-star-lines" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <filter id="av-glow"><feGaussianBlur stdDeviation="1.1" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {EDGES.map(([a, b]) => {
            const from = pointMap.get(a);
            const to = pointMap.get(b);
            return <line key={`${a}-${b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} filter="url(#av-glow)" />;
          })}
        </svg>
        {POINTS.map((point) => {
          const occupant = occupantAt(state, point.id);
          const pieceActions = occupant ? legalActions.filter((action) => action.pieceId === occupant.id) : [];
          const selectable = Boolean(occupant && pieceActions.length);
          const placementAction = !occupant
            ? legalActions.find((action) => action.to === point.id && ["place-crow", "place-vulture"].includes(action.type))
            : null;
          const selectedAction = !occupant && selectedPieceId
            ? legalActions.find((action) => action.pieceId === selectedPieceId && action.to === point.id)
            : null;
          const action = placementAction || selectedAction || null;
          const capture = action?.type === "capture-crow";
          const selected = occupant?.id === selectedPieceId;
          const aria = buildPointAria(point, occupant, selectable, action, selectedPieceId);
          return (
            <button
              key={point.id}
              type="button"
              role="gridcell"
              aria-label={aria}
              className={`av-point ${point.kind} ${occupant ? "occupied" : "empty"} ${occupant?.side || ""} ${selectable ? "selectable" : ""} ${selected ? "selected" : ""} ${action ? "destination" : ""} ${capture ? "capture" : ""}`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              disabled={!interactive || (!selectable && !action)}
              onClick={() => {
                if (action) return onAction?.(action);
                if (selectable) onSelectPiece?.(occupant.id);
              }}
            >
              <span className="av-node-core" aria-hidden="true" />
              {occupant?.side === "vulture" && <span className="av-vulture-token" aria-hidden="true"><i className="av-wing left" /><i className="av-wing right" /><b className="av-vulture-head" /><em className="av-vulture-beak" /></span>}
              {occupant?.side === "crows" && <span className="av-crow-token" aria-hidden="true"><i className="av-crow-body" /><i className="av-crow-wing" /><small>{Number(occupant.id.split("-").at(-1))}</small></span>}
              {action && !occupant && <span className="av-target-mark" aria-hidden="true">{capture ? "✦" : "·"}</span>}
            </button>
          );
        })}
        <span className="av-board-title" aria-hidden="true">AURORA STAR</span>
      </div>
    </div>
  );
}

export function VultureDock({ state }) {
  const legal = state.currentPlayer === "vulture" && !state.winner && !state.isDraw
    ? getLegalActions(state, "vulture").length
    : 0;
  return (
    <aside className="av-dock vulture">
      <header><span className="av-dock-icon av-mini-vulture" /><div><strong>Glacier Vulture</strong><small>Single hunter</small></div></header>
      <div className="av-vulture-portrait" aria-hidden="true"><span className="av-vulture-token"><i className="av-wing left" /><i className="av-wing right" /><b className="av-vulture-head" /><em className="av-vulture-beak" /></span></div>
      <div className="av-meter"><span style={{ width: `${Math.min(100, state.capturedCrows * 25)}%` }} /></div>
      <footer><span>{state.capturedCrows}/4 captures</span><span>{legal} legal options</span></footer>
    </aside>
  );
}

export function CrowDock({ state }) {
  const waiting = state.crows.filter((crow) => crow.status === "waiting");
  const active = state.crows.filter((crow) => crow.status === "board");
  const captured = state.crows.filter((crow) => crow.status === "captured");
  return (
    <aside className="av-dock crows">
      <header><span className="av-dock-icon av-mini-crow" /><div><strong>Aurora Crows</strong><small>Seven defenders</small></div></header>
      <div className="av-flock" aria-label={`${waiting.length} waiting, ${active.length} on board, ${captured.length} captured`}>
        {state.crows.map((crow) => <i key={crow.id} className={crow.status} title={`${crow.id}: ${crow.status}`} />)}
      </div>
      <footer><span>{active.length} on star</span><span>{waiting.length} waiting</span><span>{captured.length} lost</span></footer>
    </aside>
  );
}

function buildPointAria(point, occupant, selectable, action, selectedPieceId) {
  const occupancy = occupant
    ? occupant.side === "vulture"
      ? "occupied by Glacier Vulture"
      : `occupied by Aurora ${occupant.id}`
    : "empty";
  if (action?.type === "capture-crow") return `${point.label}, empty, capture destination from ${action.from} over ${action.over}`;
  if (action?.type === "move-vulture" || action?.type === "move-crow") return `${point.label}, empty, legal destination from ${action.from}`;
  if (action?.type === "place-crow") return `${point.label}, empty, legal crow placement`;
  if (action?.type === "place-vulture") return `${point.label}, empty, legal vulture placement`;
  if (selectable) return `${point.label}, ${occupancy}, selectable`;
  if (!occupant && selectedPieceId) return `${point.label}, empty`;
  return `${point.label}, ${occupancy}`;
}
