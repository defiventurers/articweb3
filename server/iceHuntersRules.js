const ICE_HUNTERS_RULESET = Object.freeze({
  gameId: "ice-hunters",
  rulesetVersion: "bagh-chal-standard-1.0.0",
  traditionalName: "Bagh-Chal",
  region: "Nepal / South Asia",
  tigers: 4,
  goats: 20,
  tigerCaptureTarget: 5,
  repetitionLimit: 3,
  noCapturePlyLimit: 100,
  capturesMandatory: false,
  multiCaptureTurns: false
});

const GRID = [10, 30, 50, 70, 90];
const NODES = Object.freeze(
  GRID.flatMap((y, row) => GRID.map((x, col) => ({ id: `n${col}${row}`, x, y, row, col })))
);

const LINES = Object.freeze([
  ...Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) => `n${col}${row}`)),
  ...Array.from({ length: 5 }, (_, col) => Array.from({ length: 5 }, (_, row) => `n${col}${row}`)),
  ["n00", "n11", "n22", "n33", "n44"],
  ["n40", "n31", "n22", "n13", "n04"],
  ["n20", "n11", "n02"],
  ["n20", "n31", "n42"],
  ["n02", "n13", "n24"],
  ["n42", "n33", "n24"]
]);

const EDGES = Object.freeze(buildEdges(LINES));
const JUMP_PATHS = Object.freeze(buildJumpPaths(LINES));
const NODE_IDS = new Set(NODES.map((node) => node.id));
const ADJACENCY = Object.freeze(
  EDGES.reduce((map, [a, b]) => {
    map[a] = [...(map[a] || []), b];
    map[b] = [...(map[b] || []), a];
    return map;
  }, {})
);
const STARTING_TIGERS = Object.freeze(["n00", "n40", "n04", "n44"]);

function createIceHuntersState({ mode = "online" } = {}) {
  const board = Object.fromEntries(NODES.map((node) => [node.id, null]));
  STARTING_TIGERS.forEach((nodeId) => { board[nodeId] = "tigers"; });
  const state = {
    gameId: ICE_HUNTERS_RULESET.gameId,
    rulesetVersion: ICE_HUNTERS_RULESET.rulesetVersion,
    mode,
    board,
    currentPlayer: "goats",
    goatsPlaced: 0,
    goatsCaptured: 0,
    winner: null,
    winReason: null,
    turn: 1,
    noCapturePly: 0,
    history: [],
    positionCounts: {},
    lastAction: null
  };
  return recordPosition(state);
}

function getPhase(state, player = state.currentPlayer) {
  if (player === "goats" && state.goatsPlaced < ICE_HUNTERS_RULESET.goats) return "goat-deployment";
  return "movement";
}

function getLegalActions(state, player = state.currentPlayer) {
  if (!state || state.winner || player !== state.currentPlayer) return [];
  const phase = getPhase(state, player);
  if (player === "goats" && phase === "goat-deployment") {
    return emptyNodes(state).map((nodeId) => ({ type: "place", nodeId }));
  }
  return player === "tigers" ? getTigerActions(state) : getGoatMoves(state);
}

function validateAction(state, action, player = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Ice Hunters match has already ended." };
  if (player !== state.currentPlayer) return { valid: false, reason: "It is not this side's turn." };
  if (!action || typeof action.type !== "string") return { valid: false, reason: "Malformed action." };
  const legal = getLegalActions(state, player).some((candidate) => actionsEqual(candidate, action));
  return legal ? { valid: true } : { valid: false, reason: explainIllegalAction(state, action, player) };
}

function applyAction(state, action, player = state.currentPlayer) {
  const validation = validateAction(state, action, player);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  next.lastAction = { ...action, player };
  let captured = false;

  if (action.type === "place") {
    next.board[action.nodeId] = "goats";
    next.goatsPlaced += 1;
  } else if (action.type === "move") {
    next.board[action.from] = null;
    next.board[action.to] = player;
  } else if (action.type === "capture") {
    next.board[action.from] = null;
    next.board[action.over] = null;
    next.board[action.to] = "tigers";
    next.goatsCaptured += 1;
    next.noCapturePly = 0;
    captured = true;
  }

  next.history.push({ turn: next.turn, player, ...action });
  if (!captured && deploymentComplete(next) && action.type !== "place") next.noCapturePly += 1;

  resolveResult(next);
  if (next.winner) return { state: next, error: null };

  next.currentPlayer = player === "tigers" ? "goats" : "tigers";
  next.turn += 1;
  recordPosition(next);
  applyModernDrawPolicy(next);
  return { state: next, error: null };
}

function getTigerActions(state) {
  const actions = [];
  occupiedNodes(state, "tigers").forEach((from) => {
    (ADJACENCY[from] || [])
      .filter((to) => !state.board[to])
      .forEach((to) => actions.push({ type: "move", from, to }));
    JUMP_PATHS
      .filter((path) => path.from === from)
      .filter((path) => state.board[path.over] === "goats" && !state.board[path.to])
      .forEach((path) => actions.push({ type: "capture", ...path }));
  });
  return actions;
}

function getGoatMoves(state) {
  if (!deploymentComplete(state)) return [];
  const actions = [];
  occupiedNodes(state, "goats").forEach((from) => {
    (ADJACENCY[from] || [])
      .filter((to) => !state.board[to])
      .forEach((to) => actions.push({ type: "move", from, to }));
  });
  return actions;
}

function getCounts(state) {
  return {
    tigersOnBoard: occupiedNodes(state, "tigers").length,
    goatsOnBoard: occupiedNodes(state, "goats").length,
    goatsInHand: ICE_HUNTERS_RULESET.goats - state.goatsPlaced,
    goatsCaptured: state.goatsCaptured,
    tigerMoves: getTigerActions({ ...state, currentPlayer: "tigers", winner: null }).length
  };
}

function resolveResult(state) {
  if (state.goatsCaptured >= ICE_HUNTERS_RULESET.tigerCaptureTarget) {
    state.winner = "tigers";
    state.winReason = "five-goats-captured";
    return;
  }
  const tigerState = { ...state, currentPlayer: "tigers", winner: null };
  if (!getTigerActions(tigerState).length) {
    state.winner = "goats";
    state.winReason = "all-tigers-trapped";
  }
}

function applyModernDrawPolicy(state) {
  if (!deploymentComplete(state) || state.winner) return;
  const signature = positionSignature(state);
  if (state.positionCounts[signature] >= ICE_HUNTERS_RULESET.repetitionLimit) {
    state.winner = "draw";
    state.winReason = "threefold-repetition";
  } else if (state.noCapturePly >= ICE_HUNTERS_RULESET.noCapturePlyLimit) {
    state.winner = "draw";
    state.winReason = "no-capture-limit";
  }
}

function deploymentComplete(state) {
  return state.goatsPlaced === ICE_HUNTERS_RULESET.goats;
}

function occupiedNodes(state, player) {
  return NODES.filter((node) => state.board[node.id] === player).map((node) => node.id);
}

function emptyNodes(state) {
  return NODES.filter((node) => !state.board[node.id]).map((node) => node.id);
}

function cloneState(state) {
  return {
    ...state,
    board: { ...state.board },
    history: [...state.history],
    positionCounts: { ...state.positionCounts },
    lastAction: state.lastAction ? { ...state.lastAction } : null
  };
}

function recordPosition(state) {
  const signature = positionSignature(state);
  state.positionCounts[signature] = (state.positionCounts[signature] || 0) + 1;
  return state;
}

function positionSignature(state) {
  return `${NODES.map((node) => state.board[node.id] === "tigers" ? "T" : state.board[node.id] === "goats" ? "G" : "-").join("")}|${state.currentPlayer}|${state.goatsPlaced}`;
}

function actionsEqual(a, b) {
  if (a.type !== b.type) return false;
  if (a.type === "place") return a.nodeId === b.nodeId;
  if (a.type === "move") return a.from === b.from && a.to === b.to;
  return a.from === b.from && a.over === b.over && a.to === b.to;
}

function explainIllegalAction(state, action, player) {
  if (action.nodeId && !NODE_IDS.has(action.nodeId)) return "Unknown board position.";
  if (action.from && !NODE_IDS.has(action.from)) return "Unknown starting position.";
  if (action.to && !NODE_IDS.has(action.to)) return "Unknown destination.";
  if (player === "goats" && state.goatsPlaced < ICE_HUNTERS_RULESET.goats) {
    if (action.type !== "place") return "The colony must deploy all twenty goats before any goat can move.";
    if (state.board[action.nodeId]) return "That intersection is occupied.";
  }
  if (action.from && state.board[action.from] !== player) return "Select one of your own pieces.";
  if (action.to && state.board[action.to]) return "The destination is occupied.";
  if (action.type === "capture" && player !== "tigers") return "Only the four hunters can capture.";
  return player === "tigers"
    ? "A hunter moves one step or jumps exactly one adjacent goat to the next empty point on the same line."
    : "A goat moves one step along a printed line after all twenty goats have been deployed.";
}

function buildEdges(lines) {
  const found = new Map();
  lines.forEach((line) => {
    for (let index = 0; index < line.length - 1; index += 1) {
      const pair = [line[index], line[index + 1]];
      found.set([...pair].sort().join(":"), pair);
    }
  });
  return [...found.values()];
}

function buildJumpPaths(lines) {
  const found = new Map();
  lines.forEach((line) => {
    for (let index = 0; index < line.length - 2; index += 1) {
      const forward = { from: line[index], over: line[index + 1], to: line[index + 2] };
      const reverse = { from: line[index + 2], over: line[index + 1], to: line[index] };
      found.set(`${forward.from}:${forward.over}:${forward.to}`, forward);
      found.set(`${reverse.from}:${reverse.over}:${reverse.to}`, reverse);
    }
  });
  return [...found.values()];
}

module.exports = {
  ICE_HUNTERS_RULESET,
  NODES,
  LINES,
  EDGES,
  JUMP_PATHS,
  ADJACENCY,
  STARTING_TIGERS,
  createIceHuntersState,
  getPhase,
  getLegalActions,
  validateAction,
  applyAction,
  getTigerActions,
  getGoatMoves,
  getCounts,
  deploymentComplete
};
