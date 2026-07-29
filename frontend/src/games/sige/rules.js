export const SIGE_RULESET = Object.freeze({
  gameId: "sige",
  rulesetVersion: "sige-parker-1909-1.0.0",
  traditionalName: "Siga / Sige",
  source: "H. Parker, Ancient Ceylon (1909), pp. 607–608",
  players: 2,
  piecesPerPlayer: 2,
  cowries: 4,
  safeSpaces: ["c02", "c24", "c42", "c20", "c22"],
  bonusValues: [1, 8]
});

export const SIDES = Object.freeze(["aurora", "ember"]);
export const BOARD_SIZE = 5;
export const cellId = (row, col) => `c${row}${col}`;
export const CELLS = Object.freeze(Array.from({ length: 25 }, (_, index) => ({ id: cellId(Math.floor(index / 5), index % 5), row: Math.floor(index / 5), col: index % 5 })));
export const SAFE_SPACES = Object.freeze(new Set(SIGE_RULESET.safeSpaces));
const AURORA_ROUTE = Object.freeze([
  "c02", "c01", "c00", "c10", "c20", "c30", "c40", "c41", "c42", "c43", "c44", "c34", "c24", "c14", "c04", "c03",
  "c13", "c23", "c33", "c32", "c31", "c21", "c11", "c12", "c22"
]);
const rotate180 = (id) => cellId(4 - Number(id[1]), 4 - Number(id[2]));
export const ROUTES = Object.freeze({ aurora: AURORA_ROUTE, ember: Object.freeze(AURORA_ROUTE.map(rotate180)) });
export const FINISH_PROGRESS = 24;

function createPieces(side) {
  return Array.from({ length: 2 }, (_, index) => ({ id: `${side}-${index + 1}`, side, status: "home", progress: -1 }));
}

export function createSigeState({ mode = "practice-aurora", starter = "aurora", seed = Date.now() } = {}) {
  const state = {
    gameId: SIGE_RULESET.gameId,
    rulesetVersion: SIGE_RULESET.rulesetVersion,
    mode,
    currentPlayer: starter === "ember" ? "ember" : "aurora",
    awaiting: "roll",
    roll: null,
    lastRoll: null,
    lastAction: null,
    pieces: { aurora: createPieces("aurora"), ember: createPieces("ember") },
    captures: { aurora: 0, ember: 0 },
    turn: 1,
    castCount: 0,
    rngState: Number(seed) >>> 0,
    winner: null,
    winReason: null,
    history: []
  };
  assertStateInvariant(state);
  return state;
}

export function createSplitFinishDrill() {
  const state = createSigeState({ mode: "drill", starter: "aurora", seed: 8 });
  state.pieces.aurora[0] = { id: "aurora-1", side: "aurora", status: "track", progress: 23 };
  state.pieces.aurora[1] = { id: "aurora-2", side: "aurora", status: "track", progress: 17 };
  state.pieces.ember[0] = { id: "ember-1", side: "ember", status: "track", progress: 6 };
  state.lastRoll = { faces: [0, 0, 0, 0], mouthsUp: 0, value: 8, bonus: true, proofHash: null, nonce: null };
  state.roll = { ...state.lastRoll };
  state.awaiting = "move";
  state.castCount = 1;
  assertStateInvariant(state);
  return state;
}

export const otherSide = (side) => side === "aurora" ? "ember" : "aurora";
export const routeFor = (side) => ROUTES[side] || ROUTES.aurora;
const clone = (value) => JSON.parse(JSON.stringify(value));
export function getPiece(state, side, pieceId) { return (state.pieces[side] || []).find((piece) => piece.id === pieceId) || null; }
export function getPieceSpaceId(piece) { return piece?.status === "track" ? routeFor(piece.side)[piece.progress] || null : null; }
export function getOccupants(state, spaceId, ignoreIds = []) {
  const ignored = new Set(ignoreIds);
  return SIDES.flatMap((side) => state.pieces[side] || []).filter((piece) => !ignored.has(piece.id) && piece.status === "track" && getPieceSpaceId(piece) === spaceId);
}
export function scoreCowries(faces) {
  const mouthsUp = faces.reduce((sum, face) => sum + Number(Boolean(face)), 0);
  const value = mouthsUp === 0 ? 8 : mouthsUp;
  return { mouthsUp, value, bonus: value === 1 || value === 8 };
}

function landingFor(state, side, pieceId, targetSpace) {
  const occupants = getOccupants(state, targetSpace, [pieceId]);
  const friendly = occupants.filter((piece) => piece.side === side);
  const enemies = occupants.filter((piece) => piece.side !== side);
  if (SAFE_SPACES.has(targetSpace)) {
    if (friendly.length >= 2) return { legal: false, reason: "safe-full" };
    return { legal: true, capturedPieceIds: [] };
  }
  if (friendly.length) return { legal: false, reason: "friendly-block" };
  if (enemies.length > 1) return { legal: false, reason: "enemy-stack" };
  return { legal: true, capturedPieceIds: enemies.map((piece) => piece.id) };
}

export function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.winner || side !== state.currentPlayer || state.awaiting !== "move" || !state.roll) return [];
  const value = state.roll.value;
  const actions = [];
  if (value === 1) {
    const start = routeFor(side)[0];
    for (const piece of state.pieces[side]) {
      if (piece.status !== "home") continue;
      const landing = landingFor(state, side, piece.id, start);
      if (landing.legal) actions.push({ type: "enter", pieceId: piece.id, value: 1, targetProgress: 0, targetSpace: start, capturedPieceIds: [] });
    }
  }
  for (const piece of state.pieces[side]) {
    if (piece.status !== "track") continue;
    const targetProgress = piece.progress + value;
    if (targetProgress > FINISH_PROGRESS) continue;
    const targetSpace = routeFor(side)[targetProgress];
    if (targetProgress === FINISH_PROGRESS) {
      actions.push({ type: "move", pieceId: piece.id, value, targetProgress, targetSpace, finishes: true, capturedPieceIds: [] });
      continue;
    }
    const landing = landingFor(state, side, piece.id, targetSpace);
    if (!landing.legal) continue;
    actions.push({ type: "move", pieceId: piece.id, value, targetProgress, targetSpace, finishes: false, capturedPieceIds: landing.capturedPieceIds });
  }
  const active = state.pieces[side].filter((piece) => piece.status === "track");
  if (active.length === 2) {
    const needs = active.map((piece) => FINISH_PROGRESS - piece.progress);
    if (needs.every((steps) => steps > 0) && needs[0] + needs[1] === value) {
      actions.push({ type: "split-finish", value, pieceIds: active.map((piece) => piece.id), allocations: active.map((piece, index) => ({ pieceId: piece.id, steps: needs[index] })) });
    }
  }
  if (!actions.length) actions.push({ type: "pass", value });
  return actions;
}

export function validateRoll(state, faces, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Sige race has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this side's turn." };
  if (state.awaiting !== "roll") return { valid: false, reason: "Resolve the current cowrie throw first." };
  if (!Array.isArray(faces) || faces.length !== 4 || faces.some((face) => ![0, 1, false, true].includes(face))) return { valid: false, reason: "Sige uses four open-or-closed cowries." };
  return { valid: true };
}

export function applyRoll(state, faces, side = state.currentPlayer, meta = {}) {
  const validation = validateRoll(state, faces, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = clone(state);
  const normalized = faces.map((face) => Number(Boolean(face)));
  const scored = scoreCowries(normalized);
  next.roll = { faces: normalized, ...scored, proofHash: meta.proofHash || null, nonce: meta.nonce || null };
  next.lastRoll = { ...next.roll, side };
  next.awaiting = "move";
  next.castCount += 1;
  next.history.push({ type: "roll", side, turn: next.turn, roll: clone(next.roll) });
  assertStateInvariant(next);
  return { state: next, error: null };
}

function actionKey(action) {
  if (!action) return "";
  if (action.type === "split-finish") return `split:${[...(action.pieceIds || [])].sort().join("+")}:${action.value}`;
  return `${action.type}:${action.pieceId || ""}:${action.targetProgress ?? ""}:${action.value ?? ""}`;
}

export function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Sige race has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this side's turn." };
  if (state.awaiting !== "move" || !state.roll) return { valid: false, reason: "Cast the cowries first." };
  const legal = getLegalActions(state, side).find((candidate) => actionKey(candidate) === actionKey(action));
  return legal ? { valid: true, action: legal } : { valid: false, reason: "That counter cannot use this whole throw." };
}

export function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = clone(state);
  const legal = validation.action;
  let captureCount = 0;
  if (legal.type === "enter") {
    const piece = getPiece(next, side, legal.pieceId);
    piece.status = "track";
    piece.progress = 0;
  } else if (legal.type === "move") {
    const piece = getPiece(next, side, legal.pieceId);
    for (const capturedId of legal.capturedPieceIds || []) {
      const captured = getPiece(next, otherSide(side), capturedId);
      if (captured) { captured.status = "home"; captured.progress = -1; captureCount += 1; }
    }
    piece.progress = legal.targetProgress;
    if (legal.finishes) piece.status = "finished";
  } else if (legal.type === "split-finish") {
    for (const pieceId of legal.pieceIds) {
      const piece = getPiece(next, side, pieceId);
      piece.status = "finished";
      piece.progress = FINISH_PROGRESS;
    }
  }
  if (captureCount) next.captures[side] += captureCount;
  next.lastAction = { ...clone(legal), side, captureCount };
  next.history.push({ type: "action", side, turn: next.turn, action: clone(next.lastAction) });
  const bonus = Boolean(next.roll?.bonus || captureCount);
  next.roll = null;
  if (next.pieces[side].every((piece) => piece.status === "finished")) {
    next.winner = side;
    next.winReason = legal.type === "split-finish" ? "split-centre-finish" : "both-finished";
    next.awaiting = "finished";
  } else {
    next.awaiting = "roll";
    next.turn += 1;
    if (!bonus) next.currentPlayer = otherSide(side);
  }
  assertStateInvariant(next);
  return { state: next, error: null };
}

export function rollLocalCowries(state, side = state.currentPlayer) {
  let seed = Number(state.rngState || 1) >>> 0;
  const faces = [];
  for (let index = 0; index < 4; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    faces.push((seed >>> 31) & 1);
  }
  const result = applyRoll(state, faces, side);
  if (!result.error) result.state.rngState = seed;
  return result;
}

export function getPlayerSummary(state, side) {
  const pieces = state.pieces[side] || [];
  return {
    home: pieces.filter((piece) => piece.status === "home").length,
    track: pieces.filter((piece) => piece.status === "track").length,
    finished: pieces.filter((piece) => piece.status === "finished").length,
    captures: state.captures[side] || 0,
    totalProgress: pieces.reduce((sum, piece) => sum + Math.max(0, piece.progress), 0)
  };
}
export function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  const side = state.currentPlayer === "ember" ? "Ember Route" : "Aurora Route";
  return state.awaiting === "roll" ? `${side}: cast four cowries.` : `${side}: move one counter the full ${state.roll?.value || 0}.`;
}
export function resultTitle(state) { return state.winner === "ember" ? "Ember Route reaches the centre" : state.winner === "aurora" ? "Aurora Route reaches the centre" : "Sige race in progress"; }
export function resultDetail(state) { return state.winReason === "split-centre-finish" ? "One exact cowrie throw was divided only at the centre to finish both counters." : "Both counters reached the protected centre by exact movement."; }
export function actionSummary(action) {
  if (!action) return "";
  if (action.type === "pass") return `${sideName(action.side)} had no legal use for ${action.value}.`;
  if (action.type === "split-finish") return `${sideName(action.side)} divided ${action.value} at the centre and finished both counters.`;
  if (action.type === "enter") return `${sideName(action.side)} entered ${action.pieceId} with 1.`;
  if (action.captureCount) return `${sideName(action.side)} chopped ${action.captureCount} rival counter and earned another cast.`;
  if (action.finishes) return `${sideName(action.side)} finished ${action.pieceId} exactly in the centre.`;
  return `${sideName(action.side)} moved ${action.pieceId} ${action.value} rooms.`;
}
export function sideName(side) { return side === "ember" ? "Ember Route" : "Aurora Route"; }

export function assertStateInvariant(state) {
  const pieces = SIDES.flatMap((side) => state.pieces[side] || []);
  if (pieces.length !== 4) throw new Error("Sige piece-count invariant failed.");
  for (const piece of pieces) {
    if (piece.status === "home" && piece.progress !== -1) throw new Error("Home counter has invalid progress.");
    if (piece.status === "finished" && piece.progress !== FINISH_PROGRESS) throw new Error("Finished counter has invalid progress.");
    if (piece.status === "track" && (!Number.isInteger(piece.progress) || piece.progress < 0 || piece.progress >= FINISH_PROGRESS)) throw new Error("Track counter has invalid progress.");
  }
  const unprotected = new Map();
  for (const piece of pieces.filter((candidate) => candidate.status === "track")) {
    const space = getPieceSpaceId(piece);
    if (!SAFE_SPACES.has(space)) {
      if (unprotected.has(space)) throw new Error(`Unprotected room ${space} contains multiple counters.`);
      unprotected.set(space, piece.id);
    }
  }
  return true;
}
