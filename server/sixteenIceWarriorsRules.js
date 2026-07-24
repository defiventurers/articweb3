const SIXTEEN_ICE_WARRIORS_RULESET = Object.freeze({
  gameId: "sixteen-ice-warriors",
  rulesetVersion: "hewakam-keliya-parker-1909-1.0.0",
  traditionalNames: ["Hewakam Keliya", "Solah Guttiya", "Sixteen Soldiers"],
  region: "Sri Lanka; also recorded in India and Bengal",
  evidenceStatus: "Parker 1909 contemporary rule description",
  soldiersPerSide: 16,
  capturesCompulsory: false,
  multipleCaptures: true,
  captureContinuationCompulsory: false,
  promotion: false,
  repetitionLimit: 3,
  noCapturePlyLimit: 160
});

const SIDES = Object.freeze(["aurora", "ember"]);
const GRID = [25, 37.5, 50, 62.5, 75];

const NODES = Object.freeze([
  ...GRID.flatMap((y, row) => GRID.map((x, col) => ({ id: `c${col}${row}`, x, y, zone: "court" }))),
  { id: "tIL", x: 40, y: 15, zone: "north" },
  { id: "tIC", x: 50, y: 15, zone: "north" },
  { id: "tIR", x: 60, y: 15, zone: "north" },
  { id: "tOL", x: 30, y: 5, zone: "north" },
  { id: "tOC", x: 50, y: 5, zone: "north" },
  { id: "tOR", x: 70, y: 5, zone: "north" },
  { id: "bIL", x: 40, y: 85, zone: "south" },
  { id: "bIC", x: 50, y: 85, zone: "south" },
  { id: "bIR", x: 60, y: 85, zone: "south" },
  { id: "bOL", x: 30, y: 95, zone: "south" },
  { id: "bOC", x: 50, y: 95, zone: "south" },
  { id: "bOR", x: 70, y: 95, zone: "south" }
]);

const CENTRAL_ROWS = Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) => `c${col}${row}`));
const CENTRAL_COLS = Array.from({ length: 5 }, (_, col) => Array.from({ length: 5 }, (_, row) => `c${col}${row}`));

const LINES = Object.freeze([
  ...CENTRAL_ROWS,
  ...CENTRAL_COLS,
  ["c00", "c11", "c22", "c33", "c44"],
  ["c40", "c31", "c22", "c13", "c04"],
  ["c02", "c11", "c20"],
  ["c20", "c31", "c42"],
  ["c02", "c13", "c24"],
  ["c42", "c33", "c24"],
  ["tOC", "tIC", "c20", "c21", "c22", "c23", "c24", "bIC", "bOC"],
  ["c31", "c20", "tIL", "tOL"],
  ["c11", "c20", "tIR", "tOR"],
  ["tIL", "tIC", "tIR"],
  ["tOL", "tOC", "tOR"],
  ["c33", "c24", "bIL", "bOL"],
  ["c13", "c24", "bIR", "bOR"],
  ["bIL", "bIC", "bIR"],
  ["bOL", "bOC", "bOR"]
]);

const EDGES = Object.freeze(buildEdges(LINES));
const JUMP_PATHS = Object.freeze(buildJumpPaths(LINES));
const NODE_IDS = new Set(NODES.map((node) => node.id));
const ADJACENCY = Object.freeze(EDGES.reduce((map, [a, b]) => {
  map[a] = [...(map[a] || []), b];
  map[b] = [...(map[b] || []), a];
  return map;
}, {}));

const AURORA_START = Object.freeze([
  "tOL", "tOC", "tOR", "tIL", "tIC", "tIR",
  "c00", "c10", "c20", "c30", "c40",
  "c01", "c11", "c21", "c31", "c41"
]);
const EMBER_START = Object.freeze([
  "bOL", "bOC", "bOR", "bIL", "bIC", "bIR",
  "c03", "c13", "c23", "c33", "c43",
  "c04", "c14", "c24", "c34", "c44"
]);

function createSixteenIceWarriorsState({ mode = "online", starter = "aurora" } = {}) {
  const board = Object.fromEntries(NODES.map((node) => [node.id, null]));
  AURORA_START.forEach((nodeId) => { board[nodeId] = "aurora"; });
  EMBER_START.forEach((nodeId) => { board[nodeId] = "ember"; });
  const state = {
    gameId: SIXTEEN_ICE_WARRIORS_RULESET.gameId,
    rulesetVersion: SIXTEEN_ICE_WARRIORS_RULESET.rulesetVersion,
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

function createCaptureDrillState() {
  const state = createSixteenIceWarriorsState({ mode: "drill", starter: "aurora" });
  Object.keys(state.board).forEach((nodeId) => { state.board[nodeId] = null; });
  state.board.c04 = "aurora";
  state.board.c13 = "ember";
  state.board.c31 = "ember";
  state.captured = { aurora: 14, ember: 15 };
  state.positionCounts = {};
  state.history = [];
  state.turn = 1;
  state.noCapturePly = 0;
  assertStateInvariant(state);
  return recordPosition(state);
}

function otherSide(side) {
  return side === "aurora" ? "ember" : "aurora";
}

function occupiedNodes(state, side) {
  return NODES.filter((node) => state.board[node.id] === side).map((node) => node.id);
}

function getStepActions(state, side, from) {
  if (state.board[from] !== side) return [];
  return (ADJACENCY[from] || [])
    .filter((to) => !state.board[to])
    .map((to) => ({ type: "move", from, to }));
}

function getCaptureActions(state, side, from) {
  if (state.board[from] !== side) return [];
  const enemy = otherSide(side);
  return JUMP_PATHS
    .filter((path) => path.from === from)
    .filter((path) => state.board[path.over] === enemy && !state.board[path.to])
    .map((path) => ({ type: "capture", ...path }));
}

function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.winner || side !== state.currentPlayer) return [];
  if (state.chainFrom) {
    const captures = getCaptureActions(state, side, state.chainFrom);
    return [...captures, { type: "end-chain", from: state.chainFrom }];
  }
  const actions = [];
  occupiedNodes(state, side).forEach((from) => {
    actions.push(...getStepActions(state, side, from));
    actions.push(...getCaptureActions(state, side, from));
  });
  return actions;
}

function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The battle has already ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this legion's turn." };
  if (!action || typeof action.type !== "string") return { valid: false, reason: "Malformed action." };
  const legal = getLegalActions(state, side).find((candidate) => actionsEqual(candidate, action));
  return legal ? { valid: true, action: legal } : { valid: false, reason: explainIllegalAction(state, action, side) };
}

function applyAction(state, action, side = state.currentPlayer) {
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
      next.winReason = "all-soldiers-captured";
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
    state.winReason = "stalemate";
  }
}

function applyModernDrawPolicy(state) {
  if (state.winner || state.chainFrom) return;
  const signature = positionSignature(state);
  if (state.positionCounts[signature] >= SIXTEEN_ICE_WARRIORS_RULESET.repetitionLimit) {
    state.winner = "draw";
    state.winReason = "threefold-repetition";
  } else if (state.noCapturePly >= SIXTEEN_ICE_WARRIORS_RULESET.noCapturePlyLimit) {
    state.winner = "draw";
    state.winReason = "no-capture-limit";
  }
}

function getCounts(state) {
  return {
    auroraOnBoard: occupiedNodes(state, "aurora").length,
    emberOnBoard: occupiedNodes(state, "ember").length,
    auroraCaptured: state.captured.aurora,
    emberCaptured: state.captured.ember
  };
}

function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  const label = state.currentPlayer === "aurora" ? "Aurora Legion" : "Ember Legion";
  if (state.chainFrom) return `${label}: continue the capture chain or end the turn.`;
  return `${label}: move one step or begin an optional jump capture.`;
}

function resultTitle(state) {
  if (state.winner === "draw") return "The war table ends in a draw";
  return state.winner === "aurora" ? "Aurora Legion wins" : "Ember Legion wins";
}

function resultDetail(state) {
  return {
    "all-soldiers-captured": "Every opposing soldier has been chopped from the board.",
    "threefold-repetition": "The same completed-turn position occurred three times under the modern digital draw policy.",
    "no-capture-limit": "The modern captureless-turn limit was reached.",
    stalemate: "Neither a step nor a capture was available under the modern stalemate policy."
  }[state.winReason] || "The battle is complete.";
}

function actionKey(action) {
  if (!action) return "";
  if (action.type === "end-chain") return `end-chain:${action.from}`;
  if (action.type === "move") return `move:${action.from}:${action.to}`;
  return `capture:${action.from}:${action.over}:${action.to}`;
}

function actionsEqual(a, b) {
  return actionKey(a) === actionKey(b);
}

function explainIllegalAction(state, action, side) {
  if (action.from && !NODE_IDS.has(action.from)) return "Unknown starting intersection.";
  if (action.to && !NODE_IDS.has(action.to)) return "Unknown destination intersection.";
  if (action.over && !NODE_IDS.has(action.over)) return "Unknown captured intersection.";
  if (state.chainFrom && action.type !== "end-chain" && action.from !== state.chainFrom) return "Continue with the same soldier or end the capture chain.";
  if (action.type === "end-chain" && !state.chainFrom) return "There is no active capture chain to end.";
  if (action.from && state.board[action.from] !== side) return "Select one of your own soldiers.";
  if (action.to && state.board[action.to]) return "The destination is occupied.";
  if (action.type === "capture" && action.over && state.board[action.over] !== otherSide(side)) return "A capture must jump one adjacent enemy soldier.";
  return "That action does not follow a printed line on the Hewakam board.";
}

function assertStateInvariant(state) {
  if (!state || state.gameId !== SIXTEEN_ICE_WARRIORS_RULESET.gameId) throw new Error("Sixteen Ice Warriors game-state invariant failed.");
  for (const node of NODES) {
    if (![null, "aurora", "ember"].includes(state.board[node.id])) throw new Error(`Invalid occupant at ${node.id}.`);
  }
  for (const side of SIDES) {
    const remaining = occupiedNodes(state, side).length;
    const lost = Number(state.captured[otherSide(side)] || 0);
    if (remaining + lost !== SIXTEEN_ICE_WARRIORS_RULESET.soldiersPerSide) throw new Error(`${side} soldier-count invariant failed.`);
  }
  if (state.chainFrom && state.board[state.chainFrom] !== state.currentPlayer) throw new Error("Capture-chain ownership invariant failed.");
  return true;
}

function recordPosition(state) {
  const signature = positionSignature(state);
  state.positionCounts = { ...state.positionCounts, [signature]: (state.positionCounts[signature] || 0) + 1 };
  return state;
}

function positionSignature(state) {
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

module.exports = {
  SIXTEEN_ICE_WARRIORS_RULESET,
  SIDES,
  NODES,
  LINES,
  EDGES,
  JUMP_PATHS,
  ADJACENCY,
  AURORA_START,
  EMBER_START,
  createSixteenIceWarriorsState,
  createCaptureDrillState,
  otherSide,
  occupiedNodes,
  getStepActions,
  getCaptureActions,
  getLegalActions,
  validateAction,
  applyAction,
  getCounts,
  describeTurn,
  resultTitle,
  resultDetail,
  actionKey,
  assertStateInvariant,
  positionSignature
};
