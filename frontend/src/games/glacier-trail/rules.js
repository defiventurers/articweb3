export const GLACIER_TRAIL_RULESET = Object.freeze({
  gameId: "glacier-trail",
  rulesetVersion: "pancha-keliya-parker-1909-1.0.0",
  traditionalName: "Pancha Keliya",
  region: "Sri Lanka",
  sides: 2,
  piecesPerSide: 3,
  cowries: 6,
  entryValues: [1, 5, 6],
  bonusValues: [1, 5, 6],
  throwAllocation: "stored-sequence-whole-throws",
  stackingPolicy: "single-occupancy-digital-policy"
});

export const SIDES = Object.freeze(["aurora", "ember"]);

function space(id, x, y, label, kind = "room") {
  return { id, x, y, label, kind };
}

const BASE = Object.freeze(Array.from({ length: 9 }, (_, index) => space(`B${index}`, 10 + index * 10, 91, `Base ${index + 1}`, index === 4 ? "house" : "base")));
const TRAIL = Object.freeze([
  ...Array.from({ length: 5 }, (_, index) => space(`T${index + 1}`, 50, 84 - index * 5, `Trail ${index + 1}`, index === 4 ? "house" : "room")),
  ...Array.from({ length: 5 }, (_, index) => space(`T${index + 6}`, 57 + index * 6.2, 64, `Trail ${index + 6}`, index === 4 ? "house" : "room")),
  ...Array.from({ length: 5 }, (_, index) => space(`T${index + 11}`, 81.8, 58 - index * 6, `Trail ${index + 11}`, index === 4 ? "house" : "room")),
  ...Array.from({ length: 5 }, (_, index) => space(`T${index + 16}`, 69.5 - index * 12.8, 34, `Trail ${index + 16}`, index === 4 ? "house" : "room")),
  ...Array.from({ length: 5 }, (_, index) => space(`T${index + 21}`, 18.3, 28 - index * 5.2, index === 4 ? "Kenda-ge" : `Trail ${index + 21}`, index === 4 ? "terminal" : "room"))
]);

export const SPACES = Object.freeze([...BASE, ...TRAIL]);
export const SPACE_BY_ID = Object.freeze(Object.fromEntries(SPACES.map((item) => [item.id, item])));
export const SAFE_SPACES = Object.freeze(new Set(["B4", "T5", "T10", "T15", "T20"]));
const SHARED_TRAIL = Object.freeze(TRAIL.map((item) => item.id));
export const ROUTES = Object.freeze({
  aurora: Object.freeze(["B0", "B1", "B2", "B3", "B4", ...SHARED_TRAIL]),
  ember: Object.freeze(["B8", "B7", "B6", "B5", "B4", ...SHARED_TRAIL])
});
export const FINISH_PROGRESS = ROUTES.aurora.length;
export const TRACK_LINES = Object.freeze([
  ["B0", "B8"], ["B4", "T5"], ["T5", "T10"], ["T10", "T15"], ["T15", "T20"], ["T20", "T25"]
]);

function createPieces(side) {
  return Array.from({ length: GLACIER_TRAIL_RULESET.piecesPerSide }, (_, index) => ({ id: `${side}-${index + 1}`, side, status: "home", progress: -1 }));
}

export function createGlacierTrailState({ mode = "hotseat", starter = "aurora", seed = Date.now() } = {}) {
  return {
    gameId: GLACIER_TRAIL_RULESET.gameId,
    rulesetVersion: GLACIER_TRAIL_RULESET.rulesetVersion,
    mode,
    currentPlayer: starter === "ember" ? "ember" : "aurora",
    awaiting: "roll",
    throwPool: [],
    rollSequence: [],
    lastRollSequence: [],
    lastMove: null,
    pieces: { aurora: createPieces("aurora"), ember: createPieces("ember") },
    captures: { aurora: 0, ember: 0 },
    turn: 1,
    castCount: 0,
    rngState: Number(seed) >>> 0,
    winner: null,
    winReason: null,
    history: []
  };
}

export function createExactLandingDrill() {
  const state = createGlacierTrailState({ mode: "drill", starter: "aurora", seed: 7 });
  state.pieces.aurora[0] = { ...state.pieces.aurora[0], status: "track", progress: FINISH_PROGRESS - 2 };
  state.pieces.aurora[1] = { ...state.pieces.aurora[1], status: "finished", progress: FINISH_PROGRESS };
  state.pieces.aurora[2] = { ...state.pieces.aurora[2], status: "finished", progress: FINISH_PROGRESS };
  state.throwPool = [{ id: "drill-2", value: 2, faces: [1, 1, 0, 0, 0, 0], bonus: false }];
  state.rollSequence = cloneState(state.throwPool);
  state.lastRollSequence = cloneState(state.throwPool);
  state.awaiting = "allocate";
  return state;
}

export function otherSide(side) { return side === "aurora" ? "ember" : "aurora"; }
export function routeFor(side) { return ROUTES[side] || ROUTES.aurora; }
export function getPiece(state, side, pieceId) { return (state.pieces[side] || []).find((piece) => piece.id === pieceId) || null; }
export function getPieceSpaceId(piece) { return piece?.status === "track" ? routeFor(piece.side)[piece.progress] || null : null; }

export function getOccupantAtSpace(state, spaceId, ignorePieceId = null) {
  for (const side of SIDES) {
    for (const piece of state.pieces[side] || []) {
      if (piece.id !== ignorePieceId && piece.status === "track" && getPieceSpaceId(piece) === spaceId) return piece;
    }
  }
  return null;
}

function canLand(state, side, spaceId, movingPieceId = null) {
  const occupant = getOccupantAtSpace(state, spaceId, movingPieceId);
  if (!occupant) return true;
  if (occupant.side === side) return false;
  return !SAFE_SPACES.has(spaceId);
}

export function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.winner || side !== state.currentPlayer || state.awaiting !== "allocate" || !state.throwPool.length) return [];
  const actions = [];
  const route = routeFor(side);
  state.throwPool.forEach((item, index) => {
    const value = Number(item.value || 0);
    if (GLACIER_TRAIL_RULESET.entryValues.includes(value) && canLand(state, side, route[0])) {
      state.pieces[side].filter((piece) => piece.status === "home").forEach((piece) => actions.push({ type: "enter", pieceId: piece.id, throwIndexes: [index], value, targetProgress: 0, targetSpace: route[0] }));
    }
    state.pieces[side].filter((piece) => piece.status === "track").forEach((piece) => {
      const action = movementAction(state, piece, [index], value);
      if (action) actions.push(action);
    });
  });
  if (state.throwPool.length > 1) {
    const value = state.throwPool.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const throwIndexes = state.throwPool.map((_, index) => index);
    state.pieces[side].filter((piece) => piece.status === "track").forEach((piece) => {
      const action = movementAction(state, piece, throwIndexes, value, true);
      if (action) actions.push(action);
    });
  }
  return dedupeActions(actions);
}

function movementAction(state, piece, throwIndexes, value, combined = false) {
  const targetProgress = piece.progress + value;
  if (targetProgress > FINISH_PROGRESS) return null;
  if (targetProgress === FINISH_PROGRESS) return { type: "move", pieceId: piece.id, throwIndexes, value, combined, targetProgress, targetSpace: null, finishes: true };
  const targetSpace = routeFor(piece.side)[targetProgress];
  if (!targetSpace || !canLand(state, piece.side, targetSpace, piece.id)) return null;
  const occupant = getOccupantAtSpace(state, targetSpace, piece.id);
  return { type: "move", pieceId: piece.id, throwIndexes, value, combined, targetProgress, targetSpace, captures: occupant && occupant.side !== piece.side && !SAFE_SPACES.has(targetSpace) ? occupant.id : null };
}

export function applyAction(state, action, side = state.currentPlayer) {
  const legal = getLegalActions(state, side).find((candidate) => actionKey(candidate) === actionKey(action));
  if (!legal) return { state, error: explainIllegalAction(state, action, side) };
  const next = cloneState(state);
  const piece = getPiece(next, side, legal.pieceId);
  const fromSpace = getPieceSpaceId(piece);
  let capturedPiece = null;
  if (legal.targetSpace) {
    capturedPiece = getOccupantAtSpace(next, legal.targetSpace, piece.id);
    if (capturedPiece && capturedPiece.side !== side && !SAFE_SPACES.has(legal.targetSpace)) {
      capturedPiece.status = "home";
      capturedPiece.progress = -1;
      next.captures[side] += 1;
    }
  }
  if (legal.type === "enter") { piece.status = "track"; piece.progress = 0; }
  else if (legal.finishes) { piece.status = "finished"; piece.progress = FINISH_PROGRESS; }
  else { piece.status = "track"; piece.progress = legal.targetProgress; }
  const used = new Set(legal.throwIndexes);
  next.throwPool = next.throwPool.filter((_, index) => !used.has(index));
  next.lastMove = { type: legal.type, side, pieceId: piece.id, value: legal.value, combined: Boolean(legal.combined), fromSpace, targetSpace: legal.targetSpace, capturedPieceId: capturedPiece?.id || null, finished: piece.status === "finished" };
  next.history.push({ type: "allocation", turn: next.turn, side, move: cloneState(next.lastMove) });
  if (next.pieces[side].every((candidate) => candidate.status === "finished")) {
    next.winner = side; next.winReason = "all-three-landed"; next.awaiting = "finished"; next.throwPool = []; next.rollSequence = [];
  } else if (!next.throwPool.length || !getLegalActions(next, side).length) finishTurn(next, next.throwPool.length ? "unused-throws-no-legal-allocation" : null);
  return { state: next, error: null };
}

export function applyRollSequence(state, sequence, side = state.currentPlayer) {
  if (!state || state.winner || side !== state.currentPlayer || state.awaiting !== "roll") return { state, error: "The caravan cannot cast now." };
  const next = cloneState(state);
  next.rollSequence = sequence.map((roll, index) => ({ ...cloneState(roll), id: roll.id || `${next.turn}-${next.castCount + index + 1}` }));
  next.lastRollSequence = cloneState(next.rollSequence);
  next.throwPool = cloneState(next.rollSequence);
  next.castCount += sequence.length;
  next.awaiting = "allocate";
  next.history.push({ type: "roll-sequence", turn: next.turn, side, rolls: cloneState(next.rollSequence) });
  if (!getLegalActions(next, side).length) finishTurn(next, "no-legal-allocation");
  return { state: next, error: null };
}

function finishTurn(state, passReason = null) {
  if (passReason) state.history.push({ type: "pass", turn: state.turn, side: state.currentPlayer, reason: passReason, unusedThrows: cloneState(state.throwPool) });
  state.throwPool = [];
  state.rollSequence = [];
  state.awaiting = "roll";
  state.currentPlayer = otherSide(state.currentPlayer);
  state.turn += 1;
}

export function rollLocalSequence(state, side = state.currentPlayer) {
  let seed = Number(state.rngState || 1) >>> 0;
  const sequence = [];
  do {
    const faces = [];
    for (let index = 0; index < GLACIER_TRAIL_RULESET.cowries; index += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      faces.push((seed >>> 31) & 1);
    }
    const value = faces.reduce((sum, face) => sum + face, 0);
    sequence.push({ faces, value, bonus: GLACIER_TRAIL_RULESET.bonusValues.includes(value) });
  } while (sequence[sequence.length - 1].bonus);
  const result = applyRollSequence(state, sequence, side);
  if (!result.error) result.state.rngState = seed;
  return result;
}

export function getPlayerSummary(state, side) {
  const pieces = state.pieces[side] || [];
  return { home: pieces.filter((piece) => piece.status === "home").length, track: pieces.filter((piece) => piece.status === "track").length, finished: pieces.filter((piece) => piece.status === "finished").length, captures: Number(state.captures[side] || 0), totalProgress: pieces.reduce((sum, piece) => sum + Math.max(0, Number(piece.progress || 0)), 0) };
}

export function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  const label = state.currentPlayer === "aurora" ? "Aurora Caravan" : "Ember Caravan";
  return state.awaiting === "roll" ? `${label}: cast six cowries.` : `${label}: allocate ${state.throwPool.map((item) => item.value).join(" + ")}.`;
}

export function resultTitle(state) {
  if (!state.winner) return "Race in progress";
  return state.winner === "aurora" ? "Aurora Caravan reaches land" : "Ember Caravan reaches land";
}
export function resultDetail(state) { return state.winReason === "all-three-landed" ? "All three counters passed beyond Kenda-ge with exact throws." : "The Glacier Trail race is complete."; }
export function actionKey(action) { return action ? `${action.type}:${action.pieceId}:${(action.throwIndexes || []).join(",")}:${Number(action.value || 0)}` : ""; }
export function actionSummary(action) {
  if (!action) return "";
  const label = action.side === "aurora" ? "Aurora" : "Ember";
  if (action.type === "enter") return `${label} admitted ${pieceLabel(action.pieceId)} with a whole throw of ${action.value}.`;
  const parts = [`${label} moved ${pieceLabel(action.pieceId)} by ${action.value}`];
  if (action.combined) parts.push("using the total stored sequence");
  if (action.capturedPieceId) parts.push("cut an opposing counter");
  if (action.finished) parts.push("landed beyond Kenda-ge");
  return `${parts.join(" · ")}.`;
}
export function pieceLabel(pieceId) { return `Counter ${String(pieceId || "").split("-")[1] || ""}`; }

function explainIllegalAction(state, action, side) {
  const piece = getPiece(state, side, action?.pieceId);
  if (!piece) return "Choose one of the active caravan's counters.";
  if (piece.status === "finished") return "That counter has already landed beyond Kenda-ge.";
  if (piece.status === "home") return "A waiting counter may enter only by assigning a whole throw of 1, 5, or 6.";
  return "That whole throw cannot be allocated to this occupied, protected, or overshooting destination.";
}
function dedupeActions(actions) { const map = new Map(); actions.forEach((action) => map.set(actionKey(action), action)); return [...map.values()]; }
function cloneState(value) { return JSON.parse(JSON.stringify(value)); }
