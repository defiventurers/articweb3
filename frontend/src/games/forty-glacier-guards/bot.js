import { getCaptureActions, getLegalActions, NODES } from "./rules.js";

const NODE_BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node]));

export function chooseFortyGlacierGuardsBotAction(state, side = state.currentPlayer) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  const captures = actions.filter((action) => action.type === "capture");
  if (captures.length) {
    return [...captures].sort((a, b) => captureScore(state, side, b) - captureScore(state, side, a) || actionKey(a).localeCompare(actionKey(b)))[0];
  }
  const moves = actions.filter((action) => action.type === "move");
  if (moves.length) {
    return [...moves].sort((a, b) => moveScore(state, side, b) - moveScore(state, side, a) || actionKey(a).localeCompare(actionKey(b)))[0];
  }
  return actions.find((action) => action.type === "end-chain") || actions[0];
}

function captureScore(state, side, action) {
  const next = JSON.parse(JSON.stringify(state));
  next.board[action.from] = null;
  next.board[action.over] = null;
  next.board[action.to] = side;
  return 1000 + getCaptureActions(next, side, action.to).length * 80 + centrality(action.to);
}

function moveScore(state, side, action) {
  const enemy = side === "aurora" ? "ember" : "aurora";
  const enemyNeighbours = Object.entries(state.board).filter(([, occupant]) => occupant === enemy).reduce((score, [id]) => score + (distance(id, action.to) <= 2 ? 1 : 0), 0);
  return centrality(action.to) * 2 + enemyNeighbours;
}

function centrality(id) {
  const node = NODE_BY_ID[id];
  return node ? 10 - Math.abs(node.row - 4) - Math.abs(node.col - 4) : 0;
}

function distance(a, b) {
  const na = NODE_BY_ID[a];
  const nb = NODE_BY_ID[b];
  return !na || !nb ? 99 : Math.abs(na.row - nb.row) + Math.abs(na.col - nb.col);
}

function actionKey(action) {
  return `${action.type}:${action.from || ""}:${action.over || ""}:${action.to || ""}`;
}
