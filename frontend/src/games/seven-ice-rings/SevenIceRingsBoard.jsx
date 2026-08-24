import { forcedStartPit, sideName } from "./rules.js";
import { HeritageSticker } from "../../components/HeritageSticker.jsx";

// Arctic Sat-gol treatment: compact physical stone stickers replace generic dots inside the shared seven-pit relay board.
const SATGOL_STONE_STICKER = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663892017223/XkjpRBzBalOUhClY.png";

const POSITIONS = [
  [50, 7], [82, 26], [90, 63], [68, 91], [32, 91], [10, 63], [18, 26]
];

export function SevenIceRingsBoard({ state, legalActions = [], onAction, interactive = true }) {
  const actions = new Map(legalActions.filter((action) => action.type === "sow").map((action) => [action.pit, action]));
  const forced = forcedStartPit(state);
  return (
    <section className="sir-board" aria-label="Seven Ice Rings circular sowing board">
      <div className="sir-aurora" aria-hidden="true" />
      <div className="sir-arrow" aria-hidden="true">ANTICLOCKWISE ↺</div>
      {state.pits.map((count, pit) => {
        const action = actions.get(pit);
        const [left, top] = POSITIONS[pit];
        return (
          <button
            key={pit}
            type="button"
            className={`sir-pit ${action ? "legal" : ""} ${forced === pit ? "forced" : ""} ${count === 0 ? "empty" : ""}`}
            style={{ left: `${left}%`, top: `${top}%` }}
            disabled={!interactive || !action}
            onClick={() => action && onAction?.(action)}
            aria-label={`Ring ${pit + 1} with ${count} stones${action ? `, legal start${action.preview?.captured ? ` capturing ${action.preview.captured}` : ""}` : ""}`}
          >
            <span className="sir-pit-number">{pit + 1}</span>
            <strong>{count}</strong>
            <span className="sir-stones" aria-hidden="true">{renderStones(count)}</span>
            {action?.preview?.captured > 0 && <em>+{action.preview.captured}</em>}
          </button>
        );
      })}
      <div className="sir-centre">
        <span>SHARED RING</span>
        <strong>{state.pits.reduce((sum, value) => sum + value, 0)}</strong>
        <small>stones remain</small>
      </div>
    </section>
  );
}

export function SevenIceRingsScore({ state }) {
  return (
    <section className="sir-score" aria-label="Captured stone score">
      <article className={state.currentPlayer === "aurora" ? "active" : ""}><span>❄</span><div><strong>Aurora Keeper</strong><small>{state.stores.aurora} captured</small></div></article>
      <div><small>TURN {state.turn}</small><strong>{state.stores.aurora} : {state.stores.ember}</strong></div>
      <article className={state.currentPlayer === "ember" ? "active" : ""}><span>◆</span><div><strong>Ember Keeper</strong><small>{state.stores.ember} captured</small></div></article>
    </section>
  );
}

export function EndClaimControls({ state, legalActions, onAction, interactive = true }) {
  const claim = legalActions.find((action) => action.type === "claim-end");
  const accept = legalActions.find((action) => action.type === "accept-end");
  if (!claim && !accept && !state.endClaimBy) return null;
  return (
    <section className="sir-end-claim" aria-label="No more captures agreement">
      {state.endClaimBy ? <p><strong>{sideName(state.endClaimBy)}</strong> says no useful capture remains. Accept, or sow to continue.</p> : <p>Two quiet turns have passed. You may ask the rival to end and score captured stones.</p>}
      {claim && <button disabled={!interactive} onClick={() => onAction?.(claim)}>Claim no more captures</button>}
      {accept && <button disabled={!interactive} onClick={() => onAction?.(accept)}>Accept and score</button>}
    </section>
  );
}

function renderStones(count) {
  const shown = Math.min(count, 12);
  return Array.from({ length: shown }, (_, index) => <HeritageSticker key={index} className="sir-stone-sticker" fallbackClassName="aurora" src={SATGOL_STONE_STICKER} alt="" />);
}
