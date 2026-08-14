export const ICE_RINGS_RULESET = Object.freeze({
  gameId: "ice-rings",
  rulesetVersion: "pretwa-murray-1951-compulsory-1.0.0",
  traditionalName: "Pretwa",
  region: "Bihar, India",
  players: 2,
  piecesPerPlayer: 9,
  rings: 3,
  sectors: 6,
  capturesCompulsory: true,
  multipleCaptures: true,
  captureContinuationCompulsory: true,
  repetitionLimit: 3,
  noCapturePlyLimit: 100
});

export const SIDES = Object.freeze(["aurora", "ember"]);
const TAU = Math.PI * 2;

function ringNodeId(ring, sector) {
  return `r${ring}s${sector}`;
}

function pointFor(ring, sector) {
  const radii = [0, 17, 30, 43];
  const angle = -Math.PI / 2 + (sector * TAU) / ICE_RINGS_RULESET.sectors;
  return {
    x: 50 + Math.cos(angle) * radii[ring],
    y: 50 + Math.sin(angle) * radii[ring]
  };
}

export const NODES = Object.freeze([
  { id: "c", x: 50, y: 50, ring: 0, sector: null, label: "centre" },
  ...Array.from({ length: ICE_RINGS_RULESET.rings }, (_, ringOffset) => {
    const ring = ringOffset + 1;
    return Array.from({ length: ICE_RINGS_RULESET.sectors }, (_, sector) => ({
      id: ringNodeId(ring, sector),
      ...pointFor(ring, sector),
      ring,
      sector,
      label: `ring ${ring}, spoke ${sector + 1}`
    }));
  }).flat()
]);

export const NODE_BY_ID = Object.freeze(Object.fromEntries(NODES.map((node) => [node.id, node])));
export const NODE_IDS = new Set(NODES.map((node) => node.id));
export const EDGES = Object.freeze(buildEdges());
export const JUMP_PATHS = Object.freeze(buildJumpPaths());
export const ADJACENCY = Object.freeze(EDGES.reduce((map, [a, b]) => {
  map[a] = [...(map[a] || []), b];
  map[b] = [...(map[b] || []), a];
  return map;
}, {}));

export const AURORA_START = Object.freeze([0, 1, 2].flatMap((sector) => [1, 2, 3].map((ring) => ringNodeId(ring, sector))));
export const EMBER_START = Object.freeze([3, 4, 5].flatMap((sector) => [1, 2, 3].map((ring) => ringNodeId(ring, sector))));

function buildEdges() {
  const edges = [];
  for (let ring = 1; ring <= 3; ring += 1) {
    for (let sector = 0; sector < 6; sector += 1) {
      edges.push([ringNodeId(ring, sector), ringNodeId(ring, (sector + 1) % 6)]);
    }
  }
  for (let sector = 0; sector < 6; sector += 1) {
    edges.push(["c", ringNodeId(1, sector)]);
    edges.push([ringNodeId(1, sector), ringNodeId(2, sector)]);
    edges.push([ringNodeId(2, sector), ringNodeId(3, sector)]);
  }
  return dedupePairs(edges);
}

function buildJumpPaths() {
  const paths = [];
  for (let ring = 1; ring <= 3; ring += 1) {
    for (let sector = 0; sector < 6; sector += 1) {
      paths.push({ from: ringNodeId(ring, sector), over: ringNodeId(ring, (sector + 1) % 6), to: ringNodeId(ring, (sector + 2) % 6), line: `ring-${ring}` });
      paths.push({ from: ringNodeId(ring, sector), over: ringNodeId(ring, (sector + 5) % 6), to: ringNodeId(ring, (sector + 4) % 6), line: `ring-${ring}` });
    }
  }
  for (let sector = 0; sector < 6; sector += 1) {
    addLineTriples(paths, ["c", ringNodeId(1, sector), ringNodeId(2, sector), ringNodeId(3, sector)], `spoke-${sector}`);
  }
  for (let sector = 0; sector < 3; sector += 1) {
    const opposite = sector + 3;
    paths.push({ from: ringNodeId(1, sector), over: "c", to: ringNodeId(1, opposite), line: `diameter-${sector}` });
    paths.push({ from: ringNodeId(1, opposite), over: "c", to: ringNodeId(1, sector), line: `diameter-${sector}` });
  }
  return dedupePaths(paths);
}

function addLineTriples(paths, line, name) {
  for (let index = 0; index <= line.length - 3; index += 1) {
    const [a, b, c] = line.slice(index, index + 3);
    paths.push({ from: a, over: b, to: c, line: name });
    paths.push({ from: c, over: b, to: a, line: name });
  }
}

function dedupePairs(pairs) {
  const seen = new Set();
  return pairs.filter(([a, b]) => {
    const key = [a, b].sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupePaths(paths) {
  const seen = new Set();
  return paths.filter((path) => {
    const key = `${path.from}|${path.over}|${path.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createIceRingsState({ mode = "hotseat", starter = "aurora" } = {}) {
  const board = Object.fromEntries(NODES.map((node) => [node.id, null]));
  AURORA_START.forEach((id) => { board[id] = "aurora"; });
  EMBER_START.forEach((id) => { board[id] = "ember"; });
  const state = {
    gameId: ICE_RINGS_RULESET.gameId,
    rulesetVersion: ICE_RINGS_RULESET.rulesetVersion,
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

export function createRingBreakDrillState() {
  const state = createIceRingsState({ mode: "drill", starter: "aurora" });
  Object.keys(state.board).forEach((id) => { state.board[id] = null; });
  state.board.r3s0 = "aurora";
  state.board.r2s0 = "ember";
  state.board.c = "ember";
  state.captured = { aurora: 7, ember: 8 };
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
  return (ADJACENCY[from] || []).filter((to) => !state.board[to]).map((to) => ({ type: "move", from, to }));
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
  if (state.chainFrom) return getCaptureActions(state, side, state.chainFrom);
  const captures = occupiedNodes(state, side).flatMap((from) => getCaptureActions(state, side, from));
  if (captures.length) return captures;
  return occupiedNodes(state, side).flatMap((from) => getStepActions(state, side, from));
}

export function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Ice Rings battle has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this ring guard's turn." };
  if (!action || !["move", "capture"].includes(action.type)) return { valid: false, reason: "Choose a legal ring move." };
  const legal = getLegalActions(state, side).find((candidate) => actionKey(candidate) === actionKey(action));
  return legal ? { valid: true, action: legal } : { valid: false, reason: explainIllegalAction(state, action, side) };
}

export function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const legal = validation.action;
  next.board[legal.from] = null;
  next.board[legal.to] = side;
  next.lastAction = { ...legal, player: side };
  next.history.push({ turn: next.turn, player: side, ...legal });

  if (legal.type === "capture") {
    next.board[legal.over] = null;
    next.captured[side] += 1;
    next.noCapturePly = 0;
    if (occupiedNodes(next, otherSide(side)).length === 0) {
      next.winner = side;
      next.winReason = "all-rivals-captured";
      next.chainFrom = null;
    } else if (getCaptureActions(next, side, legal.to).length) {
      next.chainFrom = legal.to;
    } else {
      finishTurn(next);
    }
  } else {
    next.noCapturePly += 1;
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
  applyDrawPolicy(state);
  if (!state.winner && !getLegalActions(state, state.currentPlayer).length) {
    state.winner = otherSide(state.currentPlayer);
    state.winReason = "rival-immobilized";
  }
}

function applyDrawPolicy(state) {
  if (state.winner || state.chainFrom) return;
  const signature = positionSignature(state);
  if (state.positionCounts[signature] >= ICE_RINGS_RULESET.repetitionLimit) {
    state.winner = "draw";
    state.winReason = "threefold-repetition";
  } else if (state.noCapturePly >= ICE_RINGS_RULESET.noCapturePlyLimit) {
    state.winner = "draw";
    state.winReason = "no-capture-limit";
  }
}

function recordPosition(state) {
  const signature = positionSignature(state);
  state.positionCounts[signature] = Number(state.positionCounts[signature] || 0) + 1;
  return state;
}

function positionSignature(state) {
  return `${state.currentPlayer}|${NODES.map((node) => state.board[node.id] || "-").join("")}`;
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
  const label = state.currentPlayer === "aurora" ? "Aurora Rings" : "Ember Rings";
  if (state.chainFrom) return `${label}: continue the compulsory jump chain.`;
  const captures = occupiedNodes(state, state.currentPlayer).flatMap((from) => getCaptureActions(state, state.currentPlayer, from));
  return captures.length ? `${label}: a capture is compulsory.` : `${label}: move one guard to an adjacent empty point.`;
}

export function actionSummary(action) {
  if (!action) return "";
  const label = action.player === "ember" ? "Ember Rings" : "Aurora Rings";
  if (action.type === "capture") return `${label} jumped ${action.over} and landed on ${action.to}.`;
  return `${label} moved from ${action.from} to ${action.to}.`;
}

export function resultTitle(state) {
  if (state.winner === "draw") return "The ice rings hold a draw";
  return state.winner === "aurora" ? "Aurora Rings win" : "Ember Rings win";
}

export function resultDetail(state) {
  return {
    "all-rivals-captured": "Every opposing Pretwa guard has been captured.",
    "rival-immobilized": "The opposing formation has no legal step or capture.",
    "threefold-repetition": "The same completed-turn position occurred three times under the digital tournament policy.",
    "no-capture-limit": "One hundred captureless plies elapsed under the digital tournament policy."
  }[state.winReason] || "The circular battle is complete.";
}

function actionKey(action) {
  if (!action) return "";
  return action.type === "capture"
    ? `capture:${action.from}:${action.over}:${action.to}`
    : `move:${action.from}:${action.to}`;
}

function explainIllegalAction(state, action, side) {
  if (action.from && !NODE_IDS.has(action.from)) return "Unknown starting intersection.";
  if (action.to && !NODE_IDS.has(action.to)) return "Unknown destination intersection.";
  if (action.over && !NODE_IDS.has(action.over)) return "Unknown jumped intersection.";
  if (state.chainFrom && action.from !== state.chainFrom) return "Continue the capture chain with the same guard.";
  if (action.from && state.board[action.from] !== side) return "Select one of your own ring guards.";
  if (action.to && state.board[action.to]) return "The destination is occupied.";
  const capturesExist = occupiedNodes(state, side).some((from) => getCaptureActions(state, side, from).length);
  if (action.type === "move" && capturesExist) return "A capture is available and must be taken in this ruleset.";
  return "Move along a printed ring or spoke, or jump one adjacent rival to the empty point beyond.";
}

export function assertStateInvariant(state) {
  if (!state || state.gameId !== ICE_RINGS_RULESET.gameId) throw new Error("Ice Rings game-state invariant failed.");
  for (const node of NODES) {
    if (![null, ...SIDES].includes(state.board[node.id])) throw new Error(`Invalid occupant at ${node.id}.`);
  }
  const totalAurora = occupiedNodes(state, "aurora").length + Number(state.captured.ember || 0);
  const totalEmber = occupiedNodes(state, "ember").length + Number(state.captured.aurora || 0);
  if (totalAurora !== ICE_RINGS_RULESET.piecesPerPlayer || totalEmber !== ICE_RINGS_RULESET.piecesPerPlayer) throw new Error("Pretwa piece conservation failed.");
  if (state.chainFrom && state.board[state.chainFrom] !== state.currentPlayer) throw new Error("Pretwa chain source invariant failed.");
  return true;
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}
