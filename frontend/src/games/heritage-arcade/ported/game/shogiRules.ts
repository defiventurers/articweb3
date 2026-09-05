export type ShogiSide = "sente" | "gote";
export type ShogiRole = "king" | "rook" | "bishop" | "gold" | "silver" | "knight" | "lance" | "pawn";
export type HandRole = Exclude<ShogiRole, "king">;
export type ShogiSquare = { row: number; col: number };
export type ShogiPiece = { id: string; side: ShogiSide; role: ShogiRole; square: ShogiSquare; promoted: boolean };
export type ShogiHands = Record<ShogiSide, Record<HandRole, number>>;
export type ShogiState = {
  pieces: ShogiPiece[];
  hands: ShogiHands;
  turn: ShogiSide;
  moveNumber: number;
  winner: ShogiSide | null;
  note: string;
  lastMove: null | { side: ShogiSide; role: ShogiRole; from?: ShogiSquare; to: ShogiSquare; drop?: boolean; promoted?: boolean };
};

export const ROLE_LABELS: Record<ShogiRole, string> = {
  king: "King", rook: "Rook", bishop: "Bishop", gold: "Gold", silver: "Silver", knight: "Knight", lance: "Lance", pawn: "Pawn",
};
export const SIDE_LABELS: Record<ShogiSide, string> = { sente: "Sente", gote: "Gote" };
export const HAND_ROLES: HandRole[] = ["rook", "bishop", "gold", "silver", "knight", "lance", "pawn"];

const inside = ({ row, col }: ShogiSquare) => row >= 0 && row < 9 && col >= 0 && col < 9;
export const squareKey = ({ row, col }: ShogiSquare) => `${row}:${col}`;
export const sameSquare = (a: ShogiSquare, b: ShogiSquare) => a.row === b.row && a.col === b.col;
export const pieceAt = (pieces: ShogiPiece[], square: ShogiSquare) => pieces.find((piece) => sameSquare(piece.square, square));
const other = (side: ShogiSide): ShogiSide => side === "sente" ? "gote" : "sente";
const emptyHand = (): Record<HandRole, number> => ({ rook: 0, bishop: 0, gold: 0, silver: 0, knight: 0, lance: 0, pawn: 0 });
const forward = (side: ShogiSide) => side === "sente" ? -1 : 1;

function makeInitialPieces(): ShogiPiece[] {
  const pieces: ShogiPiece[] = [];
  const add = (side: ShogiSide, role: ShogiRole, row: number, col: number, suffix: string | number) => pieces.push({ id: `${side}-${role}-${suffix}`, side, role, square: { row, col }, promoted: false });
  const back: ShogiRole[] = ["lance", "knight", "silver", "gold", "king", "gold", "silver", "knight", "lance"];
  back.forEach((role, col) => add("gote", role, 0, col, col));
  add("gote", "rook", 1, 1, 0); add("gote", "bishop", 1, 7, 0);
  for (let col = 0; col < 9; col += 1) add("gote", "pawn", 2, col, col);
  back.forEach((role, col) => add("sente", role, 8, col, col));
  add("sente", "bishop", 7, 1, 0); add("sente", "rook", 7, 7, 0);
  for (let col = 0; col < 9; col += 1) add("sente", "pawn", 6, col, col);
  return pieces;
}

export function initialShogiState(): ShogiState {
  return {
    pieces: makeInitialPieces(),
    hands: { sente: emptyHand(), gote: emptyHand() },
    turn: "sente",
    moveNumber: 1,
    winner: null,
    note: "Sente opens. Capture pieces into your hand, then drop them back under your control.",
    lastMove: null,
  };
}

const stepVectors = (piece: ShogiPiece): [number, number][] => {
  const f = forward(piece.side);
  if (piece.promoted && ["pawn", "lance", "knight", "silver"].includes(piece.role)) return [[f, -1], [f, 0], [f, 1], [0, -1], [0, 1], [-f, 0]];
  if (piece.role === "king") return [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  if (piece.role === "gold") return [[f,-1],[f,0],[f,1],[0,-1],[0,1],[-f,0]];
  if (piece.role === "silver") return [[f,-1],[f,0],[f,1],[-f,-1],[-f,1]];
  if (piece.role === "knight") return [[2 * f, -1], [2 * f, 1]];
  if (piece.role === "pawn") return [[f, 0]];
  if (piece.role === "rook" && piece.promoted) return [[-1,-1],[-1,1],[1,-1],[1,1]];
  if (piece.role === "bishop" && piece.promoted) return [[-1,0],[1,0],[0,-1],[0,1]];
  return [];
};

const slideVectors = (piece: ShogiPiece): [number, number][] => {
  if (piece.role === "rook") return [[-1,0],[1,0],[0,-1],[0,1]];
  if (piece.role === "bishop") return [[-1,-1],[-1,1],[1,-1],[1,1]];
  if (piece.role === "lance" && !piece.promoted) return [[forward(piece.side), 0]];
  return [];
};

function rawTargets(piece: ShogiPiece, pieces: ShogiPiece[]): ShogiSquare[] {
  const targets: ShogiSquare[] = [];
  for (const [dr, dc] of stepVectors(piece)) {
    const square = { row: piece.square.row + dr, col: piece.square.col + dc };
    if (inside(square)) targets.push(square);
  }
  for (const [dr, dc] of slideVectors(piece)) {
    let square = { row: piece.square.row + dr, col: piece.square.col + dc };
    while (inside(square)) {
      targets.push(square);
      if (pieceAt(pieces, square)) break;
      square = { row: square.row + dr, col: square.col + dc };
    }
  }
  return targets;
}

export function inPromotionZone(side: ShogiSide, square: ShogiSquare) {
  return side === "sente" ? square.row <= 2 : square.row >= 6;
}
export function canPromote(piece: ShogiPiece, to: ShogiSquare) {
  return !piece.promoted && !["king", "gold"].includes(piece.role) && (inPromotionZone(piece.side, piece.square) || inPromotionZone(piece.side, to));
}
export function mustPromote(piece: ShogiPiece, to: ShogiSquare) {
  if (piece.promoted) return false;
  const last = piece.side === "sente" ? 0 : 8;
  const penultimate = piece.side === "sente" ? 1 : 7;
  if ((piece.role === "pawn" || piece.role === "lance") && to.row === last) return true;
  if (piece.role === "knight" && (to.row === last || to.row === penultimate)) return true;
  return false;
}

function kingSquare(pieces: ShogiPiece[], side: ShogiSide) { return pieces.find((piece) => piece.side === side && piece.role === "king")?.square; }
export function isInCheck(pieces: ShogiPiece[], side: ShogiSide) {
  const king = kingSquare(pieces, side);
  if (!king) return true;
  return pieces.some((piece) => piece.side !== side && rawTargets(piece, pieces).some((target) => sameSquare(target, king)));
}

function simulateBoardMove(pieces: ShogiPiece[], pieceId: string, to: ShogiSquare, promote: boolean) {
  const mover = pieces.find((piece) => piece.id === pieceId);
  if (!mover) return pieces;
  return pieces.filter((piece) => piece.id === pieceId || !sameSquare(piece.square, to)).map((piece) => piece.id === pieceId ? { ...piece, square: to, promoted: piece.promoted || promote } : piece);
}

export function legalTargets(piece: ShogiPiece, pieces: ShogiPiece[]): ShogiSquare[] {
  return rawTargets(piece, pieces)
    .filter((target) => pieceAt(pieces, target)?.side !== piece.side)
    .filter((target) => !isInCheck(simulateBoardMove(pieces, piece.id, target, mustPromote(piece, target)), piece.side));
}

function cloneHands(hands: ShogiHands): ShogiHands { return { sente: { ...hands.sente }, gote: { ...hands.gote } }; }
function lastRanksBlocked(side: ShogiSide, role: HandRole, square: ShogiSquare) {
  const last = side === "sente" ? 0 : 8;
  const penultimate = side === "sente" ? 1 : 7;
  if ((role === "pawn" || role === "lance") && square.row === last) return true;
  if (role === "knight" && (square.row === last || square.row === penultimate)) return true;
  return false;
}
function hasUnpromotedPawnOnFile(pieces: ShogiPiece[], side: ShogiSide, col: number) {
  return pieces.some((piece) => piece.side === side && piece.role === "pawn" && !piece.promoted && piece.square.col === col);
}
function simulateDrop(state: ShogiState, side: ShogiSide, role: HandRole, to: ShogiSquare): ShogiState {
  const pieces = [...state.pieces, { id: `drop-${side}-${role}-${state.moveNumber}-${to.row}-${to.col}`, side, role, square: to, promoted: false } as ShogiPiece];
  const hands = cloneHands(state.hands); hands[side][role] -= 1;
  return { ...state, pieces, hands };
}

function hasAnyLegalAction(state: ShogiState, side: ShogiSide, enforcePawnDropMate = false) {
  if (state.pieces.some((piece) => piece.side === side && legalTargets(piece, state.pieces).length)) return true;
  return HAND_ROLES.some((role) => state.hands[side][role] > 0 && legalDropSquares(state, side, role, enforcePawnDropMate).length > 0);
}

function isPawnDropMate(state: ShogiState, side: ShogiSide, to: ShogiSquare) {
  const next = simulateDrop(state, side, "pawn", to);
  const defender = other(side);
  if (!isInCheck(next.pieces, defender)) return false;
  return !hasAnyLegalAction({ ...next, turn: defender }, defender, false);
}

export function legalDropSquares(state: ShogiState, side: ShogiSide, role: HandRole, enforcePawnDropMate = true): ShogiSquare[] {
  if (state.hands[side][role] <= 0) return [];
  const squares: ShogiSquare[] = [];
  for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) {
    const square = { row, col };
    if (pieceAt(state.pieces, square) || lastRanksBlocked(side, role, square)) continue;
    if (role === "pawn" && hasUnpromotedPawnOnFile(state.pieces, side, col)) continue;
    const next = simulateDrop(state, side, role, square);
    if (isInCheck(next.pieces, side)) continue;
    if (enforcePawnDropMate && role === "pawn" && isPawnDropMate(state, side, square)) continue;
    squares.push(square);
  }
  return squares;
}

function adjudicate(state: ShogiState, mover: ShogiSide): ShogiState {
  const defender = other(mover);
  const checked = isInCheck(state.pieces, defender);
  const mate = checked && !hasAnyLegalAction({ ...state, turn: defender }, defender, true);
  if (mate) return { ...state, winner: mover, note: `${SIDE_LABELS[mover]} checkmates ${SIDE_LABELS[defender]}.` };
  return { ...state, note: checked ? `${SIDE_LABELS[defender]} is in check.` : `${SIDE_LABELS[defender]} to move.` };
}

export function applyShogiMove(state: ShogiState, pieceId: string, to: ShogiSquare, promote = false): ShogiState | null {
  if (state.winner) return null;
  const piece = state.pieces.find((item) => item.id === pieceId);
  if (!piece || piece.side !== state.turn || !legalTargets(piece, state.pieces).some((target) => sameSquare(target, to))) return null;
  const captured = pieceAt(state.pieces, to);
  const forced = mustPromote(piece, to);
  const promoted = forced || (promote && canPromote(piece, to));
  const hands = cloneHands(state.hands);
  if (captured && captured.role !== "king") hands[piece.side][captured.role as HandRole] += 1;
  const pieces = simulateBoardMove(state.pieces, piece.id, to, promoted);
  const next: ShogiState = {
    ...state, pieces, hands, turn: other(piece.side), moveNumber: state.moveNumber + 1,
    lastMove: { side: piece.side, role: piece.role, from: piece.square, to, promoted },
  };
  if (captured?.role === "king") return { ...next, winner: piece.side, note: `${SIDE_LABELS[piece.side]} wins.` };
  return adjudicate(next, piece.side);
}

export function applyShogiDrop(state: ShogiState, role: HandRole, to: ShogiSquare): ShogiState | null {
  if (state.winner || !legalDropSquares(state, state.turn, role, true).some((square) => sameSquare(square, to))) return null;
  const mover = state.turn;
  const dropped = simulateDrop(state, mover, role, to);
  const next: ShogiState = {
    ...dropped, turn: other(mover), moveNumber: state.moveNumber + 1,
    lastMove: { side: mover, role, to, drop: true },
  };
  return adjudicate(next, mover);
}
