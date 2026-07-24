export const BREAK_THE_ICE_RULESET = Object.freeze({
  gameId: "break-the-ice",
  rulesetVersion: "panchi-vasantha-2006-1.0.0",
  traditionalName: "Panchi",
  region: "Mysore, Karnataka, India",
  players: 2,
  piecesPerPlayer: 5,
  cowries: 7,
  entryValues: [1, 5, 7],
  bonusValues: [1, 5, 7],
  stackingPolicy: "single-occupancy",
  safeSpacePolicy: "occupied-safe-space-blocks-entry"
});

export const PLAYERS = Object.freeze(["blue", "coral"]);
export const FINISH_PROGRESS = 56;

function space(id, x, y, label, kind = "track") {
  return { id, x, y, label, kind };
}

export const SPACES = Object.freeze([
  ...Array.from({ length: 11 }, (_, index) => space(`B${index}`, 6 + index * 8.8, 92, `Bottom ${index + 1}`, "bottom")),
  ...Array.from({ length: 5 }, (_, index) => space(`V${index + 1}`, 50, 86 - index * 6.5, `Stem ${index + 1}`, "stem")),
  space("QBL", 15, 60, "Lower-left corner", "square"),
  ...Array.from({ length: 4 }, (_, index) => space(`QB${index + 1}`, 22 + index * 7, 60, `Lower track ${index + 2}`, "square")),
  ...Array.from({ length: 4 }, (_, index) => space(`QB${index + 6}`, 57 + index * 7, 60, `Lower track ${index + 7}`, "square")),
  space("QBR", 85, 60, "Lower-right corner", "square"),
  ...Array.from({ length: 9 }, (_, index) => space(`QL${index + 1}`, 15, 55 - index * 5, `Left track ${index + 2}`, "square")),
  space("QTL", 15, 10, "Upper-left corner", "square"),
  ...Array.from({ length: 9 }, (_, index) => space(`QT${index + 1}`, 22 + index * 7, 10, `Upper track ${index + 2}`, "square")),
  space("QTR", 85, 10, "Upper-right corner", "square"),
  ...Array.from({ length: 9 }, (_, index) => space(`QR${index + 1}`, 85, 15 + index * 5, `Right track ${index + 2}`, "square")),
  ...Array.from({ length: 5 }, (_, index) => space(`V${index + 6}`, 50, 55 - index * 5, `Home climb ${index + 1}`, "home"))
]);

export const SPACE_BY_ID = Object.freeze(Object.fromEntries(SPACES.map((item) => [item.id, item])));

const BLUE_SQUARE_LOOP = Object.freeze([
  "QB4", "QB3", "QB2", "QB1", "QBL",
  "QL1", "QL2", "QL3", "QL4", "QL5", "QL6", "QL7", "QL8", "QL9", "QTL",
  "QT1", "QT2", "QT3", "QT4", "QT5", "QT6", "QT7", "QT8", "QT9", "QTR",
  "QR1", "QR2", "QR3", "QR4", "QR5", "QR6", "QR7", "QR8", "QR9", "QBR",
  "QB9", "QB8", "QB7", "QB6", "V5"
]);

const CORAL_SQUARE_LOOP = Object.freeze([
  "QB6", "QB7", "QB8", "QB9", "QBR",
  "QR9", "QR8", "QR7", "QR6", "QR5", "QR4", "QR3", "QR2", "QR1", "QTR",
  "QT9", "QT8", "QT7", "QT6", "QT5", "QT4", "QT3", "QT2", "QT1", "QTL",
  "QL9", "QL8", "QL7", "QL6", "QL5", "QL4", "QL3", "QL2", "QL1", "QBL",
  "QB1", "QB2", "QB3", "QB4", "V5"
]);

export const ROUTES = Object.freeze({
  blue: Object.freeze(["B0", "B1", "B2", "B3", "B4", "B5", "V1", "V2", "V3", "V4", "V5", ...BLUE_SQUARE_LOOP, "V6", "V7", "V8", "V9", "V10"]),
  coral: Object.freeze(["B10", "B9", "B8", "B7", "B6", "B5", "V1", "V2", "V3", "V4", "V5", ...CORAL_SQUARE_LOOP, "V6", "V7", "V8", "V9", "V10"])
});

export const SAFE_SPACES = Object.freeze(new Set(["B0", "B5", "B10", "V5", "V10", "QBL", "QBR", "QTL", "QTR", "QL5", "QT5", "QR5"]));
export const TRACK_LINES = Object.freeze([["B0", "B10"], ["B5", "V10"], ["QBL", "QBR"], ["QBR", "QTR"], ["QTR", "QTL"], ["QTL", "QBL"]]);

function createPieces(player) {
  return Array.from({ length: BREAK_THE_ICE_RULESET.piecesPerPlayer }, (_, index) => ({ id: `${player}-${index + 1}`, player, status: "home", progress: -1 }));
}

export function createBreakTheIceState({ mode = "hotseat", starter = "blue", seed = Date.now() } = {}) {
  return {
    gameId: BREAK_THE_ICE_RULESET.gameId,
    rulesetVersion: BREAK_THE_ICE_RULESET.rulesetVersion,
    mode,
    currentPlayer: starter === "coral" ? "coral" : "blue",
    awaiting: "roll",
    roll: null,
    lastRoll: null,
    lastMove: null,
    pieces: { blue: createPieces("blue"), coral: createPieces("coral") },
    captures: { blue: 0, coral: 0 },
    turn: 1,
    throwCount: 0,
    rngState: Number(seed) >>> 0,
    winner: null,
    winReason: null,
    history: []
  };
}

export function otherPlayer(player) {
  return player === "blue" ? "coral" : "blue";
}

export function routeFor(player) {
  return ROUTES[player] || ROUTES.blue;
}

export function getPiece(state, player, pieceId) {
  return (state.pieces[player] || []).find((piece) => piece.id === pieceId) || null;
}

export function getPieceSpaceId(piece) {
  if (!piece || piece.status !== "track") return null;
  return routeFor(piece.player)[piece.progress] || null;
}

export function getOccupantAtSpace(state, spaceId, ignorePieceId = null) {
  for (const player of PLAYERS) {
    for (const piece of state.pieces[player] || []) {
      if (piece.id === ignorePieceId || piece.status !== "track") continue;
      if (getPieceSpaceId(piece) === spaceId) return piece;
    }
  }
  return null;
}

function canLand(state, player, spaceId, movingPieceId = null) {
  const occupant = getOccupantAtSpace(state, spaceId, movingPieceId);
  if (!occupant) return true;
  if (occupant.player === player) return false;
  return !SAFE_SPACES.has(spaceId);
}

export function getLegalActions(state, player = state.currentPlayer) {
  if (!state || state.winner || player !== state.currentPlayer || state.awaiting !== "move" || !state.roll) return [];
  const value = Number(state.roll.value || 0);
  if (value <= 0) return [];
  const route = routeFor(player);
  const actions = [];

  if (BREAK_THE_ICE_RULESET.entryValues.includes(value) && canLand(state, player, route[0])) {
    for (const piece of state.pieces[player]) {
      if (piece.status === "home") actions.push({ type: "enter", pieceId: piece.id, targetProgress: 0, targetSpace: route[0] });
    }
  }

  for (const piece of state.pieces[player]) {
    if (piece.status !== "track") continue;
    const targetProgress = piece.progress + value;
    if (targetProgress > FINISH_PROGRESS) continue;
    if (targetProgress === FINISH_PROGRESS) {
      actions.push({ type: "move", pieceId: piece.id, targetProgress, targetSpace: null, finishes: true });
      continue;
    }
    const targetSpace = route[targetProgress];
    if (targetSpace && canLand(state, player, targetSpace, piece.id)) {
      const occupant = getOccupantAtSpace(state, targetSpace, piece.id);
      actions.push({
        type: "move",
        pieceId: piece.id,
        targetProgress,
        targetSpace,
        captures: occupant && occupant.player !== player ? occupant.id : null
      });
    }
  }
  return actions;
}

export function validateRoll(state, faces, player = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Break the Ice match has already ended." };
  if (player !== state.currentPlayer) return { valid: false, reason: "It is not this runner's turn." };
  if (state.awaiting !== "roll") return { valid: false, reason: "Choose a runner for the current cowrie throw first." };
  if (!Array.isArray(faces) || faces.length !== BREAK_THE_ICE_RULESET.cowries || faces.some((face) => ![0, 1, false, true].includes(face))) return { valid: false, reason: "A cowrie throw must contain seven shells." };
  return { valid: true };
}

export function applyRoll(state, faces, player = state.currentPlayer, meta = {}) {
  const validation = validateRoll(state, faces, player);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const normalizedFaces = faces.map((face) => Number(Boolean(face)));
  const value = normalizedFaces.reduce((sum, face) => sum + face, 0);
  const bonus = BREAK_THE_ICE_RULESET.bonusValues.includes(value);
  const roll = { faces: normalizedFaces, value, bonus, proofHash: meta.proofHash || null, nonce: meta.nonce || null, throwNumber: next.throwCount + 1 };
  next.roll = roll;
  next.lastRoll = { ...roll, player };
  next.awaiting = "move";
  next.throwCount += 1;
  next.history.push({ type: "roll", turn: next.turn, player, roll: cloneState(roll) });
  const legalActions = getLegalActions(next, player);
  if (value === 0 || legalActions.length === 0) {
    next.lastMove = { type: "pass", player, reason: value === 0 ? "no-mouths-up" : "no-legal-runner", value };
    next.history.push({ type: "pass", turn: next.turn, player, reason: next.lastMove.reason, value });
    finishThrow(next);
  }
  assertStateInvariant(next);
  return { state: next, error: null };
}

export function validateAction(state, action, player = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Break the Ice match has already ended." };
  if (player !== state.currentPlayer) return { valid: false, reason: "It is not this runner's turn." };
  if (state.awaiting !== "move" || !state.roll) return { valid: false, reason: "Roll the seven cowries first." };
  if (!action || !["enter", "move"].includes(action.type) || typeof action.pieceId !== "string") return { valid: false, reason: "Choose one legal penguin runner." };
  const legal = getLegalActions(state, player).find((candidate) => candidate.type === action.type && candidate.pieceId === action.pieceId);
  return legal ? { valid: true, action: legal } : { valid: false, reason: explainIllegalAction(state, action, player) };
}

export function applyAction(state, action, player = state.currentPlayer) {
  const validation = validateAction(state, action, player);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const legalAction = validation.action;
  const piece = getPiece(next, player, legalAction.pieceId);
  const fromSpace = getPieceSpaceId(piece);
  let capturedPiece = null;
  if (legalAction.targetSpace) {
    capturedPiece = getOccupantAtSpace(next, legalAction.targetSpace, piece.id);
    if (capturedPiece && capturedPiece.player !== player) {
      capturedPiece.status = "home";
      capturedPiece.progress = -1;
      next.captures[player] += 1;
    }
  }
  if (legalAction.type === "enter") {
    piece.status = "track";
    piece.progress = 0;
  } else if (legalAction.finishes) {
    piece.status = "finished";
    piece.progress = FINISH_PROGRESS;
  } else {
    piece.status = "track";
    piece.progress = legalAction.targetProgress;
  }
  next.lastMove = { type: legalAction.type, player, pieceId: piece.id, value: next.roll.value, fromSpace, targetSpace: legalAction.targetSpace, targetProgress: legalAction.targetProgress, capturedPieceId: capturedPiece?.id || null, finished: piece.status === "finished" };
  next.history.push({ type: "move", turn: next.turn, player, move: cloneState(next.lastMove) });
  if (next.pieces[player].every((candidate) => candidate.status === "finished")) {
    next.winner = player;
    next.winReason = "all-five-finished";
    next.awaiting = "finished";
    next.roll = null;
  } else {
    finishThrow(next);
  }
  assertStateInvariant(next);
  return { state: next, error: null };
}

function finishThrow(state) {
  const bonus = Boolean(state.roll?.bonus);
  state.roll = null;
  state.awaiting = "roll";
  if (!bonus) state.currentPlayer = otherPlayer(state.currentPlayer);
  state.turn += 1;
}

export function rollLocalCowries(state, player = state.currentPlayer) {
  let seed = Number(state.rngState || 1) >>> 0;
  const faces = [];
  for (let index = 0; index < BREAK_THE_ICE_RULESET.cowries; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    faces.push((seed >>> 31) & 1);
  }
  const result = applyRoll(state, faces, player);
  if (!result.error) result.state.rngState = seed;
  return result;
}

export function getPlayerSummary(state, player) {
  const pieces = state.pieces[player] || [];
  return {
    home: pieces.filter((piece) => piece.status === "home").length,
    track: pieces.filter((piece) => piece.status === "track").length,
    finished: pieces.filter((piece) => piece.status === "finished").length,
    captures: Number(state.captures[player] || 0),
    totalProgress: pieces.reduce((sum, piece) => sum + Math.max(0, Number(piece.progress || 0)), 0)
  };
}

export function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  const label = state.currentPlayer === "blue" ? "Blue Runners" : "Coral Runners";
  return state.awaiting === "roll" ? `${label}: cast seven cowries.` : `${label}: move one legal runner by ${state.roll?.value || 0}.`;
}

export function resultTitle(state) {
  if (!state.winner) return "Race in progress";
  return state.winner === "blue" ? "Blue Runners break through" : "Coral Runners break through";
}

export function resultDetail(state) {
  return state.winReason === "all-five-finished" ? "All five penguin runners crossed beyond the final marked space with exact throws." : "The Break the Ice race is complete.";
}

function explainIllegalAction(state, action, player) {
  const piece = getPiece(state, player, action?.pieceId);
  if (!piece) return "That runner does not belong to the active player.";
  if (piece.status === "finished") return "That runner has already left the board.";
  if (piece.status === "home" && !BREAK_THE_ICE_RULESET.entryValues.includes(Number(state.roll?.value || 0))) return "A waiting runner may enter only on a throw of 1, 5, or 7.";
  if (piece.status === "track" && piece.progress + Number(state.roll?.value || 0) > FINISH_PROGRESS) return "The final exit requires an exact throw.";
  return "That runner cannot land on the selected occupied or protected space.";
}

export function createCowrieDrill() {
  const state = createBreakTheIceState({ mode: "daily", starter: "blue", seed: 20260725 });
  state.pieces.blue[0] = { ...state.pieces.blue[0], status: "track", progress: 51 };
  state.pieces.blue[1] = { ...state.pieces.blue[1], status: "track", progress: 23 };
  state.pieces.blue[2] = { ...state.pieces.blue[2], status: "track", progress: 7 };
  state.pieces.coral[0] = { ...state.pieces.coral[0], status: "track", progress: 24 };
  state.awaiting = "move";
  state.roll = { faces: [1, 1, 1, 1, 1, 0, 0], value: 5, bonus: true, throwNumber: 1 };
  state.lastRoll = { ...state.roll, player: "blue" };
  assertStateInvariant(state);
  return state;
}

export function scoreAction(state, action, player = state.currentPlayer) {
  const legal = getLegalActions(state, player).find((candidate) => candidate.type === action.type && candidate.pieceId === action.pieceId);
  if (!legal) return -Infinity;
  let score = Number(legal.targetProgress || 0);
  if (legal.finishes) score += 1000;
  if (legal.captures) score += 500;
  if (legal.type === "enter") score += 100;
  return score;
}

export function bestCowrieDrillPieces(state) {
  const actions = getLegalActions(state);
  const scores = actions.map((action) => scoreAction(state, action));
  const best = Math.max(...scores);
  return actions.filter((action, index) => scores[index] === best).map((action) => action.pieceId);
}

export function assertStateInvariant(state) {
  const allPieces = PLAYERS.flatMap((player) => state.pieces[player] || []);
  if (allPieces.length !== BREAK_THE_ICE_RULESET.piecesPerPlayer * PLAYERS.length) throw new Error("Break the Ice piece-count invariant failed.");
  const occupied = new Set();
  for (const piece of allPieces) {
    if (piece.status === "home" && piece.progress !== -1) throw new Error("Home runner has invalid progress.");
    if (piece.status === "finished" && piece.progress !== FINISH_PROGRESS) throw new Error("Finished runner has invalid progress.");
    if (piece.status === "track") {
      if (!Number.isInteger(piece.progress) || piece.progress < 0 || piece.progress >= FINISH_PROGRESS) throw new Error("Track runner has invalid progress.");
      const spaceId = getPieceSpaceId(piece);
      if (!spaceId || !SPACE_BY_ID[spaceId]) throw new Error("Track runner occupies an unknown space.");
      if (occupied.has(spaceId)) throw new Error(`Single-occupancy invariant failed at ${spaceId}.`);
      occupied.add(spaceId);
    }
  }
  return true;
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}
