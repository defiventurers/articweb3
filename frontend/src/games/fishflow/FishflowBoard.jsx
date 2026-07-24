import { useMemo } from "react";
import { getLegalActions } from "./rules.js";

export function FishflowBoard({ state, onPit, interactivePlayer = state.currentPlayer, interactive = true }) {
  const legalIndexes = useMemo(() => {
    if (!interactive || interactivePlayer !== state.currentPlayer) return new Set();
    return new Set(getLegalActions(state, interactivePlayer).map((action) => action.pitIndex));
  }, [interactive, interactivePlayer, state]);

  return (
    <div className="fishflow-board" role="grid" aria-label="Fishflow Pallanguzhi board">
      <Store player="coral" count={state.stores.coral} />
      <div className="fishflow-pit-field">
        <div className="fishflow-current-label coral">Coral Current</div>
        <div className="fishflow-row coral" role="row">
          {[...state.rows.coral].map((count, displayIndex) => {
            const pitIndex = state.rows.coral.length - 1 - displayIndex;
            return (
              <Pit
                key={`coral-${pitIndex}`}
                player="coral"
                pitIndex={pitIndex}
                count={count}
                active={pitIndex < state.activePits.coral}
                legal={state.currentPlayer === "coral" && legalIndexes.has(pitIndex)}
                onPit={onPit}
              />
            );
          })}
        </div>
        <div className="fishflow-flow-line" aria-hidden="true"><span>← ANTICLOCKWISE CURRENT ←</span></div>
        <div className="fishflow-row blue" role="row">
          {state.rows.blue.map((count, pitIndex) => (
            <Pit
              key={`blue-${pitIndex}`}
              player="blue"
              pitIndex={pitIndex}
              count={count}
              active={pitIndex < state.activePits.blue}
              legal={state.currentPlayer === "blue" && legalIndexes.has(pitIndex)}
              onPit={onPit}
            />
          ))}
        </div>
        <div className="fishflow-current-label blue">Blue Current</div>
      </div>
      <Store player="blue" count={state.stores.blue} />
    </div>
  );
}

function Pit({ player, pitIndex, count, active, legal, onPit }) {
  const fishCount = Math.min(Number(count || 0), 12);
  return (
    <button
      type="button"
      role="gridcell"
      disabled={!active || !legal}
      className={`fishflow-pit ${player} ${active ? "active" : "inactive"} ${legal ? "legal" : ""}`}
      onClick={() => onPit(player, pitIndex)}
      aria-label={`${player === "blue" ? "Blue" : "Coral"} pit ${pitIndex + 1} with ${count} fish${active ? "" : ", frozen"}`}
    >
      <span className="fishflow-pit-number">{count}</span>
      <span className="fishflow-fish-cluster" aria-hidden="true">
        {Array.from({ length: fishCount }, (_, index) => <i key={index}>◆</i>)}
      </span>
      {count > 12 && <small>+{count - 12}</small>}
      {!active && <span className="fishflow-frozen-mark" aria-hidden="true">❄</span>}
    </button>
  );
}

function Store({ player, count }) {
  return (
    <aside className={`fishflow-store ${player}`} aria-label={`${player} captured fish store with ${count} fish`}>
      <span aria-hidden="true">◒</span>
      <strong>{count}</strong>
      <small>ICE STORE</small>
    </aside>
  );
}
