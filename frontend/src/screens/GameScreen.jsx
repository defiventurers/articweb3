import { useEffect, useMemo, useState } from "react";
import { DICE_ROLLS, TEAM_COLOR, TEAM_LABEL, createInitialGameState, currentTeam } from "../game/gameRules.js";
import { endGameTurn, getGameState, rollGameDice, selectGameSquare } from "../network/socketClient.js";

const LOCAL_PIECE_ASSET_BASE = "/assets/arctic/pieces";
const REMOTE_PIECE_ASSET_BASE =
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

const PIECE_LETTER = {
  king: "K",
  elephant: "E",
  horse: "H",
  ship: "S",
  pawn: "P"
};

export function GameScreen({ room, profile, onRoomUpdate, onFinishDemo, onBackToLobby }) {
  const [serverRoom, setServerRoom] = useState(room);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const game = serverRoom?.gameState || createInitialGameState();
  const team = currentTeam(game);
  const activePlayer = serverRoom?.players?.find((player) => player.team === team);
  const isMyTurn = activePlayer?.wallet === profile.wallet;
  const isBotTurn = Boolean(activePlayer?.wallet?.startsWith("dev-"));
  const statusText = getStatusText({ game, team, isMyTurn, isBotTurn, busy, error });
  const activeLegalSquares = useMemo(
    () => new Map((game.legalMoves || []).map((move) => [`${move.toRow},${move.toCol}`, move])),
    [game.legalMoves]
  );

  useEffect(() => {
    setServerRoom(room);
  }, [room]);

  useEffect(() => {
    let cancelled = false;

    getGameState({ roomCode: room.roomCode, profile })
      .then((nextRoom) => {
        if (cancelled) return;
        updateRoom(nextRoom);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load game state.");
      });

    function handlePacket(event) {
      const packet = event.detail;
      const nextRoom = packet?.payload?.room;
      if (packet?.type !== "room_state" || !nextRoom) return;
      if (nextRoom.roomCode !== room.roomCode) return;
      updateRoom(nextRoom);
    }

    window.addEventListener("server-packet", handlePacket);
    return () => {
      cancelled = true;
      window.removeEventListener("server-packet", handlePacket);
    };
  }, [room.roomCode, profile]);

  function updateRoom(nextRoom) {
    setServerRoom(nextRoom);
    onRoomUpdate?.(nextRoom);
  }

  async function runAction(action) {
    if (busy || !isMyTurn || game.gameOver) return;
    setBusy(true);
    setError("");
    try {
      const nextRoom = await action();
      updateRoom(nextRoom);
    } catch (err) {
      setError(err.message || "Game action failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleRoll() {
    runAction(() => rollGameDice({ roomCode: serverRoom.roomCode, profile }));
  }

  function handleCell(row, col) {
    runAction(() => selectGameSquare({ roomCode: serverRoom.roomCode, profile, row, col }));
  }

  function handleEndTurn() {
    runAction(() => endGameTurn({ roomCode: serverRoom.roomCode, profile }));
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
            <div className="game-status-badge">ROOM {serverRoom.roomCode}</div>
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
                    {piece && <PieceImage piece={piece} className="game-piece" />}
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
            <button className="game-action-hitbox new-game-hitbox" aria-label="Finish match" onClick={onFinishDemo} />
            <button className="game-back-button" onClick={onBackToLobby}>Lobby</button>
          </div>

          {(game.moveLog?.length > 0 || error) && (
            <div className="game-log" aria-live="polite">
              {error && <span>{error}</span>}
              {(game.moveLog || []).slice(0, 3).map((item, index) => (
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
      <PieceImage piece={{ team, type }} className="dice-piece-img" />
    </span>
  );
}

function PieceImage({ piece, className }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const sources = pieceImageSources(piece);
  const src = sources[sourceIndex];

  useEffect(() => {
    setSourceIndex(0);
  }, [piece.team, piece.type]);

  if (!src) {
    return <span className="piece-fallback">{PIECE_LETTER[piece.type] || "?"}</span>;
  }

  return (
    <img
      className={className}
      src={src}
      alt=""
      aria-hidden="true"
      draggable="false"
      onError={() => setSourceIndex((current) => current + 1)}
    />
  );
}

function getStatusText({ game, team, isMyTurn, isBotTurn, busy, error }) {
  if (error) return error;
  if (game.gameOver) return "Game over";
  if (busy) return "Waiting for server";
  if (isBotTurn) return "Bot thinking";
  if (!isMyTurn) return "Waiting for opponent";
  if (!game.dice.rolled) return "You · Roll dice";
  return "You · Move a piece";
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

function pieceImageSources(piece) {
  const color = TEAM_ASSET_COLOR[piece.team];
  const type = PIECE_ASSET_TYPE[piece.type];
  if (!color || !type) return [];

  return [
    `${LOCAL_PIECE_ASSET_BASE}/${color}-${type}.png`,
    `${REMOTE_PIECE_ASSET_BASE}/${color}-${type}.png`
  ];
}
