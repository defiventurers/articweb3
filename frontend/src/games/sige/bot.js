import { getLegalActions } from "./rules.js";

export function chooseSigeBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  return [...actions].sort((a, b) => score(b) - score(a))[0];
}

function score(action) {
  if (action.type === "split-finish") return 10000;
  if (action.finishes) return 8000;
  if (action.capturedPieceIds?.length) return 6000;
  if (action.type === "enter") return 3000;
  if (action.type === "move") return 1000 + Number(action.targetProgress || 0);
  return 0;
}
