import { applyAction, getLegalActions } from "./rules.js";

export function chooseKhasiBotAction(state, player = state.currentPlayer) {
  const actions = getLegalActions(state, player);
  return actions
    .map((action) => {
      const result = applyAction(state, action, player);
      const summary = result.state.lastTurn || {};
      return { action, score: (summary.captured || 0) * 100 + (summary.relays || 0) * 4 + (summary.roundEnded ? 40 : 0) };
    })
    .sort((a, b) => b.score - a.score || a.action.pitIndex - b.action.pitIndex)[0]?.action || null;
}
