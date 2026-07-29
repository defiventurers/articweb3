import { useMemo } from "react";
import { getLegalActions } from "./rules.js";

export function KhasiFishflowBoard({ state, onPit, interactivePlayer = state.currentPlayer, interactive = true }) {
  const legalIndexes = useMemo(() => {
    if (!interactive || interactivePlayer !== state.currentPlayer) return new Set();
    return new Set(getLegalActions(state, interactivePlayer).map((action) => action.pitIndex));
  }, [interactive, interactivePlayer, state]);

  return (
    <div className="kf-board" role="grid" aria-label="Khasi Fishflow Mawkar Katiya board">
      <Store player="ember" count={state.stores.ember} />
      <div className="kf-pit-field">
        <div className="kf-row-label ember">Ember Current</div>
        <div className="kf-row ember" role="row">
          {[...state.rows.ember].map((count, displayIndex) => {
            const pitIndex = state.rows.ember.length - 1 - displayIndex;
            return <Pit key={`ember-${pitIndex}`} player="ember" pitIndex={pitIndex} count={count} active={pitIndex < state.activePits.ember} legal={state.currentPlayer === "ember" && legalIndexes.has(pitIndex)} onPit={onPit} />;
          })}
        </div>
        <div className="kf-flow-line" aria-hidden="true"><span>↻ CLOCKWISE KHASI CURRENT ↻</span></div>
        <div className="kf-row aurora" role="row">
          {state.rows.aurora.map((count, pitIndex) => <Pit key={`aurora-${pitIndex}`} player="aurora" pitIndex={pitIndex} count={count} active={pitIndex < state.activePits.aurora} legal={state.currentPlayer === "aurora" && legalIndexes.has(pitIndex)} onPit={onPit} />)}
        </div>
        <div className="kf-row-label aurora">Aurora Current</div>
      </div>
      <Store player="aurora" count={state.stores.aurora} />
    </div>
  );
}

function Pit({ player, pitIndex, count, active, legal, onPit }) {
  return (
    <button
      type="button"
      role="gridcell"
      disabled={!active || !legal}
      className={`kf-pit ${player} ${active ? "active" : "inactive"} ${legal ? "legal" : ""}`}
      onClick={() => onPit(player, pitIndex)}
      aria-label={`${player === "aurora" ? "Aurora" : "Ember"} pit ${pitIndex + 1} with ${count} stones${active ? "" : ", inactive handicap pit"}`}
    >
      <strong>{count}</strong>
      <span aria-hidden="true">{Array.from({ length: Math.min(Number(count || 0), 14) }, (_, index) => <i key={index}>◆</i>)}</span>
      {count > 14 && <small>+{count - 14}</small>}
      {!active && <b aria-hidden="true">❄</b>}
    </button>
  );
}

function Store({ player, count }) {
  return <aside className={`kf-store ${player}`} aria-label={`${player} store with ${count} captured stones`}><span aria-hidden="true">◒</span><strong>{count}</strong><small>STONE STORE</small></aside>;
}
