const NINE_ICE_FORTS_RULESET = Object.freeze({
  gameId: "nine-ice-forts",
  rulesetVersion: "navakankari-standard-1.0.0",
  piecesPerPlayer: 9,
  flyingEnabled: true,
  repetitionLimit: 3,
  noCapturePlyLimit: 100
});

const NODES = Object.freeze([
  { id: "a7" }, { id: "d7" }, { id: "g7" },
  { id: "b6" }, { id: "d6" }, { id: "f6" },
  { id: "c5" }, { id: "d5" }, { id: "e5" },
  { id: "a4" }, { id: "b4" }, { id: "c4" },
  { id: "e4" }, { id: "f4" }, { id: "g4" },
  { id: "c3" }, { id: "d3" }, { id: "e3" },
  { id: "b2" }, { id: "d2" }, { id: "f2" },
  { id: "a1" }, { id: "d1" }, { id: "g1" }
]);

const EDGES = Object.freeze([
  ["a7", "d7"], ["d7", "g7"], ["a7", "a4"], ["a4", "a1"], ["g7", "g4"], ["g4", "g1"], ["a1", "d1"], ["d1", "g1"],
  ["b6", "d6"], ["d6", "f6"], ["b6", "b4"], ["b4", "b2"], ["f6", "f4"], ["f4", "f2"], ["b2", "d2"], ["d2", "f2"],
  ["c5", "d5"], ["d5", "e5"], ["c5", "c4"], ["c4", "c3"], ["e5", "e4"], ["e4", "e3"], ["c3", "d3"], ["d3", "e3"],
  ["d7", "d6"], ["d6", "d5"], ["a4", "b4"], ["b4", "c4"], ["e4", "f4"], ["f4", "g4"], ["d3", "d2"], ["d2", "d1"]
]);

const MILLS = Object.freeze([
  ["a7", "d7", "g7"], ["b6", "d6", "f6"], ["c5", "d5", "e5"],
  ["a4", "b4", "c4"], ["e4", "f4", "g4"],
  ["c3", "d3", "e3"], ["b2", "d2", "f2"], ["a1", "d1", "g1"],
  ["a7", "a4", "a1"], ["b6", "b4", "b2"], ["c5", "c4", "c3"],
  ["d7", "d6", "d5"], ["d3", "d2", "d1"],
  ["e5", "e4", "e3"], ["f6", "f4", "f2"], ["g7", "g4", "g1"]
]);

const NODE_IDS = new Set(NODES.map((node) => node.id));
const ADJACENCY = EDGES.reduce((map, [a, b]) => {
  map[a] = [...(map[a] || []), b];
  map[b] = [...(map[b] || []), a];
  return map;
}, {});

function createNineIceFortsState({ startingPlayer = "blue", mode = "online" } = {}) {
  const state = {
    gameId: NINE_ICE_FORTS_RULESET.gameId,
    rulesetVersion: NINE_ICE_FORTS_RULESET.rulesetVersion,
    mode,
    board: Object.fromEntries(NODES.map((node) => [node.id, null])),
    currentPlayer: startingPlayer,
    phase: "placement",
    placed: { blue: 0, coral: 0 },
    piecesOnBoard: { blue: 0, coral: 0 },
    pendingRemoval: false,
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

function getOpponent(player) { return player === "blue" ? "coral" : "blue"; }
function getPlayerPhase(state, player = state.currentPlayer) {
  if (state.placed[player] < NINE_ICE_FORTS_RULESET.piecesPerPlayer) return "placement";
  if (NINE_ICE_FORTS_RULESET.flyingEnabled && state.piecesOnBoard[player] === 3) return "flying";
  return "movement";
}
function getLegalActions(state, player = state.currentPlayer) {
  if (!state || state.winner || player !== state.currentPlayer) return [];
  if (state.pendingRemoval) return getRemovableNodes(state, getOpponent(player)).map((nodeId) => ({ type: "remove", nodeId }));
  const phase = getPlayerPhase(state, player);
  if (phase === "placement") return emptyNodes(state).map((nodeId) => ({ type: "place", nodeId }));
  const actions = [];
  const destinations = emptyNodes(state);
  occupiedNodes(state, player).forEach((from) => {
    const targets = phase === "flying" ? destinations : (ADJACENCY[from] || []).filter((to) => !state.board[to]);
    targets.forEach((to) => actions.push({ type: "move", from, to }));
  });
  return actions;
}
function validateAction(state, action, player = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The match has already ended." };
  if (player !== state.currentPlayer) return { valid: false, reason: "It is not this player’s turn." };
  if (!action || typeof action.type !== "string") return { valid: false, reason: "Malformed action." };
  const legal = getLegalActions(state, player).some((candidate) => actionsEqual(candidate, action));
  return legal ? { valid: true } : { valid: false, reason: explainIllegalAction(state, action) };
}
function applyAction(state, action, player = state.currentPlayer) {
  const validation = validateAction(state, action, player);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  next.lastAction = { ...action, player };
  if (action.type === "place") {
    next.board[action.nodeId] = player;
    next.placed[player] += 1;
    next.piecesOnBoard[player] += 1;
    next.noCapturePly += 1;
    next.history.push({ turn: next.turn, player, ...action });
    if (formsMill(next, action.nodeId, player)) { next.pendingRemoval = true; return { state: next, error: null }; }
    return { state: finishTurn(next), error: null };
  }
  if (action.type === "move") {
    next.board[action.from] = null;
    next.board[action.to] = player;
    next.noCapturePly += 1;
    next.history.push({ turn: next.turn, player, ...action });
    if (formsMill(next, action.to, player)) { next.pendingRemoval = true; return { state: next, error: null }; }
    return { state: finishTurn(next), error: null };
  }
  if (action.type === "remove") {
    const opponent = getOpponent(player);
    next.board[action.nodeId] = null;
    next.piecesOnBoard[opponent] -= 1;
    next.pendingRemoval = false;
    next.noCapturePly = 0;
    next.history.push({ turn: next.turn, player, ...action });
    if (next.placed[opponent] >= NINE_ICE_FORTS_RULESET.piecesPerPlayer && next.piecesOnBoard[opponent] < 3) {
      next.winner = player;
      next.winReason = "reduced-opponent-to-two";
      return { state: next, error: null };
    }
    return { state: finishTurn(next), error: null };
  }
  return { state, error: "Unsupported action." };
}
function formsMill(state, nodeId, player) { return MILLS.some((mill) => mill.includes(nodeId) && mill.every((id) => state.board[id] === player)); }
function getRemovableNodes(state, opponent) { const pieces = occupiedNodes(state, opponent); const outside = pieces.filter((nodeId) => !formsMill(state, nodeId, opponent)); return outside.length ? outside : pieces; }
function finishTurn(state) {
  state.currentPlayer = getOpponent(state.currentPlayer);
  state.turn += 1;
  state.phase = getPlayerPhase(state, state.currentPlayer);
  if (state.placed[state.currentPlayer] >= NINE_ICE_FORTS_RULESET.piecesPerPlayer && !getLegalActions(state, state.currentPlayer).length) {
    state.winner = getOpponent(state.currentPlayer);
    state.winReason = "immobilised-opponent";
    return state;
  }
  const recorded = recordPosition(state);
  const signature = positionSignature(recorded);
  if (recorded.positionCounts[signature] >= NINE_ICE_FORTS_RULESET.repetitionLimit) {
    recorded.winner = "draw";
    recorded.winReason = "threefold-repetition";
  } else if (recorded.noCapturePly >= NINE_ICE_FORTS_RULESET.noCapturePlyLimit) {
    recorded.winner = "draw";
    recorded.winReason = "no-capture-limit";
  }
  return recorded;
}
function recordPosition(state) { const signature = positionSignature(state); state.positionCounts = { ...state.positionCounts, [signature]: (state.positionCounts[signature] || 0) + 1 }; return state; }
function positionSignature(state) { return `${NODES.map((node) => state.board[node.id] || "-").join("")}|${state.currentPlayer}|${state.pendingRemoval ? "r" : "n"}|${state.placed.blue},${state.placed.coral}`; }
function occupiedNodes(state, player) { return NODES.filter((node) => state.board[node.id] === player).map((node) => node.id); }
function emptyNodes(state) { return NODES.filter((node) => !state.board[node.id]).map((node) => node.id); }
function cloneState(state) { return { ...state, board: { ...state.board }, placed: { ...state.placed }, piecesOnBoard: { ...state.piecesOnBoard }, history: [...state.history], positionCounts: { ...state.positionCounts } }; }
function actionsEqual(a, b) { if (a.type !== b.type) return false; if (a.type === "move") return a.from === b.from && a.to === b.to; return a.nodeId === b.nodeId; }
function explainIllegalAction(state, action) {
  if (state.pendingRemoval && action.type !== "remove") return "Remove a rival scout before continuing.";
  if (!state.pendingRemoval && action.type === "remove") return "A rival scout may be removed only after forming a fort line.";
  if (action.nodeId && !NODE_IDS.has(action.nodeId)) return "Unknown fort position.";
  if (action.from && !NODE_IDS.has(action.from)) return "Unknown starting position.";
  if (action.to && !NODE_IDS.has(action.to)) return "Unknown destination.";
  if (action.type === "place" && state.board[action.nodeId]) return "That fort is occupied.";
  if (action.type === "move" && state.board[action.from] !== state.currentPlayer) return "Select one of your own scouts.";
  if (action.type === "move" && state.board[action.to]) return "That destination is occupied.";
  return "That action is not legal in the current phase.";
}

module.exports = { NINE_ICE_FORTS_RULESET, NODES, EDGES, MILLS, createNineIceFortsState, getOpponent, getPlayerPhase, getLegalActions, validateAction, applyAction, formsMill, getRemovableNodes };
