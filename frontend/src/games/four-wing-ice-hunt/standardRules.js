// Arctic reference-board geometry: explicit ice rails, glowing cap nodes, penguin colony, and snow-leopard entries.
export const FOUR_WING_STANDARD_RULESET = Object.freeze({
  gameId: "four-wing-ice-hunt",
  rulesetVersion: "four-wing-reference-1.2.0",
  leopards: 2,
  cattle: 24,
  initialCattle: 9,
  leopardWinThreshold: 12,
  repetitionLimit: 3,
  noCapturePlyLimit: 160
});

const COURT_X = [27, 38.5, 50, 61.5, 73];
const COURT_Y = [27, 38.5, 50, 61.5, 73];
const courtNodes = COURT_Y.flatMap((y, row) => COURT_X.map((x, col) => ({ id: `c${col}${row}`, x, y, zone: "court" })));

// Coordinates are percentages inside a portrait 1189:1323 board stage. Outside starts are holding platforms, not dots.
export const NODES = Object.freeze([
  ...courtNodes,
  { id: "tIL", x: 40, y: 17, zone: "north" }, { id: "tIC", x: 50, y: 15, zone: "north" }, { id: "tIR", x: 60, y: 17, zone: "north" },
  { id: "tOL", x: 36, y: 8, zone: "north" }, { id: "tOC", x: 50, y: 5, zone: "north" }, { id: "tOR", x: 64, y: 8, zone: "north" },
  { id: "bIL", x: 40, y: 83, zone: "south" }, { id: "bIC", x: 50, y: 85, zone: "south" }, { id: "bIR", x: 60, y: 83, zone: "south" },
  { id: "bOL", x: 36, y: 92, zone: "south" }, { id: "bOC", x: 50, y: 95, zone: "south" }, { id: "bOR", x: 64, y: 92, zone: "south" },
  { id: "lIU", x: 17, y: 40, zone: "west" }, { id: "lIC", x: 15, y: 50, zone: "west" }, { id: "lID", x: 17, y: 60, zone: "west" },
  { id: "lOU", x: 8, y: 36, zone: "west" }, { id: "lOC", x: 5, y: 50, zone: "west" }, { id: "lOD", x: 8, y: 64, zone: "west" },
  { id: "rIU", x: 83, y: 40, zone: "east" }, { id: "rIC", x: 85, y: 50, zone: "east" }, { id: "rID", x: 83, y: 60, zone: "east" },
  { id: "rOU", x: 92, y: 36, zone: "east" }, { id: "rOC", x: 95, y: 50, zone: "east" }, { id: "rOD", x: 92, y: 64, zone: "east" },
  { id: "leopard-nw", x: 7, y: 8, zone: "entry", outside: true }, { id: "leopard-se", x: 93, y: 92, zone: "entry", outside: true }
]);

const COURT_ROWS = [0, 1, 2, 3, 4].map((row) => [0, 1, 2, 3, 4].map((col) => `c${col}${row}`));
const COURT_COLUMNS = [0, 1, 2, 3, 4].map((col) => [0, 1, 2, 3, 4].map((row) => `c${col}${row}`));
const DIAGONAL_LINES = [
  ["c00", "c11", "c22", "c33", "c44"], ["c40", "c31", "c22", "c13", "c04"],
  ["c02", "c11", "c20"], ["c20", "c31", "c42"], ["c02", "c13", "c24"], ["c42", "c33", "c24"]
];

// These visible axes are explicitly called out in the supplied mobile markup. Listing them first gives their
// rail class priority over the equivalent court/wing edges so they cannot fade into the ice background.
const REQUIRED_VISIBLE_AXES = [
  ["tOC", "tIC", "c20", "c21", "c22", "c23", "c24", "bIC", "bOC"], // 1 → 2
  ["c02", "c12", "c22", "c32", "c42"], // 5 → 6
  ["c04", "c14", "c24", "c34", "c44"], // 3 → 4
  ["c02", "c03", "c04"], // 5 ↔ 3
  ["c42", "c43", "c44"] // 6 ↔ 4
];

const straightRails = [
  ...railsFromLines(REQUIRED_VISIBLE_AXES, "reference-axis"),
  ...railsFromLines([...COURT_ROWS, ...COURT_COLUMNS], "court-grid"),
  ...railsFromLines(DIAGONAL_LINES),
  ...wingSpokes("c20", ["tIL", "tIC", "tIR"], ["tOL", "tOC", "tOR"]),
  ...wingSpokes("c24", ["bIL", "bIC", "bIR"], ["bOL", "bOC", "bOR"]),
  ...wingSpokes("c02", ["lIU", "lIC", "lID"], ["lOU", "lOC", "lOD"]),
  ...wingSpokes("c42", ["rIU", "rIC", "rID"], ["rOU", "rOC", "rOD"]),
  { from: "leopard-nw", to: "c00", kind: "entry" }, { from: "c44", to: "leopard-se", kind: "entry" }
];

const curvedRails = [
  ...fanArcs(["tIL", "tIC", "tIR"], "north", "inner"), ...fanArcs(["tOL", "tOC", "tOR"], "north", "outer"),
  ...fanArcs(["bIL", "bIC", "bIR"], "south", "inner"), ...fanArcs(["bOL", "bOC", "bOR"], "south", "outer"),
  ...fanArcs(["lIU", "lIC", "lID"], "west", "inner"), ...fanArcs(["lOU", "lOC", "lOD"], "west", "outer"),
  ...fanArcs(["rIU", "rIC", "rID"], "east", "inner"), ...fanArcs(["rOU", "rOC", "rOD"], "east", "outer")
];

// The renderer and game graph consume this one rail contract. Curves are legal adjacent rails; jump paths use only straight continuations.
export const RAILS = Object.freeze(dedupeRails([...straightRails, ...curvedRails]));
export const EDGES = Object.freeze(RAILS.map(({ from, to }) => [from, to]));
export const ADJACENCY = EDGES.reduce((map, [a, b]) => { map[a] = [...(map[a] || []), b]; map[b] = [...(map[b] || []), a]; return map; }, {});
const JUMP_LINES = [...COURT_ROWS, ...COURT_COLUMNS, ...DIAGONAL_LINES, ["c20", "tIC", "tOC"], ["c24", "bIC", "bOC"], ["c02", "lIC", "lOC"], ["c42", "rIC", "rOC"]];
const JUMP_PATHS = Object.freeze(buildJumpPaths(JUMP_LINES));
const LEOPARD_STARTS = ["leopard-nw", "leopard-se"];
const CATTLE_STARTS = ["c11", "c21", "c31", "c12", "c22", "c32", "c13", "c23", "c33"];

export function createStandardFourWingState({ mode = "hotseat" } = {}) {
  const board = Object.fromEntries(NODES.map((node) => [node.id, null]));
  LEOPARD_STARTS.forEach((nodeId) => { board[nodeId] = "leopards"; });
  CATTLE_STARTS.forEach((nodeId) => { board[nodeId] = "cattle"; });
  return recordPosition({ gameId: FOUR_WING_STANDARD_RULESET.gameId, rulesetVersion: FOUR_WING_STANDARD_RULESET.rulesetVersion, mode, board, currentPlayer: "leopards", leopardsPlaced: 2, cattlePlaced: FOUR_WING_STANDARD_RULESET.initialCattle, cattleCaptured: 0, winner: null, winReason: null, turn: 1, noCapturePly: 0, captureChainFrom: null, history: [], positionCounts: {}, lastAction: null });
}

export function getPhase(state) { return state.cattlePlaced < FOUR_WING_STANDARD_RULESET.cattle ? "deployment" : "movement"; }
export function getLegalActions(state, player = state.currentPlayer) {
  if (!state || state.winner || player !== state.currentPlayer) return [];
  if (player === "leopards" && state.captureChainFrom) return getCapturesFrom(state, state.captureChainFrom);
  if (getPhase(state) === "deployment" && player === "cattle") return emptyNodes(state).filter((nodeId) => entryRemainsOpen(state, nodeId)).map((nodeId) => ({ type: "place", nodeId }));
  return player === "leopards" ? getLeopardActions(state) : getCattleMoves(state);
}

export function applyStandardAction(state, action, player = state.currentPlayer) {
  const legal = getLegalActions(state, player);
  if (!legal.some((candidate) => actionsEqual(candidate, action))) return { state, error: explainIllegalAction(state, action, player) };
  const next = cloneState(state); next.lastAction = { ...action, player }; let captured = false;
  if (action.type === "place") { next.board[action.nodeId] = "cattle"; next.cattlePlaced += 1; }
  else if (action.type === "move") { next.board[action.from] = null; next.board[action.to] = player; }
  else { next.board[action.from] = null; next.board[action.over] = null; next.board[action.to] = "leopards"; next.cattleCaptured += 1; next.noCapturePly = 0; captured = true; }
  next.history.push({ turn: next.turn, player, ...action }); resolveResult(next); if (next.winner) return { state: next, error: null };
  if (action.type === "capture") { const continuation = getCapturesFrom(next, action.to); if (continuation.length) { next.captureChainFrom = action.to; return { state: next, error: null }; } }
  next.captureChainFrom = null; if (!captured && getPhase(next) === "movement") next.noCapturePly += 1; next.currentPlayer = player === "leopards" ? "cattle" : "leopards"; next.turn += 1; resolveResult(next); if (!next.winner) applyModernDrawPolicy(recordPosition(next)); return { state: next, error: null };
}

export function getLeopardActions(state) { return occupiedNodes(state, "leopards").flatMap((from) => [...(ADJACENCY[from] || []).filter((to) => !state.board[to]).map((to) => ({ type: "move", from, to })), ...getCapturesFrom(state, from)]); }
export function getCattleMoves(state) { return occupiedNodes(state, "cattle").flatMap((from) => (ADJACENCY[from] || []).filter((to) => !state.board[to]).map((to) => ({ type: "move", from, to }))); }
export function getCounts(state) { return { leopardsOnBoard: occupiedNodes(state, "leopards").length, cattleOnBoard: occupiedNodes(state, "cattle").length, cattleInHand: FOUR_WING_STANDARD_RULESET.cattle - state.cattlePlaced, cattleCaptured: state.cattleCaptured }; }
export function describeTurn(state) { if (state.winner) return resultTitle(state); if (state.captureChainFrom) return "Continue the snow leopard capture chain."; if (getPhase(state) === "deployment") return state.currentPlayer === "cattle" ? "Deploy one reserve coloniser to an open intersection." : "Move one snow leopard from its entry point or along a connected line."; return state.currentPlayer === "leopards" ? "Move or jump-capture with one snow leopard." : "Move one penguin coloniser along a connected line."; }
export function resultTitle(state) { if (state.winner === "draw") return "The hunt ends in a draw"; return state.winner === "leopards" ? "Snow Leopards win" : "The Colony wins"; }
export function resultDetail(state) { return { "twelve-captures": "The snow leopards captured twelve penguin colonisers.", "leopards-imprisoned": "Both snow leopards have no legal move or capture.", "threefold-repetition": "The same movement position occurred three times.", "no-capture-limit": "The digital no-capture limit was reached." }[state.winReason] || "The match is complete."; }

function railsFromLines(lines, kind = "straight") { return lines.flatMap((line) => line.slice(0, -1).map((from, index) => ({ from, to: line[index + 1], kind }))); }
function wingSpokes(anchor, inner, outer) { return [...inner.map((to) => ({ from: anchor, to, kind: "straight" })), ...inner.map((from, index) => ({ from, to: outer[index], kind: "straight" }))]; }
function fanArcs(nodes, direction, ring) { return nodes.slice(0, -1).map((from, index) => ({ from, to: nodes[index + 1], kind: "curve", curve: `${direction}-${ring}` })); }
function dedupeRails(rails) { const seen = new Map(); rails.forEach((rail) => { const key = [rail.from, rail.to].sort().join(":"); if (!seen.has(key)) seen.set(key, rail); }); return [...seen.values()]; }
function getCapturesFrom(state, from) { return JUMP_PATHS.filter((path) => path.from === from).filter((path) => state.board[path.over] === "cattle" && !state.board[path.to]).map((path) => ({ type: "capture", ...path })); }
function resolveResult(state) { if (state.cattleCaptured >= FOUR_WING_STANDARD_RULESET.leopardWinThreshold) { state.winner = "leopards"; state.winReason = "twelve-captures"; return; } const leopardState = { ...state, currentPlayer: "leopards", winner: null, captureChainFrom: null }; if (!getLeopardActions(leopardState).length) { state.winner = "cattle"; state.winReason = "leopards-imprisoned"; } }
function applyModernDrawPolicy(state) { if (getPhase(state) !== "movement" || state.winner) return; const signature = positionSignature(state); if (state.positionCounts[signature] >= FOUR_WING_STANDARD_RULESET.repetitionLimit) { state.winner = "draw"; state.winReason = "threefold-repetition"; } else if (state.noCapturePly >= FOUR_WING_STANDARD_RULESET.noCapturePlyLimit) { state.winner = "draw"; state.winReason = "no-capture-limit"; } }
function occupiedNodes(state, player) { return NODES.filter((node) => state.board[node.id] === player).map((node) => node.id); }
function emptyNodes(state) { return NODES.filter((node) => !state.board[node.id] && !node.outside).map((node) => node.id); }
function cloneState(state) { return { ...state, board: { ...state.board }, history: [...state.history], positionCounts: { ...state.positionCounts } }; }
function recordPosition(state) { const signature = positionSignature(state); state.positionCounts = { ...state.positionCounts, [signature]: (state.positionCounts[signature] || 0) + 1 }; return state; }
function positionSignature(state) { return `${NODES.map((node) => state.board[node.id] === "leopards" ? "L" : state.board[node.id] === "cattle" ? "P" : "-").join("")}|${state.currentPlayer}|${getPhase(state)}`; }
function actionsEqual(a, b) { if (a.type !== b.type) return false; if (a.type === "place") return a.nodeId === b.nodeId; if (a.type === "move") return a.from === b.from && a.to === b.to; return a.from === b.from && a.over === b.over && a.to === b.to; }
function entryRemainsOpen(state, nodeId) { if (nodeId === "c00" && state.board["leopard-nw"] === "leopards") return false; if (nodeId === "c44" && state.board["leopard-se"] === "leopards") return false; return true; }
function explainIllegalAction(state, action, player) { if (state.captureChainFrom && player === "leopards") return "This snow leopard has another legal capture and must continue the chain."; if (getPhase(state) === "deployment" && player === "cattle" && action.type !== "place") return "The colony must deploy its next reserve piece before moving."; if (action.type === "place" && state.board[action.nodeId]) return "That intersection is occupied."; if (action.type === "place" && !entryRemainsOpen(state, action.nodeId)) return "Keep the matching entry point open until that snow leopard enters the board."; if (action.type !== "place" && state.board[action.from] !== player) return "Select one of your own pieces first."; if (action.type !== "place" && state.board[action.to]) return "The destination is occupied."; return "That action is not legal on the reference board lines."; }
function buildJumpPaths(lines) { const found = new Map(); lines.forEach((line) => { for (let index = 0; index < line.length - 2; index += 1) { const forward = { from: line[index], over: line[index + 1], to: line[index + 2] }; const reverse = { from: line[index + 2], over: line[index + 1], to: line[index] }; found.set(`${forward.from}:${forward.over}:${forward.to}`, forward); found.set(`${reverse.from}:${reverse.over}:${reverse.to}`, reverse); } }); return Array.from(found.values()); }
