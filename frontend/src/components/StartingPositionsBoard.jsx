import { useMemo, useState } from "react";
import { createStartingBoard } from "../game/gameRules.js";

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

const TEAM_INFO = [
  { team: "red", name: "RETSBA", side: "Left side", color: "red" },
  { team: "blue", name: "PENGU", side: "Right side", color: "blue" },
  { team: "green", name: "ABSTER", side: "Bottom side", color: "green" },
  { team: "yellow", name: "POLLY", side: "Top side", color: "pink" }
];

export function StartingPositionsBoard() {
  const board = useMemo(() => createStartingBoard(), []);

  return (
    <div className="starting-board-shell">
      <div className="starting-board-header">
        <p className="academy-eyebrow">Battlefield Setup</p>
        <h2>All kingdoms start from the edges.</h2>
        <p>The center stays open so fights begin fast instead of dragging through a boring opening.</p>
      </div>

      <div className="starting-board-grid" aria-label="Starting positions for all Arctic Dominion teams">
        {board.flatMap((rowItems, row) => rowItems.map((piece, col) => (
          <div
            key={`${row}-${col}`}
            className={`starting-cell ${piece ? `has-piece team-${piece.team}` : ""}`}
            aria-label={piece ? `${piece.team} ${piece.type}` : `empty ${row + 1}, ${col + 1}`}
          >
            {piece && <StartingPieceImage piece={piece} />}
          </div>
        )))}
      </div>

      <div className="starting-legend">
        {TEAM_INFO.map((item) => (
          <div key={item.team} className={`starting-legend-item ${item.color}`}>
            <span />
            <strong>{item.name}</strong>
            <em>{item.side}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function StartingPieceImage({ piece }) {
  const [failedRemote, setFailedRemote] = useState(false);
  const color = TEAM_ASSET_COLOR[piece.team];
  const type = PIECE_ASSET_TYPE[piece.type];

  if (!color || !type || failedRemote) {
    return <span className="starting-piece-emoji">{PIECE_EMOJI[piece.type] || "?"}</span>;
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
