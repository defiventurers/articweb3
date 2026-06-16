import { useMemo, useState } from "react";
import { COLS, PIECE_NAME, ROWS, createEmptyBoard, makePiece } from "../game/gameRules.js";

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
const PIECE_EMOJI = { king: "👑", elephant: "🦣", horse: "🦄", ship: "🚢", pawn: "🐧" };

const TEAM_NAME = {
  red: "RETSBA",
  blue: "PENGU",
  green: "ABSTER",
  yellow: "POLLY"
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

const PROMOTION_OPTIONS = [
  { type: "ship", icon: "🚢", label: "Icebreaker", note: "angle jumper" },
  { type: "horse", icon: "🦄", label: "Aurora Unicorn", note: "L-shape jumper" },
  { type: "elephant", icon: "🦣", label: "War Mammoth", note: "straight lane power" },
  { type: "king", icon: "👑", label: "Frost King", note: "fighter only, not royal" }
];

const FORWARD = {
  yellow: [1, 0],
  red: [0, 1],
  green: [-1, 0],
  blue: [0, -1]
};

export function PromotionBoard({ teamColor = "red" }) {
  const team = normalizeTeam(teamColor);
  const [promotionType, setPromotionType] = useState("ship");
  const [selected, setSelected] = useState(false);
  const [promoted, setPromoted] = useState(false);

  const route = useMemo(() => getPromotionRoute(team, promotionType), [team, promotionType]);
  const board = useMemo(() => buildPromotionBoard(team, promotionType, promoted), [team, promotionType, promoted]);
  const promotionSquares = useMemo(() => getPromotionSquares(team), [team]);
  const selectedOption = PROMOTION_OPTIONS.find((option) => option.type === promotionType) || PROMOTION_OPTIONS[0];

  function reset(nextType = promotionType) {
    setPromotionType(nextType);
    setSelected(false);
    setPromoted(false);
  }

  function handleCell(row, col) {
    if (promoted) {
      setSelected(false);
      return;
    }

    if (row === route.start.row && col === route.start.col) {
      setSelected(true);
      return;
    }

    if (selected && row === route.target.row && col === route.target.col) {
      setPromoted(true);
      setSelected(false);
      return;
    }

    setSelected(false);
  }

  return (
    <div className="promotion-board-shell">
      <div className="promotion-board-header">
        <div>
          <p className="academy-eyebrow">Promotion Drill</p>
          <h2>Promote Snow Guards.</h2>
          <p>Reach the enemy edge. The square decides what your Guard becomes.</p>
        </div>
        <button type="button" className="tutorial-reset-btn" onClick={() => reset()}>Reset</button>
      </div>

      <div className="promotion-target-tray" aria-label="Choose promotion target">
        {PROMOTION_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.type}
            className={promotionType === option.type ? "active" : ""}
            onClick={() => reset(option.type)}
          >
            <span>{option.icon}</span>
            <strong>{option.label}</strong>
            <em>{option.note}</em>
          </button>
        ))}
      </div>

      <div className="promotion-board-grid" aria-label="Interactive Snow Guard promotion board">
        {board.flatMap((rowItems, row) => rowItems.map((piece, col) => {
          const key = `${row}-${col}`;
          const promoType = promotionSquares.get(`${row},${col}`);
          const isStart = row === route.start.row && col === route.start.col;
          const isTarget = row === route.target.row && col === route.target.col;
          const classes = ["promotion-cell"];
          if (promoType) classes.push("promotion-zone", `promo-${promoType}`);
          if (isStart && !promoted) classes.push("promotion-start");
          if (isTarget) classes.push("promotion-target");
          if (selected && isTarget) classes.push("legal");
          if (promoted && isTarget) classes.push("promoted");

          return (
            <button
              type="button"
              key={key}
              className={classes.join(" ")}
              aria-label={piece ? `${piece.team} ${piece.type}` : `empty ${row + 1}, ${col + 1}`}
              onClick={() => handleCell(row, col)}
            >
              {promoType && !piece && <small>{PIECE_EMOJI[promoType]}</small>}
              {piece && <PromotionPieceImage piece={piece} />}
            </button>
          );
        }))}
      </div>

      <div className="promotion-feedback" aria-live="polite">
        <strong>{TEAM_NAME[team]} Promotion Path</strong>
        <span>
          {promoted
            ? `Snow Guard promoted to ${PIECE_NAME[promotionType]}. ${promotionType === "king" ? "This Frost King is a fighter, not your royal King." : "It now moves as that piece."}`
            : selected
              ? `Tap the glowing edge square to become ${selectedOption.label}.`
              : `Tap the Snow Guard, then move to the ${selectedOption.label} promotion square.`}
        </span>
      </div>
    </div>
  );
}

function buildPromotionBoard(team, promotionType, promoted) {
  const board = createEmptyBoard();
  const route = getPromotionRoute(team, promotionType);
  if (promoted) {
    board[route.target.row][route.target.col] = makePiece(team, promotionType, false);
  } else {
    board[route.start.row][route.start.col] = makePiece(team, "pawn");
  }
  return board;
}

function getPromotionRoute(team, promotionType) {
  const target = getPromotionTarget(team, promotionType);
  const [forwardRow, forwardCol] = FORWARD[team] || FORWARD.red;
  return {
    target,
    start: {
      row: target.row - forwardRow,
      col: target.col - forwardCol
    }
  };
}

function getPromotionTarget(team, promotionType) {
  const entry = Object.entries(PROMOTION_PIECES[team] || PROMOTION_PIECES.red)
    .find(([, type]) => type === promotionType);
  const [row, col] = (entry?.[0] || "7,7").split(",").map(Number);
  return { row, col };
}

function getPromotionSquares(team) {
  return new Map(Object.entries(PROMOTION_PIECES[team] || PROMOTION_PIECES.red));
}

function PromotionPieceImage({ piece }) {
  const [failedRemote, setFailedRemote] = useState(false);
  const color = TEAM_ASSET_COLOR[piece.team];
  const type = PIECE_ASSET_TYPE[piece.type];

  if (!color || !type || failedRemote) {
    return <span className="promotion-piece-emoji">{PIECE_EMOJI[piece.type] || "?"}</span>;
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

function normalizeTeam(color) {
  if (color === "pink") return "yellow";
  return ["red", "blue", "green", "yellow"].includes(color) ? color : "red";
}
