export const FORTY_GLACIER_GUARDS_RULESET = Object.freeze({
  gameId: "forty-glacier-guards",
  rulesetVersion: "challis-gutia-datta-1939-orthogonal-1.0.0",
  traditionalNames: ["Challis-Gutia", "Chalis Gutiya", "Chalis Ghutia"],
  region: "Jaunpur, Uttar Pradesh, India",
  evidenceStatus: "Datta 1939 contemporary rules description",
  guardsPerSide: 40,
  boardSize: 9,
  movement: "orthogonal-lines",
  capturesCompulsory: false,
  multipleCaptures: true,
  captureContinuationCompulsory: false,
  repetitionLimit: 3,
  noCapturePlyLimit: 240
});

export const SIDES = Object.freeze(["aurora", "ember"]);
export const BOARD_SIZE = FORTY_GLACIER_GUARDS_RULESET.boardSize;
export const NODES = Object.freeze(Array.from({ length: BOARD_SIZE }, (_, row) =>
  Array.from({ length: BOARD_SIZE }, (_, col) => ({
    id: nodeId(row, col),
    row,
    col,
    x: 8 + col * 10.5,
    y: 8 + row * 10.5
  }))
).flat());
const NODE_IDS = new Set(NODES.map((node) => node.id));
export const LINES = Object.freeze([
  ...Array.from({ length: BOARD_SIZE }, (_, row) => Array.from({ length: BOARD_SIZE }, (_, col) => nodeId(row, col))),
  ...Array.from({ length: BOARD_SIZE }, (_, col) => Array.from({ length: BOARD_SIZE }, (_, row) => nodeId(row, col)))
]);
export const EDGES = Object.freeze(buildEdges(LINES));
export const JUMP_PATHS = Object.freeze(buildJumpPaths(LINES));
export const ADJACENCY = Object.freeze(EDGES.reduce((map, [a, b]) => {
  map[a] = [...(map[a] || []), b];
  map[b] = [...(map[b] || []), a];
  return map;
}, {}));

export const EMBER_START = Object.freeze([
  ...Array.from({ length: 4 }, (_, row) => Array.from({ length: BOARD_SIZE }, (_, col) => nodeId(row, col))).flat(),
  ...Array.from({ length: 4 }, (_, col) => nodeId(4, col))
]);
export const AURORA_START = Object.freeze([
  ...Array.from({ length: 4 }, (_, rowOffset) => Array.from({ length: BOARD_SIZE }, (_, col) => nodeId(rowOffset + 5, col))).flat(),
  ...Array.from({ length: 4 }, (_, index) => nodeId(4, index + 5))
]);
export const CENTER_NODE = nodeId(4, 4);

function nodeId(row, col) {
  return `g${row}${col}`;
}

export function createFortyGlacierGuardsState({ mode = "online", starter = "aurora" } = {}) {
  const board = Object.fromEntries(NODES.map((node) => [node.id, null]));
  AURORA_START.forEach((id) => { board[id] = "aurora"; });
  EMBER_START.forEach((id) => { board[id] = "ember"; });
  const state = {
    gameId: FORTY_GLACIER_GUARDS_RULESET.gameId,
    rulesetVersion: FORTY_GLACIER_GUARDS_RULESET.rulesetVersion,
    mode,
    board,
    currentPlayer: starter === "ember" ? "ember" : "aurora",
    chainFrom: null,
    captured: { aurora: 0, ember: 0 },
    winner: null,
    winReason: null,
    turn: 1,
    noCapturePly: 0,
    history: [],
    positionCounts: {},
    lastAction: null
  };
  assertStateInvariant(state);
  return recordPosition(state);
}

export function createBreakthroughDrillState() {
  const state = createFortyGlacierGuardsState({ mode: "drill", starter: "aurora" });
  Object.keys(state.board).forEach((id) => { state.board[id] = null; });
  state.board.g42 = "aurora";
  state.board.g43 = "ember";
  state.board.g45 = "ember";
  state.captured = { aurora: 38, ember: 39 };
  state.positionCounts = {};
  state.history = [];
  state.turn = 1;
  state.noCapturePly = 0;
  state.chainFrom = null;
  state.winner = null;
  state.winReason = null;
  assertStateInvariant(state);
  return recordPosition(state);
}

export function otherSide(side) {
  return side === "aurora" ? "ember" : "aurora";
}

export function occupiedNodes(state, side) {
  return NODES.filter((node) => state.board[node.id] === side).map((node) => node.id);
}

export function getStepActions(state, side, from) {
  if (state.board[from] !== side) return [];
  return (ADJACENCY[from] || [])
    .filter((to) => !state.board[to])
    .map((to) => ({ type: "move", from, to }));
}

export function getCaptureActions(state, side, from) {
  if (state.board[from] !== side) return [];
  const enemy = otherSide(side);
  return JUMP_PATHS
    .filter((path) => path.from === from)
    .filter((path) => state.board[path.over] === enemy && !state.board[path.to])
    .map((path) => ({ type: "capture", ...path }));
}

export function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.winner || side !== state.currentPlayer) return [];
  if (state.chainFrom) {
    return [...getCaptureActions(state, side, state.chainFrom), { type: "end-chain", from: state.chainFrom }];
  }
  const actions = [];
  occupiedNodes(state, side).forEach((from) => {
    actions.push(...getStepActions(state, side, from));
    actions.push(...getCaptureActions(state, side, from));
  });
  return actions;
}

export function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The glacier battle has already ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this guard line's turn." };
  if (!action || typeof action.type !== "string") return { valid: false, reason: "Malformed action." };
  const legal = getLegalActions(state, side).find((candidate) => actionKey(candidate) === actionKey(action));
  return legal ? { valid: true, action: legal } : { valid: false, reason: explainIllegalAction(state, action, side) };
}

export function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const legalAction = validation.action;

  if (legalAction.type === "end-chain") {
    next.lastAction = { ...legalAction, player: side };
    next.history.push({ turn: next.turn, player: side, ...legalAction });
    finishTurn(next);
    assertStateInvariant(next);
    return { state: next, error: null };
  }

  next.board[legalAction.from] = null;
  next.board[legalAction.to] = side;
  next.lastAction = { ...legalAction, player: side };

  if (legalAction.type === "capture") {
    next.board[legalAction.over] = null;
    next.captured[side] += 1;
    next.noCapturePly = 0;
    next.history.push({ turn: next.turn, player: side, ...legalAction });
    if (occupiedNodes(next, otherSide(side)).length === 0) {
      next.winner = side;
      next.winReason = "all-guards-captured";
      next.chainFrom = null;
    } else if (getCaptureActions(next, side, legalAction.to).length) {
      next.chainFrom = legalAction.to;
    } else {
      finishTurn(next);
    }
  } else {
    next.noCapturePly += 1;
    next.history.push({ turn: next.turn, player: side, ...legalAction });
    finishTurn(next);
  }

  assertStateInvariant(next);
  return { state: next, error: null };
}

function finishTurn(state) {
  state.chainFrom = null;
  state.currentPlayer = otherSide(state.currentPlayer);
  state.turn += 1;
  recordPosition(state);
  applyModernDrawPolicy(state);
  if (!state.winner && !getLegalActions(state, state.currentPlayer).length) {
    state.winner = "draw";
    state.winReason = "immobilized-position";
  }
}

function applyModernDrawPolicy(state) {
  if (state.winner || state.chainFrom) return;
  const signature = positionSignature(state);
  if (state.positionCounts[signature] >= FORTY_GLACIER_GUARDS_RULESET.repetitionLimit) {
    state.winner = "draw";
    state.winReason = "threefold-repetition";
  } else if (state.noCapturePly >= FORTY_GLACIER_GUARDS_RULESET.noCapturePlyLimit) {
    state.winner = "draw";
    state.winReason = "no-capture-limit";
  }
}

export function getCounts(state) {
  return {
    auroraOnBoard: occupiedNodes(state, "aurora").length,
    emberOnBoard: occupiedNodes(state, "ember").length,
    auroraCaptured: Number(state.captured.aurora || 0),
    emberCaptured: Number(state.captured.ember || 0)
  };
}

export function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  const label = state.currentPlayer === "aurora" ? "Aurora Guard" : "Ember Guard";
  if (state.chainFrom) return `${label}: continue the jump chain or end the turn.`;
  return `${label}: step one point or begin an optional capture.`;
}

export function resultTitle(state) {
  if (state.winner === "draw") return "The glacier grid locks in a draw";
  return state.winner === "aurora" ? "Aurora Guard wins" : "Ember Guard wins";
}

export function resultDetail(state) {
  return {
    "all-guards-captured": "Every opposing guard has been removed from the nine-by-nine grid.",
    "threefold-repetition": "The same completed-turn position occurred three times under the modern digital draw policy.",
    "no-capture-limit": "The modern 240-ply captureless limit was reached.",
    "immobilized-position": "The next guard line had no legal step or capture; the digital rules record a draw rather than inventing a heritage win condition."
  }[state.winReason] || "The large-grid battle is complete.";
}

export function actionKey(action) {
  if (!action) return "";
  if (action.type === "end-chain") return `end-chain:${action.from}`;
  if (action.type === "move") return `move:${action.from}:${action.to}`;
  return `capture:${action.from}:${action.over}:${action.to}`;
}

function explainIllegalAction(state, action, side) {
  if (action.from && !NODE_IDS.has(action.from)) return "Unknown starting intersection.";
  if (action.to && !NODE_IDS.has(action.to)) return "Unknown destination intersection.";
  if (action.over && !NODE_IDS.has(action.over)) return "Unknown captured intersection.";
  if (state.chainFrom && action.type !== "end-chain" && action.from !== state.chainFrom) return "Continue with the same guard or end the capture chain.";
  if (action.type === "end-chain" && !state.chainFrom) return "There is no active capture chain to end.";
  if (action.from && state.board[action.from] !== side) return "Select one of your own guards.";
  if (action.to && state.board[action.to]) return "The destination is occupied.";
  if (action.type === "capture" && action.over && state.board[action.over] !== otherSide(side)) return "A capture must jump one adjacent enemy guard.";
  return "That action must follow one horizontal or vertical line on the 9×9 board.";
}

export function assertStateInvariant(state) {
  if (!state || state.gameId !== FORTY_GLACIER_GUARDS_RULESET.gameId) throw new Error("Forty Glacier Guards game-state invariant failed.");
  for (const node of NODES) {
    if (![null, "aurora", "ember"].includes(state.board[node.id])) throw new Error(`Invalid occupant at ${node.id}.`);
  }
  for (const side of SIDES) {
    const remaining = occupiedNodes(state, side).length;
    const lost = Number(state.captured[otherSide(side)] || 0);
    if (remaining + lost !== FORTY_GLACIER_GUARDS_RULESET.guardsPerSide) throw new Error(`${side} guard-count invariant failed.`);
  }
  if (state.chainFrom && state.board[state.chainFrom] !== state.currentPlayer) throw new Error("Capture-chain ownership invariant failed.");
  return true;
}

function recordPosition(state) {
  const signature = positionSignature(state);
  state.positionCounts = { ...state.positionCounts, [signature]: (state.positionCounts[signature] || 0) + 1 };
  return state;
}

export function positionSignature(state) {
  return `${NODES.map((node) => state.board[node.id] === "aurora" ? "A" : state.board[node.id] === "ember" ? "E" : "-").join("")}|${state.currentPlayer}`;
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

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

export function actionSummary(action) {
  if (!action) return "";
  const side = action.player === "ember" ? "Ember Guard" : "Aurora Guard";
  if (action.type === "end-chain") return `${side} ended the capture chain.`;
  if (action.type === "capture") return `${side} jumped ${action.over} and landed on ${action.to}.`;
  return `${side} moved from ${action.from} to ${action.to}.`;
}
