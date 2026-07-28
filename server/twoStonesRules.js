const TWO_STONES_RULESET = Object.freeze({ gameId: "two-stones", rulesetVersion: "do-guti-das-gupta-1926-1.0.0", traditionalName: "Do-guti", source: "H. C. Das Gupta (1926), pp. 143–148", region: "Punjab, India", players: 2, piecesPerPlayer: 2, capture: false, drawRepetition: 3, movementPlyLimit: 40, solvedOpening: "draw" });
const SIDES = Object.freeze(["blue", "coral"]);
const POINTS = Object.freeze(["nw", "ne", "c", "sw", "se"]);
const EDGES = Object.freeze([["nw","sw"],["sw","se"],["se","ne"],["nw","c"],["ne","c"],["sw","c"],["se","c"]]);
const ADJACENCY = Object.freeze(Object.fromEntries(POINTS.map((point) => [point, Object.freeze(EDGES.flatMap(([a,b]) => a === point ? [b] : b === point ? [a] : []))])));
const otherSide = (side) => side === "blue" ? "coral" : "blue";
const clone = (value) => JSON.parse(JSON.stringify(value));

function createPieces(side) { return Array.from({ length: 2 }, (_, index) => ({ id: `${side}-${index + 1}`, side, point: null })); }
function createTwoStonesState({ mode = "online", starter = "blue" } = {}) {
  const state = { gameId: TWO_STONES_RULESET.gameId, rulesetVersion: TWO_STONES_RULESET.rulesetVersion, mode, currentPlayer: starter === "coral" ? "coral" : "blue", phase: "placement", pieces: { blue: createPieces("blue"), coral: createPieces("coral") }, turn: 1, ply: 0, movementPly: 0, repetitions: {}, lastAction: null, winner: null, isDraw: false, winReason: null, history: [] };
  assertStateInvariant(state); return state;
}
function createLockDrill() {
  const state = createTwoStonesState({ mode: "drill" }); state.phase = "movement";
  state.pieces.blue[0].point = "nw"; state.pieces.blue[1].point = "sw"; state.pieces.coral[0].point = "ne"; state.pieces.coral[1].point = "se";
  state.repetitions[positionKey(state)] = 1; assertStateInvariant(state); return state;
}
function occupantAt(state, pointId) { for (const side of SIDES) { const piece = state.pieces[side].find((candidate) => candidate.point === pointId); if (piece) return piece; } return null; }
function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.winner || state.isDraw || side !== state.currentPlayer) return [];
  const occupied = new Set(SIDES.flatMap((team) => state.pieces[team].map((piece) => piece.point).filter(Boolean)));
  if (state.phase === "placement") {
    const unplaced = state.pieces[side].find((piece) => !piece.point); if (!unplaced) return [];
    return POINTS.filter((point) => !occupied.has(point)).map((to) => ({ type: "place", pieceId: unplaced.id, to }));
  }
  const actions = [];
  for (const piece of state.pieces[side]) for (const to of ADJACENCY[piece.point] || []) if (!occupied.has(to)) actions.push({ type: "move", pieceId: piece.id, from: piece.point, to });
  return actions;
}
function actionKey(action) { return `${action?.type || ""}:${action?.pieceId || ""}:${action?.from || ""}:${action?.to || ""}`; }
function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing Two Stones state." };
  if (state.winner || state.isDraw) return { valid: false, reason: "This instant challenge is finished." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this tribe's turn." };
  if (!action?.type || !action?.pieceId || !action?.to) return { valid: false, reason: "Choose a stone and a connected empty point." };
  const legal = getLegalActions(state, side).find((candidate) => actionKey(candidate) === actionKey(action));
  if (legal) return { valid: true, action: legal };
  const piece = state.pieces[side].find((candidate) => candidate.id === action.pieceId);
  if (!piece) return { valid: false, reason: "That stone does not belong to the active tribe." };
  if (occupantAt(state, action.to)) return { valid: false, reason: "That point is occupied." };
  if (state.phase === "placement") return { valid: false, reason: "Place the next waiting stone on any empty point." };
  if (!(ADJACENCY[piece.point] || []).includes(action.to)) return { valid: false, reason: "Stones move only along a printed line to an adjacent point." };
  return { valid: false, reason: "That move is not legal." };
}
function positionKey(state) { const sideKey = (side) => state.pieces[side].map((piece) => piece.point || "-").sort().join(","); return `${state.phase}|${state.currentPlayer}|${sideKey("blue")}|${sideKey("coral")}`; }
function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side); if (!validation.valid) return { state, error: validation.reason };
  const next = clone(state); const legal = validation.action; const piece = next.pieces[side].find((candidate) => candidate.id === legal.pieceId); const from = piece.point; piece.point = legal.to;
  next.ply += 1; if (next.phase === "movement") next.movementPly += 1; next.lastAction = { ...legal, side, from }; next.history.push({ turn: next.turn, ...next.lastAction });
  const allPlaced = SIDES.every((team) => next.pieces[team].every((candidate) => candidate.point)); if (next.phase === "placement" && allPlaced) next.phase = "movement";
  next.currentPlayer = otherSide(side); next.turn += 1;
  if (next.phase === "movement") { const key = positionKey(next); next.repetitions[key] = Number(next.repetitions[key] || 0) + 1; }
  if (!getLegalActions(next, next.currentPlayer).length) { next.winner = side; next.winReason = "immobilization"; }
  else if (next.phase === "movement" && next.repetitions[positionKey(next)] >= TWO_STONES_RULESET.drawRepetition) { next.isDraw = true; next.winReason = "threefold-repetition"; }
  else if (next.movementPly >= TWO_STONES_RULESET.movementPlyLimit) { next.isDraw = true; next.winReason = "movement-ply-limit"; }
  assertStateInvariant(next); return { state: next, error: null };
}
function getPlayerSummary(state, side) { return { placed: state.pieces[side].filter((piece) => piece.point).length, mobility: state.currentPlayer === side && !state.winner && !state.isDraw ? getLegalActions(state, side).length : 0, winner: state.winner === side, draw: Boolean(state.isDraw) }; }
function actionSummary(action) { if (!action) return ""; return action.type === "place" ? `${action.side} placed on ${action.to}.` : `${action.side} slid ${action.from} to ${action.to}.`; }
function assertStateInvariant(state) {
  const pieces = SIDES.flatMap((side) => state.pieces[side] || []); if (pieces.length !== 4) throw new Error("Two Stones must always contain four stones.");
  const occupied = pieces.map((piece) => piece.point).filter(Boolean); if (new Set(occupied).size !== occupied.length) throw new Error("Two Stones occupancy invariant failed.");
  if (occupied.some((point) => !POINTS.includes(point))) throw new Error("A stone occupies an unknown point.");
  if (state.phase === "movement" && occupied.length !== 4) throw new Error("Movement cannot begin before all stones are placed."); return true;
}

function compactKey(state) { return `${state.phase}|${state.currentPlayer}|${state.blue.join(",")}|${state.coral.join(",")}`; }
function compactState(blue, coral, currentPlayer, phase) { return { blue: [...blue].sort(), coral: [...coral].sort(), currentPlayer, phase }; }
function compactSuccessors(state) {
  const occupied = new Set([...state.blue, ...state.coral]); const side = state.currentPlayer === "blue" ? state.blue : state.coral; const nextPlayer = otherSide(state.currentPlayer); const results = [];
  if (state.phase === "placement") {
    if (side.length >= 2) return results;
    for (const point of POINTS) if (!occupied.has(point)) { const blue = state.currentPlayer === "blue" ? [...state.blue, point] : state.blue; const coral = state.currentPlayer === "coral" ? [...state.coral, point] : state.coral; results.push(compactState(blue, coral, nextPlayer, blue.length === 2 && coral.length === 2 ? "movement" : "placement")); }
    return results;
  }
  for (const from of side) for (const to of ADJACENCY[from] || []) if (!occupied.has(to)) { const moved = side.map((point) => point === from ? to : point); results.push(compactState(state.currentPlayer === "blue" ? moved : state.blue, state.currentPlayer === "coral" ? moved : state.coral, nextPlayer, "movement")); }
  return results;
}
function solveGameGraph() {
  const start = compactState([], [], "blue", "placement"); const states = new Map([[compactKey(start), start]]); const queue = [start];
  for (let i = 0; i < queue.length; i += 1) for (const next of compactSuccessors(queue[i])) { const key = compactKey(next); if (!states.has(key)) { states.set(key, next); queue.push(next); } }
  const successors = new Map(); const predecessors = new Map();
  for (const [key, state] of states) { const nextKeys = compactSuccessors(state).map(compactKey); successors.set(key, nextKeys); for (const nextKey of nextKeys) predecessors.set(nextKey, [...(predecessors.get(nextKey) || []), key]); }
  const outcomes = new Map(); const remaining = new Map([...successors].map(([key, list]) => [key, list.length])); const work = [];
  for (const [key, state] of states) if (state.phase === "movement" && !(successors.get(key) || []).length) { outcomes.set(key, "loss"); work.push(key); }
  while (work.length) { const key = work.shift(); for (const previous of predecessors.get(key) || []) { if (outcomes.has(previous)) continue; if (outcomes.get(key) === "loss") { outcomes.set(previous, "win"); work.push(previous); } else { remaining.set(previous, remaining.get(previous) - 1); if (remaining.get(previous) === 0) { outcomes.set(previous, "loss"); work.push(previous); } } } }
  for (const key of states.keys()) if (!outcomes.has(key)) outcomes.set(key, "draw");
  const counts = { win: 0, loss: 0, draw: 0 }; for (const outcome of outcomes.values()) counts[outcome] += 1;
  return { outcomes, reachableStates: outcomes.size, ...counts, opening: outcomes.get(compactKey(start)) };
}

module.exports = { TWO_STONES_RULESET, SIDES, POINTS, EDGES, ADJACENCY, createTwoStonesState, createLockDrill, otherSide, occupantAt, getLegalActions, validateAction, applyAction, positionKey, getPlayerSummary, actionSummary, assertStateInvariant, solveGameGraph };
