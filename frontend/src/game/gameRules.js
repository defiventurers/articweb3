export const ROWS = 8;
export const COLS = 8;
export const PLAYERS = ["green", "red", "blue", "yellow"];

export const TEAM_LABEL = {
  green: "Green",
  red: "Red",
  blue: "Blue",
  yellow: "Pink"
};

export const TEAM_COLOR = {
  green: "#75db9e",
  red: "#ff9ea3",
  blue: "#a8c4ff",
  yellow: "#ffb7e1"
};

export const PIECE_NAME = {
  king: "Frost King",
  elephant: "War Mammoth",
  horse: "Aurora Unicorn",
  ship: "Icebreaker",
  pawn: "Snow Guard"
};

export const DICE_ROLLS = {
  1: ["pawn", "king"],
  2: ["elephant"],
  3: ["horse"],
  4: ["ship"],
  5: ["pawn", "king"],
  6: ["ship"]
};

const PROMOTION_PIECES = {
  yellow: {
    "7,0": "ship", "7,1": "horse", "7,2": "elephant", "7,3": "king",
    "7,4": "king", "7,5": "elephant", "7,6": "horse", "7,7": "ship"
  },
  red: {
    "7,7": "ship", "6,7": "elephant", "5,7": "horse", "4,7": "king",
    "3,7": "king", "2,7": "horse", "1,7": "elephant", "0,7": "ship"
  },
  green: {
    "0,0": "ship", "0,1": "horse", "0,2": "elephant", "0,3": "king",
    "0,4": "king", "0,5": "elephant", "0,6": "horse", "0,7": "ship"
  },
  blue: {
    "7,0": "ship", "6,0": "horse", "5,0": "elephant", "4,0": "king",
    "3,0": "king", "2,0": "elephant", "1,0": "horse", "0,0": "ship"
  }
};

export function createInitialGameState() {
  return {
    board: createStartingBoard(),
    currentPlayerIndex: 0,
    selected: null,
    legalMoves: [],
    dice: { values: [null, null], used: [false, false], rolled: false },
    moveLog: [],
    gameOver: false,
    winner: null
  };
}

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function createStartingBoard() {
  const board = createEmptyBoard();

  board[0][0] = makePiece("yellow", "ship");
  board[0][1] = makePiece("yellow", "horse");
  board[0][2] = makePiece("yellow", "elephant");
  board[0][3] = makePiece("yellow", "king", true);
  board[1][0] = makePiece("yellow", "pawn");
  board[1][1] = makePiece("yellow", "pawn");
  board[1][2] = makePiece("yellow", "pawn");
  board[1][3] = makePiece("yellow", "pawn");

  board[7][0] = makePiece("red", "ship");
  board[6][0] = makePiece("red", "horse");
  board[5][0] = makePiece("red", "elephant");
  board[4][0] = makePiece("red", "king", true);
  board[7][1] = makePiece("red", "pawn");
  board[6][1] = makePiece("red", "pawn");
  board[5][1] = makePiece("red", "pawn");
  board[4][1] = makePiece("red", "pawn");

  board[7][4] = makePiece("green", "king", true);
  board[7][5] = makePiece("green", "elephant");
  board[7][6] = makePiece("green", "horse");
  board[7][7] = makePiece("green", "ship");
  board[6][4] = makePiece("green", "pawn");
  board[6][5] = makePiece("green", "pawn");
  board[6][6] = makePiece("green", "pawn");
  board[6][7] = makePiece("green", "pawn");

  board[3][7] = makePiece("blue", "king", true);
  board[2][7] = makePiece("blue", "elephant");
  board[1][7] = makePiece("blue", "horse");
  board[0][7] = makePiece("blue", "ship");
  board[3][6] = makePiece("blue", "pawn");
  board[2][6] = makePiece("blue", "pawn");
  board[1][6] = makePiece("blue", "pawn");
  board[0][6] = makePiece("blue", "pawn");

  return board;
}

export function makePiece(team, type, isRoyal = false) {
  return { team, type, isRoyal };
}

export function currentTeam(state) {
  return PLAYERS[state.currentPlayerIndex];
}

export function rollDiceForState(state) {
  if (state.gameOver || state.dice.rolled) return state;
  return {
    ...state,
    selected: null,
    legalMoves: [],
    dice: {
      values: [rollD6(), rollD6()],
      used: [false, false],
      rolled: true
    }
  };
}

export function selectSquare(state, row, col) {
  if (state.gameOver || !state.dice.rolled) return state;

  const chosenMove = state.legalMoves.find((move) => move.toRow === row && move.toCol === col);
  if (chosenMove) return applyMove(state, chosenMove);

  const team = currentTeam(state);
  const piece = state.board[row]?.[col];
  if (!piece || piece.team !== team) {
    return { ...state, selected: null, legalMoves: [] };
  }

  const legalMoves = getLegalMovesForPiece(state, row, col);
  if (!legalMoves.length) return { ...state, selected: null, legalMoves: [] };

  return {
    ...state,
    selected: { row, col },
    legalMoves
  };
}

export function getLegalMovesForPiece(state, row, col) {
  const piece = state.board[row]?.[col];
  if (!piece || state.gameOver || !state.dice.rolled) return [];

  const activeDieIndexes = [0, 1].filter((dieIndex) => {
    const value = state.dice.values[dieIndex];
    return value && !state.dice.used[dieIndex] && DICE_ROLLS[value].includes(piece.type);
  });

  if (!activeDieIndexes.length) return [];

  const moves = [];
  activeDieIndexes.forEach((dieIndex) => {
    getPossibleTargets(state, row, col, piece).forEach(([toRow, toCol]) => {
      const target = state.board[toRow][toCol];
      if (target && target.team === piece.team) return;
      moves.push({
        fromRow: row,
        fromCol: col,
        toRow,
        toCol,
        dieIndex,
        captured: target || null
      });
    });
  });

  return dedupeMoves(moves);
}

export function getMovementPreviewTargets(state, row, col) {
  const piece = state.board[row]?.[col];
  if (!piece || state.gameOver) return [];

  return getPossibleTargets(state, row, col, piece)
    .filter(([toRow, toCol]) => {
      const target = state.board[toRow][toCol];
      return !target || target.team !== piece.team;
    })
    .map(([toRow, toCol]) => ({
      fromRow: row,
      fromCol: col,
      toRow,
      toCol,
      captured: state.board[toRow][toCol] || null
    }));
}

export function getAllLegalMovesForTeam(state, team = currentTeam(state)) {
  const moves = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const piece = state.board[row][col];
      if (piece && piece.team === team) moves.push(...getLegalMovesForPiece(state, row, col));
    }
  }
  return moves;
}

export function hasAnyLegalMoveForTeam(state, team = currentTeam(state)) {
  return getAllLegalMovesForTeam(state, team).length > 0;
}

export function applyMove(state, move) {
  const board = cloneBoard(state.board);
  const piece = board[move.fromRow][move.fromCol];
  if (!piece) return state;

  const captured = board[move.toRow][move.toCol];
  board[move.toRow][move.toCol] = { ...piece };
  board[move.fromRow][move.fromCol] = null;

  const dice = {
    values: [...state.dice.values],
    used: [...state.dice.used],
    rolled: state.dice.rolled
  };
  dice.used[move.dieIndex] = true;

  const moveLog = [...state.moveLog];
  if (captured) {
    moveLog.unshift(`${TEAM_LABEL[piece.team]} captured ${TEAM_LABEL[captured.team]} ${PIECE_NAME[captured.type]}`);
  } else {
    moveLog.unshift(`${TEAM_LABEL[piece.team]} moved ${PIECE_NAME[piece.type]}`);
  }

  maybePromotePawn(board[move.toRow][move.toCol], move.toRow, move.toCol, moveLog);

  if (captured?.type === "king") {
    removeTeamPieces(board, captured.team);
    moveLog.unshift(`${TEAM_LABEL[captured.team]} eliminated`);
  }

  let next = {
    ...state,
    board,
    dice,
    selected: null,
    legalMoves: [],
    moveLog: moveLog.slice(0, 6)
  };

  next = checkWinner(next);
  if (next.gameOver) return next;

  const team = currentTeam(next);
  if (next.dice.used.every(Boolean) || !hasAnyLegalMoveForTeam(next, team)) {
    return endTurn(next);
  }

  return next;
}

export function endTurn(state) {
  if (state.gameOver) return state;

  let nextIndex = state.currentPlayerIndex;
  for (let i = 0; i < PLAYERS.length; i += 1) {
    nextIndex = (nextIndex + 1) % PLAYERS.length;
    if (teamHasKing(state.board, PLAYERS[nextIndex])) break;
  }

  return {
    ...state,
    currentPlayerIndex: nextIndex,
    selected: null,
    legalMoves: [],
    dice: { values: [null, null], used: [false, false], rolled: false }
  };
}

export function pickBotMove(state) {
  const team = currentTeam(state);
  const moves = getAllLegalMovesForTeam(state, team);
  if (!moves.length) return null;
  const captures = moves.filter((move) => move.captured);
  const options = captures.length ? captures : moves;
  return options[Math.floor(Math.random() * options.length)];
}

function getPossibleTargets(state, row, col, piece) {
  if (piece.type === "king") return kingMoves(row, col);
  if (piece.type === "pawn") return pawnMoves(state, row, col, piece.team);
  if (piece.type === "ship") return shipMoves(row, col);
  if (piece.type === "horse") return horseMoves(row, col);
  if (piece.type === "elephant") return mammothMoves(state, row, col);
  return [];
}

function pawnMoves(state, row, col, team) {
  const directions = {
    yellow: { forward: [1, 0], captures: [[1, -1], [1, 1]] },
    red: { forward: [0, 1], captures: [[-1, 1], [1, 1]] },
    green: { forward: [-1, 0], captures: [[-1, -1], [-1, 1]] },
    blue: { forward: [0, -1], captures: [[-1, -1], [1, -1]] }
  };

  const spec = directions[team];
  if (!spec) return [];

  const out = [];
  const [fr, fc] = spec.forward;
  const fRow = row + fr;
  const fCol = col + fc;
  if (inBounds(fRow, fCol) && !state.board[fRow][fCol]) out.push([fRow, fCol]);

  spec.captures.forEach(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c)) return;
    const target = state.board[r][c];
    if (target && target.team !== team) out.push([r, c]);
  });

  return out;
}

function kingMoves(row, col) {
  return oneStepMoves(row, col, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
}

function horseMoves(row, col) {
  return [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]
    .map(([dr, dc]) => [row + dr, col + dc])
    .filter(([r, c]) => inBounds(r, c));
}

function shipMoves(row, col) {
  return [[2, 2], [2, -2], [-2, 2], [-2, -2]]
    .map(([dr, dc]) => [row + dr, col + dc])
    .filter(([r, c]) => inBounds(r, c));
}

function mammothMoves(state, row, col) {
  return slideMoves(state, row, col, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
}

function oneStepMoves(row, col, dirs) {
  return dirs
    .map(([dr, dc]) => [row + dr, col + dc])
    .filter(([r, c]) => inBounds(r, c));
}

function slideMoves(state, row, col, dirs) {
  const out = [];
  for (const [dr, dc] of dirs) {
    for (let step = 1; step < 8; step += 1) {
      const r = row + dr * step;
      const c = col + dc * step;
      if (!inBounds(r, c)) break;
      out.push([r, c]);
      if (state.board[r][c]) break;
    }
  }
  return out;
}

function maybePromotePawn(piece, row, col, moveLog) {
  if (!piece || piece.type !== "pawn") return;
  const promotionType = PROMOTION_PIECES[piece.team]?.[`${row},${col}`];
  if (!promotionType) return;
  piece.type = promotionType;
  piece.isRoyal = false;
  moveLog.unshift(`${TEAM_LABEL[piece.team]} pawn promoted to ${PIECE_NAME[promotionType]}`);
}

function removeTeamPieces(board, team) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row][col]?.team === team) board[row][col] = null;
    }
  }
}

function checkWinner(state) {
  const alive = PLAYERS.filter((team) => teamHasKing(state.board, team));
  if (alive.length > 1) return state;
  return {
    ...state,
    gameOver: true,
    winner: alive[0] || null,
    selected: null,
    legalMoves: []
  };
}

function teamHasKing(board, team) {
  return board.some((row) => row.some((piece) => piece && piece.team === team && piece.type === "king"));
}

function inBounds(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function dedupeMoves(moves) {
  const seen = new Set();
  return moves.filter((move) => {
    const key = `${move.fromRow},${move.fromCol},${move.toRow},${move.toCol},${move.dieIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}
