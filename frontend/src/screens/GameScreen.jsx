const OLD_ASSET_BASE =
  "https://raw.githubusercontent.com/defiventurers/chaturanga-game/36d8ee9ae33fa08a21ba3d644b6053b9e13273e4/public/assets/arctic/pieces";

const TEAM_ASSET_COLOR = {
  green: "green",
  red: "red",
  blue: "blue",
  yellow: "pink"
};

const PIECE_ASSET_TYPE = {
  king: "frost-king",
  elephant: "war-mammoth",
  horse: "aurora-unicorn",
  ship: "icebreaker",
  pawn: "snow-guard"
};

const STARTING_BOARD = createStartingBoard();

export function GameScreen({ room, profile, onFinishDemo, onBackToLobby }) {
  return (
    <section className="game-screen-page" aria-label="Game screen">
      <div className="game-stage">
        <div className="game-overlay">
          <div className="game-status-overlay" aria-live="polite">
            <div>
              <div className="game-status-turn">Green Turn</div>
              <div className="game-status-main">{profile.name} · Board preview</div>
            </div>
            <div className="game-status-badge">ROOM {room.roomCode}</div>
          </div>

          <div className="board-overlay">
            <div className="board-grid" aria-label="8 by 8 Arctic Dominion board">
              {STARTING_BOARD.flatMap((row, rowIndex) =>
                row.map((piece, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    className="board-cell"
                    aria-label={piece ? `${piece.team} ${piece.type}` : `empty ${rowIndex + 1},${colIndex + 1}`}
                  >
                    {piece && (
                      <img
                        className="game-piece"
                        src={pieceImageSrc(piece)}
                        alt={`${piece.team} ${piece.type}`}
                        draggable="false"
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="dice-overlay">
            <div className="dice-slot">ROLL</div>
            <div className="dice-slot">DICE</div>
          </div>

          <div className="game-action-layer">
            <button className="game-action-hitbox roll-hitbox" aria-label="Roll dice" />
            <button className="game-action-hitbox end-turn-hitbox" aria-label="End turn" />
            <button className="game-action-hitbox new-game-hitbox" aria-label="Finish demo match" onClick={onFinishDemo} />
            <button className="game-back-button" onClick={onBackToLobby}>Lobby</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function createStartingBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));

  board[0][0] = piece("yellow", "ship");
  board[0][1] = piece("yellow", "horse");
  board[0][2] = piece("yellow", "elephant");
  board[0][3] = piece("yellow", "king");
  board[1][0] = piece("yellow", "pawn");
  board[1][1] = piece("yellow", "pawn");
  board[1][2] = piece("yellow", "pawn");
  board[1][3] = piece("yellow", "pawn");

  board[7][0] = piece("red", "ship");
  board[6][0] = piece("red", "horse");
  board[5][0] = piece("red", "elephant");
  board[4][0] = piece("red", "king");
  board[7][1] = piece("red", "pawn");
  board[6][1] = piece("red", "pawn");
  board[5][1] = piece("red", "pawn");
  board[4][1] = piece("red", "pawn");

  board[7][4] = piece("green", "king");
  board[7][5] = piece("green", "elephant");
  board[7][6] = piece("green", "horse");
  board[7][7] = piece("green", "ship");
  board[6][4] = piece("green", "pawn");
  board[6][5] = piece("green", "pawn");
  board[6][6] = piece("green", "pawn");
  board[6][7] = piece("green", "pawn");

  board[3][7] = piece("blue", "king");
  board[2][7] = piece("blue", "elephant");
  board[1][7] = piece("blue", "horse");
  board[0][7] = piece("blue", "ship");
  board[3][6] = piece("blue", "pawn");
  board[2][6] = piece("blue", "pawn");
  board[1][6] = piece("blue", "pawn");
  board[0][6] = piece("blue", "pawn");

  return board;
}

function piece(team, type) {
  return { team, type };
}

function pieceImageSrc(piece) {
  const color = TEAM_ASSET_COLOR[piece.team];
  const type = PIECE_ASSET_TYPE[piece.type];
  return `${OLD_ASSET_BASE}/${color}-${type}.png`;
}
