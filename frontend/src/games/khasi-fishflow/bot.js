import { getLegalActions, scoreAction } from "./rules.js";

export function chooseKhasiFishflowBotAction(state, player = state.currentPlayer) {
  const actions = getLegalActions(state, player);
  if (!actions.length) return null;
  return [...actions]
    .map((action) => ({ action, score: scoreAction(state, action, player) }))
    .sort((a, b) => b.score - a.score || a.action.pitIndex - b.action.pitIndex)[0].action;
}
