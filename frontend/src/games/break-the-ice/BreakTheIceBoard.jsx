import { useMemo } from "react";
import {
  SAFE_SPACES,
  SPACE_BY_ID,
  SPACES,
  TRACK_LINES,
  getLegalActions,
  getOccupantAtSpace,
  getPlayerSummary
} from "./rules.js";

export function BreakTheIceBoard({ state, onPiece, interactive = true, interactivePlayer = state.currentPlayer }) {
  const legalActions = useMemo(() => getLegalActions(state, interactivePlayer), [state, interactivePlayer]);
  const legalByPiece = new Map(legalActions.map((action) => [action.pieceId, action]));
  const blue = getPlayerSummary(state, "blue");
  const coral = getPlayerSummary(state, "coral");

  return (
    <div className="bti-board-stage">
      <RunnerDock player="coral" state={state} summary={coral} legalByPiece={legalByPiece} interactive={interactive && interactivePlayer === "coral"} onPiece={onPiece} />
      <div className="bti-board" role="grid" aria-label="Break the Ice Panchi board">
        <svg className="bti-board-lines" viewBox="0 0 100 100" aria-hidden="true">
          {TRACK_LINES.map(([from, to]) => {
            const a = SPACE_BY_ID[from];
            const b = SPACE_BY_ID[to];
            return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
          <path className="bti-route-arrow blue" d="M 7 96 C 28 96, 45 96, 50 87" />
          <path className="bti-route-arrow coral" d="M 93 96 C 72 96, 55 96, 50 87" />
        </svg>

        {SPACES.map((space) => {
          const occupant = getOccupantAtSpace(state, space.id);
          const legal = occupant ? legalByPiece.has(occupant.id) : false;
          const action = occupant ? legalByPiece.get(occupant.id) : null;
          return (
            <div
              key={space.id}
              className={`bti-space ${SAFE_SPACES.has(space.id) ? "safe" : ""} kind-${space.kind}`}
              style={{ left: `${space.x}%`, top: `${space.y}%` }}
              role="gridcell"
              aria-label={`${space.label}${SAFE_SPACES.has(space.id) ? ", protected" : ""}${occupant ? `, ${occupant.player} runner ${occupant.id.split("-")[1]}` : ", empty"}`}
            >
              {SAFE_SPACES.has(space.id) && <span className="bti-safe-mark" aria-hidden="true">✦</span>}
              {occupant && (
                <button
                  type="button"
                  className={`bti-runner piece-${occupant.player} ${legal ? "legal" : ""}`}
                  disabled={!interactive || !legal}
                  onClick={() => onPiece(action || { type: "move", pieceId: occupant.id })}
                  aria-label={`${occupant.player === "blue" ? "Blue" : "Coral"} runner ${occupant.id.split("-")[1]} on ${space.label}${legal ? ", legal move" : ""}`}
                >
                  <span className="bti-runner-face" aria-hidden="true"><i /><b /></span>
                </button>
              )}
            </div>
          );
        })}

        <div className="bti-finish-gate" aria-label="Exact finish beyond the final space">
          <span>BREAK</span><strong>THE ICE</strong>
        </div>
      </div>
      <RunnerDock player="blue" state={state} summary={blue} legalByPiece={legalByPiece} interactive={interactive && interactivePlayer === "blue"} onPiece={onPiece} />
    </div>
  );
}

function RunnerDock({ player, state, summary, legalByPiece, interactive, onPiece }) {
  return (
    <aside className={`bti-runner-dock ${player}`}>
      <div className="bti-dock-heading">
        <span className="bti-dock-crest" aria-hidden="true">{player === "blue" ? "◆" : "◇"}</span>
        <div><strong>{player === "blue" ? "Blue Runners" : "Coral Runners"}</strong><small>{summary.finished} finished · {summary.captures} captures</small></div>
      </div>
      <div className="bti-home-pieces" aria-label={`${player} waiting runners`}>
        {state.pieces[player].filter((piece) => piece.status === "home").map((piece) => {
          const action = legalByPiece.get(piece.id);
          const legal = Boolean(action);
          return (
            <button
              key={piece.id}
              type="button"
              className={`bti-home-runner piece-${player} ${legal ? "legal" : ""}`}
              disabled={!interactive || !legal}
              onClick={() => onPiece(action || { type: "enter", pieceId: piece.id })}
              aria-label={`${player === "blue" ? "Blue" : "Coral"} waiting runner ${piece.id.split("-")[1]}${legal ? ", legal entry" : ""}`}
            >
              <span aria-hidden="true">♟</span>
            </button>
          );
        })}
        {!summary.home && <span className="bti-empty-home">All runners entered</span>}
      </div>
      <div className="bti-dock-stats"><span>HOME <b>{summary.home}</b></span><span>TRACK <b>{summary.track}</b></span><span>OUT <b>{summary.finished}</b></span></div>
    </aside>
  );
}

export function CowrieTray({ roll, onRoll, canRoll, busy = false, label = "Cast Cowries" }) {
  const visibleRoll = roll || { faces: Array(7).fill(0), value: null, bonus: false };
  return (
    <div className="bti-cowrie-panel">
      <div className="bti-cowries" aria-label={visibleRoll.value === null ? "Seven cowries ready" : `${visibleRoll.value} mouths up`}>
        {visibleRoll.faces.map((face, index) => (
          <span key={index} className={`bti-cowrie ${face ? "mouth-up" : "closed"}`} aria-label={face ? "mouth up" : "closed"}><i /></span>
        ))}
      </div>
      <div className="bti-roll-value">
        <small>MOUTHS UP</small>
        <strong>{visibleRoll.value === null ? "—" : visibleRoll.value}</strong>
        <span>{visibleRoll.bonus ? "BONUS THROW" : visibleRoll.value === 0 ? "TURN LOST" : ""}</span>
      </div>
      {onRoll && <button type="button" className="bti-roll-button" disabled={!canRoll || busy} onClick={onRoll}>{busy ? "Casting…" : label}</button>}
    </div>
  );
}
