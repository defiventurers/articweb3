import { applyStandardAction, getLeopardActions, getLegalActions } from "./standardRules.js";

export function chooseStandardFourWingBotAction(state, role = state.currentPlayer) {
  const actions = getLegalActions(state, role);
  if (!actions.length) return null;
  return actions
    .map((action) => ({ action, score: scoreAction(state, action, role) }))
    .sort((a, b) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)))[0].action;
}

function scoreAction(state, action, role) {
  const result = applyStandardAction(state, action, role);
  if (result.error) return -Infinity;
  const next = result.state;
  if (next.winner === role) return 100000;
  if (next.winner && next.winner !== "draw") return -100000;
  const leopardState = { ...next, currentPlayer: "leopards", winner: null, captureChainFrom: null };
  const leopardActions = getLeopardActions(leopardState);
  const captureCount = leopardActions.filter((candidate) => candidate.type === "capture").length;
  const centreWeight = nodeWeight(action.type === "place" ? action.nodeId : action.to);
  if (role === "leopards") return (action.type === "capture" ? 5000 : 0) + captureCount * 90 + leopardActions.length * 18 + centreWeight;
  return -captureCount * 170 - leopardActions.length * 20 + centreWeight * 0.4;
}

function actionKey(action) { return action.type === "place" ? `place:${action.nodeId}` : `${action.type}:${action.from}:${action.to}`; }
function nodeWeight(nodeId) { if (nodeId === "c22") return 35; if (/^c[123][123]$/.test(nodeId)) return 18; if (/^[tblr]I/.test(nodeId)) return 9; if (/^[tblr]O/.test(nodeId)) return -2; return 4; }
