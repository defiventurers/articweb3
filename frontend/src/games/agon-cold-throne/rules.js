export const AGON_RULESET = Object.freeze({
  gameId: "agon-cold-throne",
  rulesetVersion: "peacock-documented-core-1.0.0",
  traditionalName: "Agon, or the Queen's Guards",
  creditedInventor: "Anthony Peacock",
  firstPublication: 1842,
  region: "London, England",
  players: 2,
  boardRadius: 5,
  cells: 91,
  piecesPerPlayer: 7,
  repetitionLimit: 3,
  noProgressPlyLimit: 160,
  defaultVariant: "owner-choice"
});

export const SIDES = Object.freeze(["blue", "coral"]);
export const DIRECTIONS = Object.freeze([
  Object.freeze([1, 0]), Object.freeze([1, -1]), Object.freeze([0, -1]),
  Object.freeze([-1, 0]), Object.freeze([-1, 1]), Object.freeze([0, 1])
]);

export function cellKey(q, r) { return `${q},${r}`; }
export function ringDistance(q, r) { return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)); }

export const CELLS = Object.freeze(buildCells());
export const CELL_BY_ID = Object.freeze(Object.fromEntries(CELLS.map((cell) => [cell.id, cell])));
export const OUTER_RING = Object.freeze(buildRing(AGON_RULESET.boardRadius));
export const THRONE_NEIGHBORS = Object.freeze(DIRECTIONS.map(([q, r]) => cellKey(q, r)));

const BLUE_GUARD_RING_INDEXES = Object.freeze([4, 9, 13, 17, 21, 26]);
const CORAL_GUARD_RING_INDEXES = Object.freeze(BLUE_GUARD_RING_INDEXES.map((index) => (index + 15) % 30));

export function otherSide(side) { return side === "blue" ? "coral" : "blue"; }

export function createAgonState({ mode = "hotseat", variant = AGON_RULESET.defaultVariant } = {}) {
  if (!new Set(["owner-choice", "rival-decree"]).has(variant)) throw new Error("Unknown Agon variant.");
  const pieces = [
    makePiece("blue-queen", "blue", "queen", OUTER_RING[0]),
    ...BLUE_GUARD_RING_INDEXES.map((index, guardIndex) => makePiece(`blue-guard-${guardIndex + 1}`, "blue", "guard", OUTER_RING[index])),
    makePiece("coral-queen", "coral", "queen", OUTER_RING[15]),
    ...CORAL_GUARD_RING_INDEXES.map((index, guardIndex) => makePiece(`coral-guard-${guardIndex + 1}`, "coral", "guard", OUTER_RING[index]))
  ];
  const state = {
    gameId: AGON_RULESET.gameId,
    rulesetVersion: AGON_RULESET.rulesetVersion,
    mode,
    variant,
    pieces,
    currentPlayer: "blue",
    pendingRelocations: [],
    turn: 1,
    ply: 0,
    noProgressPly: 0,
    winner: null,
    isDraw: false,
    winReason: null,
    lastAction: null,
    history: [],
    repetitions: {}
  };
  state.repetitions[positionKey(state)] = 1;
  assertStateInvariant(state);
  return state;
}

export function pieceAt(state, cellId) {
  return state.pieces.find((piece) => piece.cell === cellId) || null;
}

export function getPendingPieces(state, side = state.currentPlayer) {
  return state.pendingRelocations
    .map((pieceId) => state.pieces.find((piece) => piece.id === pieceId))
    .filter((piece) => piece?.side === side);
}

export function getActingSide(state) {
  const forced = getPendingPieces(state, state.currentPlayer);
  const queenForced = forced.some((piece) => piece.kind === "queen");
  return queenForced && state.variant === "rival-decree" ? otherSide(state.currentPlayer) : state.currentPlayer;
}

export function getLegalActions(state, actor = getActingSide(state)) {
  if (!state || state.winner || state.isDraw || actor !== getActingSide(state)) return [];
  const forced = getPendingPieces(state, state.currentPlayer);
  if (forced.length) {
    const queen = forced.find((piece) => piece.kind === "queen");
    const eligible = queen ? [queen] : forced;
    return eligible.flatMap((piece) => CELLS
      .filter((cell) => !pieceAt(state, cell.id))
      .filter((cell) => piece.kind === "queen" || cell.ring === AGON_RULESET.boardRadius)
      .filter((cell) => !wouldBeSelfSandwiched(state, piece, null, cell.id))
      .map((cell) => ({ type: "relocate", pieceId: piece.id, to: cell.id, owner: piece.side })));
  }

  const actions = [];
  for (const piece of state.pieces.filter((candidate) => candidate.side === state.currentPlayer && candidate.cell)) {
    const from = CELL_BY_ID[piece.cell];
    for (const [dq, dr] of DIRECTIONS) {
      const toId = cellKey(from.q + dq, from.r + dr);
      const to = CELL_BY_ID[toId];
      if (!to || pieceAt(state, toId)) continue;
      if (to.ring > from.ring) continue;
      if (to.ring === 0 && piece.kind !== "queen") continue;
      if (wouldBeSelfSandwiched(state, piece, piece.cell, toId)) continue;
      actions.push({ type: "move", pieceId: piece.id, from: piece.cell, to: toId });
    }
  }
  return actions;
}

export function validateAction(state, action, actor = getActingSide(state)) {
  if (!state) return { valid: false, reason: "Missing Agon state." };
  if (state.winner || state.isDraw) return { valid: false, reason: "The contest has already ended." };
  if (actor !== getActingSide(state)) return { valid: false, reason: "It is not this side's action." };
  if (!action?.type || !action?.pieceId || !action?.to) return { valid: false, reason: "Choose a piece and a legal ice hex." };
  const legal = getLegalActions(state, actor).find((candidate) => actionKey(candidate) === actionKey(action));
  if (legal) return { valid: true, action: legal };
  const target = CELL_BY_ID[action.to];
  if (!target) return { valid: false, reason: "That hex is outside the six-ring board." };
  if (pieceAt(state, action.to)) return { valid: false, reason: "That ice hex is occupied." };
  const forced = getPendingPieces(state, state.currentPlayer);
  if (forced.length) {
    const queenForced = forced.some((piece) => piece.kind === "queen");
    if (queenForced && !String(action.pieceId).includes("queen")) return { valid: false, reason: "A displaced Queen must return before any Guard." };
    const piece = state.pieces.find((candidate) => candidate.id === action.pieceId);
    if (piece?.kind === "guard" && target.ring !== AGON_RULESET.boardRadius) return { valid: false, reason: "A displaced Guard must return on the outer ice ring." };
    return { valid: false, reason: "Choose a highlighted safe return hex." };
  }
  const piece = state.pieces.find((candidate) => candidate.id === action.pieceId);
  if (!piece || piece.side !== state.currentPlayer) return { valid: false, reason: "Choose one of the current side's pieces." };
  if (target.ring > CELL_BY_ID[piece.cell].ring) return { valid: false, reason: "Agon pieces may move inward or sideways, never outward." };
  if (target.ring === 0 && piece.kind !== "queen") return { valid: false, reason: "Only a Queen may occupy the throne." };
  if (wouldBeSelfSandwiched(state, piece, piece.cell, target.id)) return { valid: false, reason: "A piece may not voluntarily step between two enemy pieces." };
  return { valid: false, reason: "Pieces move exactly one adjacent hex." };
}

export function applyAction(state, action, actor = getActingSide(state)) {
  const validation = validateAction(state, action, actor);
  if (!validation.valid) return { state, error: validation.reason };
  const legal = validation.action;
  const next = clone(state);
  const piece = next.pieces.find((candidate) => candidate.id === legal.pieceId);
  const from = piece.cell;
  piece.cell = legal.to;
  piece.status = "board";
  next.pendingRelocations = next.pendingRelocations.filter((pieceId) => pieceId !== piece.id);

  const captured = findNewCaptures(next, piece.side, legal.to);
  for (const capturedPiece of captured) {
    capturedPiece.cell = null;
    capturedPiece.status = "relocating";
    if (!next.pendingRelocations.includes(capturedPiece.id)) next.pendingRelocations.push(capturedPiece.id);
  }
  next.pendingRelocations.sort((a, b) => {
    const aQueen = next.pieces.find((pieceCandidate) => pieceCandidate.id === a)?.kind === "queen";
    const bQueen = next.pieces.find((pieceCandidate) => pieceCandidate.id === b)?.kind === "queen";
    return Number(bQueen) - Number(aQueen);
  });

  next.ply += 1;
  next.noProgressPly = captured.length ? 0 : next.noProgressPly + 1;
  next.lastAction = { ...legal, actor, movedSide: piece.side, from, captured: captured.map((candidate) => candidate.id) };
  next.history.push({ turn: next.turn, ...next.lastAction });

  const formationWinner = SIDES.find((side) => hasWinningFormation(next, side));
  const forfeitingSide = SIDES.find((side) => hasForbiddenEmptyThroneRing(next, side));
  if (formationWinner) {
    next.winner = formationWinner;
    next.winReason = "queen-and-six-guards";
  } else if (forfeitingSide) {
    next.winner = otherSide(forfeitingSide);
    next.winReason = "empty-throne-forfeit";
  } else {
    next.currentPlayer = otherSide(next.currentPlayer);
    next.turn += 1;
    const key = positionKey(next);
    next.repetitions[key] = Number(next.repetitions[key] || 0) + 1;
    if (next.repetitions[key] >= AGON_RULESET.repetitionLimit) {
      next.isDraw = true;
      next.winReason = "threefold-repetition";
    } else if (next.noProgressPly >= AGON_RULESET.noProgressPlyLimit) {
      next.isDraw = true;
      next.winReason = "no-progress-limit";
    } else if (!getLegalActions(next).length) {
      next.winner = otherSide(next.currentPlayer);
      next.winReason = "blockade";
    }
  }
  assertStateInvariant(next);
  return { state: next, error: null };
}

export function hasWinningFormation(state, side) {
  const queen = state.pieces.find((piece) => piece.side === side && piece.kind === "queen");
  const guards = new Set(state.pieces.filter((piece) => piece.side === side && piece.kind === "guard").map((piece) => piece.cell));
  return queen?.cell === cellKey(0, 0) && THRONE_NEIGHBORS.every((cellId) => guards.has(cellId));
}

export function hasForbiddenEmptyThroneRing(state, side) {
  if (pieceAt(state, cellKey(0, 0))) return false;
  const guards = new Set(state.pieces.filter((piece) => piece.side === side && piece.kind === "guard").map((piece) => piece.cell));
  return THRONE_NEIGHBORS.every((cellId) => guards.has(cellId));
}

export function describeTurn(state) {
  if (state.winner || state.isDraw) return resultTitle(state);
  const forced = getPendingPieces(state, state.currentPlayer);
  if (forced.length) {
    const queen = forced.find((piece) => piece.kind === "queen");
    if (queen && state.variant === "rival-decree") return `${sideName(getActingSide(state))} chooses where the displaced ${sideName(state.currentPlayer)} Queen returns.`;
    if (queen) return `${sideName(state.currentPlayer)} must return the displaced Queen to a safe vacant hex.`;
    return `${sideName(state.currentPlayer)} must return one displaced Guard to the outer ring.`;
  }
  return `${sideName(state.currentPlayer)} moves one piece inward or sideways.`;
}

export function actionSummary(action) {
  if (!action) return "The throne contest is ready.";
  const moved = action.pieceId.includes("queen") ? "Queen" : "Guard";
  const captureText = action.captured?.length ? ` ${action.captured.length} rival ${action.captured.length === 1 ? "piece was" : "pieces were"} displaced.` : "";
  if (action.type === "relocate") return `${sideName(action.movedSide)} returned a displaced ${moved}.${captureText}`;
  return `${sideName(action.movedSide)} moved a ${moved} toward the throne.${captureText}`;
}

export function resultTitle(state) {
  if (state.isDraw) return "The cold throne remains unclaimed";
  if (state.winner) return `${sideName(state.winner)} completes the royal ring`;
  return "The contest continues";
}

export function resultDetail(state) {
  const details = {
    "queen-and-six-guards": "The Queen holds the throne with all six Guards on the surrounding hexes.",
    "empty-throne-forfeit": "Six Guards closed around an empty throne while their Queen remained outside.",
    blockade: "The next side had no legal move under the declared digital stalemate policy.",
    "threefold-repetition": "The same full position occurred three times under the modern digital draw policy.",
    "no-progress-limit": `No capture or victory occurred for ${AGON_RULESET.noProgressPlyLimit} plies.`
  };
  return details[state.winReason] || "The Agon match is complete.";
}

export function chooseAgonBotAction(state, botSide = "coral") {
  if (getActingSide(state) !== botSide) return null;
  const actions = getLegalActions(state, botSide);
  let best = null;
  let bestScore = -Infinity;
  for (const action of actions) {
    const piece = state.pieces.find((candidate) => candidate.id === action.pieceId);
    const targetRing = CELL_BY_ID[action.to].ring;
    let score = 0;
    if (action.type === "relocate" && piece.side !== botSide) score += targetRing * 25;
    else score += (AGON_RULESET.boardRadius - targetRing) * (piece.kind === "queen" ? 8 : 5);
    const outcome = applyAction(state, action, botSide).state;
    if (outcome.winner === botSide) score += 100000;
    if (outcome.winner && outcome.winner !== botSide) score -= 100000;
    score += Number(outcome.lastAction?.captured?.length || 0) * 80;
    score += formationProgress(outcome, botSide) * 6;
    if (score > bestScore || (score === bestScore && actionKey(action) < actionKey(best))) {
      best = action;
      bestScore = score;
    }
  }
  return best;
}

export function positionKey(state) {
  const pieces = [...state.pieces].sort((a, b) => a.id.localeCompare(b.id)).map((piece) => `${piece.id}:${piece.cell || "off"}`).join("|");
  return `${state.currentPlayer}|${state.variant}|${state.pendingRelocations.join(",")}|${pieces}`;
}

export function assertStateInvariant(state) {
  if (state.pieces?.length !== 14) throw new Error("Agon requires fourteen pieces.");
  for (const side of SIDES) {
    if (state.pieces.filter((piece) => piece.side === side && piece.kind === "queen").length !== 1) throw new Error("Each side requires one Queen.");
    if (state.pieces.filter((piece) => piece.side === side && piece.kind === "guard").length !== 6) throw new Error("Each side requires six Guards.");
  }
  const occupied = state.pieces.filter((piece) => piece.cell).map((piece) => piece.cell);
  if (occupied.some((cellId) => !CELL_BY_ID[cellId])) throw new Error("A piece occupies an unknown Agon hex.");
  if (new Set(occupied).size !== occupied.length) throw new Error("Two pieces occupy the same Agon hex.");
  if (state.pieces.some((piece) => piece.kind === "guard" && piece.cell === cellKey(0, 0))) throw new Error("A Guard cannot occupy the throne.");
  const pending = new Set(state.pendingRelocations);
  if (pending.size !== state.pendingRelocations.length) throw new Error("A relocation cannot be queued twice.");
  if (state.pendingRelocations.some((pieceId) => state.pieces.find((piece) => piece.id === pieceId)?.cell)) throw new Error("A displaced piece must be off-board.");
  return true;
}

function buildCells() {
  const cells = [];
  const radius = AGON_RULESET.boardRadius;
  for (let q = -radius; q <= radius; q += 1) {
    const minR = Math.max(-radius, -q - radius);
    const maxR = Math.min(radius, -q + radius);
    for (let r = minR; r <= maxR; r += 1) {
      const xRaw = Math.sqrt(3) * (q + r / 2);
      const yRaw = 1.5 * r;
      cells.push(Object.freeze({
        id: cellKey(q, r), q, r, ring: ringDistance(q, r),
        x: 50 + (xRaw / (11 * Math.sqrt(3))) * 100,
        y: 50 + (yRaw / 17) * 100
      }));
    }
  }
  return cells.sort((a, b) => a.r - b.r || a.q - b.q);
}

function buildRing(radius) {
  if (!radius) return [cellKey(0, 0)];
  const result = [];
  let q = radius;
  let r = 0;
  const directions = [[-1, 1], [-1, 0], [0, -1], [1, -1], [1, 0], [0, 1]];
  for (const [dq, dr] of directions) {
    for (let step = 0; step < radius; step += 1) {
      result.push(cellKey(q, r));
      q += dq;
      r += dr;
    }
  }
  return result;
}

function makePiece(id, side, kind, cell) { return { id, side, kind, cell, status: "board" }; }

function wouldBeSelfSandwiched(state, piece, from, to) {
  const occupant = (cellId) => {
    if (cellId === to) return piece;
    if (cellId === from) return null;
    return pieceAt(state, cellId);
  };
  const target = CELL_BY_ID[to];
  return [[0, 3], [1, 4], [2, 5]].some(([a, b]) => {
    const first = neighborId(target, DIRECTIONS[a]);
    const second = neighborId(target, DIRECTIONS[b]);
    return occupant(first)?.side === otherSide(piece.side) && occupant(second)?.side === otherSide(piece.side);
  });
}

function findNewCaptures(state, movingSide, destination) {
  const target = CELL_BY_ID[destination];
  const captures = [];
  for (const direction of DIRECTIONS) {
    const adjacentId = neighborId(target, direction);
    const beyond = CELL_BY_ID[adjacentId];
    if (!beyond) continue;
    const adjacentPiece = pieceAt(state, adjacentId);
    const supportPiece = pieceAt(state, neighborId(beyond, direction));
    if (adjacentPiece?.side === otherSide(movingSide) && supportPiece?.side === movingSide && !captures.includes(adjacentPiece)) captures.push(adjacentPiece);
  }
  return captures;
}

function neighborId(cell, [dq, dr]) { return cellKey(cell.q + dq, cell.r + dr); }
function formationProgress(state, side) {
  const queen = state.pieces.find((piece) => piece.side === side && piece.kind === "queen");
  const guards = state.pieces.filter((piece) => piece.side === side && piece.kind === "guard");
  return (queen?.cell === cellKey(0, 0) ? 3 : 0) + guards.filter((guard) => CELL_BY_ID[guard.cell]?.ring === 1).length;
}
function sideName(side) { return side === "blue" ? "Sapphire Court" : "Coral Court"; }
function actionKey(action) { return action ? `${action.type}:${action.pieceId}:${action.from || ""}:${action.to}` : ""; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
