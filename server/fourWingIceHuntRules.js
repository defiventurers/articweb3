const FOUR_WING_ICE_HUNT_RULESET = Object.freeze({
  gameId: "four-wing-ice-hunt",
  rulesetVersion: "diviyan-keliya-parker-1909-1.0.0",
  traditionalNames: ["Diviyan Keliya", "Kotiyo saha Harak", "Leopards and Cattle"],
  region: "Sri Lanka",
  leopards: 2,
  cattle: 24,
  repetitionLimit: 3,
  noCapturePlyLimit: 160
});

const GRID = [25, 37.5, 50, 62.5, 75];
const NODES = Object.freeze([
  ...GRID.flatMap((y, row) => GRID.map((x, col) => ({ id: `c${col}${row}`, x, y, zone: "court" }))),
  { id: "tIL", x: 40, y: 15, zone: "north" }, { id: "tIC", x: 50, y: 15, zone: "north" }, { id: "tIR", x: 60, y: 15, zone: "north" },
  { id: "tOL", x: 30, y: 5, zone: "north" }, { id: "tOC", x: 50, y: 5, zone: "north" }, { id: "tOR", x: 70, y: 5, zone: "north" },
  { id: "bIL", x: 40, y: 85, zone: "south" }, { id: "bIC", x: 50, y: 85, zone: "south" }, { id: "bIR", x: 60, y: 85, zone: "south" },
  { id: "bOL", x: 30, y: 95, zone: "south" }, { id: "bOC", x: 50, y: 95, zone: "south" }, { id: "bOR", x: 70, y: 95, zone: "south" },
  { id: "lIU", x: 15, y: 40, zone: "west" }, { id: "lIC", x: 15, y: 50, zone: "west" }, { id: "lID", x: 15, y: 60, zone: "west" },
  { id: "lOU", x: 5, y: 30, zone: "west" }, { id: "lOC", x: 5, y: 50, zone: "west" }, { id: "lOD", x: 5, y: 70, zone: "west" },
  { id: "rIU", x: 85, y: 40, zone: "east" }, { id: "rIC", x: 85, y: 50, zone: "east" }, { id: "rID", x: 85, y: 60, zone: "east" },
  { id: "rOU", x: 95, y: 30, zone: "east" }, { id: "rOC", x: 95, y: 50, zone: "east" }, { id: "rOD", x: 95, y: 70, zone: "east" }
]);
const centralRows = [0, 1, 3, 4].map((row) => [0, 1, 2, 3, 4].map((col) => `c${col}${row}`));
const centralCols = [0, 1, 3, 4].map((col) => [0, 1, 2, 3, 4].map((row) => `c${col}${row}`));
const LINES = Object.freeze([
  ...centralRows,
  ...centralCols,
  ["tOC", "tIC", "c20", "c21", "c22", "c23", "c24", "bIC", "bOC"],
  ["lOC", "lIC", "c02", "c12", "c22", "c32", "c42", "rIC", "rOC"],
  ["c00", "c11", "c22", "c33", "c44"],
  ["c40", "c31", "c22", "c13", "c04"],
  ["c02", "c11", "c20"], ["c20", "c31", "c42"], ["c02", "c13", "c24"], ["c42", "c33", "c24"],
  ["c31", "c20", "tIL", "tOL"], ["c11", "c20", "tIR", "tOR"], ["tIL", "tIC", "tIR"], ["tOL", "tOC", "tOR"],
  ["c33", "c24", "bIL", "bOL"], ["c13", "c24", "bIR", "bOR"], ["bIL", "bIC", "bIR"], ["bOL", "bOC", "bOR"],
  ["c13", "c02", "lIU", "lOU"], ["c11", "c02", "lID", "lOD"], ["lIU", "lIC", "lID"], ["lOU", "lOC", "lOD"],
  ["c31", "c42", "rID", "rOD"], ["c33", "c42", "rIU", "rOU"], ["rIU", "rIC", "rID"], ["rOU", "rOC", "rOD"]
]);
const EDGES = Object.freeze(buildEdges(LINES));
const JUMP_PATHS = Object.freeze(buildJumpPaths(LINES));
const NODE_IDS = new Set(NODES.map((node) => node.id));
const ADJACENCY = EDGES.reduce((map, [a, b]) => {
  map[a] = [...(map[a] || []), b];
  map[b] = [...(map[b] || []), a];
  return map;
}, {});

function createFourWingIceHuntState({ mode = "online" } = {}) {
  const state = {
    gameId: FOUR_WING_ICE_HUNT_RULESET.gameId,
    rulesetVersion: FOUR_WING_ICE_HUNT_RULESET.rulesetVersion,
    mode,
    board: Object.fromEntries(NODES.map((node) => [node.id, null])),
    currentPlayer: "leopards",
    leopardsPlaced: 0,
    cattlePlaced: 0,
    cattleCaptured: 0,
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
  if (player === "leopards" && state.leopardsPlaced < FOUR_WING_ICE_HUNT_RULESET.leopards) return "leopard-placement";
  if (player === "cattle" && state.cattlePlaced < FOUR_WING_ICE_HUNT_RULESET.cattle) return "cattle-deployment";
  return "movement";
}
function getLegalActions(state, player = state.currentPlayer) {
  if (!state || state.winner || player !== state.currentPlayer) return [];
  const phase = getPhase(state, player);
  if (phase === "leopard-placement") return emptyNodes(state).map((nodeId) => ({ type: "place", nodeId }));
  if (phase === "cattle-deployment") return emptyNodes(state).filter((nodeId) => state.cattlePlaced > 0 || firstCattleIsSafe(state, nodeId)).map((nodeId) => ({ type: "place", nodeId }));
  return player === "leopards" ? getLeopardActions(state) : getCattleMoves(state);
}
function validateAction(state, action, player = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The hunt has already ended." };
  if (player !== state.currentPlayer) return { valid: false, reason: "It is not this side’s turn." };
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
    next.board[action.nodeId] = player;
    if (player === "leopards") next.leopardsPlaced += 1;
    else next.cattlePlaced += 1;
  } else if (action.type === "move") {
    next.board[action.from] = null;
    next.board[action.to] = player;
  } else if (action.type === "capture") {
    next.board[action.from] = null;
    next.board[action.over] = null;
    next.board[action.to] = "leopards";
    next.cattleCaptured += 1;
    next.noCapturePly = 0;
    captured = true;
  }
  next.history.push({ turn: next.turn, player, ...action });
  if (!captured && deploymentComplete(next) && action.type !== "place") next.noCapturePly += 1;
  resolveResult(next);
  if (!next.winner) {
    next.currentPlayer = player === "leopards" ? "cattle" : "leopards";
    next.turn += 1;
    const recorded = recordPosition(next);
    applyModernDrawPolicy(recorded);
    return { state: recorded, error: null };
  }
  return { state: next, error: null };
}
function getLeopardActions(state) {
  const actions = [];
  occupiedNodes(state, "leopards").forEach((from) => {
    (ADJACENCY[from] || []).filter((to) => !state.board[to]).forEach((to) => actions.push({ type: "move", from, to }));
    JUMP_PATHS.filter((path) => path.from === from).filter((path) => state.board[path.over] === "cattle" && !state.board[path.to]).forEach((path) => actions.push({ type: "capture", ...path }));
  });
  return actions;
}
function getCattleMoves(state) {
  const actions = [];
  occupiedNodes(state, "cattle").forEach((from) => (ADJACENCY[from] || []).filter((to) => !state.board[to]).forEach((to) => actions.push({ type: "move", from, to })));
  return actions;
}
function getCounts(state) {
  return { leopardsOnBoard: occupiedNodes(state, "leopards").length, cattleOnBoard: occupiedNodes(state, "cattle").length, cattleInHand: FOUR_WING_ICE_HUNT_RULESET.cattle - state.cattlePlaced, cattleCaptured: state.cattleCaptured };
}
function resolveResult(state) {
  if (state.cattlePlaced === FOUR_WING_ICE_HUNT_RULESET.cattle && occupiedNodes(state, "cattle").length === 0) {
    state.winner = "leopards";
    state.winReason = "all-cattle-captured";
    return;
  }
  if (state.leopardsPlaced === FOUR_WING_ICE_HUNT_RULESET.leopards && !getLeopardActions({ ...state, currentPlayer: "leopards", winner: null }).length) {
    state.winner = "cattle";
    state.winReason = "leopards-imprisoned";
  }
}
function applyModernDrawPolicy(state) {
  if (!deploymentComplete(state) || state.winner) return;
  const signature = positionSignature(state);
  if (state.positionCounts[signature] >= FOUR_WING_ICE_HUNT_RULESET.repetitionLimit) {
    state.winner = "draw";
    state.winReason = "threefold-repetition";
  } else if (state.noCapturePly >= FOUR_WING_ICE_HUNT_RULESET.noCapturePlyLimit) {
    state.winner = "draw";
    state.winReason = "no-capture-limit";
  }
}
function firstCattleIsSafe(state, nodeId) {
  const board = { ...state.board, [nodeId]: "cattle" };
  return !JUMP_PATHS.some((path) => board[path.from] === "leopards" && board[path.over] === "cattle" && !board[path.to]);
}
function deploymentComplete(state) { return state.leopardsPlaced === FOUR_WING_ICE_HUNT_RULESET.leopards && state.cattlePlaced === FOUR_WING_ICE_HUNT_RULESET.cattle; }
function occupiedNodes(state, player) { return NODES.filter((node) => state.board[node.id] === player).map((node) => node.id); }
function emptyNodes(state) { return NODES.filter((node) => !state.board[node.id]).map((node) => node.id); }
function cloneState(state) { return { ...state, board: { ...state.board }, history: [...state.history], positionCounts: { ...state.positionCounts } }; }
function recordPosition(state) { const signature = positionSignature(state); state.positionCounts = { ...state.positionCounts, [signature]: (state.positionCounts[signature] || 0) + 1 }; return state; }
function positionSignature(state) { return `${NODES.map((node) => state.board[node.id] === "leopards" ? "L" : state.board[node.id] === "cattle" ? "C" : "-").join("")}|${state.currentPlayer}|${state.leopardsPlaced}|${state.cattlePlaced}`; }
function actionsEqual(a, b) { if (a.type !== b.type) return false; if (a.type === "place") return a.nodeId === b.nodeId; if (a.type === "move") return a.from === b.from && a.to === b.to; return a.from === b.from && a.over === b.over && a.to === b.to; }
function explainIllegalAction(state, action, player) {
  if (action.nodeId && !NODE_IDS.has(action.nodeId)) return "Unknown board position.";
  if (action.from && !NODE_IDS.has(action.from)) return "Unknown starting position.";
  if (action.to && !NODE_IDS.has(action.to)) return "Unknown destination.";
  const phase = getPhase(state, player);
  if (phase.includes("placement") || phase === "cattle-deployment") {
    if (action.type !== "place") return "This side must place its next piece before moving.";
    if (state.board[action.nodeId]) return "That intersection is occupied.";
    if (player === "cattle" && state.cattlePlaced === 0 && !firstCattleIsSafe(state, action.nodeId)) return "Parker’s opening requires the first cattle piece to be safe from immediate capture.";
  }
  if (player === "cattle" && state.cattlePlaced < FOUR_WING_ICE_HUNT_RULESET.cattle && action.type === "move") return "Cattle cannot move until all twenty-four have been deployed.";
  if (action.from && state.board[action.from] !== player) return "Select one of your own pieces.";
  if (action.to && state.board[action.to]) return "The destination is occupied.";
  if (action.type === "capture" && player !== "leopards") return "Only leopards capture.";
  return "That action is not legal on the printed line board.";
}
function buildEdges(lines) {
  const found = new Map();
  lines.forEach((line) => { for (let index = 0; index < line.length - 1; index += 1) { const pair = [line[index], line[index + 1]]; found.set([...pair].sort().join(":"), pair); } });
  return [...found.values()];
}
function buildJumpPaths(lines) {
  const found = new Map();
  lines.forEach((line) => { for (let index = 0; index < line.length - 2; index += 1) { const forward = { from: line[index], over: line[index + 1], to: line[index + 2] }; const reverse = { from: line[index + 2], over: line[index + 1], to: line[index] }; found.set(`${forward.from}:${forward.over}:${forward.to}`, forward); found.set(`${reverse.from}:${reverse.over}:${reverse.to}`, reverse); } });
  return [...found.values()];
}

module.exports = { FOUR_WING_ICE_HUNT_RULESET, NODES, LINES, EDGES, JUMP_PATHS, createFourWingIceHuntState, getPhase, getLegalActions, validateAction, applyAction, getLeopardActions, getCattleMoves, getCounts };
