/** Design reference: Arctic heritage-console strategy game with a readable four-wing line board. */
export type Player = "leopards" | "colony";
export type Phase = "deployment" | "movement";
export type Winner = Player | "draw" | null;

export type FourWingAction =
  | { type: "place"; nodeId: string }
  | { type: "move"; from: string; to: string }
  | { type: "capture"; from: string; over: string; to: string };

export interface FourWingState {
  board: Record<string, Player | null>;
  currentPlayer: Player;
  phase: Phase;
  penguinsDeployed: number;
  penguinsCaptured: number;
  turn: number;
  winner: Winner;
  winReason: string | null;
  captureChainFrom: string | null;
  noCapturePly: number;
  positions: Record<string, number>;
  lastAction: FourWingAction | null;
}

export const RULESET_VERSION = "four-wing-standard-1.0";
export const PENGUIN_TOTAL = 24;
export const INITIAL_PENGUINS = 8;
export const LEOPARD_WIN_THRESHOLD = 12;

export const NODES = [
  ...[25, 37.5, 50, 62.5, 75].flatMap((y, row) => [25, 37.5, 50, 62.5, 75].map((x, col) => ({ id: `c${col}${row}`, x, y }))),
  { id: "tIL", x: 40, y: 15 }, { id: "tIC", x: 50, y: 15 }, { id: "tIR", x: 60, y: 15 },
  { id: "tOL", x: 30, y: 5 }, { id: "tOC", x: 50, y: 5 }, { id: "tOR", x: 70, y: 5 },
  { id: "bIL", x: 40, y: 85 }, { id: "bIC", x: 50, y: 85 }, { id: "bIR", x: 60, y: 85 },
  { id: "bOL", x: 30, y: 95 }, { id: "bOC", x: 50, y: 95 }, { id: "bOR", x: 70, y: 95 },
  { id: "lIU", x: 15, y: 40 }, { id: "lIC", x: 15, y: 50 }, { id: "lID", x: 15, y: 60 },
  { id: "lOU", x: 5, y: 30 }, { id: "lOC", x: 5, y: 50 }, { id: "lOD", x: 5, y: 70 },
  { id: "rIU", x: 85, y: 40 }, { id: "rIC", x: 85, y: 50 }, { id: "rID", x: 85, y: 60 },
  { id: "rOU", x: 95, y: 30 }, { id: "rOC", x: 95, y: 50 }, { id: "rOD", x: 95, y: 70 },
] as const;

export const NODE_BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node]));

const gridRows = [0, 1, 3, 4].map((row) => [0, 1, 2, 3, 4].map((col) => `c${col}${row}`));
const gridColumns = [0, 1, 3, 4].map((col) => [0, 1, 2, 3, 4].map((row) => `c${col}${row}`));

const LINES = [
  ...gridRows,
  ...gridColumns,
  ["tOC", "tIC", "c20", "c21", "c22", "c23", "c24", "bIC", "bOC"],
  ["lOC", "lIC", "c02", "c12", "c22", "c32", "c42", "rIC", "rOC"],
  ["c00", "c11", "c22", "c33", "c44"], ["c40", "c31", "c22", "c13", "c04"],
  ["c02", "c11", "c20"], ["c20", "c31", "c42"], ["c02", "c13", "c24"], ["c42", "c33", "c24"],
  ["c31", "c20", "tIL", "tOL"], ["c11", "c20", "tIR", "tOR"], ["tIL", "tIC", "tIR"], ["tOL", "tOC", "tOR"],
  ["c33", "c24", "bIL", "bOL"], ["c13", "c24", "bIR", "bOR"], ["bIL", "bIC", "bIR"], ["bOL", "bOC", "bOR"],
  ["c13", "c02", "lIU", "lOU"], ["c11", "c02", "lID", "lOD"], ["lIU", "lIC", "lID"], ["lOU", "lOC", "lOD"],
  ["c31", "c42", "rID", "rOD"], ["c33", "c42", "rIU", "rOU"], ["rIU", "rIC", "rID"], ["rOU", "rOC", "rOD"],
];

export const EDGES = buildEdges(LINES);
const ADJACENCY = EDGES.reduce<Record<string, string[]>>((map, [a, b]) => {
  map[a] = [...(map[a] ?? []), b];
  map[b] = [...(map[b] ?? []), a];
  return map;
}, {});
const JUMP_PATHS = buildJumpPaths(LINES);

const LEOPARD_STARTS = ["lOC", "rOC"];
const PENGUIN_STARTS = ["c11", "c21", "c31", "c12", "c32", "c13", "c23", "c33"];

export function createFourWingState(): FourWingState {
  const board = Object.fromEntries(NODES.map((node) => [node.id, null])) as Record<string, Player | null>;
  LEOPARD_STARTS.forEach((nodeId) => { board[nodeId] = "leopards"; });
  PENGUIN_STARTS.forEach((nodeId) => { board[nodeId] = "colony"; });
  const state: FourWingState = {
    board,
    currentPlayer: "colony",
    phase: "deployment",
    penguinsDeployed: INITIAL_PENGUINS,
    penguinsCaptured: 0,
    turn: 1,
    winner: null,
    winReason: null,
    captureChainFrom: null,
    noCapturePly: 0,
    positions: {},
    lastAction: null,
  };
  return recordPosition(state);
}

export function getCounts(state: FourWingState) {
  return {
    leopardsOnBoard: occupiedNodes(state, "leopards").length,
    penguinsOnBoard: occupiedNodes(state, "colony").length,
    penguinsInReserve: PENGUIN_TOTAL - state.penguinsDeployed,
    penguinsCaptured: state.penguinsCaptured,
  };
}

export function getLegalActions(state: FourWingState, player = state.currentPlayer): FourWingAction[] {
  if (state.winner || player !== state.currentPlayer) return [];
  if (player === "leopards" && state.captureChainFrom) return getCapturesFrom(state, state.captureChainFrom);
  if (state.phase === "deployment" && player === "colony") {
    return emptyNodes(state).map((nodeId) => ({ type: "place", nodeId }));
  }
  return player === "leopards" ? getLeopardActions(state) : getPenguinMoves(state);
}

export function getLeopardActions(state: FourWingState): FourWingAction[] {
  return occupiedNodes(state, "leopards").flatMap((from) => [
    ...(ADJACENCY[from] ?? []).filter((to) => !state.board[to]).map((to) => ({ type: "move" as const, from, to })),
    ...getCapturesFrom(state, from),
  ]);
}

export function getPenguinMoves(state: FourWingState): FourWingAction[] {
  return occupiedNodes(state, "colony").flatMap((from) =>
    (ADJACENCY[from] ?? []).filter((to) => !state.board[to]).map((to) => ({ type: "move" as const, from, to })),
  );
}

export function describeTurn(state: FourWingState) {
  if (state.winner) return resultTitle(state);
  if (state.captureChainFrom) return "Continue the snow leopard capture chain.";
  if (state.phase === "deployment") {
    return state.currentPlayer === "colony"
      ? "Deploy one reserve coloniser to an open intersection."
      : "Move or jump-capture with one snow leopard.";
  }
  return state.currentPlayer === "colony"
    ? "Move one coloniser along a connected line."
    : "Move or jump-capture with one snow leopard.";
}

export function resultTitle(state: FourWingState) {
  if (state.winner === "draw") return "The hunt ends in a draw";
  return state.winner === "leopards" ? "Snow Leopards win" : "The Colony wins";
}

export function resultDetail(state: FourWingState) {
  if (state.winReason === "twelve-captures") return "The leopards captured twelve penguin colonisers.";
  if (state.winReason === "leopards-immobilised") return "Both snow leopards have no legal move or capture.";
  if (state.winReason === "threefold-repetition") return "The same movement position appeared three times.";
  if (state.winReason === "no-capture-limit") return "The digital no-capture safeguard was reached.";
  return "The match is complete.";
}

export function applyAction(state: FourWingState, action: FourWingAction, player = state.currentPlayer) {
  const legalActions = getLegalActions(state, player);
  const isLegal = legalActions.some((candidate) => actionEquals(candidate, action));
  if (!isLegal) return { state, error: illegalMessage(state, action, player) };

  const next = cloneState(state);
  next.lastAction = action;
  let captured = false;

  if (action.type === "place") {
    next.board[action.nodeId] = "colony";
    next.penguinsDeployed += 1;
  }
  if (action.type === "move") {
    next.board[action.from] = null;
    next.board[action.to] = player;
  }
  if (action.type === "capture") {
    next.board[action.from] = null;
    next.board[action.over] = null;
    next.board[action.to] = "leopards";
    next.penguinsCaptured += 1;
    next.noCapturePly = 0;
    captured = true;
  }

  resolveWinner(next);
  if (next.winner) return { state: next, error: null };

  if (action.type === "capture") {
    const continuation = getCapturesFrom(next, action.to);
    if (continuation.length) {
      next.captureChainFrom = action.to;
      return { state: next, error: null };
    }
  }

  next.captureChainFrom = null;
  if (!captured && next.phase === "movement") next.noCapturePly += 1;
  next.currentPlayer = player === "colony" ? "leopards" : "colony";
  next.turn += 1;
  if (next.currentPlayer === "colony" && next.phase === "deployment" && next.penguinsDeployed === PENGUIN_TOTAL) {
    next.phase = "movement";
  }
  resolveWinner(next);
  if (!next.winner) applyDrawPolicy(next);
  return { state: recordPosition(next), error: null };
}

function getCapturesFrom(state: FourWingState, from: string): FourWingAction[] {
  return JUMP_PATHS
    .filter((path) => path.from === from)
    .filter((path) => state.board[path.over] === "colony" && !state.board[path.to])
    .map((path) => ({ type: "capture" as const, ...path }));
}

function resolveWinner(state: FourWingState) {
  if (state.penguinsCaptured >= LEOPARD_WIN_THRESHOLD) {
    state.winner = "leopards";
    state.winReason = "twelve-captures";
    return;
  }
  if (!getLeopardActions({ ...state, currentPlayer: "leopards", winner: null, captureChainFrom: null }).length) {
    state.winner = "colony";
    state.winReason = "leopards-immobilised";
  }
}

function applyDrawPolicy(state: FourWingState) {
  if (state.phase !== "movement") return;
  const signature = positionSignature(state);
  if ((state.positions[signature] ?? 0) >= 3) {
    state.winner = "draw";
    state.winReason = "threefold-repetition";
  } else if (state.noCapturePly >= 160) {
    state.winner = "draw";
    state.winReason = "no-capture-limit";
  }
}

function buildEdges(lines: string[][]) {
  const entries = new Map<string, [string, string]>();
  lines.forEach((line) => line.slice(0, -1).forEach((from, index) => {
    const to = line[index + 1];
    entries.set([from, to].sort().join(":"), [from, to]);
  }));
  return Array.from(entries.values());
}

function buildJumpPaths(lines: string[][]) {
  const entries = new Map<string, { from: string; over: string; to: string }>();
  lines.forEach((line) => line.slice(0, -2).forEach((from, index) => {
    const forward = { from, over: line[index + 1], to: line[index + 2] };
    const backward = { from: line[index + 2], over: line[index + 1], to: from };
    entries.set(`${forward.from}:${forward.over}:${forward.to}`, forward);
    entries.set(`${backward.from}:${backward.over}:${backward.to}`, backward);
  }));
  return Array.from(entries.values());
}

function occupiedNodes(state: FourWingState, player: Player) {
  return NODES.filter((node) => state.board[node.id] === player).map((node) => node.id);
}

function emptyNodes(state: FourWingState) {
  return NODES.filter((node) => !state.board[node.id]).map((node) => node.id);
}

function cloneState(state: FourWingState): FourWingState {
  return { ...state, board: { ...state.board }, positions: { ...state.positions } };
}

function actionEquals(a: FourWingAction, b: FourWingAction) {
  if (a.type !== b.type) return false;
  if (a.type === "place" && b.type === "place") return a.nodeId === b.nodeId;
  if (a.type === "move" && b.type === "move") return a.from === b.from && a.to === b.to;
  if (a.type === "capture" && b.type === "capture") return a.from === b.from && a.over === b.over && a.to === b.to;
  return false;
}

function positionSignature(state: FourWingState) {
  return `${NODES.map((node) => state.board[node.id] === "leopards" ? "L" : state.board[node.id] === "colony" ? "P" : "-").join("")}|${state.currentPlayer}|${state.phase}`;
}

function recordPosition(state: FourWingState) {
  const signature = positionSignature(state);
  state.positions = { ...state.positions, [signature]: (state.positions[signature] ?? 0) + 1 };
  return state;
}

function illegalMessage(state: FourWingState, action: FourWingAction, player: Player) {
  if (state.captureChainFrom && player === "leopards") return "This leopard has another legal capture and must continue the chain.";
  if (state.phase === "deployment" && player === "colony" && action.type !== "place") return "The colony must deploy its next reserve piece before moving.";
  if (action.type === "place" && state.board[action.nodeId]) return "That intersection is already occupied.";
  if (action.type !== "place" && state.board[action.from] !== player) return "Select one of your own pieces first.";
  if (action.type !== "place" && state.board[action.to]) return "The destination must be an open intersection.";
  if (action.type === "capture" && player !== "leopards") return "Only snow leopards can capture.";
  return "That action is not legal on the four-wing line board.";
}
