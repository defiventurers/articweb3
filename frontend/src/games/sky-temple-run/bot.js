import { getLegalActions } from "./rules.js";

export function chooseSkyTempleRunBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  return [...actions].sort((a, b) => scoreAction(b) - scoreAction(a) || a.pieceId.localeCompare(b.pieceId))[0];
}

function scoreAction(action) {
  let score = Number(action.targetProgress || 0);
  if (action.finishes) score += 1000;
  if (action.captures) score += 500;
  if (action.type === "enter") score += 20;
  return score;
}
