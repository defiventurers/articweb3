export type XiangqiSide = "red" | "black";
export type XiangqiRole = "general" | "advisor" | "elephant" | "horse" | "chariot" | "cannon" | "soldier";
export type XiangqiSquare = { row: number; col: number };
export type XiangqiPiece = XiangqiSquare & { id: string; side: XiangqiSide; role: XiangqiRole };
export type XiangqiResult = "checkmate" | "stalemate" | null;
export type XiangqiMove = { from: XiangqiSquare; to: XiangqiSquare; side: XiangqiSide; role: XiangqiRole; captured?: XiangqiRole };
export type XiangqiState = {
  pieces: XiangqiPiece[];
  turn: XiangqiSide;
  winner: XiangqiSide | null;
  result: XiangqiResult;
  note: string;
  moveNumber: number;
  lastMove: XiangqiMove | null;
};

export const ROLE_LABELS: Record<XiangqiRole, string> = {
  general: "General", advisor: "Advisor", elephant: "Elephant", horse: "Horse",
  chariot: "Chariot", cannon: "Cannon", soldier: "Soldier",
};
export const SIDE_LABELS: Record<XiangqiSide, string> = { red: "Red / Shu", black: "Blue / Wei" };

const otherSide = (side: XiangqiSide): XiangqiSide => side === "red" ? "black" : "red";
const key = ({ row, col }: XiangqiSquare) => `${row}:${col}`;
const sameSquare = (a: XiangqiSquare, b: XiangqiSquare) => a.row === b.row && a.col === b.col;

export const inBoard = ({ row, col }: XiangqiSquare) => row >= 0 && row < 10 && col >= 0 && col < 9;
export const isInPalace = (side: XiangqiSide, { row, col }: XiangqiSquare) => col >= 3 && col <= 5 && (side === "red" ? row >= 7 && row <= 9 : row >= 0 && row <= 2);
export const isHomeSide = (side: XiangqiSide, row: number) => side === "red" ? row >= 5 : row <= 4;
export const pieceAt = (pieces: XiangqiPiece[], square: XiangqiSquare) => pieces.find((piece) => sameSquare(piece, square));

const canLand = (piece: XiangqiPiece, square: XiangqiSquare, pieces: XiangqiPiece[]) => inBoard(square) && pieceAt(pieces, square)?.side !== piece.side;
const candidate = (piece: XiangqiPiece, square: XiangqiSquare, pieces: XiangqiPiece[], targets: XiangqiSquare[]) => {
  if (canLand(piece, square, pieces)) targets.push(square);
};

const rayTargets = (piece: XiangqiPiece, pieces: XiangqiPiece[]) => {
  const targets: XiangqiSquare[] = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    for (let step = 1; step < 10; step += 1) {
      const square = { row: piece.row + dr * step, col: piece.col + dc * step };
      if (!inBoard(square)) break;
      const blocker = pieceAt(pieces, square);
      if (!blocker) targets.push(square);
      else { if (blocker.side !== piece.side) targets.push(square); break; }
    }
  }
  return targets;
};

const cannonTargets = (piece: XiangqiPiece, pieces: XiangqiPiece[]) => {
  const targets: XiangqiSquare[] = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let screened = false;
    for (let step = 1; step < 10; step += 1) {
      const square = { row: piece.row + dr * step, col: piece.col + dc * step };
      if (!inBoard(square)) break;
      const blocker = pieceAt(pieces, square);
      if (!screened) {
        if (!blocker) targets.push(square);
        else screened = true;
        continue;
      }
      if (!blocker) continue;
      if (blocker.side !== piece.side) targets.push(square);
      break;
    }
  }
  return targets;
};

export function pseudoLegalTargets(piece: XiangqiPiece, pieces: XiangqiPiece[]): XiangqiSquare[] {
  const targets: XiangqiSquare[] = [];
  if (piece.role === "chariot") return rayTargets(piece, pieces);
  if (piece.role === "cannon") return cannonTargets(piece, pieces);

  if (piece.role === "general") {
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
      const square = { row: piece.row + dr, col: piece.col + dc };
      if (isInPalace(piece.side, square)) candidate(piece, square, pieces, targets);
    });
    return targets;
  }

  if (piece.role === "advisor") {
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => {
      const square = { row: piece.row + dr, col: piece.col + dc };
      if (isInPalace(piece.side, square)) candidate(piece, square, pieces, targets);
    });
    return targets;
  }

  if (piece.role === "elephant") {
    [[-2, -2], [-2, 2], [2, -2], [2, 2]].forEach(([dr, dc]) => {
      const square = { row: piece.row + dr, col: piece.col + dc };
      const eye = { row: piece.row + dr / 2, col: piece.col + dc / 2 };
      if (inBoard(square) && isHomeSide(piece.side, square.row) && !pieceAt(pieces, eye)) candidate(piece, square, pieces, targets);
    });
    return targets;
  }

  if (piece.role === "horse") {
    const moves = [
      { dr: -2, dc: -1, legRow: -1, legCol: 0 }, { dr: -2, dc: 1, legRow: -1, legCol: 0 },
      { dr: 2, dc: -1, legRow: 1, legCol: 0 }, { dr: 2, dc: 1, legRow: 1, legCol: 0 },
      { dr: -1, dc: -2, legRow: 0, legCol: -1 }, { dr: 1, dc: -2, legRow: 0, legCol: -1 },
      { dr: -1, dc: 2, legRow: 0, legCol: 1 }, { dr: 1, dc: 2, legRow: 0, legCol: 1 },
    ];
    moves.forEach(({ dr, dc, legRow, legCol }) => {
      const leg = { row: piece.row + legRow, col: piece.col + legCol };
      if (!pieceAt(pieces, leg)) candidate(piece, { row: piece.row + dr, col: piece.col + dc }, pieces, targets);
    });
    return targets;
  }

  const forward = piece.side === "red" ? -1 : 1;
  candidate(piece, { row: piece.row + forward, col: piece.col }, pieces, targets);
  const crossedRiver = piece.side === "red" ? piece.row <= 4 : piece.row >= 5;
  if (crossedRiver) {
    candidate(piece, { row: piece.row, col: piece.col - 1 }, pieces, targets);
    candidate(piece, { row: piece.row, col: piece.col + 1 }, pieces, targets);
  }
  return targets;
}

export const generalsFacing = (pieces: XiangqiPiece[]) => {
  const red = pieces.find((piece) => piece.side === "red" && piece.role === "general");
  const black = pieces.find((piece) => piece.side === "black" && piece.role === "general");
  if (!red || !black || red.col !== black.col) return false;
  const start = Math.min(red.row, black.row) + 1;
  const end = Math.max(red.row, black.row);
  return !pieces.some((piece) => piece.col === red.col && piece.row >= start && piece.row < end);
};

export const isInCheck = (side: XiangqiSide, pieces: XiangqiPiece[]) => {
  const general = pieces.find((piece) => piece.side === side && piece.role === "general");
  if (!general) return true;
  return generalsFacing(pieces) || pieces.some((piece) => piece.side !== side && pseudoLegalTargets(piece, pieces).some((target) => sameSquare(target, general)));
};

const relocate = (pieces: XiangqiPiece[], piece: XiangqiPiece, destination: XiangqiSquare) => {
  const captured = pieceAt(pieces, destination);
  return pieces.filter((candidatePiece) => candidatePiece.id !== captured?.id).map((candidatePiece) => candidatePiece.id === piece.id ? { ...candidatePiece, ...destination } : candidatePiece);
};

export function legalTargets(piece: XiangqiPiece, pieces: XiangqiPiece[]) {
  return pseudoLegalTargets(piece, pieces).filter((target) => {
    const captured = pieceAt(pieces, target);
    if (captured?.role === "general") return false;
    const nextPieces = relocate(pieces, piece, target);
    return !isInCheck(piece.side, nextPieces) && !generalsFacing(nextPieces);
  });
}

export const hasLegalMove = (side: XiangqiSide, pieces: XiangqiPiece[]) => pieces.some((piece) => piece.side === side && legalTargets(piece, pieces).length > 0);

const homeRank = (side: XiangqiSide) => side === "red" ? 9 : 0;
const cannonRank = (side: XiangqiSide) => side === "red" ? 7 : 2;
const soldierRank = (side: XiangqiSide) => side === "red" ? 6 : 3;

export function initialXiangqiState(): XiangqiState {
  const pieces: XiangqiPiece[] = [];
  (["red", "black"] as XiangqiSide[]).forEach((side) => {
    const add = (role: XiangqiRole, row: number, col: number, index: number) => pieces.push({ id: `${side}-${role}-${index}`, side, role, row, col });
    (["chariot", "horse", "elephant", "advisor", "general", "advisor", "elephant", "horse", "chariot"] as XiangqiRole[]).forEach((role, col) => add(role, homeRank(side), col, col));
    add("cannon", cannonRank(side), 1, 0); add("cannon", cannonRank(side), 7, 1);
    [0, 2, 4, 6, 8].forEach((col, index) => add("soldier", soldierRank(side), col, index));
  });
  return { pieces, turn: "red", winner: null, result: null, note: "Red / Shu opens. Select a coin to reveal legal intersections.", moveNumber: 1, lastMove: null };
}

export function applyXiangqiMove(state: XiangqiState, pieceId: string, destination: XiangqiSquare): XiangqiState | null {
  if (state.winner) return null;
  const piece = state.pieces.find((candidatePiece) => candidatePiece.id === pieceId);
  if (!piece || piece.side !== state.turn || !legalTargets(piece, state.pieces).some((target) => sameSquare(target, destination))) return null;
  const captured = pieceAt(state.pieces, destination);
  const pieces = relocate(state.pieces, piece, destination);
  const nextTurn = otherSide(piece.side);
  const checked = isInCheck(nextTurn, pieces);
  const noReply = !hasLegalMove(nextTurn, pieces);
  const action = `${SIDE_LABELS[piece.side]} ${ROLE_LABELS[piece.role]} ${captured ? `captures ${SIDE_LABELS[captured.side]} ${ROLE_LABELS[captured.role]}` : "advances"}`;
  const lastMove: XiangqiMove = { from: { row: piece.row, col: piece.col }, to: destination, side: piece.side, role: piece.role, captured: captured?.role };
  if (noReply) {
    const result: XiangqiResult = checked ? "checkmate" : "stalemate";
    return { pieces, turn: nextTurn, winner: piece.side, result, note: `${action}. ${result === "checkmate" ? "Checkmate" : "Stalemate"} — ${SIDE_LABELS[piece.side]} wins.`, moveNumber: state.moveNumber + 1, lastMove };
  }
  return { pieces, turn: nextTurn, winner: null, result: null, note: `${action}.${checked ? ` Check — ${SIDE_LABELS[nextTurn]} must answer.` : ` ${SIDE_LABELS[nextTurn]} to move.`}`, moveNumber: state.moveNumber + 1, lastMove };
}

export function demoXiangqiState() {
  const commands: [string, XiangqiSquare][] = [
    ["red-cannon-0", { row: 5, col: 1 }], ["black-cannon-0", { row: 4, col: 1 }],
    ["red-horse-1", { row: 7, col: 2 }], ["black-horse-1", { row: 2, col: 2 }],
  ];
  return commands.reduce((state, [pieceId, destination]) => applyXiangqiMove(state, pieceId, destination) ?? state, initialXiangqiState());
}

export function xiangqiStateFrom(pieces: XiangqiPiece[], turn: XiangqiSide = "red"): XiangqiState {
  return { pieces, turn, winner: null, result: null, note: "Test position loaded.", moveNumber: 1, lastMove: null };
}

export const squareKey = key;
