import { NODES, actionKey, applyAction, getCaptureActions, getLegalActions, occupiedNodes, otherSide } from "./rules.js";

const NODE_BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node]));

export function chooseSixteenIceWarriorsBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  const captures = actions.filter((action) => action.type === "capture");
  const pool = captures.length ? captures : actions;
  return [...pool]
    .map((action) => ({ action, score: scoreAction(state, action, side) }))
    .sort((a, b) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)))[0].action;
}

function scoreAction(state, action, side) {
  if (action.type === "end-chain") return -100;
  const result = applyAction(state, action, side);
  if (result.error) return -Infinity;
  const next = result.state;
  if (next.winner === side) return 1_000_000;
  let score = action.type === "capture" ? 10_000 : 0;
  if (action.type === "capture") score += getCaptureActions(next, side, action.to).length * 900;
  score += centreScore(action.to) * 20;
  score += mobility(next, side) * 4;
  score -= mobility(next, otherSide(side)) * 2;
  score += occupiedNodes(next, side).length - occupiedNodes(next, otherSide(side)).length;
  return score;
}

function mobility(state, side) {
  if (state.winner || state.currentPlayer !== side) return 0;
  return getLegalActions(state, side).filter((action) => action.type !== "end-chain").length;
}

function centreScore(nodeId) {
  const node = NODE_BY_ID[nodeId];
  if (!node) return 0;
  return 50 - (Math.abs(node.x - 50) + Math.abs(node.y - 50));
}
