import { applyAction, getCaptureActions, getLegalActions, occupiedNodes, otherSide } from "./rules.js";

export function chooseIceRingsBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  return [...actions].sort((a, b) => scoreAction(state, side, b) - scoreAction(state, side, a) || actionKey(a).localeCompare(actionKey(b)))[0];
}

function scoreAction(state, side, action) {
  const result = applyAction(state, action, side);
  if (result.error) return -Infinity;
  if (result.state.winner === side) return 100000;
  let score = action.type === "capture" ? 1000 : 0;
  if (result.state.chainFrom) score += getCaptureActions(result.state, side, result.state.chainFrom).length * 500;
  const enemy = otherSide(side);
  const enemyCaptures = result.state.currentPlayer === enemy
    ? occupiedNodes(result.state, enemy).flatMap((from) => getCaptureActions(result.state, enemy, from)).length
    : 0;
  score -= enemyCaptures * 220;
  const node = action.to;
  if (node === "c") score += 90;
  if (node?.startsWith("r1")) score += 45;
  if (node?.startsWith("r2")) score += 25;
  return score;
}

function actionKey(action) {
  return action.type === "capture" ? `${action.from}:${action.over}:${action.to}` : `${action.from}:${action.to}`;
}
