/** Design reference: deterministic tactical AI for the preserved practice modes. */
import { applyAction, getLeopardActions, getLegalActions, type FourWingAction, type FourWingState, type Player } from "./fourWingRules";

export function chooseFourWingBotAction(state: FourWingState, role: Player = state.currentPlayer): FourWingAction | null {
  const actions: FourWingAction[] = getLegalActions(state, role);
  if (!actions.length) return null;
  return actions
    .map((action: FourWingAction) => ({ action, score: scoreAction(state, action, role) }))
    .sort((a: { action: FourWingAction; score: number }, b: { action: FourWingAction; score: number }) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)))[0].action;
}

function scoreAction(state: FourWingState, action: FourWingAction, role: Player) {
  const result = applyAction(state, action, role);
  if (result.error) return -Infinity;
  const next = result.state;
  if (next.winner === role) return 100000;
  if (next.winner && next.winner !== "draw") return -100000;
  const leopardState = { ...next, currentPlayer: "leopards" as const, winner: null, captureChainFrom: null };
  const leopardActions = getLeopardActions(leopardState);
  const captureCount = leopardActions.filter((candidate: FourWingAction) => candidate.type === "capture").length;
  const mobility = leopardActions.length;
  const centreWeight = nodeWeight(action.type === "place" ? action.nodeId : action.to);
  if (role === "leopards") return (action.type === "capture" ? 5000 : 0) + captureCount * 95 + mobility * 16 + centreWeight;
  return -captureCount * 170 - mobility * 18 + centreWeight * 0.4;
}

function actionKey(action: FourWingAction) {
  return action.type === "place" ? `p:${action.nodeId}` : `${action.type}:${action.from}:${action.to}`;
}

function nodeWeight(nodeId: string) {
  if (nodeId === "c22") return 35;
  if (/^c[123][123]$/.test(nodeId)) return 17;
  if (/^[tblr]I/.test(nodeId)) return 8;
  if (/^[tblr]O/.test(nodeId)) return -2;
  return 4;
}
