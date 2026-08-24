import {
  BOARD_SIZE,
  COWRIE_KINGDOMS_RULESET,
  ROUTES,
  SAFE_SPACES,
  cellId,
  getPieceSpaceId
} from "./rules.js";
import { HeritageSticker } from "../../components/HeritageSticker.jsx";

// Arctic Ashta-Kashte treatment: physical penguin runner stickers preserve all semantic controls and the 7×7 spiral race.
const ASHTA_RUNNER_STICKER = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663892017223/gDgxQHLOMmGXQjMg.png";

export function CowrieKingdomsBoard({ state, legalActions = [], onAction, interactive = true }) {
  const singleActionsByPiece = new Map();
  const pairActionsByCell = new Map();
  legalActions.forEach((action) => {
    if (!action.pieceId) return;
    if (action.groupSize === 2) pairActionsByCell.set(action.fromSpace, action);
    else if (!singleActionsByPiece.has(action.pieceId)) singleActionsByPiece.set(action.pieceId, action);
  });
  const piecesByCell = new Map();
  Object.values(state.pieces).flat().forEach((piece) => {
    const spaceId = getPieceSpaceId(piece);
    if (!spaceId) return;
    piecesByCell.set(spaceId, [...(piecesByCell.get(spaceId) || []), piece]);
  });
  const auroraSteps = new Map(ROUTES.aurora.map((id, index) => [id, index]));
  const emberSteps = new Map(ROUTES.ember.map((id, index) => [id, index]));

  return (
    <div className="ck-board" role="grid" aria-label="Cowrie Kingdoms seven by seven spiral board">
      {Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => {
          const id = cellId(row, col);
          const pieces = piecesByCell.get(id) || [];
          const safe = SAFE_SPACES.has(id);
          const goal = id === cellId(3, 3);
          const pairAction = pairActionsByCell.get(id) || null;
          const aria = `${id} ${safe ? "safe square" : "route cell"} ${pieces.length ? `occupied by ${pieces.map((piece) => piece.side).join(" and ")}` : "empty"}`;
          return (
            <div
              key={id}
              role="gridcell"
              aria-label={aria}
              className={`ck-cell ${safe ? "safe" : ""} ${goal ? "goal" : ""} ${pieces.length ? "occupied" : ""}`}
              style={{ gridRow: row + 1, gridColumn: col + 1 }}
            >
              <span className="ck-cell-id">{id}</span>
              {safe && <span className="ck-safe-mark" aria-hidden="true">✦</span>}
              {!goal && <span className="ck-route-number aurora" aria-hidden="true">{auroraSteps.get(id) ?? ""}</span>}
              {!goal && <span className="ck-route-number ember" aria-hidden="true">{emberSteps.get(id) ?? ""}</span>}
              <div className="ck-cell-stack">
                {pieces.map((piece) => {
                  const action = singleActionsByPiece.get(piece.id);
                  const number = Number(piece.id.split("-").at(-1));
                  const label = `${piece.side === "aurora" ? "Aurora" : "Ember"} runner ${number} on ${id}${action ? `, legal ${action.type === "enter" ? "entry" : `move ${action.value}`}` : ""}`;
                  return (
                    <button
                      key={piece.id}
                      type="button"
                      className={`ck-piece ${piece.side} ${action ? "legal" : ""}`}
                      disabled={!interactive || !action}
                      onClick={() => action && onAction?.(action)}
                      aria-label={label}
                    >
                      <HeritageSticker className={`ck-runner-sticker ${piece.side}`} fallbackClassName={piece.side === "aurora" ? "aurora" : "ember"} src={ASHTA_RUNNER_STICKER} alt="" aria-hidden="true" />
                      <small>{number}</small>
                    </button>
                  );
                })}
                {pairAction && (
                  <button
                    type="button"
                    className={`ck-pair-action ${state.currentPlayer}`}
                    disabled={!interactive}
                    onClick={() => onAction?.(pairAction)}
                    aria-label={`${state.currentPlayer === "aurora" ? "Aurora" : "Ember"} paired runners ${pairAction.pieceIds.join(" and ")} on ${id}, legal move ${pairAction.value}`}
                  >
                    ×2
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
      <div className="ck-direction aurora" aria-hidden="true">AURORA SPIRAL ↺</div>
      <div className="ck-direction ember" aria-hidden="true">EMBER SPIRAL ↺</div>
    </div>
  );
}

export function KingdomDock({ side, state, legalActions = [], onAction, interactive = true }) {
  const actionsByPiece = new Map(legalActions.filter((action) => action.pieceId && action.groupSize !== 2).map((action) => [action.pieceId, action]));
  const homePieces = state.pieces[side].filter((piece) => piece.status === "home");
  const finished = state.pieces[side].filter((piece) => piece.status === "finished").length;
  return (
    <aside className={`ck-dock ${side}`}>
      <header>
        <span>{side === "aurora" ? "❄" : "◆"}</span>
        <div>
          <strong>{side === "aurora" ? "Aurora Kingdom" : "Ember Kingdom"}</strong>
          <small>{side === "aurora" ? "North gate" : "South gate"}</small>
        </div>
      </header>
      <div className="ck-home-pieces">
        {!homePieces.length && <em>No runners waiting</em>}
        {homePieces.map((piece) => {
          const action = actionsByPiece.get(piece.id);
          const number = Number(piece.id.split("-").at(-1));
          const label = `${side === "aurora" ? "Aurora" : "Ember"} runner ${number} at home${action ? ", legal grace entry" : ""}`;
          return (
            <button
              key={piece.id}
              type="button"
              className={action ? "legal" : ""}
              disabled={!interactive || !action}
              onClick={() => action && onAction?.(action)}
              aria-label={label}
            >
              <HeritageSticker className={`ck-home-runner-sticker ${side}`} fallbackClassName={side === "aurora" ? "aurora" : "ember"} src={ASHTA_RUNNER_STICKER} alt="" aria-hidden="true" />
              <small>{number}</small>
            </button>
          );
        })}
      </div>
      <footer>
        <span>{homePieces.length} home</span>
        <span>{finished}/{COWRIE_KINGDOMS_RULESET.piecesPerPlayer} centre</span>
        <span>{state.captures[side]} captured</span>
      </footer>
    </aside>
  );
}

export function CowrieTray({ roll, onRoll, canRoll, busy = false }) {
  const faces = roll?.faces || [0, 0, 0, 0];
  return (
    <section className="ck-cowrie-tray" aria-label="Four cowries">
      <div className="ck-cowries" aria-label={roll ? `Cowrie result ${roll.value}` : "Cowries ready"}>
        {faces.map((face, index) => (
          <i key={index} className={face ? "open" : "closed"}><span>{face ? "◡" : "●"}</span></i>
        ))}
      </div>
      <div className="ck-roll-copy">
        <strong>{roll ? roll.value : "CAST"}</strong>
        <small>{roll ? roll.splitGrace ? "Ashta: 8 + separate grace" : roll.grace ? `Grace ${roll.value}` : `${roll.mouthsUp} mouths up` : "Four cowries"}</small>
      </div>
      <button type="button" className="ck-roll-button" disabled={!canRoll || busy} onClick={onRoll}>{busy ? "Casting…" : "Cast Cowries"}</button>
    </section>
  );
}

export function ThrowPool({ units, selectedUnitId, onSelect, passAction, onPass, interactive = true }) {
  return (
    <section className="ck-throw-pool" aria-label="Stored Ashta-Kashte throws">
      <div>
        <strong>Stored throw</strong>
        <small>{units.length ? "Choose which part to play" : "Cast to create a movement value"}</small>
      </div>
      <div className="ck-unit-buttons">
        {units.map((unit) => (
          <button
            key={unit.id}
            type="button"
            className={unit.id === selectedUnitId ? "selected" : ""}
            disabled={!interactive}
            onClick={() => onSelect?.(unit.id)}
            aria-pressed={unit.id === selectedUnitId}
          >
            {unit.label}
          </button>
        ))}
      </div>
      <button type="button" className="ck-pass-button" disabled={!interactive || !passAction} onClick={() => passAction && onPass?.(passAction)}>Pass selected throw</button>
    </section>
  );
}
