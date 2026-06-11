import { useEffect, useMemo, useState } from "react";
import {
  DICE_ROLLS,
  PIECE_NAME,
  TEAM_COLOR,
  TEAM_LABEL,
  applyMove,
  createInitialGameState,
  currentTeam,
  endTurn,
  getAllLegalMovesForTeam,
  hasAnyLegalMoveForTeam,
  pickBotMove,
  rollDiceForState,
  selectSquare
} from "../game/gameRules.js";

const PIECE_ASSET_BASE = "/assets/arctic/pieces";

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

const BOT_DELAY_MS = 650;

export function GameScreen({ room, profile, onFinishDemo, onBackToLobby }) {
  const [game, setGame] = useState(() => createInitialGameState());
  const team = currentTeam(game);
  const isBotTurn = team !== "green" && !game.gameOver;
  const statusText = getStatusText(game, team, isBotTurn);
  const activeLegalSquares = useMemo(
    () => new Map(game.legalMoves.map((move) => [`${move.toRow},${move.toCol}`, move])),
    [game.legalMoves]
  );

  useEffect(() => {
    setGame(createInitialGameState());
  }, [room?.roomCode]);

  useEffect(() => {
    if (!isBotTurn) return;

    const timer = window.setTimeout(() => {
      setGame((current) => playBotTurn(current));
    }, BOT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isBotTurn, game.currentPlayerIndex, game.dice.rolled, game.dice.values[0], game.dice.values[1]]);

  function handleRoll() {
    if (isBotTurn) return;
    setGame((current) => {
      const rolled = rollDiceForState(current);
      const rolledTeam = currentTeam(rolled);
      if (rolled.dice.rolled && !hasAnyLegalMoveForTeam(rolled, rolledTeam)) return endTurn(rolled);
      return rolled;
    });
  }

  function handleCell(row, col) {
    if (isBotTurn) return;
    setGame((current) => selectSquare(current, row, col));
  }

  function handleEndTurn() {
    if (isBotTurn) return;
    setGame((current) => endTurn(current));
  }

  function handleNewGame() {
    setGame(createInitialGameState());
  }

  return (
    <section className="game-screen-page" aria-label="Game screen">
      <div className="game-stage" style={{ "--active-player-color": TEAM_COLOR[team] }}>
        <div className="game-overlay">
          <div className="game-status-overlay" aria-live="polite">
            <div>
              <div className="game-status-turn">{game.gameOver ? winnerText(game) : `${TEAM_LABEL[team]} Turn`}</div>
              <div className="game-status-main">{statusText}</div>
            </div>
            <div className="game-status-badge">ROOM {room.roomCode}</div>
          </div>

          <div className="board-overlay">
            <div className="board-grid" aria-label="8 by 8 Arctic Dominion board">
              {renderBoardRows(game.board).map(({ piece, row, col }) => {
                const selected = game.selected?.row === row && game.selected?.col === col;
                const move = activeLegalSquares.get(`${row},${col}`);
                const classes = ["board-cell"];
                if (selected) classes.push("selected");
                if (move?.captured) classes.push("capture");
                else if (move) classes.push("legal");

                return (
                  <button
                    key={`${row}-${col}`}
                    className={classes.join(" ")}
                    aria-label={piece ? `${piece.team} ${piece.type}` : `empty ${row + 1},${col + 1}`}
                    onClick={() => handleCell(row, col)}
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
                );
              })}
            </div>
          </div>

          <div className="dice-overlay">
            {[0, 1].map((index) => (
              <div className="dice-slot" key={index}>
                <DiceFace game={game} index={index} team={team} />
              </div>
            ))}
          </div>

          <div className="game-action-layer">
            <button className="game-action-hitbox roll-hitbox" aria-label="Roll dice" onClick={handleRoll} />
            <button className="game-action-hitbox end-turn-hitbox" aria-label="End turn" onClick={handleEndTurn} />
            <button className="game-action-hitbox new-game-hitbox" aria-label="New game" onClick={handleNewGame} />
            <button className="game-back-button" onClick={onBackToLobby}>Lobby</button>
          </div>

          {game.moveLog.length > 0 && (
            <div className="game-log" aria-live="polite">
              {game.moveLog.slice(0, 3).map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DiceFace({ game, index, team }) {
  const value = game.dice.values[index];
  const used = game.dice.used[index];

  if (!value) return <span className="die-piece">{index === 0 ? "ROLL" : "DICE"}</span>;
  if (used) return <span className="die-piece">USED</span>;

  const allowed = DICE_ROLLS[value];
  const type = allowed[0];

  return (
    <span className="die-piece">
      <img src={pieceImageSrc({ team, type })} alt={`${value}: ${allowed.join("/")}`} draggable="false" />
    </span>
  );
}

function playBotTurn(game) {
  if (game.gameOver) return game;
  if (currentTeam(game) === "green") return game;

  let next = game;
  if (!next.dice.rolled) {
    next = rollDiceForState(next);
  }

  const move = pickBotMove(next);
  if (!move) return endTurn(next);
  return applyMove(next, move);
}

function getStatusText(game, team, isBotTurn) {
  if (game.gameOver) return "Game over · New game to restart";
  if (isBotTurn) return "Bot thinking";
  if (!game.dice.rolled) return `${profileControlLabel(team)} · Roll dice`;
  const moves = getAllLegalMovesForTeam(game, team);
  if (!moves.length) return "No legal moves · End turn";
  return `${profileControlLabel(team)} · Move a piece`;
}

function profileControlLabel(team) {
  return team === "green" ? "You" : "Bot";
}

function winnerText(game) {
  return game.winner ? `${TEAM_LABEL[game.winner]} Wins` : "No Winner";
}

function renderBoardRows(board) {
  const cells = [];
  for (let row = 7; row >= 0; row -= 1) {
    for (let col = 0; col < 8; col += 1) {
      cells.push({ piece: board[row][col], row, col });
    }
  }
  return cells;
}

function pieceImageSrc(piece) {
  const color = TEAM_ASSET_COLOR[piece.team];
  const type = PIECE_ASSET_TYPE[piece.type];
  return `${PIECE_ASSET_BASE}/${color}-${type}.png`;
}
