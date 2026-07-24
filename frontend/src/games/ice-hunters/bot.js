import {
  NODES,
  applyAction,
  getLegalActions,
  getTigerActions
} from "./rules.js";

const NODE_BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node]));

export function chooseIceHuntersBotAction(state, player = state.currentPlayer) {
  const actions = getLegalActions(state, player);
  if (!actions.length) return null;
  return [...actions]
    .map((action) => ({ action, score: scoreAction(state, action, player) }))
    .sort((a, b) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)))[0].action;
}

function scoreAction(state, action, player) {
  const result = applyAction(state, action, player);
  if (result.error) return -Infinity;
  const next = result.state;
  const target = NODE_BY_ID[action.nodeId || action.to];
  const centrality = target ? 8 - Math.abs(target.col - 2) - Math.abs(target.row - 2) : 0;

  if (next.winner === player) return 100000;
  if (next.winner && next.winner !== "draw") return -100000;

  if (player === "tigers") {
    const mobility = getTigerActions({ ...next, currentPlayer: "tigers", winner: null }).length;
    return (action.type === "capture" ? 5000 : 0) + mobility * 24 + centrality * 8;
  }

  const tigerMobility = getTigerActions({ ...next, currentPlayer: "tigers", winner: null }).length;
  const exposed = countImmediateCaptures(next);
  return 3200 - tigerMobility * 28 - exposed * 420 + centrality * 10;
}

function countImmediateCaptures(state) {
  return getTigerActions({ ...state, currentPlayer: "tigers", winner: null })
    .filter((action) => action.type === "capture").length;
}

function actionKey(action) {
  if (action.type === "place") return `place:${action.nodeId}`;
  if (action.type === "move") return `move:${action.from}:${action.to}`;
  return `capture:${action.from}:${action.over}:${action.to}`;
}
