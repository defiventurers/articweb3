export const BOARD_SIZE = 9;
export const SIDES = Object.freeze(["red", "blue"]);
export const HAND_TYPES = Object.freeze(["rook", "bishop", "gold", "silver", "knight", "lance", "pawn"]);

export const PIECE_NAMES = Object.freeze({
  king: "King",
  rook: "Rook",
  bishop: "Bishop",
  gold: "Gold General",
  silver: "Silver General",
  knight: "Knight",
  lance: "Lance",
  pawn: "Pawn"
});

export const PROMOTED_NAMES = Object.freeze({
  rook: "Dragon King",
  bishop: "Dragon Horse",
  silver: "Promoted Silver",
  knight: "Promoted Knight",
  lance: "Promoted Lance",
  pawn: "Tokin"
});

export const SHOGI_RULESET = Object.freeze({
  id: "standard-hon-shogi",
  title: "Standard Shogi",
  players: 2,
  board: "9×9 squares",
  pieces: 40,
  randomizer: "None",
  firstPlayer: "red",
  promotionZoneRanks: 3,
  repetitionCount: 4,
  impasseThreshold: 24
});

const GOLD_STEPS = Object.freeze([[-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0], [0, -1]]);
const SILVER_STEPS = Object.freeze([[-1, 1], [0, 1], [1, 1], [-1, -1], [1, -1]]);
const KING_STEPS = Object.freeze([[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]);

export function createShogiState(options = {}) {
  const board = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  let id = 0;
  const place = (side, type, row, col) => { board[indexOf(row, col)] = { id: `${side}-${type}-${id++}`, side, type, promoted: false }; };
  const backRank = ["lance", "knight", "silver", "gold", "king", "gold", "silver", "knight", "lance"];
  backRank.forEach((type, col) => place("blue", type, 0, col));
  place("blue", "rook", 1, 1);
  place("blue", "bishop", 1, 7);
  for (let col = 0; col < BOARD_SIZE; col += 1) place("blue", "pawn", 2, col);
  for (let col = 0; col < BOARD_SIZE; col += 1) place("red", "pawn", 6, col);
  place("red", "bishop", 7, 1);
  place("red", "rook", 7, 7);
  backRank.forEach((type, col) => place("red", type, 8, col));
  const state = baseState({ board, ...options });
  state.positionHistory = [{ key: positionKey(state), mover: null, gaveCheck: false }];
  return state;
}

export function createEmptyShogiState(options = {}) {
  const state = baseState({ board: Array(81).fill(null), ...options });
  state.positionHistory = [{ key: positionKey(state), mover: null, gaveCheck: false }];
  return state;
}

function baseState({ board, turn = "red", hands, mode = "hotseat" }) {
  return {
    board,
    hands: hands || { red: emptyHand(), blue: emptyHand() },
    turn,
    ply: 1,
    mode,
    winner: null,
    draw: false,
    result: null,
    lastAction: null,
    positionHistory: []
  };
}

export function emptyHand() { return Object.fromEntries(HAND_TYPES.map((type) => [type, 0])); }
export function indexOf(row, col) { return row * BOARD_SIZE + col; }
export function coordinatesOf(index) { return { row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE }; }
export function inside(row, col) { return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE; }
export function otherSide(side) { return side === "red" ? "blue" : "red"; }
export function sideName(side) { return side === "red" ? "Crimson Shogunate" : "Sapphire Shogunate"; }
export function isPromotionZone(side, row) { return side === "red" ? row <= 2 : row >= 6; }

export function getLegalActions(state, side = state.turn, options = {}) {
  if (state.winner || state.draw) return [];
  const actions = [];
  for (let from = 0; from < state.board.length; from += 1) {
    const piece = state.board[from];
    if (piece?.side !== side) continue;
    for (const to of pseudoTargets(state.board, from, piece)) {
      const variants = promotionVariants(piece, side, coordinatesOf(from).row, coordinatesOf(to).row);
      for (const promote of variants) {
        const action = { kind: "move", from, to, promote };
        if (leavesKingSafe(state, action, side)) actions.push(action);
      }
    }
  }
  for (const type of HAND_TYPES) {
    if (!state.hands[side][type]) continue;
    for (let to = 0; to < state.board.length; to += 1) {
      if (state.board[to] || !dropDestinationAllowed(state, side, type, to)) continue;
      const action = { kind: "drop", type, to };
      if (!leavesKingSafe(state, action, side)) continue;
      if (type === "pawn" && options.enforcePawnDropMate !== false && isIllegalPawnDropMate(state, action, side)) continue;
      actions.push(action);
    }
  }
  return actions;
}

export function legalActionsForSource(state, source) {
  const actions = getLegalActions(state);
  return typeof source === "number"
    ? actions.filter((action) => action.kind === "move" && action.from === source)
    : actions.filter((action) => action.kind === "drop" && action.type === source);
}

export function applyShogiAction(state, requested) {
  if (state.winner || state.draw) return { error: "This match is already complete." };
  const legal = getLegalActions(state);
  const action = legal.find((candidate) => actionKey(candidate) === actionKey(requested));
  if (!action) return { error: "That move is not legal in this position." };

  const mover = state.turn;
  const opponent = otherSide(mover);
  const next = applyBare(state, action, mover);
  next.turn = opponent;
  next.ply = state.ply + 1;
  const gaveCheck = isInCheck(next, opponent);
  next.lastAction = describeAction(state, action, gaveCheck);

  if (gaveCheck && getLegalActions(next, opponent).length === 0) {
    next.winner = mover;
    next.result = "checkmate";
  } else if (!gaveCheck && getLegalActions(next, opponent).length === 0) {
    next.winner = mover;
    next.result = "no-legal-move";
  }

  const entry = { key: positionKey(next), mover, gaveCheck };
  next.positionHistory = [...state.positionHistory, entry];
  if (!next.winner) resolveRepetition(next);
  return { state: next };
}

export function isInCheck(state, side) {
  const kingIndex = state.board.findIndex((piece) => piece?.side === side && piece.type === "king");
  if (kingIndex < 0) return true;
  return isSquareAttacked(state.board, kingIndex, otherSide(side));
}

export function isSquareAttacked(board, target, bySide) {
  for (let from = 0; from < board.length; from += 1) {
    const piece = board[from];
    if (piece?.side === bySide && pseudoTargets(board, from, piece, true).includes(target)) return true;
  }
  return false;
}

export function assessImpasse(state) {
  if (state.winner || state.draw) return { eligible: false, message: "The match is already complete." };
  const redKing = findKing(state, "red");
  const blueKing = findKing(state, "blue");
  if (redKing < 0 || blueKing < 0 || !isPromotionZone("red", coordinatesOf(redKing).row) || !isPromotionZone("blue", coordinatesOf(blueKing).row)) {
    return { eligible: false, message: "Both kings must be inside the opposing three-rank camp." };
  }
  if (isInCheck(state, "red") || isInCheck(state, "blue")) return { eligible: false, message: "Impasse cannot be assessed while either king is in check." };
  const points = { red: materialPoints(state, "red"), blue: materialPoints(state, "blue") };
  const next = cloneState(state);
  if (points.red >= 24 && points.blue >= 24) {
    next.draw = true;
    next.result = "impasse";
  } else {
    next.winner = points.red < 24 ? "blue" : "red";
    next.result = "impasse-points";
  }
  return { eligible: true, state: next, points };
}

export function materialPoints(state, side) {
  let score = 0;
  for (const piece of state.board) if (piece?.side === side && piece.type !== "king") score += piece.type === "rook" || piece.type === "bishop" ? 5 : 1;
  for (const type of HAND_TYPES) score += state.hands[side][type] * (type === "rook" || type === "bishop" ? 5 : 1);
  return score;
}

export function chooseShogiBotAction(state, side = state.turn) {
  const actions = getLegalActions(state, side);
  if (!actions.length) return null;
  let best = [];
  let bestScore = -Infinity;
  for (const action of actions) {
    const target = state.board[action.to];
    const next = applyBare(state, action, side);
    let score = Math.random() * 0.18;
    if (target) score += pieceValue(target.type) * 3;
    if (action.promote) score += 2.2;
    if (isInCheck(next, otherSide(side))) score += 1.5;
    const ownPiece = next.board[action.to];
    if (ownPiece && isSquareAttacked(next.board, action.to, otherSide(side))) score -= pieceValue(ownPiece.type) * 0.7;
    const { row, col } = coordinatesOf(action.to);
    score += (4 - Math.abs(4 - col)) * 0.05 + (side === "red" ? 8 - row : row) * 0.025;
    if (score > bestScore + 0.001) { bestScore = score; best = [action]; }
    else if (Math.abs(score - bestScore) <= 0.001) best.push(action);
  }
  return best[Math.floor(Math.random() * best.length)];
}

export function positionKey(state) {
  const board = state.board.map((piece) => piece ? `${piece.side[0]}:${piece.type}:${piece.promoted ? 1 : 0}` : "-").join("|");
  const hands = SIDES.map((side) => HAND_TYPES.map((type) => state.hands[side][type]).join(",")).join("|");
  return `${state.turn};${board};${hands}`;
}

export function actionKey(action) {
  if (!action) return "";
  return action.kind === "drop" ? `d:${action.type}:${action.to}` : `m:${action.from}:${action.to}:${action.promote ? 1 : 0}`;
}

export function assetRole(piece) {
  if (!piece.promoted) return piece.type;
  if (piece.type === "rook") return "dragon";
  if (piece.type === "bishop") return "horse";
  if (piece.type === "pawn") return "tokin";
  return `promoted-${piece.type}`;
}

export function displayPieceName(piece) {
  return piece.promoted ? PROMOTED_NAMES[piece.type] || PIECE_NAMES[piece.type] : PIECE_NAMES[piece.type];
}

function pseudoTargets(board, from, piece) {
  const { row, col } = coordinatesOf(from);
  const targets = [];
  const forward = piece.side === "red" ? -1 : 1;
  const land = (nextRow, nextCol) => {
    if (!inside(nextRow, nextCol)) return false;
    const occupant = board[indexOf(nextRow, nextCol)];
    if (occupant?.side === piece.side) return false;
    targets.push(indexOf(nextRow, nextCol));
    return !occupant;
  };
  const steps = (relative) => relative.forEach(([dc, df]) => land(row + df * forward, col + dc));
  const rays = (directions) => directions.forEach(([dc, df]) => {
    let distance = 1;
    while (land(row + df * forward * distance, col + dc * distance)) distance += 1;
  });

  if (piece.type === "king") steps(KING_STEPS);
  else if (piece.promoted && ["pawn", "lance", "knight", "silver"].includes(piece.type)) steps(GOLD_STEPS);
  else if (piece.type === "gold") steps(GOLD_STEPS);
  else if (piece.type === "silver") steps(SILVER_STEPS);
  else if (piece.type === "knight") steps([[-1, 2], [1, 2]]);
  else if (piece.type === "lance") rays([[0, 1]]);
  else if (piece.type === "pawn") steps([[0, 1]]);
  else if (piece.type === "rook") {
    rays([[-1, 0], [1, 0], [0, 1], [0, -1]]);
    if (piece.promoted) steps([[-1, 1], [1, 1], [-1, -1], [1, -1]]);
  } else if (piece.type === "bishop") {
    rays([[-1, 1], [1, 1], [-1, -1], [1, -1]]);
    if (piece.promoted) steps([[-1, 0], [1, 0], [0, 1], [0, -1]]);
  }
  return targets;
}

function promotionVariants(piece, side, fromRow, toRow) {
  if (piece.promoted || piece.type === "king" || piece.type === "gold") return [false];
  const eligible = isPromotionZone(side, fromRow) || isPromotionZone(side, toRow);
  if (!eligible) return [false];
  if (mustPromote(piece.type, side, toRow)) return [true];
  return [false, true];
}

function mustPromote(type, side, row) {
  const last = side === "red" ? 0 : 8;
  const secondLast = side === "red" ? 1 : 7;
  return (type === "pawn" || type === "lance") ? row === last : type === "knight" ? (row === last || row === secondLast) : false;
}

function dropDestinationAllowed(state, side, type, to) {
  const { row, col } = coordinatesOf(to);
  if (mustPromote(type, side, row)) return false;
  if (type === "pawn") {
    for (let scanRow = 0; scanRow < BOARD_SIZE; scanRow += 1) {
      const piece = state.board[indexOf(scanRow, col)];
      if (piece?.side === side && piece.type === "pawn" && !piece.promoted) return false;
    }
  }
  return true;
}

function leavesKingSafe(state, action, side) {
  const next = applyBare(state, action, side);
  return !isInCheck(next, side);
}

function isIllegalPawnDropMate(state, action, side) {
  const opponent = otherSide(side);
  const next = applyBare(state, action, side);
  next.turn = opponent;
  return isInCheck(next, opponent) && getLegalActions(next, opponent, { enforcePawnDropMate: false }).length === 0;
}

function applyBare(state, action, side) {
  const next = cloneState(state);
  if (action.kind === "drop") {
    next.hands[side][action.type] -= 1;
    next.board[action.to] = { id: `${side}-${action.type}-drop-${state.ply}-${action.to}`, side, type: action.type, promoted: false };
    return next;
  }
  const piece = { ...next.board[action.from], promoted: next.board[action.from].promoted || Boolean(action.promote) };
  const captured = next.board[action.to];
  next.board[action.from] = null;
  if (captured && captured.type !== "king") next.hands[side][captured.type] += 1;
  next.board[action.to] = piece;
  return next;
}

function resolveRepetition(state) {
  const key = positionKey(state);
  const occurrences = [];
  state.positionHistory.forEach((entry, index) => { if (entry.key === key) occurrences.push(index); });
  if (occurrences.length < 4) return;
  const start = occurrences.at(-4);
  const cycle = state.positionHistory.slice(start + 1);
  const perpetualChecker = SIDES.find((side) => {
    const turns = cycle.filter((entry) => entry.mover === side);
    return turns.length > 0 && turns.every((entry) => entry.gaveCheck);
  });
  if (perpetualChecker) {
    state.winner = otherSide(perpetualChecker);
    state.result = "perpetual-check";
  } else {
    state.draw = true;
    state.result = "repetition";
  }
}

function describeAction(state, action, gaveCheck) {
  if (action.kind === "drop") return { ...action, text: `${sideName(state.turn)} dropped a ${PIECE_NAMES[action.type]}${gaveCheck ? " with check" : ""}.` };
  const piece = state.board[action.from];
  const capture = state.board[action.to];
  const promoted = action.promote ? ` and promoted to ${PROMOTED_NAMES[piece.type]}` : "";
  return { ...action, text: `${sideName(state.turn)} moved ${PIECE_NAMES[piece.type]}${capture ? ` and captured ${displayPieceName(capture)}` : ""}${promoted}${gaveCheck ? " — check" : ""}.` };
}

function findKing(state, side) { return state.board.findIndex((piece) => piece?.side === side && piece.type === "king"); }
function pieceValue(type) { return ({ king: 100, rook: 9, bishop: 8, gold: 6, silver: 5, knight: 4, lance: 3, pawn: 1 })[type] || 0; }
function cloneState(state) { return { ...state, board: state.board.map((piece) => piece ? { ...piece } : null), hands: { red: { ...state.hands.red }, blue: { ...state.hands.blue } }, positionHistory: [...state.positionHistory], lastAction: state.lastAction ? { ...state.lastAction } : null }; }

