import { useEffect, useMemo, useState } from "react";
import {
  COLS,
  PIECE_NAME,
  ROWS,
  createEmptyBoard,
  getMovementPreviewTargets,
  makePiece
} from "../game/gameRules.js";

const LOCAL_PIECE_ASSET_BASE = "/assets/arctic/pieces";
const REMOTE_PIECE_ASSET_BASE =
  "https://raw.githubusercontent.com/defiventurers/chaturanga-game/36d8ee9ae33fa08a21ba3d644b6053b9e13273e4/public/assets/arctic/pieces";

const TEAM_ASSET_COLOR = { green: "green", red: "red", blue: "blue", yellow: "pink" };
const PIECE_ASSET_TYPE = {
  king: "frost-king",
  elephant: "war-mammoth",
  horse: "aurora-unicorn",
  ship: "icebreaker",
  pawn: "snow-guard"
};

const PIECE_EMOJI = {
  king: "👑",
  elephant: "🦣",
  horse: "🦄",
  ship: "🚢",
  pawn: "🐧"
};

const PIECE_OPTIONS = [
  {
    type: "pawn",
    label: "Snow Guard",
    shortRule: "Moves forward. Captures diagonally forward.",
    tip: "Use Guards to protect lanes and create capture pressure."
  },
  {
    type: "ship",
    label: "Icebreaker",
    shortRule: "Moves straight across rows or columns.",
    tip: "The Icebreaker controls long open lanes."
  },
  {
    type: "elephant",
    label: "War Mammoth",
    shortRule: "Jumps exactly 2 tiles diagonally.",
    tip: "The Mammoth is a power jumper. Use it to break locked positions."
  },
  {
    type: "horse",
    label: "Aurora Unicorn",
    shortRule: "Moves in an L-shape and jumps over pieces.",
    tip: "The Unicorn is your surprise attacker. It creates chaos fast."
  },
  {
    type: "king",
    label: "Frost King",
    shortRule: "Moves 1 tile in any direction.",
    tip: "Protect this piece. If it gets captured, your kingdom falls."
  }
];

const TEAM_NAME = {
  red: "RETSBA",
  blue: "PENGU",
  green: "ABSTER",
  yellow: "POLLY"
};

export function TutorialBoard({ teamColor = "red" }) {
  const tutorialTeam = normalizeTeam(teamColor);
  const [pieceType, setPieceType] = useState("pawn");
  const [board, setBoard] = useState(() => createTutorialSetup("pawn", tutorialTeam).board);
  const [selected, setSelected] = useState(null);
  const [lastAction, setLastAction] = useState("Tap a piece below, then tap it on the board.");
  const selectedPiece = PIECE_OPTIONS.find((piece) => piece.type === pieceType) || PIECE_OPTIONS[0];

  useEffect(() => {
    resetBoard(pieceType, tutorialTeam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieceType, tutorialTeam]);

  const legalMoves = useMemo(() => {
    if (!selected) return [];
    return getMovementPreviewTargets({ board, gameOver: false }, selected.row, selected.col);
  }, [board, selected]);

  const legalMap = useMemo(() => {
    return new Map(legalMoves.map((move) => [`${move.toRow},${move.toCol}`, move]));
  }, [legalMoves]);

  function resetBoard(nextPieceType = pieceType, nextTeam = tutorialTeam) {
    const setup = createTutorialSetup(nextPieceType, nextTeam);
    setBoard(setup.board);
    setSelected(null);
    setLastAction(`Tap the ${PIECE_NAME[nextPieceType]} on the board to reveal legal moves.`);
  }

  function choosePiece(nextPieceType) {
    setPieceType(nextPieceType);
  }

  function handleCell(row, col) {
    const move = legalMap.get(`${row},${col}`);
    if (selected && move) {
      const nextBoard = cloneBoard(board);
      const piece = nextBoard[move.fromRow][move.fromCol];
      const captured = nextBoard[move.toRow][move.toCol];
      nextBoard[move.toRow][move.toCol] = piece ? { ...piece } : null;
      nextBoard[move.fromRow][move.fromCol] = null;
      setBoard(nextBoard);
      setSelected(null);
      if (captured?.type === "king") {
        setLastAction(`${PIECE_NAME[piece.type]} captured the Frost King. Kingdom erased.`);
      } else if (captured) {
        setLastAction(`${PIECE_NAME[piece.type]} captured ${PIECE_NAME[captured.type]}.`);
      } else {
        setLastAction(`${PIECE_NAME[piece.type]} moved to glowing ice.`);
      }
      return;
    }

    const piece = board[row]?.[col];
    if (piece?.team === tutorialTeam && piece.type === pieceType) {
      setSelected({ row, col });
      setLastAction(`${PIECE_NAME[piece.type]} selected. Tap a glowing tile to move.`);
      return;
    }

    if (selected) {
      setSelected(null);
      setLastAction("Selection cleared. Tap your piece again.");
    }
  }

  return (
    <div className="tutorial-board-shell">
      <div className="tutorial-board-header">
        <div>
          <p className="academy-eyebrow">Try Every Piece</p>
          <h2>{selectedPiece.label}</h2>
          <p>{selectedPiece.shortRule}</p>
        </div>
        <button type="button" onClick={() => resetBoard()} className="tutorial-reset-btn">Reset</button>
      </div>

      <div className="tutorial-board-grid" aria-label="Interactive Arctic Dominion tutorial board">
        {board.flatMap((rowItems, row) => rowItems.map((piece, col) => {
          const key = `${row}-${col}`;
          const move = legalMap.get(`${row},${col}`);
          const isSelected = selected?.row === row && selected?.col === col;
          const classes = ["tutorial-cell"];
          if (isSelected) classes.push("selected");
          if (move?.captured) classes.push("capture");
          else if (move) classes.push("legal");
          if (piece?.team === tutorialTeam && piece.type === pieceType) classes.push("own-piece");

          return (
            <button
              type="button"
              key={key}
              className={classes.join(" ")}
              aria-label={piece ? `${piece.team} ${piece.type}` : `empty ${row + 1}, ${col + 1}`}
              onClick={() => handleCell(row, col)}
            >
              {piece && <TutorialPieceImage piece={piece} />}
            </button>
          );
        }))}
      </div>

      <div className="tutorial-feedback" aria-live="polite">
        <strong>{TEAM_NAME[tutorialTeam]} Training</strong>
        <span>{lastAction}</span>
      </div>

      <div className="tutorial-piece-tray" aria-label="Choose piece to train">
        {PIECE_OPTIONS.map((piece) => (
          <button
            type="button"
            key={piece.type}
            className={piece.type === pieceType ? "active" : ""}
            onClick={() => choosePiece(piece.type)}
          >
            <span>{PIECE_EMOJI[piece.type]}</span>
            <strong>{piece.label}</strong>
          </button>
        ))}
      </div>

      <p className="tutorial-piece-tip">{selectedPiece.tip}</p>
    </div>
  );
}

function TutorialPieceImage({ piece }) {
  const [failedRemote, setFailedRemote] = useState(false);
  const color = TEAM_ASSET_COLOR[piece.team];
  const type = PIECE_ASSET_TYPE[piece.type];

  if (!color || !type || failedRemote) {
    return <span className="tutorial-piece-emoji">{PIECE_EMOJI[piece.type] || "?"}</span>;
  }

  const filename = `${color}-${type}.png`;
  const localSrc = `${LOCAL_PIECE_ASSET_BASE}/${filename}`;
  const remoteSrc = `${REMOTE_PIECE_ASSET_BASE}/${filename}`;

  return (
    <img
      src={localSrc}
      alt={`${piece.team} ${piece.type}`}
      draggable="false"
      onError={(event) => {
        if (event.currentTarget.src !== remoteSrc) {
          event.currentTarget.src = remoteSrc;
        } else {
          setFailedRemote(true);
        }
      }}
    />
  );
}

function createTutorialSetup(pieceType, team) {
  const board = createEmptyBoard();
  const start = getStartPosition(pieceType, team);
  const enemyTeam = getEnemyTeam(team);
  board[start.row][start.col] = makePiece(team, pieceType, pieceType === "king");

  getEnemyTargets(pieceType, team, start).forEach((target) => {
    board[target.row][target.col] = makePiece(enemyTeam, target.type || "king", target.type === "king");
  });

  return { board, start };
}

function getStartPosition(pieceType, team) {
  if (pieceType !== "pawn") return { row: 4, col: 3 };
  const starts = {
    green: { row: 5, col: 3 },
    red: { row: 4, col: 2 },
    blue: { row: 4, col: 5 },
    yellow: { row: 2, col: 3 }
  };
  return starts[team] || starts.green;
}

function getEnemyTargets(pieceType, team, start) {
  if (pieceType === "pawn") {
    const captures = {
      green: [[-1, -1], [-1, 1]],
      red: [[-1, 1], [1, 1]],
      blue: [[-1, -1], [1, -1]],
      yellow: [[1, -1], [1, 1]]
    }[team] || [[-1, -1], [-1, 1]];
    return captures.map(([dr, dc], index) => ({
      row: start.row + dr,
      col: start.col + dc,
      type: index === 0 ? "pawn" : "king"
    })).filter(isInBounds);
  }

  const targets = {
    ship: [{ row: start.row - 3, col: start.col, type: "king" }, { row: start.row, col: start.col + 3, type: "pawn" }],
    elephant: [{ row: start.row - 2, col: start.col + 2, type: "king" }, { row: start.row + 2, col: start.col - 2, type: "pawn" }],
    horse: [{ row: start.row - 2, col: start.col + 1, type: "king" }, { row: start.row + 1, col: start.col + 2, type: "pawn" }],
    king: [{ row: start.row - 1, col: start.col + 1, type: "king" }, { row: start.row + 1, col: start.col, type: "pawn" }]
  };

  return (targets[pieceType] || []).filter(isInBounds);
}

function getEnemyTeam(team) {
  return ({ red: "blue", blue: "red", green: "yellow", yellow: "green" })[team] || "blue";
}

function normalizeTeam(color) {
  if (color === "pink") return "yellow";
  return ["red", "blue", "green", "yellow"].includes(color) ? color : "red";
}

function isInBounds(target) {
  return target.row >= 0 && target.row < ROWS && target.col >= 0 && target.col < COLS;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}
