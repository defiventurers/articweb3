const POLAR_TABLAN_RULESET = Object.freeze({
  gameId: "polar-tablan",
  rulesetVersion: "tablan-bell-open-finish-1.0.0",
  traditionalName: "Taabla / Tablan / Tabul Fale",
  source: "R. C. Bell, Board and Table Games from Many Civilizations",
  region: "Mysore region, southwest India",
  players: 2,
  rows: 4,
  columns: 12,
  piecesPerPlayer: 12,
  sticks: 4,
  scoring: Object.freeze({ 0: 12, 1: 2, 2: 0, 3: 0, 4: 8 }),
  scoringThrowsRepeat: true,
  firstMoveScore: 2,
  splitValues: Object.freeze({ 2: 1, 8: 4, 12: 6 }),
  orderedFinishOptional: false
});
const SIDES = Object.freeze(["aurora", "ember"]);
const ROWS = 4;
const COLS = 12;
const ROUTE_LENGTH = 48;
const cellId = (row, col) => `t${row}-${col}`;
function parseCell(id) { const [, row, col] = /^t(\d+)-(\d+)$/.exec(id) || []; return { row: Number(row), col: Number(col) }; }
function rowCells(row, direction) { return Array.from({ length: COLS }, (_, index) => cellId(row, direction === "right" ? index : COLS - 1 - index)); }
const ROUTES = Object.freeze({
  aurora: Object.freeze([...rowCells(3,"right"),...rowCells(2,"left"),...rowCells(1,"right"),...rowCells(0,"left")]),
  ember: Object.freeze([...rowCells(0,"left"),...rowCells(1,"right"),...rowCells(2,"left"),...rowCells(3,"right")])
});
const routeFor = (side) => ROUTES[side] || ROUTES.aurora;
const otherSide = (side) => side === "aurora" ? "ember" : "aurora";
const opponentHomeRow = (side) => side === "aurora" ? 0 : 3;
const ownHomeRow = (side) => side === "aurora" ? 3 : 0;
const clone = (value) => JSON.parse(JSON.stringify(value));
const sideName = (side) => side === "ember" ? "Ember Convoy" : "Aurora Convoy";

function createPieces(side) {
  return Array.from({ length: COLS }, (_, col) => ({ id: `${side}-${col + 1}`, side, progress: side === "aurora" ? col : COLS - 1 - col, started: false, status: "active" }));
}
function createPolarTablanState({ mode = "online", starter = "aurora", seed = Date.now() } = {}) {
  const state = { gameId: POLAR_TABLAN_RULESET.gameId, rulesetVersion: POLAR_TABLAN_RULESET.rulesetVersion, mode, currentPlayer: starter === "ember" ? "ember" : "aurora", awaiting: "roll", pendingRoll: null, bonusRolls: 0, lastRoll: null, lastAction: null, pieces: { aurora: createPieces("aurora"), ember: createPieces("ember") }, captures: { aurora: 0, ember: 0 }, turn: 1, castCount: 0, rngState: Number(seed) >>> 0, winner: null, isDraw: false, winReason: null, scores: null, history: [] };
  assertStateInvariant(state); return state;
}
function createFinishRowDrill() {
  const state = createPolarTablanState({ mode: "drill", starter: "aurora", seed: 8 });
  for (const piece of state.pieces.aurora) { piece.status = "captured"; piece.progress = null; piece.started = true; }
  for (const piece of state.pieces.ember) { piece.status = "captured"; piece.progress = null; piece.started = true; }
  Object.assign(state.pieces.aurora[0], { status: "active", progress: 28, started: true });
  Object.assign(state.pieces.ember[0], { status: "active", progress: 0, started: false });
  state.awaiting = "allocate";
  state.pendingRoll = { value: 8, plainUp: 4, faces: [1,1,1,1], splitValue: 4, throwNumber: 1 };
  state.lastRoll = { ...state.pendingRoll, side: "aurora" };
  state.bonusRolls = 1; state.castCount = 1;
  assertStateInvariant(state); return state;
}
function scoreSticks(faces) { const plainUp = faces.reduce((sum, face) => sum + Number(Boolean(face)), 0); return { plainUp, value: POLAR_TABLAN_RULESET.scoring[plainUp] ?? 0, scores: [0,1,4].includes(plainUp) }; }
function getPiece(state, side, pieceId) { return (state.pieces[side] || []).find((piece) => piece.id === pieceId) || null; }
function getPieceCell(piece) { return piece?.status === "active" || piece?.status === "locked" ? routeFor(piece.side)[piece.progress] || null : null; }
function occupantAt(state, id, ignored = []) { const ignore = new Set(Array.isArray(ignored) ? ignored : [ignored]); for (const side of SIDES) for (const piece of state.pieces[side]) if (!ignore.has(piece.id) && getPieceCell(piece) === id) return piece; return null; }
function canStart(piece, amount, rollValue, split) { return piece.started || (rollValue === 2 && amount === (split ? 1 : 2)); }
function simulateLeg(state, side, leg, rollValue, split) {
  const piece = getPiece(state, side, leg.pieceId);
  if (!piece || piece.status !== "active") return { error: "Choose an active runner." };
  if (!canStart(piece, leg.amount, rollValue, split)) return { error: "A runner's first move requires a score of 2." };
  const targetProgress = piece.progress + leg.amount;
  if (targetProgress >= ROUTE_LENGTH) return { error: "That runner would move beyond the finishing row." };
  const targetCell = routeFor(side)[targetProgress];
  const occupant = occupantAt(state, targetCell, [piece.id]);
  let capturedPieceId = null;
  if (occupant) {
    if (occupant.side === side) return { error: "Tablan never doubles two friendly runners on one square." };
    if (occupant.status === "locked") return { error: "A locked finishing-row runner cannot be displaced." };
    const row = parseCell(targetCell).row;
    if (!(row === 1 || row === 2 || row === opponentHomeRow(side))) return { error: "Enemy runners cannot be captured on your own home row." };
    occupant.status = "captured"; occupant.progress = null; capturedPieceId = occupant.id;
  }
  piece.progress = targetProgress; piece.started = true;
  if (parseCell(targetCell).row === opponentHomeRow(side)) piece.status = "locked";
  return { pieceId: piece.id, amount: leg.amount, targetProgress, targetCell, capturedPieceId, locked: piece.status === "locked" };
}
function candidateAction(state, side, legs, split) {
  const draft = clone(state); const resolved = [];
  for (const leg of legs) { const result = simulateLeg(draft, side, leg, state.pendingRoll.value, split); if (result.error) return null; resolved.push(result); }
  return { type: "move", split, value: state.pendingRoll.value, legs: resolved.map(({ pieceId, amount }) => ({ pieceId, amount })), resolved };
}
function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.winner || state.isDraw || side !== state.currentPlayer || state.awaiting !== "allocate" || !state.pendingRoll?.value) return [];
  const value = state.pendingRoll.value; const actions = [];
  for (const piece of state.pieces[side]) { const action = candidateAction(state, side, [{ pieceId: piece.id, amount: value }], false); if (action) actions.push(action); }
  const half = POLAR_TABLAN_RULESET.splitValues[value];
  if (half) {
    const active = state.pieces[side].filter((piece) => piece.status === "active");
    for (const first of active) for (const second of active) {
      if (first.id === second.id) continue;
      const action = candidateAction(state, side, [{ pieceId: first.id, amount: half }, { pieceId: second.id, amount: half }], true);
      if (action && !actions.some((existing) => actionKey(existing) === actionKey(action))) actions.push(action);
    }
  }
  if (!actions.length) actions.push({ type: "forfeit-roll", value });
  return actions;
}
function validateRoll(state, faces, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing Polar Tablan state." };
  if (state.winner || state.isDraw) return { valid: false, reason: "The polar race has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this convoy's turn." };
  if (state.awaiting !== "roll" || state.pendingRoll) return { valid: false, reason: "Use the current stick score first." };
  if (!Array.isArray(faces) || faces.length !== 4 || faces.some((face) => ![0,1,false,true].includes(face))) return { valid: false, reason: "Cast exactly four marked-or-plain sticks." };
  return { valid: true };
}
function applyRoll(state, faces, side = state.currentPlayer, meta = {}) {
  const validation = validateRoll(state, faces, side); if (!validation.valid) return { state, error: validation.reason };
  const next = clone(state); const normalized = faces.map((face) => Number(Boolean(face))); const scored = scoreSticks(normalized);
  const roll = { faces: normalized, ...scored, splitValue: POLAR_TABLAN_RULESET.splitValues[scored.value] || null, throwNumber: next.castCount + 1, nonce: meta.nonce || null, proofHash: meta.proofHash || null, side };
  next.lastRoll = roll; next.castCount += 1; next.history.push({ type: "roll", turn: next.turn, side, roll: clone(roll) });
  if (!scored.value) { next.pendingRoll = null; next.awaiting = "roll"; next.currentPlayer = otherSide(side); next.turn += 1; }
  else { next.pendingRoll = { value: scored.value, plainUp: scored.plainUp, faces: normalized, splitValue: roll.splitValue, throwNumber: roll.throwNumber }; next.awaiting = "allocate"; next.bonusRolls += 1; }
  assertStateInvariant(next); return { state: next, error: null };
}
function actionKey(action) { if (!action) return ""; if (action.type === "forfeit-roll") return `forfeit:${action.value}`; return `${action.type}:${action.split ? 1 : 0}:${(action.legs || []).map((leg) => `${leg.pieceId}@${leg.amount}`).join("|")}`; }
function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing Polar Tablan state." };
  if (state.winner || state.isDraw) return { valid: false, reason: "The polar race has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this convoy's turn." };
  const legal = getLegalActions(state, side).find((candidate) => actionKey(candidate) === actionKey(action));
  return legal ? { valid: true, action: legal } : { valid: false, reason: "That score allocation is not legal under Bell's movement obligations." };
}
function raceComplete(state, side) { const survivors = state.pieces[side].filter((piece) => piece.status !== "captured"); return survivors.every((piece) => piece.status === "locked"); }
function finalizeRace(state, finisher) { const scores = Object.fromEntries(SIDES.map((side) => [side, state.pieces[side].filter((piece) => piece.status === "locked").length])); state.scores = scores; state.winner = scores.aurora === scores.ember ? finisher : scores.aurora > scores.ember ? "aurora" : "ember"; state.winReason = scores.aurora === scores.ember ? "first-finisher-tiebreak" : "finish-row-majority"; state.awaiting = "finished"; state.pendingRoll = null; state.bonusRolls = 0; }
function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side); if (!validation.valid) return { state, error: validation.reason };
  const next = clone(state); const legal = validation.action;
  if (legal.type === "forfeit-roll") next.lastAction = { type: "forfeit-roll", side, value: legal.value };
  else { const resolved = []; for (const leg of legal.legs) { const result = simulateLeg(next, side, leg, next.pendingRoll.value, legal.split); if (result.error) return { state, error: result.error }; if (result.capturedPieceId) next.captures[side] += 1; resolved.push(result); } next.lastAction = { type: "move", side, split: legal.split, value: legal.value, legs: resolved }; }
  next.history.push({ type: "action", turn: next.turn, side, action: clone(next.lastAction) }); next.pendingRoll = null; next.awaiting = "roll";
  if (raceComplete(next, side)) finalizeRace(next, side); else if (next.bonusRolls > 0) next.bonusRolls -= 1; else { next.currentPlayer = otherSide(side); next.turn += 1; }
  assertStateInvariant(next); return { state: next, error: null };
}
function rollLocalSticks(state, side = state.currentPlayer) { let seed = Number(state.rngState || 1) >>> 0; const faces = []; for (let index = 0; index < 4; index += 1) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; faces.push((seed >>> 31) & 1); } const result = applyRoll(state, faces, side); if (!result.error) result.state.rngState = seed; return result; }
function getPlayerSummary(state, side) { const pieces = state.pieces[side] || []; return { active: pieces.filter((piece) => piece.status === "active").length, locked: pieces.filter((piece) => piece.status === "locked").length, captured: pieces.filter((piece) => piece.status === "captured").length, captures: state.captures[side], progress: pieces.reduce((sum, piece) => sum + (Number(piece.progress) || 0), 0) }; }
function describeTurn(state) { if (state.winner) return resultTitle(state); return state.awaiting === "roll" ? `${sideName(state.currentPlayer)}: cast four sticks.` : `${sideName(state.currentPlayer)}: use ${state.pendingRoll.value} in full or split it.`; }
function resultTitle(state) { return state.winner ? `${sideName(state.winner)} wins the finish row` : "Polar Tablan in progress"; }
function resultDetail(state) { return state.scores ? `Final locked score: Aurora ${state.scores.aurora}, Ember ${state.scores.ember}.` : "Race every surviving runner into the rival home row."; }
function actionSummary(action) { if (!action) return ""; if (action.type === "forfeit-roll") return `${sideName(action.side)} had no legal way to use ${action.value}.`; const captures = action.legs.filter((leg) => leg.capturedPieceId).length; const locks = action.legs.filter((leg) => leg.locked).length; return `${sideName(action.side)} used ${action.value}${action.split ? " as a split move" : ""}${captures ? `, captured ${captures}` : ""}${locks ? `, and locked ${locks} runner${locks === 1 ? "" : "s"} into the finish row` : ""}.`; }
function assertStateInvariant(state) {
  const all = SIDES.flatMap((side) => state.pieces[side] || []); if (all.length !== 24) throw new Error("Polar Tablan must keep twelve records per side."); const occupied = new Set();
  for (const piece of all) { if (!["active","locked","captured"].includes(piece.status)) throw new Error("Unknown Polar Tablan runner status."); if (piece.status === "captured") { if (piece.progress !== null) throw new Error("Captured runner cannot retain route progress."); continue; } if (!Number.isInteger(piece.progress) || piece.progress < 0 || piece.progress >= ROUTE_LENGTH) throw new Error("Runner has invalid route progress."); const id = getPieceCell(piece); if (occupied.has(id)) throw new Error(`Two runners occupy ${id}.`); occupied.add(id); if (piece.status === "locked" && parseCell(id).row !== opponentHomeRow(piece.side)) throw new Error("Locked runner is outside the rival home row."); }
  return true;
}
module.exports = { POLAR_TABLAN_RULESET, SIDES, ROWS, COLS, ROUTE_LENGTH, ROUTES, cellId, parseCell, routeFor, otherSide, opponentHomeRow, ownHomeRow, createPolarTablanState, createFinishRowDrill, scoreSticks, getPiece, getPieceCell, occupantAt, getLegalActions, validateRoll, applyRoll, validateAction, applyAction, rollLocalSticks, getPlayerSummary, describeTurn, resultTitle, resultDetail, actionSummary, assertStateInvariant };
