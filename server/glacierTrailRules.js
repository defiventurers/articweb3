const GLACIER_TRAIL_RULESET = Object.freeze({
  gameId: "glacier-trail",
  rulesetVersion: "pancha-keliya-parker-1909-1.0.0",
  traditionalName: "Pancha Keliya",
  region: "Sri Lanka",
  evidenceStatus: "Parker 1909 contemporary description",
  sides: 2,
  piecesPerSide: 3,
  cowries: 6,
  entryValues: [1, 5, 6],
  bonusValues: [1, 5, 6],
  throwAllocation: "stored-sequence-whole-throws",
  stackingPolicy: "single-occupancy-digital-policy"
});

const SIDES = Object.freeze(["aurora", "ember"]);

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

const SPACES = Object.freeze([...BASE, ...TRAIL]);
const SPACE_BY_ID = Object.freeze(Object.fromEntries(SPACES.map((item) => [item.id, item])));
const SAFE_SPACES = Object.freeze(new Set(["B4", "T5", "T10", "T15", "T20"]));
const SHARED_TRAIL = Object.freeze(TRAIL.map((item) => item.id));
const ROUTES = Object.freeze({
  aurora: Object.freeze(["B0", "B1", "B2", "B3", "B4", ...SHARED_TRAIL]),
  ember: Object.freeze(["B8", "B7", "B6", "B5", "B4", ...SHARED_TRAIL])
});
const FINISH_PROGRESS = ROUTES.aurora.length;
const TRACK_LINES = Object.freeze([
  ["B0", "B8"], ["B4", "T5"], ["T5", "T10"], ["T10", "T15"], ["T15", "T20"], ["T20", "T25"]
]);

function createPieces(side) {
  return Array.from({ length: GLACIER_TRAIL_RULESET.piecesPerSide }, (_, index) => ({
    id: `${side}-${index + 1}`,
    side,
    status: "home",
    progress: -1
  }));
}

function createGlacierTrailState({ mode = "online", starter = "aurora", seed = Date.now() } = {}) {
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

function createExactLandingDrill() {
  const state = createGlacierTrailState({ mode: "drill", starter: "aurora", seed: 7 });
  state.pieces.aurora[0] = { ...state.pieces.aurora[0], status: "track", progress: FINISH_PROGRESS - 2 };
  state.pieces.aurora[1].status = "finished";
  state.pieces.aurora[1].progress = FINISH_PROGRESS;
  state.pieces.aurora[2].status = "finished";
  state.pieces.aurora[2].progress = FINISH_PROGRESS;
  state.throwPool = [{ id: "drill-2", value: 2, faces: [1, 1, 0, 0, 0, 0], bonus: false }];
  state.rollSequence = cloneState(state.throwPool);
  state.lastRollSequence = cloneState(state.throwPool);
  state.awaiting = "allocate";
  return state;
}

function otherSide(side) {
  return side === "aurora" ? "ember" : "aurora";
}

function routeFor(side) {
  return ROUTES[side] || ROUTES.aurora;
}

function getPiece(state, side, pieceId) {
  return (state.pieces[side] || []).find((piece) => piece.id === pieceId) || null;
}

function getPieceSpaceId(piece) {
  if (!piece || piece.status !== "track") return null;
  return routeFor(piece.side)[piece.progress] || null;
}

function getOccupantAtSpace(state, spaceId, ignorePieceId = null) {
  for (const side of SIDES) {
    for (const piece of state.pieces[side] || []) {
      if (piece.id === ignorePieceId || piece.status !== "track") continue;
      if (getPieceSpaceId(piece) === spaceId) return piece;
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

function wholeThrowOptions(state) {
  return state.throwPool.map((item, index) => ({ item, index }));
}

function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.winner || side !== state.currentPlayer || state.awaiting !== "allocate" || !state.throwPool.length) return [];
  const actions = [];
  const route = routeFor(side);

  for (const { item, index } of wholeThrowOptions(state)) {
    const value = Number(item.value || 0);
    if (GLACIER_TRAIL_RULESET.entryValues.includes(value) && canLand(state, side, route[0])) {
      for (const piece of state.pieces[side]) {
        if (piece.status === "home") actions.push({ type: "enter", pieceId: piece.id, throwIndexes: [index], value, targetProgress: 0, targetSpace: route[0] });
      }
    }
    for (const piece of state.pieces[side]) {
      if (piece.status !== "track") continue;
      const action = movementAction(state, piece, [index], value);
      if (action) actions.push(action);
    }
  }

  if (state.throwPool.length > 1) {
    const value = state.throwPool.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const throwIndexes = state.throwPool.map((_, index) => index);
    for (const piece of state.pieces[side]) {
      if (piece.status !== "track") continue;
      const action = movementAction(state, piece, throwIndexes, value, true);
      if (action) actions.push(action);
    }
  }

  return dedupeActions(actions);
}

function movementAction(state, piece, throwIndexes, value, combined = false) {
  const targetProgress = piece.progress + value;
  if (targetProgress > FINISH_PROGRESS) return null;
  if (targetProgress === FINISH_PROGRESS) {
    return { type: "move", pieceId: piece.id, throwIndexes, value, combined, targetProgress, targetSpace: null, finishes: true };
  }
  const targetSpace = routeFor(piece.side)[targetProgress];
  if (!targetSpace || !canLand(state, piece.side, targetSpace, piece.id)) return null;
  const occupant = getOccupantAtSpace(state, targetSpace, piece.id);
  return {
    type: "move",
    pieceId: piece.id,
    throwIndexes,
    value,
    combined,
    targetProgress,
    targetSpace,
    captures: occupant && occupant.side !== piece.side && !SAFE_SPACES.has(targetSpace) ? occupant.id : null
  };
}

function validateRollSequence(state, sequence, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Glacier Trail race has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this caravan's turn." };
  if (state.awaiting !== "roll") return { valid: false, reason: "Allocate the stored cowrie throws first." };
  if (!Array.isArray(sequence) || !sequence.length) return { valid: false, reason: "A cowrie sequence is required." };
  for (let index = 0; index < sequence.length; index += 1) {
    const roll = sequence[index];
    if (!Array.isArray(roll.faces) || roll.faces.length !== GLACIER_TRAIL_RULESET.cowries || roll.faces.some((face) => ![0, 1, false, true].includes(face))) {
      return { valid: false, reason: "Each Pancha throw must contain six open-or-closed shells." };
    }
    const value = roll.faces.reduce((sum, face) => sum + Number(Boolean(face)), 0);
    if (Number(roll.value) !== value) return { valid: false, reason: "Cowrie value does not match the recorded faces." };
    const bonus = GLACIER_TRAIL_RULESET.bonusValues.includes(value);
    if (Boolean(roll.bonus) !== bonus) return { valid: false, reason: "Cowrie bonus flag is invalid." };
    if (index < sequence.length - 1 && !bonus) return { valid: false, reason: "Only 1, 5, or 6 may continue a throw sequence." };
    if (index === sequence.length - 1 && bonus) return { valid: false, reason: "A bonus sequence must continue until a non-bonus result." };
  }
  return { valid: true };
}

function applyRollSequence(state, sequence, side = state.currentPlayer, meta = {}) {
  const validation = validateRollSequence(state, sequence, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  next.rollSequence = sequence.map((roll, index) => ({ ...cloneState(roll), id: roll.id || `${next.turn}-${next.castCount + index + 1}`, proofHash: meta.proofHash || roll.proofHash || null, nonce: meta.nonce || roll.nonce || null }));
  next.lastRollSequence = cloneState(next.rollSequence);
  next.throwPool = cloneState(next.rollSequence);
  next.castCount += sequence.length;
  next.awaiting = "allocate";
  next.history.push({ type: "roll-sequence", turn: next.turn, side, rolls: cloneState(next.rollSequence) });
  if (!getLegalActions(next, side).length) finishTurn(next, "no-legal-allocation");
  assertStateInvariant(next);
  return { state: next, error: null };
}

function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Glacier Trail race has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this caravan's turn." };
  if (state.awaiting !== "allocate") return { valid: false, reason: "Cast the six cowries first." };
  const key = actionKey(action);
  const legal = getLegalActions(state, side).find((candidate) => actionKey(candidate) === key);
  return legal ? { valid: true, action: legal } : { valid: false, reason: explainIllegalAction(state, action, side) };
}

function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const legal = validation.action;
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

  if (legal.type === "enter") {
    piece.status = "track";
    piece.progress = 0;
  } else if (legal.finishes) {
    piece.status = "finished";
    piece.progress = FINISH_PROGRESS;
  } else {
    piece.status = "track";
    piece.progress = legal.targetProgress;
  }

  const used = new Set(legal.throwIndexes);
  next.throwPool = next.throwPool.filter((_, index) => !used.has(index));
  next.lastMove = {
    type: legal.type,
    side,
    pieceId: piece.id,
    value: legal.value,
    combined: Boolean(legal.combined),
    fromSpace,
    targetSpace: legal.targetSpace,
    capturedPieceId: capturedPiece?.id || null,
    finished: piece.status === "finished"
  };
  next.history.push({ type: "allocation", turn: next.turn, side, move: cloneState(next.lastMove) });

  if (next.pieces[side].every((candidate) => candidate.status === "finished")) {
    next.winner = side;
    next.winReason = "all-three-landed";
    next.awaiting = "finished";
    next.throwPool = [];
    next.rollSequence = [];
  } else if (!next.throwPool.length || !getLegalActions(next, side).length) {
    finishTurn(next, next.throwPool.length ? "unused-throws-no-legal-allocation" : null);
  }

  assertStateInvariant(next);
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

function rollLocalSequence(state, side = state.currentPlayer) {
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
  } while (sequence[sequence.length - 1].bonus && sequence.length < 24);
  const result = applyRollSequence(state, sequence, side);
  if (!result.error) result.state.rngState = seed;
  return result;
}

function getPlayerSummary(state, side) {
  const pieces = state.pieces[side] || [];
  return {
    home: pieces.filter((piece) => piece.status === "home").length,
    track: pieces.filter((piece) => piece.status === "track").length,
    finished: pieces.filter((piece) => piece.status === "finished").length,
    captures: Number(state.captures[side] || 0),
    totalProgress: pieces.reduce((sum, piece) => sum + Math.max(0, Number(piece.progress || 0)), 0)
  };
}

function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  const label = state.currentPlayer === "aurora" ? "Aurora Caravan" : "Ember Caravan";
  if (state.awaiting === "roll") return `${label}: cast six cowries.`;
  const values = state.throwPool.map((item) => item.value).join(" + ");
  return `${label}: allocate ${values}.`;
}

function resultTitle(state) {
  if (!state.winner) return "Race in progress";
  return state.winner === "aurora" ? "Aurora Caravan reaches land" : "Ember Caravan reaches land";
}

function resultDetail(state) {
  return state.winReason === "all-three-landed"
    ? "All three counters passed beyond Kenda-ge with exact throws."
    : "The Glacier Trail race is complete.";
}

function actionKey(action) {
  if (!action) return "";
  return `${action.type}:${action.pieceId}:${(action.throwIndexes || []).join(",")}:${Number(action.value || 0)}`;
}

function explainIllegalAction(state, action, side) {
  const piece = getPiece(state, side, action?.pieceId);
  if (!piece) return "Choose one of the active caravan's counters.";
  if (piece.status === "finished") return "That counter has already landed beyond Kenda-ge.";
  if (piece.status === "home") return "A waiting counter may enter only by assigning a whole throw of 1, 5, or 6.";
  const maxValue = state.throwPool.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (piece.progress + maxValue > FINISH_PROGRESS) return "Landing requires an exact throw; this allocation overshoots Kenda-ge.";
  return "That whole throw cannot be allocated to this occupied or protected destination.";
}

function assertStateInvariant(state) {
  const all = SIDES.flatMap((side) => state.pieces[side] || []);
  if (all.length !== GLACIER_TRAIL_RULESET.piecesPerSide * SIDES.length) throw new Error("Glacier Trail piece-count invariant failed.");
  const occupied = new Set();
  for (const piece of all) {
    if (piece.status === "home" && piece.progress !== -1) throw new Error("Home counter has invalid progress.");
    if (piece.status === "finished" && piece.progress !== FINISH_PROGRESS) throw new Error("Finished counter has invalid progress.");
    if (piece.status === "track") {
      if (!Number.isInteger(piece.progress) || piece.progress < 0 || piece.progress >= FINISH_PROGRESS) throw new Error("Track counter has invalid progress.");
      const spaceId = getPieceSpaceId(piece);
      if (!spaceId || !SPACE_BY_ID[spaceId]) throw new Error("Counter occupies an unknown trail space.");
      if (occupied.has(spaceId)) throw new Error(`Single-occupancy invariant failed at ${spaceId}.`);
      occupied.add(spaceId);
    }
  }
  if (state.awaiting === "allocate" && !state.throwPool.length) throw new Error("Allocation state requires stored throws.");
  return true;
}

function dedupeActions(actions) {
  const map = new Map();
  actions.forEach((action) => map.set(actionKey(action), action));
  return [...map.values()];
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  GLACIER_TRAIL_RULESET,
  SIDES,
  SPACES,
  SPACE_BY_ID,
  SAFE_SPACES,
  ROUTES,
  TRACK_LINES,
  FINISH_PROGRESS,
  createGlacierTrailState,
  createExactLandingDrill,
  otherSide,
  routeFor,
  getPiece,
  getPieceSpaceId,
  getOccupantAtSpace,
  getLegalActions,
  validateRollSequence,
  applyRollSequence,
  validateAction,
  applyAction,
  rollLocalSequence,
  getPlayerSummary,
  describeTurn,
  resultTitle,
  resultDetail,
  actionKey,
  assertStateInvariant
};