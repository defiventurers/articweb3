import { applyAction, getLegalActions, getPieceById } from "./rules.js";

export function chooseCrownRunBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  return [...actions]
    .map((action) => ({ action, score: scoreAction(state, action, side) }))
    .sort((a, b) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)))[0].action;
}

function scoreAction(state, action, side) {
  const piece = getPieceById(state, action.pieceId);
  const captured = action.capturedPieceId ? getPieceById(state, action.capturedPieceId) : null;
  let score = 0;
  if (action.type === "exit") score += piece?.kind === "king" ? 26_000 : 20_000;
  if (action.entersCenter) score += piece?.kind === "king" ? 18_000 : 14_000;
  if (captured?.kind === "king") score += piece?.kind === "king" ? 80_000 : 55_000;
  else if (captured) score += 12_000;
  if (action.type === "capture-in-place") score += 2_000;
  if (action.type === "enter") score += piece?.kind === "king" ? 700 : 1_200;
  score += Number(action.targetProgress || 0) * 35;
  score += Number(action.value || 0) * 3;

  const result = applyAction(state, action, side);
  if (!result.error && result.state.winner === side) score += 1_000_000;
  return score;
}

function actionKey(action) {
  return `${action.type}:${action.pieceId}:${action.throwId}`;
}
