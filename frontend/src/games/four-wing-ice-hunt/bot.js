import { actionKey, applyAction, getLegalActions, getLeopardActions } from "./rules.js";

export function chooseFourWingBotAction(state, role = state.currentPlayer) {
  const actions = getLegalActions(state, role);
  if (!actions.length) return null;
  return actions
    .map((action) => ({ action, score: scoreAction(state, action, role) }))
    .sort((a, b) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)))[0].action;
}

function scoreAction(state, action, role) {
  const result = applyAction(state, action, role);
  if (result.error) return -Infinity;
  const next = result.state;
  if (next.winner === role) return 100000;
  if (next.winner && next.winner !== "draw") return -100000;

  const leopardState = { ...next, currentPlayer: "leopards", winner: null };
  const leopardActions = getLeopardActions(leopardState);
  const captureCount = leopardActions.filter((candidate) => candidate.type === "capture").length;
  const mobility = leopardActions.length;
  const centreWeight = nodeWeight(action.to || action.nodeId);

  if (role === "leopards") {
    return (action.type === "capture" ? 5000 : 0) + captureCount * 90 + mobility * 18 + centreWeight;
  }

  const firstPlacementSafety = action.type === "place" && state.cattlePlaced === 0 ? 400 : 0;
  return firstPlacementSafety - captureCount * 170 - mobility * 22 + centreWeight * 0.3;
}

function nodeWeight(nodeId) {
  if (!nodeId) return 0;
  if (nodeId === "c22") return 35;
  if (/^c[123][123]$/.test(nodeId)) return 18;
  if (/^[tblr]I/.test(nodeId)) return 9;
  if (/^[tblr]O/.test(nodeId)) return -2;
  return 4;
}
