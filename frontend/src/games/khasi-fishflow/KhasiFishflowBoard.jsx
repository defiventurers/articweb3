import { getCounts } from "./rules.js";

export function KhasiFishflowBoard({ state, legalActions = [], onAction, interactive = true }) {
  const legal = new Map(legalActions.map((action) => [action.pitIndex, action]));
  const counts = getCounts(state);
  return (
    <section className="kf-board" aria-label="Khasi Fishflow board">
      <header>
        <Score side="blue" counts={counts.blue} />
        <div><strong>Round {state.round}</strong><span>Clockwise relay · seventy stones</span></div>
        <Score side="coral" counts={counts.coral} />
      </header>
      <div className="kf-row coral" role="row" aria-label="Coral Khasi row">
        {[...state.rows.coral].map((count, displayIndex) => {
          const pitIndex = 6 - displayIndex;
          return <Pit key={`coral-${pitIndex}`} side="coral" pitIndex={pitIndex} count={count} active={state.active.coral[pitIndex]} partial={state.partialPit.coral === pitIndex} action={state.currentPlayer === "coral" ? legal.get(pitIndex) : null} onAction={onAction} interactive={interactive} />;
        })}
      </div>
      <div className="kf-current-arrow" aria-hidden="true">BLUE → · CLOCKWISE · ← CORAL</div>
      <div className="kf-row blue" role="row" aria-label="Blue Khasi row">
        {state.rows.blue.map((count, pitIndex) => <Pit key={`blue-${pitIndex}`} side="blue" pitIndex={pitIndex} count={count} active={state.active.blue[pitIndex]} partial={state.partialPit.blue === pitIndex} action={state.currentPlayer === "blue" ? legal.get(pitIndex) : null} onAction={onAction} interactive={interactive} />)}
      </div>
    </section>
  );
}

function Pit({ side, pitIndex, count, active, partial, action, onAction, interactive }) {
  const label = `${side === "blue" ? "Blue" : "Coral"} pit ${pitIndex + 1} with ${count} stones${active ? "" : ", inactive"}${partial ? ", handicap pit" : ""}${action ? ", legal sow" : ""}`;
  return (
    <button role="gridcell" aria-label={label} className={`kf-pit ${side} ${active ? "active" : "inactive"} ${partial ? "partial" : ""} ${action ? "legal" : ""}`} disabled={!interactive || !action} onClick={() => action && onAction?.(action)}>
      <span className="kf-stones" aria-hidden="true">{Array.from({ length: Math.min(count, 12) }, (_, index) => <i key={index} />)}</span>
      <strong>{count}</strong><small>{partial ? "HANDICAP" : active ? `PIT ${pitIndex + 1}` : "FROZEN"}</small>
    </button>
  );
}

function Score({ side, counts }) {
  return <div className={`kf-score ${side}`}><strong>{side === "blue" ? "Blue Current" : "Coral Current"}</strong><span>{counts.store} captured · {counts.reserve} reserve</span><small>{counts.activePits} active pits · target {counts.handicapTarget || "—"}</small></div>;
}
