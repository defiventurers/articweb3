import { applyAction, getCounts, getLegalActions, otherPlayer } from "./rules.js";

export function chooseFishflowBotAction(state, player = state.currentPlayer) {
  const actions = getLegalActions(state, player);
  if (!actions.length) return null;
  return actions
    .map((action) => ({ action, score: scoreAction(state, action, player) }))
    .sort((a, b) => b.score - a.score || a.action.pitIndex - b.action.pitIndex)[0].action;
}

function scoreAction(state, action, player) {
  const result = applyAction(state, action, player);
  if (result.error) return Number.NEGATIVE_INFINITY;
  const next = result.state;
  const summary = next.lastTurn;
  const counts = getCounts(next);
  const rival = otherPlayer(player);
  return (
    summary.captured * 1000 +
    summary.exactFourPickups * 90 +
    summary.relays * 18 +
    summary.seedsSown +
    (summary.roundEnded ? 250 : 0) +
    (next.winner === player ? 100000 : 0) +
    (counts[player].total - counts[rival].total) * 12
  );
}
