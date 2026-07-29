import { SIDE_PITS, sideName } from "./rules.js";

export function KhasiFishflowBoard({ state, legalActions = [], onAction, interactive = true }) {
  const legal = new Map(legalActions.map((action) => [action.pitId, action]));
  return (
    <section className="kf-board" aria-label="Khasi Fishflow two by seven board">
      <div className="kf-current-arrow">CLOCKWISE RELAY ↻</div>
      <PitRow side="ember" pits={[...SIDE_PITS.ember].reverse()} state={state} legal={legal} onAction={onAction} interactive={interactive} />
      <div className="kf-river"><span>KHASI ICE RIVER</span><b>relay from the next pit</b></div>
      <PitRow side="aurora" pits={SIDE_PITS.aurora} state={state} legal={legal} onAction={onAction} interactive={interactive} />
    </section>
  );
}

function PitRow({ side, pits, state, legal, onAction, interactive }) {
  return (
    <div className={`kf-row ${side}`} aria-label={`${sideName(side)} row`}>
      {pits.map((pitId, index) => {
        const action = legal.get(pitId);
        const active = state.active[pitId];
        const partial = state.partialPit[side] === pitId;
        const count = state.pits[pitId];
        const label = `${sideName(side)} pit ${index + 1}, ${active ? `${count} stones` : "inactive"}${partial ? ", handicap pit" : ""}${action ? ", legal relay" : ""}`;
        return (
          <button
            key={pitId}
            type="button"
            className={`kf-pit ${side} ${active ? "active" : "inactive"} ${partial ? "partial" : ""} ${action ? "legal" : ""}`}
            disabled={!interactive || !action}
            onClick={() => action && onAction?.(action)}
            aria-label={label}
          >
            <small>{pitId.toUpperCase()}</small>
            <strong>{active ? count : "—"}</strong>
            <span className="kf-stones" aria-hidden="true">{Array.from({ length: Math.min(count, 12) }, (_, stone) => <i key={stone} />)}</span>
            {partial && <em>HANDICAP</em>}
          </button>
        );
      })}
    </div>
  );
}

export function KhasiScore({ state }) {
  return (
    <section className="kf-score" aria-label="Khasi Fishflow score">
      {(["aurora", "ember"]).map((side) => (
        <article key={side} className={state.currentPlayer === side ? "active" : ""}>
          <span>{side === "aurora" ? "❄" : "◆"}</span>
          <div><strong>{sideName(side)}</strong><small>{state.stores[side]} captured · {state.reserves[side]} reserved</small><small>{state.handicapValue[side] ? `auto-capture value ${state.handicapValue[side]}` : "no handicap trigger"}</small></div>
        </article>
      ))}
      <div><strong>Round {state.round}</strong><small>Turn {state.turn}</small></div>
    </section>
  );
}
