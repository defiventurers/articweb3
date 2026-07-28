import { COLS, ROWS, cellId, getPieceCell } from "./rules.js";

export function PolarTablanBoard({ state, legalActions = [], onAction, interactive = true }) {
  const piecesByCell = new Map();
  for (const side of ["aurora", "ember"]) for (const piece of state.pieces[side]) {
    const id = getPieceCell(piece);
    if (id) piecesByCell.set(id, piece);
  }
  const targetCells = new Set(legalActions.flatMap((action) => (action.resolved || []).map((leg) => leg.targetCell)));
  const movableIds = new Set(legalActions.flatMap((action) => (action.legs || []).map((leg) => leg.pieceId)));

  return (
    <section className="pt-board-wrap" aria-label="Polar Tablan board">
      <div className="pt-row-labels" aria-hidden="true"><span>EMBER HOME · LOCKED FINISH</span><span>SHARED ICE</span><span>SHARED ICE</span><span>AURORA HOME · LOCKED FINISH</span></div>
      <div className="pt-board" role="grid" aria-label="Polar Tablan four by twelve board">
        {Array.from({ length: ROWS }, (_, row) => Array.from({ length: COLS }, (_, col) => {
          const id = cellId(row, col);
          const piece = piecesByCell.get(id);
          const isFinish = row === 0 || row === 3;
          const target = targetCells.has(id);
          return (
            <div key={id} role="gridcell" aria-label={`${id} ${piece ? `occupied by ${piece.side} runner ${piece.id.split("-").at(-1)} ${piece.status}` : "empty"}${target ? " legal destination" : ""}`} className={`pt-cell ${isFinish ? "home-row" : "middle-row"} ${target ? "target" : ""}`}>
              <small>{col + 1}</small>
              {piece && <button type="button" className={`pt-runner ${piece.side} ${piece.status} ${movableIds.has(piece.id) ? "movable" : ""}`} disabled={!interactive || !movableIds.has(piece.id)} aria-label={`${piece.side === "aurora" ? "Aurora" : "Ember"} runner ${piece.id.split("-").at(-1)} on ${id}, ${piece.status}`}><span>{piece.status === "locked" ? "🔒" : piece.side === "aurora" ? "🐧" : "🧊"}</span><b>{piece.id.split("-").at(-1)}</b></button>}
            </div>
          );
        }))}
      </div>
      <div className="pt-route-legend"><span> Aurora: bottom → left/right boustrophedon → top</span><span>Ember: top → opposite boustrophedon → bottom</span></div>
      <ActionRail actions={legalActions} onAction={onAction} interactive={interactive} />
    </section>
  );
}

export function ActionRail({ actions, onAction, interactive }) {
  return (
    <section className="pt-action-rail" aria-label="Legal Bell score allocations">
      <header><strong>Use the score</strong><small>A full move uses one runner. A split uses two different runners.</small></header>
      <div>
        {actions.map((action, index) => {
          if (action.type === "forfeit-roll") return <button key="forfeit" disabled={!interactive} onClick={() => onAction?.(action)} aria-label={`Forfeit unusable score ${action.value}`}>No legal move · forfeit {action.value}</button>;
          const label = action.split
            ? `Split ${action.value}: ${action.legs.map((leg) => `${shortId(leg.pieceId)} +${leg.amount}`).join(" · ")}`
            : `Move ${shortId(action.legs[0].pieceId)} by ${action.value}`;
          const detail = (action.resolved || []).map((leg) => `${leg.capturedPieceId ? "capture " : ""}${leg.locked ? "lock " : ""}${leg.targetCell}`).join(" / ");
          return <button key={`${index}-${label}`} disabled={!interactive} onClick={() => onAction?.(action)} aria-label={label}><strong>{label}</strong><small>{detail}</small></button>;
        })}
      </div>
    </section>
  );
}

export function StickTray({ roll, onRoll, canRoll, busy = false }) {
  const faces = roll?.faces || [0,0,0,0];
  return (
    <section className="pt-stick-tray" aria-label="Four Tablan casting sticks">
      <div className="pt-sticks">{faces.map((face, index) => <i key={index} className={face ? "plain" : "painted"}><span>{face ? "ICE" : "INK"}</span></i>)}</div>
      <div><strong>{roll ? roll.value : "CAST"}</strong><small>{roll ? `${roll.plainUp} plain up${roll.value ? " · repeat after movement" : " · turn passes"}` : "Four half-cylinder sticks"}</small></div>
      <button disabled={!canRoll || busy} onClick={onRoll}>{busy ? "Casting…" : "Cast Sticks"}</button>
    </section>
  );
}

export function ConvoyPanel({ side, state }) {
  const pieces = state.pieces[side];
  return <aside className={`pt-convoy ${side}`}><header><span>{side === "aurora" ? "🐧" : "❄"}</span><div><strong>{side === "aurora" ? "Aurora Convoy" : "Ember Convoy"}</strong><small>{side === "aurora" ? "Bottom home row" : "Top home row"}</small></div></header><div className="pt-convoy-score"><b>{pieces.filter((piece) => piece.status === "locked").length}</b><span>locked</span></div><footer><span>{pieces.filter((piece) => piece.status === "active").length} active</span><span>{pieces.filter((piece) => piece.status === "captured").length} captured</span><span>{state.captures[side]} takedowns</span></footer></aside>;
}

function shortId(pieceId) { const [side, number] = pieceId.split("-"); return `${side === "aurora" ? "A" : "E"}${number}`; }
