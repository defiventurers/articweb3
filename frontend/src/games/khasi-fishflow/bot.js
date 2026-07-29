import { getLegalActions, previewAction } from "./rules.js";

export function chooseKhasiFishflowBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  return [...actions].sort((left, right) => score(right) - score(left) || left.pitId.localeCompare(right.pitId))[0];

  function score(action) {
    const move = previewAction(state, action, side);
    if (!move) return -100000;
    return Number(move.captured || 0) * 100 + Number(move.taxCaptured || 0) * 20 - Number(move.opponentHandicapCapture || 0) * 90 + Number(move.relays || 0);
  }
}
