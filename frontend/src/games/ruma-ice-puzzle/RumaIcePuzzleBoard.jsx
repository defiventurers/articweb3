import { getLegalActions } from "./rules.js";

export function RumaIcePuzzleBoard({ state, onPit, interactive = true, hintPit = null }) {
  const legal = new Set(getLegalActions(state).map((action) => action.pitIndex));
  return (
    <div className="rp-board" role="grid" aria-label="Ruma Ice Puzzle board">
      <div className="rp-route" aria-hidden="true"><span>→</span><span>→</span><span>→</span><span>→</span></div>
      <div className="rp-pits">
        {state.pits.map((count, pitIndex) => (
          <button
            key={pitIndex}
            type="button"
            role="gridcell"
            className={`rp-pit ${legal.has(pitIndex) ? "legal" : ""} ${hintPit === pitIndex ? "hint" : ""}`}
            disabled={!interactive || !legal.has(pitIndex)}
            onClick={() => onPit(pitIndex)}
            aria-label={`Pit ${pitIndex + 1} with ${count} counters${hintPit === pitIndex ? ", suggested move" : ""}`}
          >
            <small>PIT {pitIndex + 1}</small>
            <strong>{count}</strong>
            <span aria-hidden="true">{Array.from({ length: Math.min(count, 12) }, (_, index) => <i key={index}>◆</i>)}</span>
          </button>
        ))}
      </div>
      <aside className="rp-ruma" aria-label={`Ruma store with ${state.ruma} counters`}>
        <small>RUMA</small><strong>{state.ruma}/8</strong><span aria-hidden="true">{Array.from({ length: state.ruma }, (_, index) => <i key={index}>❄</i>)}</span>
      </aside>
      <div className="rp-wrap" aria-hidden="true">RUMA → PIT 1</div>
    </div>
  );
}
