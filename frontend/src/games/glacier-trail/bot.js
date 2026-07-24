import { applyAction, getLegalActions } from "./rules.js";

export function chooseGlacierTrailBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  return [...actions]
    .map((action) => ({ action, score: scoreAction(state, action, side) }))
    .sort((a, b) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)))[0].action;
}

function scoreAction(state, action, side) {
  const result = applyAction(state, action, side);
  if (result.error) return -Infinity;
  if (result.state.winner === side) return 1_000_000;
  let score = 0;
  if (action.finishes) score += 100_000;
  if (action.captures) score += 20_000;
  if (action.type === "enter") score += 2_000;
  score += Number(action.targetProgress || 0) * 18;
  if (action.combined) score += action.value * 3;
  score -= result.state.throwPool.length * 4;
  return score;
}

function actionKey(action) {
  return `${action.type}:${action.pieceId}:${(action.throwIndexes || []).join(",")}:${action.value}`;
}
