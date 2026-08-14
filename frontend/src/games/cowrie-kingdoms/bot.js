import { getLegalActions } from "./rules.js";

export function chooseCowrieKingdomsBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  return [...actions].sort((a, b) => scoreAction(b) - scoreAction(a) || actionKey(a).localeCompare(actionKey(b)))[0];
}

function scoreAction(action) {
  if (action.type === "pass-unit") return -1000;
  let score = Number(action.targetProgress || 0);
  if (action.finishes) score += 2000;
  if (action.captures) score += 900;
  if (action.type === "enter") score += 180;
  return score;
}

function actionKey(action) {
  return `${action.type}:${action.unitId || ""}:${action.pieceId || ""}:${action.targetProgress ?? ""}`;
}
