const SKY_TEMPLE_RUN_RULESET = Object.freeze({
  gameId: "sky-temple-run",
  rulesetVersion: "vimanam-kreeda-kaushalya-2008-web-1.0.0",
  traditionalName: "Vimanam",
  region: "South India",
  players: 2,
  piecesPerPlayer: 6,
  cowries: 6,
  entryValues: [1, 5],
  bonusValues: [1, 5, 6, 12],
  captureGate: true,
  stackingPolicy: "single-occupancy"
});

const SIDES = Object.freeze(["aurora", "ember"]);
const INTERMEDIATE_PER_EDGE = 3;

const ANCHOR_COORDS = Object.freeze({
  a: [8, 14], c: [8, 50], b: [8, 86], d: [30, 50],
  e: [30, 14], f: [52, 14], g: [82, 14], h: [92, 50],
  i: [82, 86], j: [52, 86], k: [30, 86],
  l: [41, 70], m: [41, 30], n: [55, 50],
  q: [68, 38], r: [84, 27], o: [68, 62], p: [84, 73]
});

const ANCHOR_ROUTES = Object.freeze({
  aurora: Object.freeze(["a", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "n", "q", "r"]),
  ember: Object.freeze(["b", "c", "d", "k", "j", "i", "h", "g", "f", "e", "m", "n", "o", "p"])
});

function edgeKey(a, b) { return [a, b].sort().join("-"); }
function edgeMidIds(a, b) {
  const canonical = a < b;
  const ids = Array.from({ length: INTERMEDIATE_PER_EDGE }, (_, index) => `${edgeKey(a, b)}-${index + 1}`);
  return canonical ? ids : ids.reverse();
}
function expandRoute(anchors) {
  const route = [anchors[0]];
  for (let index = 0; index < anchors.length - 1; index += 1) route.push(...edgeMidIds(anchors[index], anchors[index + 1]), anchors[index + 1]);
  return route;
}

const ROUTES = Object.freeze({
  aurora: Object.freeze(expandRoute(ANCHOR_ROUTES.aurora)),
  ember: Object.freeze(expandRoute(ANCHOR_ROUTES.ember))
});
const GATE_PROGRESS = Object.freeze({ aurora: ROUTES.aurora.indexOf("k"), ember: ROUTES.ember.indexOf("e") });
const FINISH_PROGRESS = ROUTES.aurora.length - 1;
const SAFE_SPACES = Object.freeze(new Set(Object.keys(ANCHOR_COORDS)));

function createSpaces() {
  const spaces = Object.entries(ANCHOR_COORDS).map(([id, [x, y]]) => ({ id, x, y, label: `Rest square ${id.toUpperCase()}`, kind: "rest" }));
  const seen = new Set();
  for (const anchors of Object.values(ANCHOR_ROUTES)) {
    for (let index = 0; index < anchors.length - 1; index += 1) {
      const key = edgeKey(anchors[index], anchors[index + 1]);
      if (seen.has(key)) continue;
      seen.add(key);
      const [left, right] = key.split("-");
      const [ax, ay] = ANCHOR_COORDS[left];
      const [bx, by] = ANCHOR_COORDS[right];
      for (let step = 1; step <= INTERMEDIATE_PER_EDGE; step += 1) {
        const ratio = step / (INTERMEDIATE_PER_EDGE + 1);
        spaces.push({ id: `${key}-${step}`, x: ax + (bx - ax) * ratio, y: ay + (by - ay) * ratio, label: `${key.toUpperCase()} corridor ${step}`, kind: "corridor" });
      }
    }
  }
  return spaces;
}

const SPACES = Object.freeze(createSpaces());
const SPACE_BY_ID = Object.freeze(Object.fromEntries(SPACES.map((space) => [space.id, space])));
const TRACK_LINES = Object.freeze(uniqueEdges().map(([from, to]) => [from, to]));

function uniqueEdges() {
  const edges = [];
  const seen = new Set();
  for (const anchors of Object.values(ANCHOR_ROUTES)) {
    for (let index = 0; index < anchors.length - 1; index += 1) {
      const key = edgeKey(anchors[index], anchors[index + 1]);
      if (!seen.has(key)) { seen.add(key); edges.push(key.split("-")); }
    }
  }
  return edges;
}

function createPieces(side) {
  return Array.from({ length: SKY_TEMPLE_RUN_RULESET.piecesPerPlayer }, (_, index) => ({ id: `${side}-${index + 1}`, side, status: "home", progress: -1 }));
}

function createSkyTempleRunState({ mode = "hotseat", starter = "aurora", seed = Date.now() } = {}) {
  return {
    gameId: SKY_TEMPLE_RUN_RULESET.gameId,
    rulesetVersion: SKY_TEMPLE_RUN_RULESET.rulesetVersion,
    mode,
    currentPlayer: starter === "ember" ? "ember" : "aurora",
    awaiting: "roll",
    roll: null,
    lastRoll: null,
    lastMove: null,
    pieces: { aurora: createPieces("aurora"), ember: createPieces("ember") },
    captures: { aurora: 0, ember: 0 },
    captureLicense: { aurora: false, ember: false },
    turn: 1,
    castCount: 0,
    rngState: Number(seed) >>> 0,
    winner: null,
    winReason: null,
    history: []
  };
}

function createTempleGateDrill() {
  const state = createSkyTempleRunState({ mode: "drill", starter: "aurora", seed: 10 });
  state.pieces.aurora.slice(1).forEach((piece) => { piece.status = "finished"; piece.progress = FINISH_PROGRESS; });
  state.pieces.aurora[0].status = "track";
  state.pieces.aurora[0].progress = 33;
  state.pieces.ember[0].status = "track";
  state.pieces.ember[0].progress = ROUTES.ember.indexOf("j-k-3");
  state.roll = { faces: [1, 1, 0, 0, 0, 0], mouthsUp: 2, value: 2, bonus: false, throwNumber: 1 };
  state.lastRoll = { ...state.roll, side: "aurora" };
  state.awaiting = "move";
  state.castCount = 1;
  return state;
}

function otherSide(side) { return side === "aurora" ? "ember" : "aurora"; }
function routeFor(side) { return ROUTES[side] || ROUTES.aurora; }
function getPiece(state, side, pieceId) { return (state.pieces[side] || []).find((piece) => piece.id === pieceId) || null; }
function getPieceSpaceId(piece) { return piece?.status === "track" ? routeFor(piece.side)[piece.progress] || null : null; }

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

function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.winner || side !== state.currentPlayer || state.awaiting !== "move" || !state.roll) return [];
  const value = Number(state.roll.value || 0);
  if (value <= 0) return [];
  const route = routeFor(side);
  const actions = [];
  if (SKY_TEMPLE_RUN_RULESET.entryValues.includes(value) && canLand(state, side, route[0])) {
    for (const piece of state.pieces[side]) if (piece.status === "home") actions.push({ type: "enter", pieceId: piece.id, value, targetProgress: 0, targetSpace: route[0] });
  }
  for (const piece of state.pieces[side]) {
    if (piece.status !== "track") continue;
    const targetProgress = piece.progress + value;
    if (targetProgress > FINISH_PROGRESS) continue;
    if (targetProgress > GATE_PROGRESS[side] && !state.captureLicense[side]) continue;
    const targetSpace = route[targetProgress];
    if (!targetSpace || !canLand(state, side, targetSpace, piece.id)) continue;
    const occupant = getOccupantAtSpace(state, targetSpace, piece.id);
    actions.push({ type: "move", pieceId: piece.id, value, targetProgress, targetSpace, finishes: targetProgress === FINISH_PROGRESS, captures: occupant && occupant.side !== side && !SAFE_SPACES.has(targetSpace) ? occupant.id : null });
  }
  return actions;
}

function scoreCowries(faces) {
  const mouthsUp = faces.reduce((sum, face) => sum + Number(Boolean(face)), 0);
  return { mouthsUp, value: mouthsUp === 0 ? 12 : mouthsUp };
}

function validateRoll(state, faces, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Sky Temple race has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this pilgrim court's turn." };
  if (state.awaiting !== "roll") return { valid: false, reason: "Move one legal pilgrim before casting again." };
  if (!Array.isArray(faces) || faces.length !== SKY_TEMPLE_RUN_RULESET.cowries || faces.some((face) => ![0, 1, false, true].includes(face))) return { valid: false, reason: "A Vimanam cast must contain six open-or-closed cowries." };
  return { valid: true };
}

function applyRoll(state, faces, side = state.currentPlayer, meta = {}) {
  const validation = validateRoll(state, faces, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const normalizedFaces = faces.map((face) => Number(Boolean(face)));
  const { mouthsUp, value } = scoreCowries(normalizedFaces);
  const roll = { faces: normalizedFaces, mouthsUp, value, bonus: SKY_TEMPLE_RUN_RULESET.bonusValues.includes(value), proofHash: meta.proofHash || null, nonce: meta.nonce || null, throwNumber: next.castCount + 1 };
  next.roll = roll;
  next.lastRoll = { ...roll, side };
  next.awaiting = "move";
  next.castCount += 1;
  next.history.push({ type: "roll", turn: next.turn, side, roll: cloneState(roll) });
  if (!getLegalActions(next, side).length) {
    next.lastMove = { type: "pass", side, value, reason: "no-legal-pilgrim" };
    next.history.push({ type: "pass", turn: next.turn, side, value, reason: next.lastMove.reason });
    finishThrow(next, false);
  }
  assertStateInvariant(next);
  return { state: next, error: null };
}

function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Sky Temple race has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this pilgrim court's turn." };
  if (state.awaiting !== "move" || !state.roll) return { valid: false, reason: "Cast the six cowries first." };
  if (!action || !["enter", "move"].includes(action.type) || typeof action.pieceId !== "string") return { valid: false, reason: "Choose one legal pilgrim." };
  const legal = getLegalActions(state, side).find((candidate) => candidate.type === action.type && candidate.pieceId === action.pieceId);
  return legal ? { valid: true, action: legal } : { valid: false, reason: explainIllegalAction(state, action, side) };
}

function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const legal = validation.action;
  const piece = getPiece(next, side, legal.pieceId);
  const fromSpace = getPieceSpaceId(piece);
  const hadLicense = Boolean(next.captureLicense[side]);
  let capturedPiece = null;
  if (legal.targetSpace) {
    capturedPiece = getOccupantAtSpace(next, legal.targetSpace, piece.id);
    if (capturedPiece && capturedPiece.side !== side && !SAFE_SPACES.has(legal.targetSpace)) {
      capturedPiece.status = "home";
      capturedPiece.progress = -1;
      next.captures[side] += 1;
      next.captureLicense[side] = true;
    }
  }
  if (legal.type === "enter") { piece.status = "track"; piece.progress = 0; }
  else if (legal.finishes) { piece.status = "finished"; piece.progress = FINISH_PROGRESS; }
  else { piece.status = "track"; piece.progress = legal.targetProgress; }
  next.lastMove = { type: legal.type, side, pieceId: piece.id, value: next.roll.value, fromSpace, targetSpace: legal.targetSpace, targetProgress: legal.targetProgress, capturedPieceId: capturedPiece?.id || null, unlockedGate: !hadLicense && Boolean(capturedPiece), finished: piece.status === "finished" };
  next.history.push({ type: "move", turn: next.turn, side, move: cloneState(next.lastMove) });
  if (next.pieces[side].every((candidate) => candidate.status === "finished")) {
    next.winner = side;
    next.winReason = "all-six-finished";
    next.awaiting = "finished";
    next.roll = null;
  } else finishThrow(next, Boolean(capturedPiece));
  assertStateInvariant(next);
  return { state: next, error: null };
}

function finishThrow(state, captureBonus) {
  const retainTurn = Boolean(state.roll?.bonus || captureBonus);
  state.roll = null;
  state.awaiting = "roll";
  if (!retainTurn) state.currentPlayer = otherSide(state.currentPlayer);
  state.turn += 1;
}

function rollLocalCowries(state, side = state.currentPlayer) {
  let seed = Number(state.rngState || 1) >>> 0;
  const faces = [];
  for (let index = 0; index < SKY_TEMPLE_RUN_RULESET.cowries; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    faces.push((seed >>> 31) & 1);
  }
  const result = applyRoll(state, faces, side);
  if (!result.error) result.state.rngState = seed;
  return result;
}

function getPlayerSummary(state, side) {
  const pieces = state.pieces[side] || [];
  return { home: pieces.filter((piece) => piece.status === "home").length, track: pieces.filter((piece) => piece.status === "track").length, finished: pieces.filter((piece) => piece.status === "finished").length, captures: Number(state.captures[side] || 0), gateUnlocked: Boolean(state.captureLicense[side]), totalProgress: pieces.reduce((sum, piece) => sum + Math.max(0, Number(piece.progress || 0)), 0) };
}

function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  const label = state.currentPlayer === "aurora" ? "Aurora Pilgrims" : "Ember Pilgrims";
  return state.awaiting === "roll" ? `${label}: cast six cowries.` : `${label}: move one pilgrim by ${state.roll?.value || 0}.`;
}
function resultTitle(state) {
  if (!state.winner) return "Temple race in progress";
  return state.winner === "aurora" ? "Aurora reaches the sky temple" : "Ember reaches the sky temple";
}
function resultDetail(state) { return state.winReason === "all-six-finished" ? "All six pilgrims completed the Vimanam route with an exact final cast." : "The Sky Temple Run is complete."; }
function actionSummary(move) {
  if (!move) return "";
  if (move.type === "pass") return `${sideName(move.side)} had no legal pilgrim for ${move.value}.`;
  if (move.unlockedGate) return `${sideName(move.side)} captured a rival and unlocked the temple gate.`;
  if (move.capturedPieceId) return `${sideName(move.side)} captured ${move.capturedPieceId}.`;
  if (move.finished) return `${sideName(move.side)} finished one pilgrim on the final rest square.`;
  if (move.type === "enter") return `${sideName(move.side)} entered a pilgrim on ${move.targetSpace.toUpperCase()}.`;
  return `${sideName(move.side)} moved ${move.value} spaces.`;
}

function explainIllegalAction(state, action, side) {
  const piece = getPiece(state, side, action?.pieceId);
  if (!piece) return "That pilgrim does not belong to the active court.";
  if (piece.status === "finished") return "That pilgrim already reached the sky temple.";
  if (piece.status === "home" && !SKY_TEMPLE_RUN_RULESET.entryValues.includes(Number(state.roll?.value || 0))) return "A waiting pilgrim may enter only on 1 or 5.";
  if (piece.status === "track" && piece.progress + Number(state.roll?.value || 0) > FINISH_PROGRESS) return "The final rest square requires an exact cast.";
  if (piece.status === "track" && piece.progress + Number(state.roll?.value || 0) > GATE_PROGRESS[side] && !state.captureLicense[side]) return "Capture at least one rival before entering the final inner route.";
  return "That destination is occupied or protected.";
}

function assertStateInvariant(state) {
  const allPieces = SIDES.flatMap((side) => state.pieces[side] || []);
  if (allPieces.length !== SKY_TEMPLE_RUN_RULESET.piecesPerPlayer * SIDES.length) throw new Error("Sky Temple piece-count invariant failed.");
  const occupied = new Set();
  for (const piece of allPieces) {
    if (piece.status === "home" && piece.progress !== -1) throw new Error("Home pilgrim has invalid progress.");
    if (piece.status === "finished" && piece.progress !== FINISH_PROGRESS) throw new Error("Finished pilgrim has invalid progress.");
    if (piece.status === "track") {
      if (!Number.isInteger(piece.progress) || piece.progress < 0 || piece.progress >= FINISH_PROGRESS) throw new Error("Track pilgrim has invalid progress.");
      const spaceId = getPieceSpaceId(piece);
      if (!spaceId || !SPACE_BY_ID[spaceId]) throw new Error("Track pilgrim occupies an unknown space.");
      if (occupied.has(spaceId)) throw new Error(`Single-occupancy invariant failed at ${spaceId}.`);
      occupied.add(spaceId);
    }
  }
  return true;
}

function sideName(side) { return side === "ember" ? "Ember Pilgrims" : "Aurora Pilgrims"; }
function cloneState(value) { return JSON.parse(JSON.stringify(value)); }

module.exports = {
  SKY_TEMPLE_RUN_RULESET,
  SIDES,
  ANCHOR_ROUTES,
  ROUTES,
  GATE_PROGRESS,
  FINISH_PROGRESS,
  SAFE_SPACES,
  SPACES,
  SPACE_BY_ID,
  TRACK_LINES,
  createSkyTempleRunState,
  createTempleGateDrill,
  otherSide,
  routeFor,
  getPiece,
  getPieceSpaceId,
  getOccupantAtSpace,
  getLegalActions,
  scoreCowries,
  validateRoll,
  applyRoll,
  validateAction,
  applyAction,
  rollLocalCowries,
  getPlayerSummary,
  describeTurn,
  resultTitle,
  resultDetail,
  actionSummary,
  assertStateInvariant
};
