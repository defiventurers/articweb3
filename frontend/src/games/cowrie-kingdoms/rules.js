export const COWRIE_KINGDOMS_RULESET = Object.freeze({
  gameId: "cowrie-kingdoms",
  rulesetVersion: "ashta-kashte-falkener-1892-duel-1.0.0",
  traditionalName: "Ashta-Kashte",
  source: "Edward Falkener, Games Ancient and Oriental (1892), pp. 265–267",
  region: "India; exact locality not recorded by Falkener",
  sourcePlayers: "2–4",
  digitalSeats: 2,
  piecesPerPlayer: 4,
  cowries: 4,
  graceValues: [4, 8],
  extraThrowOnCapture: true,
  optionalPlay: true,
  doublesEnabled: true,
  maxFriendlyStack: 2,
  safeEntryCoexistence: true
});

export const SIDES = Object.freeze(["aurora", "ember"]);
export const BOARD_SIZE = 7;

export function cellId(row, col) {
  return `c${row}${col}`;
}

export const CELLS = Object.freeze(Array.from({ length: BOARD_SIZE }, (_, row) =>
  Array.from({ length: BOARD_SIZE }, (_, col) => ({ id: cellId(row, col), row, col }))
).flat());

export const SAFE_SPACES = Object.freeze(new Set([
  cellId(0, 3),
  cellId(3, 6),
  cellId(6, 3),
  cellId(3, 0),
  cellId(3, 3)
]));

const NORTH_ROUTE = Object.freeze(buildNorthRoute());
export const ROUTES = Object.freeze({
  aurora: NORTH_ROUTE,
  ember: Object.freeze(NORTH_ROUTE.map((id) => rotateCell(id, 2)))
});
export const FINISH_PROGRESS = NORTH_ROUTE.length - 1;

function ringClockwiseFromNorthEast(min, max) {
  const cells = [cellId(min, max)];
  for (let row = min + 1; row <= max; row += 1) cells.push(cellId(row, max));
  for (let col = max - 1; col >= min; col -= 1) cells.push(cellId(max, col));
  for (let row = max - 1; row >= min; row -= 1) cells.push(cellId(row, min));
  for (let col = min + 1; col < max; col += 1) cells.push(cellId(min, col));
  return cells;
}

function buildNorthRoute() {
  const outer = [cellId(0, 3)];
  for (let col = 2; col >= 0; col -= 1) outer.push(cellId(0, col));
  for (let row = 1; row <= 6; row += 1) outer.push(cellId(row, 0));
  for (let col = 1; col <= 6; col += 1) outer.push(cellId(6, col));
  for (let row = 5; row >= 0; row -= 1) outer.push(cellId(row, 6));
  for (let col = 5; col >= 4; col -= 1) outer.push(cellId(0, col));
  return [
    ...outer,
    ...ringClockwiseFromNorthEast(1, 5),
    ...ringClockwiseFromNorthEast(2, 4),
    cellId(3, 3)
  ];
}

function rotateCell(id, quarterTurns) {
  let row = Number(id[1]);
  let col = Number(id[2]);
  for (let turn = 0; turn < quarterTurns; turn += 1) {
    const nextRow = col;
    const nextCol = BOARD_SIZE - 1 - row;
    row = nextRow;
    col = nextCol;
  }
  return cellId(row, col);
}

function createPieces(side) {
  return Array.from({ length: COWRIE_KINGDOMS_RULESET.piecesPerPlayer }, (_, index) => ({
    id: `${side}-${index + 1}`,
    side,
    status: "home",
    progress: -1
  }));
}

export function createCowrieKingdomsState({ mode = "hotseat", starter = "aurora", seed = Date.now() } = {}) {
  const state = {
    gameId: COWRIE_KINGDOMS_RULESET.gameId,
    rulesetVersion: COWRIE_KINGDOMS_RULESET.rulesetVersion,
    mode,
    currentPlayer: starter === "ember" ? "ember" : "aurora",
    awaiting: "roll",
    throwPool: [],
    bonusRolls: 0,
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

export function createAshtaGraceDrill() {
  const state = createCowrieKingdomsState({ mode: "drill", starter: "aurora", seed: 8 });
  state.pieces.aurora[1].status = "track";
  state.pieces.aurora[1].progress = 5;
  state.pieces.aurora[2].status = "finished";
  state.pieces.aurora[2].progress = FINISH_PROGRESS;
  state.pieces.aurora[3].status = "finished";
  state.pieces.aurora[3].progress = FINISH_PROGRESS;
  const captureCell = ROUTES.aurora[13];
  state.pieces.ember[0].status = "track";
  state.pieces.ember[0].progress = ROUTES.ember.indexOf(captureCell);
  state.lastRoll = { faces: [0, 0, 0, 0], mouthsUp: 0, value: 8, grace: true, splitGrace: true, throwNumber: 1 };
  state.throwPool = [
    { id: "drill-grace", kind: "grace", value: 0, label: "Grace entry", enterAllowed: true, moveAllowed: false },
    { id: "drill-eight", kind: "move", value: 8, label: "Move 8", enterAllowed: false, moveAllowed: true }
  ];
  state.bonusRolls = 1;
  state.awaiting = "allocate";
  state.castCount = 1;
  assertStateInvariant(state);
  return state;
}

export function otherSide(side) {
  return side === "aurora" ? "ember" : "aurora";
}

export function routeFor(side) {
  return ROUTES[side] || ROUTES.aurora;
}

export function getPiece(state, side, pieceId) {
  return (state.pieces[side] || []).find((piece) => piece.id === pieceId) || null;
}

export function getPieceSpaceId(piece) {
  if (!piece || piece.status !== "track") return null;
  return routeFor(piece.side)[piece.progress] || null;
}

export function getOccupantsAtSpace(state, spaceId, ignorePieceIds = []) {
  const ignored = new Set(Array.isArray(ignorePieceIds) ? ignorePieceIds : [ignorePieceIds].filter(Boolean));
  const occupants = [];
  for (const side of SIDES) {
    for (const piece of state.pieces[side] || []) {
      if (ignored.has(piece.id) || piece.status !== "track") continue;
      if (getPieceSpaceId(piece) === spaceId) occupants.push(piece);
    }
  }
  return occupants;
}

function movingGroupsAtSpace(state, side, spaceId) {
  const friendly = getOccupantsAtSpace(state, spaceId).filter((piece) => piece.side === side);
  const groups = friendly.map((piece) => [piece.id]);
  if (friendly.length === 2) groups.push(friendly.map((piece) => piece.id).sort());
  return groups;
}

function landingResult(state, side, targetSpace, movingPieceIds, actionType) {
  const occupants = getOccupantsAtSpace(state, targetSpace, movingPieceIds);
  const friendly = occupants.filter((piece) => piece.side === side);
  const enemies = occupants.filter((piece) => piece.side !== side);
  const movingCount = movingPieceIds.length;

  if (SAFE_SPACES.has(targetSpace)) {
    if (enemies.length && actionType !== "enter") return { legal: false, reason: "safe-enemy" };
    if (friendly.length + movingCount > COWRIE_KINGDOMS_RULESET.maxFriendlyStack) return { legal: false, reason: "stack-limit" };
    return { legal: true, capturedPieceIds: [] };
  }

  if (friendly.length) {
    if (friendly.length + movingCount > COWRIE_KINGDOMS_RULESET.maxFriendlyStack) return { legal: false, reason: "stack-limit" };
    return { legal: true, capturedPieceIds: [] };
  }

  if (enemies.length) {
    if (enemies.length > movingCount) return { legal: false, reason: "double-block" };
    return { legal: true, capturedPieceIds: enemies.map((piece) => piece.id).sort() };
  }

  return { legal: true, capturedPieceIds: [] };
}

export function scoreCowries(faces) {
  const mouthsUp = faces.reduce((sum, face) => sum + Number(Boolean(face)), 0);
  return {
    mouthsUp,
    value: mouthsUp === 0 ? 8 : mouthsUp,
    grace: mouthsUp === 0 || mouthsUp === COWRIE_KINGDOMS_RULESET.cowries,
    splitGrace: mouthsUp === 0
  };
}

function unitsForRoll(roll, throwNumber) {
  if (roll.splitGrace) {
    return [
      { id: `t${throwNumber}-grace`, kind: "grace", value: 0, label: "Grace entry", enterAllowed: true, moveAllowed: false },
      { id: `t${throwNumber}-eight`, kind: "move", value: 8, label: "Move 8", enterAllowed: false, moveAllowed: true }
    ];
  }
  return [{
    id: `t${throwNumber}-value`,
    kind: roll.grace ? "grace-move" : "move",
    value: roll.value,
    label: roll.grace ? `Grace ${roll.value}` : `Move ${roll.value}`,
    enterAllowed: roll.grace,
    moveAllowed: true
  }];
}

export function getLegalActions(state, side = state.currentPlayer, unitId = null) {
  if (!state || state.winner || side !== state.currentPlayer || state.awaiting !== "allocate") return [];
  const units = unitId ? state.throwPool.filter((unit) => unit.id === unitId) : state.throwPool;
  const actions = [];

  for (const unit of units) {
    if (unit.enterAllowed) {
      const startSpace = routeFor(side)[0];
      for (const piece of state.pieces[side]) {
        if (piece.status !== "home") continue;
        const landing = landingResult(state, side, startSpace, [piece.id], "enter");
        if (landing.legal) actions.push({
          type: "enter",
          unitId: unit.id,
          pieceId: piece.id,
          pieceIds: [piece.id],
          groupSize: 1,
          value: unit.value,
          targetProgress: 0,
          targetSpace: startSpace,
          captures: null,
          capturedPieceIds: []
        });
      }
    }

    if (unit.moveAllowed) {
      const seenGroups = new Set();
      for (const piece of state.pieces[side]) {
        if (piece.status !== "track") continue;
        const fromSpace = getPieceSpaceId(piece);
        for (const pieceIds of movingGroupsAtSpace(state, side, fromSpace)) {
          const key = pieceIds.join("|");
          if (seenGroups.has(key)) continue;
          seenGroups.add(key);
          const movingPieces = pieceIds.map((id) => getPiece(state, side, id));
          const progress = movingPieces[0].progress;
          if (!movingPieces.every((candidate) => candidate.progress === progress)) continue;
          const targetProgress = progress + unit.value;
          if (targetProgress > FINISH_PROGRESS) continue;
          const targetSpace = routeFor(side)[targetProgress];
          if (!targetSpace) continue;
          const landing = landingResult(state, side, targetSpace, pieceIds, "move");
          if (!landing.legal) continue;
          actions.push({
            type: "move",
            unitId: unit.id,
            pieceId: pieceIds[0],
            pieceIds,
            groupSize: pieceIds.length,
            value: unit.value,
            fromSpace,
            targetProgress,
            targetSpace,
            finishes: targetProgress === FINISH_PROGRESS,
            captures: landing.capturedPieceIds[0] || null,
            capturedPieceIds: landing.capturedPieceIds
          });
        }
      }
    }

    actions.push({ type: "pass-unit", unitId: unit.id, value: unit.value });
  }
  return actions;
}

export function validateRoll(state, faces, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Cowrie Kingdoms race has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this kingdom's turn." };
  if (state.awaiting !== "roll" || state.throwPool.length) return { valid: false, reason: "Allocate or pass every stored throw first." };
  if (!Array.isArray(faces) || faces.length !== COWRIE_KINGDOMS_RULESET.cowries || faces.some((face) => ![0, 1, false, true].includes(face))) {
    return { valid: false, reason: "An Ashta-Kashte cast must contain four open-or-closed cowries." };
  }
  return { valid: true };
}

export function applyRoll(state, faces, side = state.currentPlayer, meta = {}) {
  const validation = validateRoll(state, faces, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const normalizedFaces = faces.map((face) => Number(Boolean(face)));
  const scored = scoreCowries(normalizedFaces);
  const throwNumber = next.castCount + 1;
  const roll = {
    faces: normalizedFaces,
    ...scored,
    proofHash: meta.proofHash || null,
    nonce: meta.nonce || null,
    throwNumber
  };
  next.lastRoll = { ...roll, side };
  next.throwPool = unitsForRoll(roll, throwNumber);
  next.awaiting = "allocate";
  next.castCount = throwNumber;
  if (roll.grace) next.bonusRolls += 1;
  next.history.push({ type: "roll", turn: next.turn, side, roll: cloneState(roll) });
  assertStateInvariant(next);
  return { state: next, error: null };
}

export function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing game state." };
  if (state.winner) return { valid: false, reason: "The Cowrie Kingdoms race has ended." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this kingdom's turn." };
  if (state.awaiting !== "allocate" || !state.throwPool.length) return { valid: false, reason: "Cast the four cowries first." };
  if (!action || typeof action.type !== "string" || typeof action.unitId !== "string") return { valid: false, reason: "Choose one stored throw and a legal runner." };
  const legal = getLegalActions(state, side, action.unitId).find((candidate) => actionKey(candidate) === actionKey(action));
  return legal ? { valid: true, action: legal } : { valid: false, reason: explainIllegalAction(state, action, side) };
}

export function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = cloneState(state);
  const legal = validation.action;

  if (legal.type === "pass-unit") {
    next.lastAction = { type: "pass-unit", side, unitId: legal.unitId, value: legal.value };
    next.history.push({ type: "pass-unit", turn: next.turn, side, unitId: legal.unitId, value: legal.value });
    consumeUnit(next, legal.unitId);
    assertStateInvariant(next);
    return { state: next, error: null };
  }

  const pieceIds = legal.pieceIds?.length ? legal.pieceIds : [legal.pieceId];
  const movingPieces = pieceIds.map((id) => getPiece(next, side, id));
  const fromSpace = legal.type === "enter" ? null : getPieceSpaceId(movingPieces[0]);
  const capturedPieceIds = [...(legal.capturedPieceIds || [])];

  for (const capturedId of capturedPieceIds) {
    const capturedPiece = getPiece(next, otherSide(side), capturedId);
    if (!capturedPiece) continue;
    capturedPiece.status = "home";
    capturedPiece.progress = -1;
  }
  if (capturedPieceIds.length) {
    next.captures[side] += capturedPieceIds.length;
    next.bonusRolls += 1;
  }

  for (const piece of movingPieces) {
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
  }

  next.lastAction = {
    type: legal.type,
    side,
    unitId: legal.unitId,
    pieceId: pieceIds[0],
    pieceIds,
    groupSize: pieceIds.length,
    value: legal.value,
    fromSpace,
    targetSpace: legal.targetSpace,
    targetProgress: legal.targetProgress,
    capturedPieceId: capturedPieceIds[0] || null,
    capturedPieceIds,
    finished: movingPieces.every((piece) => piece.status === "finished")
  };
  next.history.push({ type: "action", turn: next.turn, side, action: cloneState(next.lastAction) });
  consumeUnit(next, legal.unitId);

  if (next.pieces[side].every((candidate) => candidate.status === "finished")) {
    next.winner = side;
    next.winReason = "all-four-finished";
    next.awaiting = "finished";
    next.throwPool = [];
    next.bonusRolls = 0;
  }
  assertStateInvariant(next);
  return { state: next, error: null };
}

function consumeUnit(state, unitId) {
  state.throwPool = state.throwPool.filter((unit) => unit.id !== unitId);
  if (state.throwPool.length) {
    state.awaiting = "allocate";
    return;
  }
  state.awaiting = "roll";
  state.turn += 1;
  if (state.bonusRolls > 0) state.bonusRolls -= 1;
  else state.currentPlayer = otherSide(state.currentPlayer);
}

export function rollLocalCowries(state, side = state.currentPlayer) {
  let seed = Number(state.rngState || 1) >>> 0;
  const faces = [];
  for (let index = 0; index < COWRIE_KINGDOMS_RULESET.cowries; index += 1) {
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
    captures: Number(state.captures[side] || 0),
    doubles: countDoubles(state, side),
    totalProgress: pieces.reduce((sum, piece) => sum + Math.max(0, Number(piece.progress || 0)), 0)
  };
}

function countDoubles(state, side) {
  const counts = new Map();
  for (const piece of state.pieces[side] || []) {
    const spaceId = getPieceSpaceId(piece);
    if (spaceId) counts.set(spaceId, (counts.get(spaceId) || 0) + 1);
  }
  return [...counts.values()].filter((count) => count === 2).length;
}

export function describeTurn(state) {
  if (state.winner) return resultTitle(state);
  const label = sideName(state.currentPlayer);
  if (state.awaiting === "roll") return `${label}: cast four cowries.`;
  return `${label}: allocate or pass each stored throw.`;
}

export function resultTitle(state) {
  if (!state.winner) return "Spiral race in progress";
  return state.winner === "aurora" ? "Aurora Kingdom reaches the centre" : "Ember Kingdom reaches the centre";
}

export function resultDetail(state) {
  return state.winReason === "all-four-finished"
    ? "All four runners completed the seven-by-seven spiral with exact throws."
    : "The Ashta-Kashte duel is complete.";
}

export function actionSummary(action) {
  if (!action) return "";
  if (action.type === "pass-unit") return `${sideName(action.side)} passed ${action.value || "the grace"}.`;
  const group = action.groupSize === 2 ? "paired runners" : action.pieceId;
  if (action.capturedPieceIds?.length) return `${sideName(action.side)} moved ${group}, captured ${action.capturedPieceIds.join(" and ")}, and earned another cast.`;
  if (action.finished) return `${sideName(action.side)} finished ${action.groupSize === 2 ? "two runners" : "one runner"} in the centre.`;
  if (action.type === "enter") return `${sideName(action.side)} used grace to enter ${action.pieceId}.`;
  return `${sideName(action.side)} moved ${group} ${action.value} cells.`;
}

function actionKey(action) {
  if (!action) return "";
  if (action.type === "pass-unit") return `pass-unit:${action.unitId}`;
  const pieceIds = action.pieceIds?.length ? [...action.pieceIds].sort() : [action.pieceId];
  return `${action.type}:${action.unitId}:${pieceIds.join("+")}:${action.targetProgress}`;
}

function explainIllegalAction(state, action, side) {
  const unit = state.throwPool.find((candidate) => candidate.id === action?.unitId);
  if (!unit) return "That stored throw is no longer available.";
  if (action.type === "pass-unit") return "That throw cannot be passed now.";
  const requestedIds = action?.pieceIds?.length ? action.pieceIds : [action?.pieceId];
  const pieces = requestedIds.map((id) => getPiece(state, side, id)).filter(Boolean);
  if (pieces.length !== requestedIds.length) return "Every selected runner must belong to the active kingdom.";
  if (pieces.some((piece) => piece.status === "finished")) return "A selected runner already reached the centre.";
  if (pieces.some((piece) => piece.status === "home") && !unit.enterAllowed) return "Only a grace may enter a waiting runner.";
  if (pieces.some((piece) => piece.status === "track") && !unit.moveAllowed) return "The separate grace from an Ashta throw enters a runner; use the stored 8 to move.";
  if (pieces.length === 2 && getPieceSpaceId(pieces[0]) !== getPieceSpaceId(pieces[1])) return "Paired runners must begin on the same cell.";
  if (pieces.some((piece) => piece.status === "track" && piece.progress + Number(unit.value || 0) > FINISH_PROGRESS)) return "The centre requires an exact throw.";
  return "That destination is blocked, protected, overfilled, or defended by a stronger pair.";
}

export function assertStateInvariant(state) {
  const pieces = SIDES.flatMap((side) => state.pieces[side] || []);
  if (pieces.length !== COWRIE_KINGDOMS_RULESET.piecesPerPlayer * SIDES.length) throw new Error("Cowrie Kingdoms piece-count invariant failed.");
  const occupancy = new Map();
  for (const piece of pieces) {
    if (piece.status === "home" && piece.progress !== -1) throw new Error("Home runner has invalid progress.");
    if (piece.status === "finished" && piece.progress !== FINISH_PROGRESS) throw new Error("Finished runner has invalid progress.");
    if (piece.status === "track") {
      if (!Number.isInteger(piece.progress) || piece.progress < 0 || piece.progress >= FINISH_PROGRESS) throw new Error("Track runner has invalid progress.");
      const spaceId = getPieceSpaceId(piece);
      if (!spaceId) throw new Error("Track runner occupies an unknown cell.");
      const bySide = occupancy.get(spaceId) || { aurora: 0, ember: 0 };
      bySide[piece.side] += 1;
      if (bySide[piece.side] > COWRIE_KINGDOMS_RULESET.maxFriendlyStack) throw new Error(`Friendly stack limit failed at ${spaceId}.`);
      occupancy.set(spaceId, bySide);
    }
  }
  for (const [spaceId, bySide] of occupancy) {
    if (!SAFE_SPACES.has(spaceId) && bySide.aurora && bySide.ember) throw new Error(`Mixed unprotected occupancy failed at ${spaceId}.`);
  }
  for (const unit of state.throwPool || []) {
    if (!unit.id || (!unit.enterAllowed && !unit.moveAllowed)) throw new Error("Stored throw unit invariant failed.");
  }
  return true;
}

function sideName(side) {
  return side === "ember" ? "Ember Kingdom" : "Aurora Kingdom";
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}
