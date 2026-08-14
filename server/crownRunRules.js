const CROWN_RUN_RULESET = Object.freeze({
  gameId: "crown-run",
  rulesetVersion: "dadu-schmidt-madsen-2024-majority-1.0.0",
  traditionalName: "Dadu",
  community: "Dawoodi Bohra community of western India",
  evidenceStatus: "Schmidt-Madsen 2024 interview-based majority rules appendix",
  sides: 2,
  standardPiecesPerSide: 8,
  kingPiecesPerSide: 1,
  cowries: 5,
  trackLength: 36,
  homeRowLength: 6,
  safeProgresses: [0, 5, 10, 15, 20, 25, 30, 35],
  entryValue: 1,
  bonusValues: [1, 10],
  forfeitValue: 0,
  stackingPolicy: "friendly-and-opposing-stacks-allowed-except-opposed-safe-square",
  optionalRulesEnabled: []
});

const SIDES = Object.freeze(["aurora", "ember"]);
const SAFE_PROGRESS_SET = new Set(CROWN_RUN_RULESET.safeProgresses);
const CENTER_PROGRESS = CROWN_RUN_RULESET.trackLength;
const FINISHED_PROGRESS = CROWN_RUN_RULESET.trackLength + 1;
const OPPONENT_HOME_START = CROWN_RUN_RULESET.trackLength - CROWN_RUN_RULESET.homeRowLength;

function makeSpaces() {
  const points = [];
  const segments = [
    [[10, 90], [90, 90]],
    [[90, 90], [90, 63]],
    [[90, 63], [10, 63]],
    [[10, 63], [10, 36]],
    [[10, 36], [90, 36]],
    [[90, 36], [90, 10]],
    [[90, 10], [10, 10]]
  ];
  segments.forEach(([from, to], segmentIndex) => {
    for (let step = 0; step <= 5; step += 1) {
      if (segmentIndex > 0 && step === 0) continue;
      const progress = segmentIndex * 5 + step;
      const t = step / 5;
      points.push({
        id: `R${progress}`,
        progress,
        x: from[0] + (to[0] - from[0]) * t,
        y: from[1] + (to[1] - from[1]) * t,
        safe: SAFE_PROGRESS_SET.has(progress),
        label: SAFE_PROGRESS_SET.has(progress) ? `Macho ${progress / 5 + 1}` : `Track ${progress + 1}`
      });
    }
  });
  return points;
}

const SPACES = Object.freeze(makeSpaces());
const SPACE_BY_ID = Object.freeze(Object.fromEntries(SPACES.map((space) => [space.id, space])));
const SAFE_SPACES = Object.freeze(new Set(SPACES.filter((space) => space.safe).map((space) => space.id)));
const TRACK_LINES = Object.freeze(SPACES.slice(0, -1).map((space, index) => [space.id, SPACES[index + 1].id]));
const ROUTES = Object.freeze({
  aurora: Object.freeze(SPACES.map((space) => space.id)),
  ember: Object.freeze([...SPACES].reverse().map((space) => space.id))
});

function createPieces(side) {
  return [
    { id: `${side}-nakta`, side, kind: "king", status: "home", progress: -1 },
    ...Array.from({ length: CROWN_RUN_RULESET.standardPiecesPerSide }, (_, index) => ({
      id: `${side}-kaangi-${index + 1}`,
      side,
      kind: "standard",
      status: "home",
      progress: -1
    }))
  ];
}

function createCrownRunState({ mode = "online", starter = "aurora", seed = Date.now() } = {}) {
  const state = {
    gameId: CROWN_RUN_RULESET.gameId,
    rulesetVersion: CROWN_RUN_RULESET.rulesetVersion,
    mode,
    currentPlayer: starter === "ember" ? "ember" : "aurora",
    awaiting: "roll",
    throwPool: [],
    rollSequence: [],
    lastRollSequence: [],
    turnHasDa: false,
    pieces: { aurora: createPieces("aurora"), ember: createPieces("ember") },
    captureLicense: { aurora: false, ember: false },
    captures: { aurora: 0, ember: 0 },
    kingResets: { aurora: 0, ember: 0 },
    turn: 1,
    castCount: 0,
    rngState: Number(seed) >>> 0,
    winner: null,
    winReason: null,
    lastMove: null,
    lastReset: null,
    history: []
  };
  assertStateInvariant(state);
  return state;
}

function createCrownCollapseDrill() {
  const state = createCrownRunState({ mode: "drill", starter: "aurora", seed: 11 });
  state.pieces.aurora.forEach((piece) => { piece.status = "finished"; piece.progress = FINISHED_PROGRESS; });
  const striker = state.pieces.aurora.find((piece) => piece.kind === "standard");
  striker.status = "track";
  striker.progress = 8;
  state.pieces.ember.forEach((piece) => { piece.status = "home"; piece.progress = -1; });
  const king = state.pieces.ember.find((piece) => piece.kind === "king");
  king.status = "track";
  king.progress = 24;
  state.pieces.ember[1].status = "track";
  state.pieces.ember[1].progress = 12;
  state.pieces.ember[2].status = "center";
  state.pieces.ember[2].progress = CENTER_PROGRESS;
  state.pieces.ember[3].status = "finished";
  state.pieces.ember[3].progress = FINISHED_PROGRESS;
  state.captureLicense = { aurora: true, ember: true };
  state.throwPool = [{ id: "drill-3", value: 3, faces: [1, 1, 1, 0, 0], bonus: false }];
  state.rollSequence = cloneState(state.throwPool);
  state.lastRollSequence = cloneState(state.throwPool);
  state.turnHasDa = true;
  state.awaiting = "allocate";
  state.winner = null;
  state.winReason = null;
  assertStateInvariant(state);
  return state;
}

function otherSide(side) { return side === "aurora" ? "ember" : "aurora"; }
function routeFor(side) { return ROUTES[side] || ROUTES.aurora; }
function getPiece(state, side, pieceId) { return (state.pieces[side] || []).find((piece) => piece.id === pieceId) || null; }
function getPieceById(state, pieceId) {
  for (const side of SIDES) {
    const piece = getPiece(state, side, pieceId);
    if (piece) return piece;
  }
  return null;
}
function getPieceSpaceId(piece) { return piece?.status === "track" ? routeFor(piece.side)[piece.progress] || null : null; }
function getPiecesAtSpace(state, spaceId) {
  return SIDES.flatMap((side) => (state.pieces[side] || []).filter((piece) => piece.status === "track" && getPieceSpaceId(piece) === spaceId));
}
function getOpponentPiecesAtSpace(state, side, spaceId) { return getPiecesAtSpace(state, spaceId).filter((piece) => piece.side !== side); }
function chooseCapturedPiece(pieces) { return [...pieces].sort((a, b) => (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === "standard" ? -1 : 1))[0] || null; }
function isSafeSpace(spaceId) { return SAFE_SPACES.has(spaceId); }
function homePieces(state, side) { return (state.pieces[side] || []).filter((piece) => piece.status === "home"); }
function centerPieces(state, side) { return (state.pieces[side] || []).filter((piece) => piece.status === "center"); }
function finishedPieces(state, side) { return (state.pieces[side] || []).filter((piece) => piece.status === "finished"); }
function trackPieces(state, side) { return (state.pieces[side] || []).filter((piece) => piece.status === "track"); }

function canLand(state, side, spaceId) {
  const opponents = getOpponentPiecesAtSpace(state, side, spaceId);
  return !(opponents.length && isSafeSpace(spaceId));
}

function actionForMove(state, piece, throwItem) {
  const value = Number(throwItem.value || 0);
  const targetProgress = piece.progress + value;
  if (targetProgress >= CROWN_RUN_RULESET.trackLength) return null;
  if (targetProgress >= OPPONENT_HOME_START && !state.captureLicense[piece.side]) return null;
  const targetSpace = routeFor(piece.side)[targetProgress];
  if (!targetSpace || !canLand(state, piece.side, targetSpace)) return null;
  const captured = chooseCapturedPiece(getOpponentPiecesAtSpace(state, piece.side, targetSpace));
  return {
    type: "move",
    pieceId: piece.id,
    throwId: throwItem.id,
    value,
    targetProgress,
    targetSpace,
    entersCenter: targetProgress === CROWN_RUN_RULESET.trackLength - 1,
    capturedPieceId: captured?.id || null
  };
}

function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.winner || side !== state.currentPlayer || state.awaiting !== "allocate" || !state.throwPool.length) return [];
  const actions = [];
  for (const throwItem of state.throwPool) {
    const value = Number(throwItem.value || 0);
    if (value <= 0) continue;
    const waiting = homePieces(state, side);
    if (value === CROWN_RUN_RULESET.entryValue && waiting.length) {
      const entrySpace = routeFor(side)[0];
      if (canLand(state, side, entrySpace)) {
        waiting.forEach((piece) => actions.push({ type: "enter", pieceId: piece.id, throwId: throwItem.id, value, targetProgress: 0, targetSpace: entrySpace }));
        continue;
      }
    }
    if (value === 1 && !waiting.length) {
      centerPieces(state, side).forEach((piece) => actions.push({ type: "exit", pieceId: piece.id, throwId: throwItem.id, value }));
    }
    for (const piece of trackPieces(state, side)) {
      if (value === 1) {
        const spaceId = getPieceSpaceId(piece);
        const captured = chooseCapturedPiece(getOpponentPiecesAtSpace(state, side, spaceId));
        if (captured && !isSafeSpace(spaceId)) actions.push({ type: "capture-in-place", pieceId: piece.id, throwId: throwItem.id, value, targetSpace: spaceId, capturedPieceId: captured.id });
      }
      const move = actionForMove(state, piece, throwItem);
      if (move) actions.push(move);
    }
  }
  return dedupeActions(actions);
}

function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing Crown Run state." };
  if (state.winner) return { valid: false, reason: "The Crown Run match has already ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this caravan's turn." };
  if (state.awaiting !== "allocate") return { valid: false, reason: state.awaiting === "capture-roll" ? "Cast the immediate capture throw first." : "Cast the five cowries first." };
  const legal = getLegalActions(state, side).find((candidate) => actionKey(candidate) === actionKey(action));
  return legal ? { valid: true, action: legal } : { valid: false, reason: explainIllegalAction(state, action, side) };
}

function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const legal = validation.action;
  const piece = getPiece(next, side, legal.pieceId);
  const fromSpace = getPieceSpaceId(piece);
  next.throwPool = next.throwPool.filter((item) => item.id !== legal.throwId);
  next.lastReset = null;

  if (legal.type === "enter") {
    piece.status = "track";
    piece.progress = 0;
  } else if (legal.type === "exit") {
    piece.status = "finished";
    piece.progress = FINISHED_PROGRESS;
  } else if (legal.type === "move") {
    if (legal.entersCenter) {
      piece.status = "center";
      piece.progress = CENTER_PROGRESS;
    } else {
      piece.status = "track";
      piece.progress = legal.targetProgress;
    }
  }

  let capturedPiece = legal.capturedPieceId ? getPieceById(next, legal.capturedPieceId) : null;
  let resetCount = 0;
  if (capturedPiece) {
    const reset = capturePiece(next, piece, capturedPiece);
    resetCount = reset.resetCount;
    capturedPiece = reset.capturedPiece;
  }

  next.lastMove = {
    type: legal.type,
    side,
    pieceId: piece.id,
    pieceKind: piece.kind,
    throwId: legal.throwId,
    value: legal.value,
    fromSpace,
    targetSpace: legal.targetSpace || getPieceSpaceId(piece),
    entered: legal.type === "enter",
    exited: legal.type === "exit",
    enteredCenter: legal.type === "move" && Boolean(legal.entersCenter),
    capturedPieceId: capturedPiece?.id || null,
    capturedKind: capturedPiece?.kind || null,
    resetCount
  };
  next.history.push({ type: "allocation", turn: next.turn, side, move: cloneState(next.lastMove) });

  if (capturedPiece) {
    next.awaiting = "capture-roll";
  } else if (next.pieces[side].every((candidate) => candidate.status === "finished")) {
    next.winner = side;
    next.winReason = "all-nine-exited";
    next.awaiting = "finished";
    next.throwPool = [];
    next.rollSequence = [];
  } else if (!next.throwPool.length || !getLegalActions(next, side).length) {
    finishTurn(next, next.throwPool.length ? "unused-throws-no-legal-application" : null);
  }
  assertStateInvariant(next);
  return { state: next, error: null };
}

function capturePiece(state, attacker, capturedPiece) {
  const victimSide = capturedPiece.side;
  state.captures[attacker.side] += 1;
  state.captureLicense[attacker.side] = true;
  let resetPieces = [capturedPiece];
  if (capturedPiece.kind === "king") {
    resetPieces = state.pieces[victimSide].filter((piece) => attacker.kind === "king" ? piece.status !== "home" : ["track", "center"].includes(piece.status));
    state.captureLicense[victimSide] = false;
    state.kingResets[attacker.side] += 1;
  }
  resetPieces.forEach((piece) => { piece.status = "home"; piece.progress = -1; });
  if (capturedPiece.kind === "king") {
    state.lastReset = {
      victimSide,
      capturedBy: attacker.kind,
      resetPieceIds: resetPieces.map((piece) => piece.id),
      includedFinishedPieces: attacker.kind === "king"
    };
  }
  return { capturedPiece, resetCount: resetPieces.length };
}

function validateRollSequence(state, sequence, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing Crown Run state." };
  if (state.winner) return { valid: false, reason: "The Crown Run match has already ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this caravan's turn." };
  if (!["roll", "capture-roll"].includes(state.awaiting)) return { valid: false, reason: "Apply the stored throws before casting again." };
  if (!Array.isArray(sequence) || !sequence.length) return { valid: false, reason: "A cowrie sequence is required." };
  for (const roll of sequence) {
    if (!Array.isArray(roll.faces) || roll.faces.length !== CROWN_RUN_RULESET.cowries || roll.faces.some((face) => ![0, 1, false, true].includes(face))) return { valid: false, reason: "Each Dadu cast must contain five binary cowries." };
  }
  return { valid: true };
}

function applyRollSequence(state, sequence, side = state.currentPlayer) {
  const validation = validateRollSequence(state, sequence, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const context = next.awaiting;
  const normalized = sequence.map((roll, index) => normalizeRoll(roll, `${next.turn}-${next.castCount + index + 1}`));
  next.lastRollSequence = cloneState(normalized);
  next.rollSequence = cloneState(normalized);
  next.castCount += normalized.length;
  next.history.push({ type: "roll-sequence", turn: next.turn, side, context, rolls: cloneState(normalized) });

  if (normalized.some((roll) => roll.value === 0)) {
    next.throwPool = [];
    finishTurn(next, context === "capture-roll" ? "capture-bonus-zero-forfeit" : "zero-forfeit");
    assertStateInvariant(next);
    return { state: next, error: null };
  }
  if (context === "roll" && !normalized.some((roll) => roll.value === 1)) {
    next.throwPool = [];
    finishTurn(next, "no-da");
    assertStateInvariant(next);
    return { state: next, error: null };
  }
  if (context === "roll") next.turnHasDa = true;
  next.throwPool = [...next.throwPool, ...normalized];
  next.awaiting = "allocate";
  if (!getLegalActions(next, side).length) finishTurn(next, "no-legal-application");
  assertStateInvariant(next);
  return { state: next, error: null };
}

function normalizeRoll(roll, fallbackId) {
  const faces = roll.faces.map((face) => Number(Boolean(face)));
  const mouthsUp = faces.reduce((sum, face) => sum + face, 0);
  const value = mouthsUp === 5 ? 10 : mouthsUp;
  return { ...cloneState(roll), id: roll.id || fallbackId, faces, mouthsUp, value, bonus: [1, 10].includes(value) };
}

function rollLocalSequence(state, side = state.currentPlayer) {
  let seed = Number(state.rngState || 1) >>> 0;
  const sequence = [];
  do {
    const faces = [];
    for (let index = 0; index < CROWN_RUN_RULESET.cowries; index += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      faces.push((seed >>> 31) & 1);
    }
    const mouthsUp = faces.reduce((sum, face) => sum + face, 0);
    const value = mouthsUp === 5 ? 10 : mouthsUp;
    sequence.push({ faces, mouthsUp, value, bonus: [1, 10].includes(value) });
  } while (sequence[sequence.length - 1].bonus);
  const result = applyRollSequence(state, sequence, side);
  if (!result.error) result.state.rngState = seed;
  return result;
}

function finishTurn(state, passReason = null) {
  if (passReason) state.history.push({ type: "pass", turn: state.turn, side: state.currentPlayer, reason: passReason, unusedThrows: cloneState(state.throwPool) });
  state.throwPool = [];
  state.rollSequence = [];
  state.turnHasDa = false;
  state.awaiting = "roll";
  state.currentPlayer = otherSide(state.currentPlayer);
  state.turn += 1;
}

function getSideSummary(state, side) {
  const pieces = state.pieces[side] || [];
  return {
    home: pieces.filter((piece) => piece.status === "home").length,
    track: pieces.filter((piece) => piece.status === "track").length,
    center: pieces.filter((piece) => piece.status === "center").length,
    finished: pieces.filter((piece) => piece.status === "finished").length,
    captures: Number(state.captures[side] || 0),
    kingResets: Number(state.kingResets[side] || 0),
    captureLicense: Boolean(state.captureLicense[side])
  };
}

function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  const label = state.currentPlayer === "aurora" ? "Aurora Court" : "Ember Court";
  if (state.awaiting === "roll") return `${label}: cast five cowries and seek da.`;
  if (state.awaiting === "capture-roll") return `${label}: cast the immediate capture throw.`;
  return `${label}: apply ${state.throwPool.map((item) => item.value).join(" · ")} in any legal order.`;
}
function resultTitle(state) {
  if (!state.winner) return "The crown race continues";
  return state.winner === "aurora" ? "Aurora Court secures the crown" : "Ember Court secures the crown";
}
function resultDetail(state) { return state.winReason === "all-nine-exited" ? "All eight kaangi and the nakta have crossed the opposing home row and exited." : "The Crown Run match is complete."; }

function actionKey(action) { return action ? `${action.type}:${action.pieceId || ""}:${action.throwId || ""}` : ""; }
function dedupeActions(actions) { return [...new Map(actions.map((action) => [actionKey(action), action])).values()]; }
function explainIllegalAction(state, action, side) {
  const piece = getPiece(state, side, action?.pieceId);
  if (!piece) return "Choose a piece belonging to the active court.";
  const throwItem = state.throwPool.find((item) => item.id === action?.throwId);
  if (!throwItem) return "Choose one stored cowrie result.";
  if (throwItem.value === 1 && homePieces(state, side).length) return "A da must enter a waiting piece before it can move or exit another piece.";
  if (piece.status === "finished") return "That piece has already exited.";
  if (piece.status === "center" && throwItem.value !== 1) return "A piece in the central quadrant exits only with da.";
  if (piece.status === "track" && piece.progress + throwItem.value >= OPPONENT_HOME_START && !state.captureLicense[side]) return "Capture an opposing piece before entering the opposing home row.";
  return "That stored throw has no legal application to the selected piece.";
}

function assertStateInvariant(state) {
  if (!state || state.gameId !== CROWN_RUN_RULESET.gameId) throw new Error("Crown Run game-state invariant failed.");
  for (const side of SIDES) {
    const pieces = state.pieces[side] || [];
    if (pieces.length !== 9 || pieces.filter((piece) => piece.kind === "king").length !== 1 || pieces.filter((piece) => piece.kind === "standard").length !== 8) throw new Error(`${side} Crown Run piece-count invariant failed.`);
    for (const piece of pieces) {
      if (!['home', 'track', 'center', 'finished'].includes(piece.status)) throw new Error(`Invalid Crown Run status for ${piece.id}.`);
      if (piece.status === "home" && piece.progress !== -1) throw new Error(`Home progress invariant failed for ${piece.id}.`);
      if (piece.status === "track" && (!Number.isInteger(piece.progress) || piece.progress < 0 || piece.progress >= CROWN_RUN_RULESET.trackLength - 1)) throw new Error(`Track progress invariant failed for ${piece.id}.`);
      if (piece.status === "center" && piece.progress !== CENTER_PROGRESS) throw new Error(`Center progress invariant failed for ${piece.id}.`);
      if (piece.status === "finished" && piece.progress !== FINISHED_PROGRESS) throw new Error(`Finished progress invariant failed for ${piece.id}.`);
    }
    if (typeof state.captureLicense[side] !== "boolean") throw new Error(`${side} capture-license invariant failed.`);
  }
  if (state.winner && state.pieces[state.winner]?.some((piece) => piece.status !== "finished")) throw new Error("Crown Run winner invariant failed.");
  return true;
}

function cloneState(value) { return JSON.parse(JSON.stringify(value)); }

module.exports = {
  CROWN_RUN_RULESET,
  SIDES,
  CENTER_PROGRESS,
  FINISHED_PROGRESS,
  OPPONENT_HOME_START,
  SPACES,
  SPACE_BY_ID,
  SAFE_SPACES,
  TRACK_LINES,
  ROUTES,
  createCrownRunState,
  createCrownCollapseDrill,
  otherSide,
  routeFor,
  getPiece,
  getPieceById,
  getPieceSpaceId,
  getPiecesAtSpace,
  getOpponentPiecesAtSpace,
  getLegalActions,
  validateAction,
  applyAction,
  validateRollSequence,
  applyRollSequence,
  rollLocalSequence,
  getSideSummary,
  describeTurn,
  resultTitle,
  resultDetail,
  actionKey,
  assertStateInvariant
};