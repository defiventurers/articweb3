import { useMemo } from "react";
import {
  SAFE_SPACES,
  SPACE_BY_ID,
  SPACES,
  TRACK_LINES,
  getLegalActions,
  getPiecesAtSpace,
  getSideSummary
} from "./rules.js";

export function CrownRunBoard({ state, selectedThrowId, onPiece, interactive = true, interactiveSide = state.currentPlayer }) {
  const legalActions = useMemo(
    () => interactive && interactiveSide === state.currentPlayer
      ? getLegalActions(state, interactiveSide).filter((action) => action.throwId === selectedThrowId)
      : [],
    [interactive, interactiveSide, selectedThrowId, state]
  );
  const legalPieces = new Set(legalActions.map((action) => action.pieceId));
  const capturePieces = new Set(legalActions.filter((action) => action.capturedPieceId).map((action) => action.pieceId));

  return (
    <div className="cr-board" role="grid" aria-label="Crown Run Dadu board">
      <svg className="cr-board-lines" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <filter id="crGlow"><feGaussianBlur stdDeviation="0.55" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {TRACK_LINES.map(([from, to]) => {
          const a = SPACE_BY_ID[from];
          const b = SPACE_BY_ID[to];
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        <path className="cr-route-arrow aurora" d="M 4 94 L 18 94" />
        <path className="cr-route-arrow ember" d="M 4 6 L 18 6" />
      </svg>

      <div className="cr-central-quadrant" aria-label="Central exit quadrant">
        <span>EXIT COURT</span>
        <b>♛</b>
        <div className="cr-center-stacks">
          {state.pieces.aurora.filter((piece) => piece.status === "center").map((piece) => <CrownPiece key={piece.id} piece={piece} legal={legalPieces.has(piece.id)} capture={capturePieces.has(piece.id)} interactive={interactive} onPiece={onPiece} location="central quadrant" />)}
          {state.pieces.ember.filter((piece) => piece.status === "center").map((piece) => <CrownPiece key={piece.id} piece={piece} legal={legalPieces.has(piece.id)} capture={capturePieces.has(piece.id)} interactive={interactive} onPiece={onPiece} location="central quadrant" />)}
        </div>
      </div>

      {SPACES.map((space) => {
        const pieces = getPiecesAtSpace(state, space.id);
        return (
          <div
            key={space.id}
            className={`cr-space ${SAFE_SPACES.has(space.id) ? "safe" : ""}`}
            style={{ left: `${space.x}%`, top: `${space.y}%` }}
            role="gridcell"
            aria-label={`${space.label}${SAFE_SPACES.has(space.id) ? ", protected macho" : ""}${pieces.length ? `, ${pieces.length} pieces` : ", empty"}`}
          >
            {SAFE_SPACES.has(space.id) && <span className="cr-macho-mark" aria-hidden="true">✕</span>}
            <div className="cr-space-stack">
              {pieces.map((piece, index) => (
                <CrownPiece
                  key={piece.id}
                  piece={piece}
                  legal={legalPieces.has(piece.id)}
                  capture={capturePieces.has(piece.id)}
                  interactive={interactive}
                  onPiece={onPiece}
                  location={space.label}
                  stackIndex={index}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CrownRunDock({ state, side, selectedThrowId, onPiece, interactive = true, interactiveSide = state.currentPlayer }) {
  const summary = getSideSummary(state, side);
  const legalActions = useMemo(
    () => interactive && interactiveSide === state.currentPlayer
      ? getLegalActions(state, interactiveSide).filter((action) => action.throwId === selectedThrowId)
      : [],
    [interactive, interactiveSide, selectedThrowId, state]
  );
  const legalPieces = new Set(legalActions.map((action) => action.pieceId));
  const waiting = state.pieces[side].filter((piece) => piece.status === "home");
  const finished = state.pieces[side].filter((piece) => piece.status === "finished");

  return (
    <aside className={`cr-dock ${side}`} aria-label={`${sideLabel(side)} piece dock`}>
      <div className="cr-dock-heading">
        <span>{side === "aurora" ? "✦" : "◆"}</span>
        <div><strong>{sideLabel(side)}</strong><small>{summary.captureLicense ? "OPPOSING HOME OPEN" : "CAPTURE TO OPEN HOME"}</small></div>
      </div>
      <div className="cr-dock-section">
        <small>WAITING · {waiting.length}</small>
        <div className="cr-dock-pieces">
          {waiting.map((piece) => <CrownPiece key={piece.id} piece={piece} legal={legalPieces.has(piece.id)} interactive={interactive} onPiece={onPiece} location="waiting court" />)}
          {!waiting.length && <span className="cr-dock-empty">All pieces entered</span>}
        </div>
      </div>
      <div className="cr-dock-stats">
        <span>TRACK <b>{summary.track}</b></span>
        <span>CENTER <b>{summary.center}</b></span>
        <span>OUT <b>{summary.finished}</b></span>
      </div>
      <div className="cr-dock-section exited">
        <small>EXITED</small>
        <div className="cr-exited-pips">{finished.map((piece) => <i key={piece.id} className={piece.kind === "king" ? "king" : ""}>{piece.kind === "king" ? "♛" : "•"}</i>)}</div>
      </div>
      <p>{summary.captures} captures · {summary.kingResets} crown resets</p>
    </aside>
  );
}

export function CrownCowriePanel({ state, onRoll, canRoll, busy = false }) {
  const sequence = state.lastRollSequence || [];
  const label = state.awaiting === "capture-roll" ? "Cast Capture Throw" : "Cast Five Cowries";
  return (
    <div className="cr-cowrie-panel">
      <div className="cr-cowrie-sequence" aria-label={sequence.length ? `Last sequence ${sequence.map((roll) => roll.value).join(", ")}` : "Five cowries ready"}>
        {(sequence.length ? sequence : [{ id: "ready", faces: [0, 0, 0, 0, 0], value: null }]).map((roll, rollIndex) => (
          <div className="cr-cast" key={roll.id || rollIndex}>
            <div>{roll.faces.map((face, index) => <span key={index} className={`cr-cowrie ${face ? "mouth-up" : "closed"}`}><i /></span>)}</div>
            <strong>{roll.value === null ? "—" : roll.value}</strong>
          </div>
        ))}
      </div>
      {onRoll && <button type="button" className="cr-roll-button" disabled={!canRoll || busy} onClick={onRoll}>{busy ? "Casting…" : label}</button>}
    </div>
  );
}

export function CrownThrowPool({ throws, selectedThrowId, onSelect, disabled = false }) {
  return (
    <div className="cr-throw-pool" aria-label="Stored Dadu throws">
      <span>STORED THROWS</span>
      <div>
        {throws.map((item) => (
          <button key={item.id} type="button" className={selectedThrowId === item.id ? "selected" : ""} disabled={disabled} onClick={() => onSelect(item.id)} aria-pressed={selectedThrowId === item.id} aria-label={`Use stored throw ${item.value}`}>
            <strong>{item.value}</strong><small>{item.value === 1 ? "DA" : item.value === 10 ? "BONUS" : "MOVE"}</small>
          </button>
        ))}
        {!throws.length && <em>Cast to earn movement values.</em>}
      </div>
    </div>
  );
}

function CrownPiece({ piece, legal = false, capture = false, interactive, onPiece, location, stackIndex = 0 }) {
  const name = piece.kind === "king" ? "nakta" : `kaangi ${piece.id.split("-").at(-1)}`;
  return (
    <button
      type="button"
      className={`cr-piece ${piece.side} ${piece.kind} ${legal ? "legal" : ""} ${capture ? "capture" : ""}`}
      style={{ "--stack-index": stackIndex }}
      disabled={!interactive || !legal}
      onClick={() => onPiece(piece.id)}
      aria-label={`${sideLabel(piece.side)} ${name} on ${location}${legal ? capture ? ", legal capture" : ", legal move" : ""}`}
    >
      <span aria-hidden="true">{piece.kind === "king" ? "♛" : "●"}</span>
    </button>
  );
}

export function sideLabel(side) { return side === "ember" ? "Ember Court" : "Aurora Court"; }
