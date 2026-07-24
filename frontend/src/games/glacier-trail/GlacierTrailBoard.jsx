import { useMemo } from "react";
import {
  FINISH_PROGRESS,
  SAFE_SPACES,
  SPACE_BY_ID,
  SPACES,
  TRACK_LINES,
  getOccupantAtSpace,
  getPieceSpaceId,
  getPlayerSummary,
  pieceLabel
} from "./rules.js";

export function GlacierTrailBoard({ state, legalActions = [], onAction, interactive = true, selectedAllocation = null }) {
  const actions = useMemo(
    () => legalActions.filter((action) => allocationKey(action) === selectedAllocation),
    [legalActions, selectedAllocation]
  );
  const actionByPiece = new Map(actions.map((action) => [action.pieceId, action]));
  const aurora = getPlayerSummary(state, "aurora");
  const ember = getPlayerSummary(state, "ember");

  return (
    <div className="gt-board-stage">
      <CounterDock side="ember" state={state} summary={ember} actionByPiece={actionByPiece} interactive={interactive && state.currentPlayer === "ember"} onAction={onAction} />
      <div className="gt-board" role="grid" aria-label="Glacier Trail Pancha Keliya board">
        <svg className="gt-board-lines" viewBox="0 0 100 100" aria-hidden="true">
          {TRACK_LINES.map(([from, to]) => {
            const a = SPACE_BY_ID[from];
            const b = SPACE_BY_ID[to];
            return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
          <path className="gt-base-arrow aurora" d="M 10 95 L 49 95" />
          <path className="gt-base-arrow ember" d="M 90 95 L 51 95" />
        </svg>

        {SPACES.map((space) => {
          const occupant = getOccupantAtSpace(state, space.id);
          const action = occupant ? actionByPiece.get(occupant.id) : null;
          const legal = Boolean(action);
          return (
            <div
              key={space.id}
              className={`gt-space kind-${space.kind} ${SAFE_SPACES.has(space.id) ? "safe" : ""}`}
              style={{ left: `${space.x}%`, top: `${space.y}%` }}
              role="gridcell"
              aria-label={`${space.label}${SAFE_SPACES.has(space.id) ? ", safe house" : ""}${occupant ? `, ${occupant.side} ${pieceLabel(occupant.id)}` : ", empty"}`}
            >
              {SAFE_SPACES.has(space.id) && <span className="gt-house-mark" aria-hidden="true">×</span>}
              {space.kind === "terminal" && <span className="gt-terminal-label" aria-hidden="true">LAND</span>}
              {occupant && (
                <button
                  type="button"
                  className={`gt-counter piece-${occupant.side} ${legal ? "legal" : ""}`}
                  disabled={!interactive || !legal}
                  onClick={() => onAction(action)}
                  aria-label={`${sideName(occupant.side)} ${pieceLabel(occupant.id)} on ${space.label}${legal ? `, legal move by ${action.value}` : ""}`}
                >
                  <span aria-hidden="true"><i /><b>{occupant.id.split("-")[1]}</b></span>
                </button>
              )}
            </div>
          );
        })}

        <div className="gt-summit" aria-label="Exact landing beyond Kenda-ge"><span>KENDA-GE</span><strong>LAND</strong></div>
      </div>
      <CounterDock side="aurora" state={state} summary={aurora} actionByPiece={actionByPiece} interactive={interactive && state.currentPlayer === "aurora"} onAction={onAction} />
    </div>
  );
}

function CounterDock({ side, state, summary, actionByPiece, interactive, onAction }) {
  return (
    <aside className={`gt-counter-dock ${side}`}>
      <div className="gt-dock-heading"><span aria-hidden="true">{side === "aurora" ? "✦" : "◆"}</span><div><strong>{sideName(side)}</strong><small>{summary.finished} landed · {summary.captures} cuts</small></div></div>
      <div className="gt-home-counters" aria-label={`${sideName(side)} waiting counters`}>
        {state.pieces[side].filter((piece) => piece.status === "home").map((piece) => {
          const action = actionByPiece.get(piece.id);
          return (
            <button
              key={piece.id}
              type="button"
              className={`gt-home-counter piece-${side} ${action ? "legal" : ""}`}
              disabled={!interactive || !action}
              onClick={() => onAction(action)}
              aria-label={`${sideName(side)} waiting ${pieceLabel(piece.id)}${action ? `, legal entry with ${action.value}` : ""}`}
            >
              <span aria-hidden="true">{piece.id.split("-")[1]}</span>
            </button>
          );
        })}
        {!summary.home && <span className="gt-empty-home">All counters admitted</span>}
      </div>
      <div className="gt-dock-stats"><span>HOME <b>{summary.home}</b></span><span>TRAIL <b>{summary.track}</b></span><span>LAND <b>{summary.finished}</b></span></div>
    </aside>
  );
}

export function CowrieSequence({ sequence = [], onRoll, canRoll = false, busy = false }) {
  const rolls = sequence.length ? sequence : [{ faces: Array(6).fill(0), value: null, bonus: false }];
  return (
    <div className="gt-cowrie-panel">
      <div className="gt-roll-stack" aria-label={sequence.length ? `Stored throws ${sequence.map((roll) => roll.value).join(", ")}` : "Six cowries ready"}>
        {rolls.map((roll, rollIndex) => (
          <div className="gt-roll" key={roll.id || rollIndex}>
            <div className="gt-cowries">{roll.faces.map((face, index) => <span key={index} className={face ? "mouth-up" : "closed"}><i /></span>)}</div>
            <strong>{roll.value === null ? "—" : roll.value}</strong>
            {roll.bonus && <small>PANCHA · THROW AGAIN</small>}
          </div>
        ))}
      </div>
      {onRoll && <button type="button" className="gt-roll-button" disabled={!canRoll || busy} onClick={onRoll}>{busy ? "Casting…" : "Cast Six Cowries"}</button>}
    </div>
  );
}

export function ThrowSelector({ state, selectedAllocation, onSelect }) {
  if (state.awaiting !== "allocate" || !state.throwPool.length) return null;
  const choices = state.throwPool.map((item, index) => ({ key: `one:${index}`, label: String(item.value), detail: item.bonus ? "bonus throw" : "whole throw" }));
  if (state.throwPool.length > 1) choices.push({ key: `total:${state.throwPool.map((_, index) => index).join(",")}`, label: String(state.throwPool.reduce((sum, item) => sum + item.value, 0)), detail: "total to one counter" });
  return (
    <div className="gt-throw-selector" aria-label="Choose a stored Pancha throw">
      <span>ALLOCATE</span>
      {choices.map((choice) => <button key={choice.key} type="button" className={selectedAllocation === choice.key ? "selected" : ""} onClick={() => onSelect(choice.key)}><strong>{choice.label}</strong><small>{choice.detail}</small></button>)}
    </div>
  );
}

export function allocationKey(action) {
  if (!action) return null;
  return action.combined ? `total:${action.throwIndexes.join(",")}` : `one:${action.throwIndexes[0]}`;
}

export function defaultAllocation(state) {
  if (state.awaiting !== "allocate" || !state.throwPool.length) return null;
  return `one:0`;
}

export function runnerPositionLabel(piece) {
  if (piece.status === "home") return "waiting";
  if (piece.status === "finished") return "landed";
  return SPACE_BY_ID[getPieceSpaceId(piece)]?.label || `progress ${Math.min(piece.progress, FINISH_PROGRESS)}`;
}

function sideName(side) { return side === "ember" ? "Ember Caravan" : "Aurora Caravan"; }
