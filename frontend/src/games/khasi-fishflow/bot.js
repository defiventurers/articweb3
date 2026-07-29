import { getLegalActions, scoreTurn } from "./rules.js";

export function chooseKhasiFishflowBotAction(state, player = state.currentPlayer) {
  const actions = getLegalActions(state, player);
  if (!actions.length) return null;
  return actions
    .map((action) => ({ action, score: scoreTurn(state, action, player) }))
    .sort((left, right) => right.score - left.score || left.action.pitIndex - right.action.pitIndex)[0].action;
}
