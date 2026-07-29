import { getLegalActions, scoreAction } from "./rules.js";

export function chooseKhasiFishflowBotAction(state, player = state.currentPlayer) {
  return getLegalActions(state, player)
    .map((action) => ({ action, score: scoreAction(state, action, player) }))
    .sort((a, b) => b.score - a.score || a.action.pitIndex - b.action.pitIndex)[0]?.action || null;
}
