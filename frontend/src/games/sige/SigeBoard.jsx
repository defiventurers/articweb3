import { BOARD_SIZE, CELLS, ROUTES, SAFE_SPACES, getPieceSpaceId, sideName } from "./rules.js";

export function SigeBoard({ state, legalActions = [], onAction, interactive = true }) {
  const actionByPiece = new Map(legalActions.filter((action) => action.pieceId).map((action) => [action.pieceId, action]));
  const piecesBySpace = new Map();
  Object.values(state.pieces).flat().forEach((piece) => {
    const spaceId = getPieceSpaceId(piece);
    if (!spaceId) return;
    piecesBySpace.set(spaceId, [...(piecesBySpace.get(spaceId) || []), piece]);
  });
  const auroraIndex = new Map(ROUTES.aurora.map((space, index) => [space, index]));
  const emberIndex = new Map(ROUTES.ember.map((space, index) => [space, index]));

  return (
    <div className="sg-board" role="grid" aria-label="Sige five by five spiral board">
      {CELLS.map((cell) => {
        const pieces = piecesBySpace.get(cell.id) || [];
        const safe = SAFE_SPACES.has(cell.id);
        const centre = cell.id === "c22";
        return (
          <div
            key={cell.id}
            role="gridcell"
            aria-label={`${cell.id} ${centre ? "protected centre" : safe ? "protected Katti" : "open room"}${pieces.length ? ` occupied by ${pieces.map((piece) => piece.side).join(" and ")}` : " empty"}`}
            className={`sg-cell ${safe ? "safe" : ""} ${centre ? "centre" : ""}`}
            style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}
          >
            <span className="sg-cell-name">{centre ? "TACHI" : safe ? "KATTI" : cell.id}</span>
            {safe && <span className="sg-safe-mark" aria-hidden="true">✕</span>}
            {!centre && <span className="sg-route-step aurora" aria-hidden="true">{auroraIndex.get(cell.id)}</span>}
            {!centre && <span className="sg-route-step ember" aria-hidden="true">{emberIndex.get(cell.id)}</span>}
            <div className="sg-piece-stack">
              {pieces.map((piece) => {
                const action = actionByPiece.get(piece.id);
                const number = Number(piece.id.split("-").at(-1));
                return (
                  <button
                    key={piece.id}
                    type="button"
                    className={`sg-piece ${piece.side} ${action ? "legal" : ""}`}
                    disabled={!interactive || !action}
                    onClick={() => action && onAction?.(action)}
                    aria-label={`${sideName(piece.side)} counter ${number} on ${cell.id}${action ? `, legal ${action.type === "enter" ? "entry" : action.finishes ? "exact centre finish" : action.capturedPieceIds?.length ? "capture" : `move ${action.value}`}` : ""}`}
                  >
                    <span aria-hidden="true">{piece.side === "aurora" ? "🐧" : "🧊"}</span>
                    <small>{number}</small>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="sg-board-arrow outer" aria-hidden="true">OUTER ↺</div>
      <div className="sg-board-arrow inner" aria-hidden="true">INNER ↻</div>
    </div>
  );
}

export function SigeDock({ side, state, legalActions = [], onAction, interactive = true }) {
  const actionByPiece = new Map(legalActions.filter((action) => action.pieceId).map((action) => [action.pieceId, action]));
  const home = state.pieces[side].filter((piece) => piece.status === "home");
  const finished = state.pieces[side].filter((piece) => piece.status === "finished");
  return (
    <aside className={`sg-dock ${side}`}>
      <header><strong>{sideName(side)}</strong><small>{side === "aurora" ? "North Katti" : "South Katti"}</small></header>
      <div className="sg-home-pieces">
        {!home.length && <em>No counters waiting</em>}
        {home.map((piece) => {
          const action = actionByPiece.get(piece.id);
          const number = Number(piece.id.split("-").at(-1));
          return (
            <button
              key={piece.id}
              className={action ? "legal" : ""}
              disabled={!interactive || !action}
              onClick={() => action && onAction?.(action)}
              aria-label={`${sideName(side)} counter ${number} at home${action ? ", legal entry with 1" : ""}`}
            >
              <span>{side === "aurora" ? "🐧" : "🧊"}</span><small>{number}</small>
            </button>
          );
        })}
      </div>
      <footer><span>{home.length} home</span><span>{finished.length}/2 centre</span><span>{state.captures[side]} chopped</span></footer>
    </aside>
  );
}

export function SigeCowries({ roll, canRoll, onRoll, busy = false }) {
  const faces = roll?.faces || [0, 0, 0, 0];
  return (
    <section className="sg-cowrie-tray" aria-label="Four Sige cowries">
      <div className="sg-cowries">
        {faces.map((face, index) => <i key={index} className={face ? "open" : "closed"}><span>{face ? "◡" : "●"}</span></i>)}
      </div>
      <div><strong>{roll ? roll.value : "CAST"}</strong><small>{roll ? roll.mouthsUp === 0 ? "No mouths up = 8" : `${roll.mouthsUp} mouths up` : "Four cowries"}</small></div>
      <button type="button" disabled={!canRoll || busy} onClick={onRoll}>{busy ? "Casting…" : "Cast Cowries"}</button>
    </section>
  );
}

export function SplitFinishControl({ action, onAction, interactive = true }) {
  if (!action) return null;
  return (
    <button
      type="button"
      className="sg-split-finish"
      disabled={!interactive}
      onClick={() => onAction?.(action)}
      aria-label={`Split ${action.value} to finish both Aurora counters exactly in the centre`}
    >
      <strong>Split {action.value} at the centre</strong>
      <span>{action.allocations.map((item) => `${item.pieceId}: ${item.steps}`).join(" · ")}</span>
    </button>
  );
}
