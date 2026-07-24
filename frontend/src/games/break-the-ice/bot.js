import { SAFE_SPACES, getLegalActions } from "./rules.js";

export function chooseBreakTheIceBotAction(state, player = state.currentPlayer) {
  const actions = getLegalActions(state, player);
  if (!actions.length) return null;
  return [...actions]
    .map((action) => ({ action, score: scoreAction(action) }))
    .sort((a, b) => b.score - a.score || a.action.pieceId.localeCompare(b.action.pieceId))[0].action;
}

function scoreAction(action) {
  let score = Number(action.targetProgress || 0);
  if (action.finishes) score += 10000;
  if (action.captures) score += 4000;
  if (action.type === "enter") score += 450;
  if (action.targetSpace && SAFE_SPACES.has(action.targetSpace)) score += 250;
  return score;
}
