import { useEffect, useMemo, useState } from "react";
import {
  COLS,
  DICE_ROLLS,
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

const DIE_FACE_META = {
  1: { icon: "🐧/👑", label: "Guard or King" },
  2: { icon: "🦣", label: "War Mammoth" },
  3: { icon: "🦄", label: "Aurora Unicorn" },
  4: { icon: "🚢", label: "Icebreaker" },
  5: { icon: "🐧/👑", label: "Guard or King" },
  6: { icon: "🚢", label: "Icebreaker" }
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
    shortRule: "Jumps exactly 2 tiles diagonally.",
    tip: "The Icebreaker is a sharp angle jumper. Use it to punish exposed corners."
  },
  {
    type: "elephant",
    label: "War Mammoth",
    shortRule: "Moves straight across rows or columns.",
    tip: "The Mammoth controls long lanes and crushes open files."
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

const EMPTY_DICE = { values: [null, null], used: [false, false], rolled: false };

export function TutorialBoard({ teamColor = "red", diceMode = false }) {
  const tutorialTeam = normalizeTeam(teamColor);
  const [pieceType, setPieceType] = useState("pawn");
  const [board, setBoard] = useState(() => createTutorialSetup("pawn", tutorialTeam).board);
  const [selected, setSelected] = useState(null);
  const [dice, setDice] = useState(EMPTY_DICE);
  const [lastAction, setLastAction] = useState(() => getInitialMessage("pawn", diceMode));
  const selectedPiece = PIECE_OPTIONS.find((piece) => piece.type === pieceType) || PIECE_OPTIONS[0];

  useEffect(() => {
    resetBoard(pieceType, tutorialTeam, { keepDice: true, message: getInitialMessage(pieceType, diceMode) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialTeam, diceMode]);

  const availablePieceTypes = useMemo(() => {
    if (!diceMode || !dice.rolled) return PIECE_OPTIONS.map((piece) => piece.type);
    const out = new Set();
    dice.values.forEach((value, index) => {
      if (!value || dice.used[index]) return;
      DICE_ROLLS[value].forEach((type) => out.add(type));
    });
    return [...out];
  }, [dice, diceMode]);

  const activeDieIndex = useMemo(() => {
    if (!diceMode) return 0;
    return dice.values.findIndex((value, index) => {
      return value && !dice.used[index] && DICE_ROLLS[value].includes(pieceType);
    });
  }, [dice, diceMode, pieceType]);

  const legalMoves = useMemo(() => {
    if (!selected) return [];
    if (diceMode && activeDieIndex === -1) return [];
    return getMovementPreviewTargets({ board, gameOver: false }, selected.row, selected.col);
  }, [activeDieIndex, board, diceMode, selected]);

  const legalMap = useMemo(() => {
    return new Map(legalMoves.map((move) => [`${move.toRow},${move.toCol}`, move]));
  }, [legalMoves]);

  function resetBoard(nextPieceType = pieceType, nextTeam = tutorialTeam, options = {}) {
    const setup = createTutorialSetup(nextPieceType, nextTeam);
    setBoard(setup.board);
    setSelected(null);
    if (!options.keepDice) setDice(EMPTY_DICE);
    setLastAction(options.message || getInitialMessage(nextPieceType, diceMode));
  }

  function choosePiece(nextPieceType) {
    if (diceMode && !dice.rolled) {
      setPieceType(nextPieceType);
      resetBoard(nextPieceType, tutorialTeam, { keepDice: true, message: "Roll two Dominion Dice, then move one matching piece." });
      return;
    }

    if (diceMode && !availablePieceTypes.includes(nextPieceType)) {
      setLastAction(`${PIECE_NAME[nextPieceType]} is not active. Pick a piece shown by your unused dice.`);
      return;
    }

    setPieceType(nextPieceType);
    resetBoard(nextPieceType, tutorialTeam, { keepDice: true, message: `Tap the ${PIECE_NAME[nextPieceType]} on the board, then move to glowing ice.` });
  }

  function rollTutorialDice() {
    const values = [rollD6(), rollD6()];
    const allowed = values.flatMap((value) => DICE_ROLLS[value]);
    const nextPieceType = PIECE_OPTIONS.find((piece) => allowed.includes(piece.type))?.type || "pawn";
    setDice({ values, used: [false, false], rolled: true });
    setPieceType(nextPieceType);
    resetBoard(nextPieceType, tutorialTeam, {
      keepDice: true,
      message: `Rolled ${getDieLabel(values[0])} and ${getDieLabel(values[1])}. Choose a matching piece and move.`
    });
  }

  function handleCell(row, col) {
    if (diceMode && !dice.rolled) {
      setLastAction("Roll two Dominion Dice first.");
      return;
    }

    if (diceMode && activeDieIndex === -1) {
      setLastAction(`${PIECE_NAME[pieceType]} is not active on your unused dice.`);
      return;
    }

    const move = legalMap.get(`${row},${col}`);
    if (selected && move) {
      const nextBoard = cloneBoard(board);
      const piece = nextBoard[move.fromRow][move.fromCol];
      const captured = nextBoard[move.toRow][move.toCol];
      nextBoard[move.toRow][move.toCol] = piece ? { ...piece } : null;
      nextBoard[move.fromRow][move.fromCol] = null;
      setBoard(nextBoard);
      setSelected(null);

      const nextDice = { values: [...dice.values], used: [...dice.used], rolled: dice.rolled };
      if (diceMode && activeDieIndex >= 0) nextDice.used[activeDieIndex] = true;
      if (diceMode) setDice(nextDice);

      const actionText = getMoveResultText(piece, captured);
      if (diceMode) {
        const remaining = getRemainingDiceTypes(nextDice);
        setLastAction(remaining.length ? `${actionText} Use your second die: ${remaining.join(" or ")}.` : `${actionText} Both dice used. Roll again.`);
      } else {
        setLastAction(actionText);
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
    <div className={`tutorial-board-shell ${diceMode ? "dice-mode" : "free-mode"}`}>
      <div className="tutorial-board-header">
        <div>
          <p className="academy-eyebrow">{diceMode ? "Roll & Move" : "Try Every Piece"}</p>
          <h2>{diceMode ? "Dominion Dice Drill" : selectedPiece.label}</h2>
          <p>{diceMode ? "Roll two dice. Move pieces matching the unused dice symbols." : selectedPiece.shortRule}</p>
        </div>
        <button type="button" onClick={() => resetBoard(pieceType)} className="tutorial-reset-btn">Reset</button>
      </div>

      {diceMode && (
        <div className="tutorial-dice-panel">
          <button type="button" className="tutorial-roll-btn" onClick={rollTutorialDice}>Roll Two Dice</button>
          <div className="tutorial-dice-slots" aria-label="Tutorial dice results">
            {[0, 1].map((index) => (
              <div key={index} className={`tutorial-die ${dice.used[index] ? "used" : ""}`}>
                <span>{dice.values[index] ? DIE_FACE_META[dice.values[index]].icon : "🎲"}</span>
                <strong>{dice.values[index] ? DIE_FACE_META[dice.values[index]].label : `Die ${index + 1}`}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

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
        {PIECE_OPTIONS.map((piece) => {
          const unavailable = diceMode && dice.rolled && !availablePieceTypes.includes(piece.type);
          return (
            <button
              type="button"
              key={piece.type}
              className={`${piece.type === pieceType ? "active" : ""} ${unavailable ? "unavailable" : ""}`}
              onClick={() => choosePiece(piece.type)}
            >
              <span>{PIECE_EMOJI[piece.type]}</span>
              <strong>{piece.label}</strong>
            </button>
          );
        })}
      </div>

      <p className="tutorial-piece-tip">{diceMode ? "Dice limits your options in real matches. Use both dice when possible." : selectedPiece.tip}</p>
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
    ship: [{ row: start.row - 2, col: start.col + 2, type: "king" }, { row: start.row + 2, col: start.col - 2, type: "pawn" }],
    elephant: [{ row: start.row - 3, col: start.col, type: "king" }, { row: start.row, col: start.col + 3, type: "pawn" }],
    horse: [{ row: start.row - 2, col: start.col + 1, type: "king" }, { row: start.row + 1, col: start.col + 2, type: "pawn" }],
    king: [{ row: start.row - 1, col: start.col + 1, type: "king" }, { row: start.row + 1, col: start.col, type: "pawn" }]
  };

  return (targets[pieceType] || []).filter(isInBounds);
}

function getInitialMessage(pieceType, diceMode) {
  if (diceMode) return "Roll two Dominion Dice, then move one matching piece.";
  return `Tap the ${PIECE_NAME[pieceType]} on the board to reveal legal moves.`;
}

function getMoveResultText(piece, captured) {
  if (!piece) return "Move complete.";
  if (captured?.type === "king") return `${PIECE_NAME[piece.type]} captured the Frost King. Kingdom erased.`;
  if (captured) return `${PIECE_NAME[piece.type]} captured ${PIECE_NAME[captured.type]}.`;
  return `${PIECE_NAME[piece.type]} moved to glowing ice.`;
}

function getRemainingDiceTypes(dice) {
  const names = new Set();
  dice.values.forEach((value, index) => {
    if (!value || dice.used[index]) return;
    DICE_ROLLS[value].forEach((type) => names.add(PIECE_NAME[type]));
  });
  return [...names];
}

function getDieLabel(value) {
  return DIE_FACE_META[value]?.label || `Die ${value}`;
}

function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
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
