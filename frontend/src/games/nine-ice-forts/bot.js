import { actionKey, applyAction, formsMill, getLegalActions, getOpponent, MILLS, NODES } from "./rules.js";

export function chooseBotAction(state, player = state.currentPlayer) {
  const actions = getLegalActions(state, player);
  if (!actions.length) return null;

  const scored = actions.map((action) => ({ action, score: scoreAction(state, action, player) }));
  scored.sort((a, b) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)));
  return scored[0].action;
}

function scoreAction(state, action, player) {
  const opponent = getOpponent(player);
  let score = 0;

  if (action.type === "remove") {
    const degree = nodeDegree(action.nodeId);
    const millPotential = MILLS.filter((mill) => mill.includes(action.nodeId)).length;
    return 1000 + degree * 10 + millPotential * 14;
  }

  const result = applyAction(state, action, player).state;
  const landingNode = action.type === "place" ? action.nodeId : action.to;

  if (result.pendingRemoval) score += 500;
  score += nodeDegree(landingNode) * 8;
  score += openMillPotential(result, landingNode, player) * 18;
  score += forkPotential(result, player) * 16;

  if (action.type === "move") {
    score += createsMobility(result, player) * 0.8;
  }

  score += blocksImmediateMill(state, action, opponent) ? 180 : 0;
  score -= exposesImmediateMill(result, opponent) ? 140 : 0;

  return score;
}

function blocksImmediateMill(state, action, opponent) {
  const destination = action.type === "place" ? action.nodeId : action.to;
  return MILLS.some((mill) => {
    if (!mill.includes(destination)) return false;
    const occupied = mill.filter((id) => state.board[id] === opponent).length;
    const empty = mill.filter((id) => !state.board[id]).length;
    return occupied === 2 && empty === 1;
  });
}

function exposesImmediateMill(state, opponent) {
  return getLegalActions(state, opponent).some((action) => {
    if (action.type === "remove") return true;
    const preview = applyAction({ ...state, currentPlayer: opponent }, action, opponent).state;
    return preview.pendingRemoval;
  });
}

function openMillPotential(state, nodeId, player) {
  return MILLS.filter((mill) => mill.includes(nodeId)).reduce((total, mill) => {
    const mine = mill.filter((id) => state.board[id] === player).length;
    const empty = mill.filter((id) => !state.board[id]).length;
    return total + (mine === 2 && empty === 1 ? 2 : mine === 1 && empty === 2 ? 1 : 0);
  }, 0);
}

function forkPotential(state, player) {
  return NODES.reduce((total, node) => {
    if (state.board[node.id] !== player) return total;
    const threats = MILLS.filter((mill) => mill.includes(node.id)).filter((mill) => {
      const mine = mill.filter((id) => state.board[id] === player).length;
      const empty = mill.filter((id) => !state.board[id]).length;
      return mine === 2 && empty === 1;
    }).length;
    return total + Math.max(0, threats - 1);
  }, 0);
}

function createsMobility(state, player) {
  return getLegalActions({ ...state, currentPlayer: player }, player).length;
}

function nodeDegree(nodeId) {
  const edgeCount = [
    ["a7", "d7"], ["d7", "g7"], ["a7", "a4"], ["a4", "a1"], ["g7", "g4"], ["g4", "g1"], ["a1", "d1"], ["d1", "g1"],
    ["b6", "d6"], ["d6", "f6"], ["b6", "b4"], ["b4", "b2"], ["f6", "f4"], ["f4", "f2"], ["b2", "d2"], ["d2", "f2"],
    ["c5", "d5"], ["d5", "e5"], ["c5", "c4"], ["c4", "c3"], ["e5", "e4"], ["e4", "e3"], ["c3", "d3"], ["d3", "e3"],
    ["d7", "d6"], ["d6", "d5"], ["a4", "b4"], ["b4", "c4"], ["e4", "f4"], ["f4", "g4"], ["d3", "d2"], ["d2", "d1"]
  ].filter(([a, b]) => a === nodeId || b === nodeId).length;
  return edgeCount;
}
