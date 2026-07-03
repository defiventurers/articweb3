import { useEffect, useMemo, useRef, useState } from "react";
import { DICE_ROLLS, TEAM_COLOR, TEAM_LABEL, createInitialGameState, currentTeam, hasAnyLegalMoveForTeam } from "../game/gameRules.js";
import { endGameTurn, getGameState, rollGameDice, selectGameSquare } from "../network/socketClient.js";
import { soundManager } from "../utils/soundManager.js";

const LOCAL_PIECE_ASSET_BASE = "/assets/arctic/pieces";
const REMOTE_PIECE_ASSET_BASE =
  "https://raw.githubusercontent.com/defiventurers/chaturanga-game/36d8ee9ae33fa08a21ba3d644b6053b9e13273e4/public/assets/arctic/pieces";
const REMOTE_DESKTOP_GAME_ART =
  "https://raw.githubusercontent.com/defiventurers/articweb3/main/frontend/public/assets/screens/arctic-dominion-game-base-desktop.png";

const TEAM_ASSET_COLOR = { green: "green", red: "red", blue: "blue", yellow: "pink" };
const PIECE_ASSET_TYPE = { king: "frost-king", elephant: "war-mammoth", horse: "aurora-unicorn", ship: "icebreaker", pawn: "snow-guard" };
const PIECE_LETTER = { king: "K", elephant: "E", horse: "H", ship: "S", pawn: "P" };

export function GameScreen({ room, profile, onRoomUpdate, onFinishDemo, onMainMenu, onBackToLobby }) {
  const [serverRoom, setServerRoom] = useState(room);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const previousRoomRef = useRef(null);
  const game = serverRoom?.gameState || createInitialGameState();
  const team = currentTeam(game);
  const activePlayer = serverRoom?.players?.find((player) => player.team === team);
  const isMyTurn = activePlayer?.wallet === profile.wallet;
  const isBotTurn = Boolean(activePlayer?.wallet?.startsWith("dev-"));
  const hasLegalMoveForRoll = game.dice.rolled ? hasAnyLegalMoveForTeam(game, team) : true;
  const statusText = getStatusText({ game, team, isMyTurn, isBotTurn, busy, error, hasLegalMoveForRoll });
  const eliminatedTeams = game.eliminatedTeams || [];
  const activeLegalSquares = useMemo(() => new Map((game.legalMoves || []).map((move) => [`${move.toRow},${move.toCol}`, move])), [game.legalMoves]);

  useEffect(() => { setServerRoom(room); }, [room]);
  useEffect(() => { if (serverRoom?.status !== "finished") return; const timer = setTimeout(() => onFinishDemo?.(), 1000); return () => clearTimeout(timer); }, [serverRoom?.status, onFinishDemo]);

  useEffect(() => {
    let cancelled = false;
    getGameState({ roomCode: room.roomCode, profile }).then((nextRoom) => { if (!cancelled) updateRoom(nextRoom); }).catch((err) => { if (!cancelled) { soundManager.play("uiError"); setError(err.message || "Could not load game state."); } });
    function handlePacket(event) { const packet = event.detail; const nextRoom = packet?.payload?.room; if (packet?.type !== "room_state" || !nextRoom) return; if (nextRoom.roomCode !== room.roomCode) return; updateRoom(nextRoom); }
    window.addEventListener("server-packet", handlePacket);
    return () => { cancelled = true; window.removeEventListener("server-packet", handlePacket); };
  }, [room.roomCode, profile]);

  useEffect(() => {
    const previousRoom = previousRoomRef.current;
    if (previousRoom?.gameState && serverRoom?.gameState) {
      const previousTeam = previousRoom.gameState.gameOver ? null : currentTeam(previousRoom.gameState);
      const nextTeam = game.gameOver ? null : currentTeam(game);
      if (previousTeam && nextTeam && previousTeam !== nextTeam) soundManager.play("turnChange", { cooldownMs: 260 });
      if ((game.eliminatedTeams || []).length > (previousRoom.gameState.eliminatedTeams || []).length) soundManager.play("teamEliminated", { cooldownMs: 800 });
    }
    if (previousRoom?.status !== "finished" && serverRoom?.status === "finished") soundManager.play("victory", { cooldownMs: 1200 });
    previousRoomRef.current = serverRoom;
  }, [serverRoom, game]);

  function updateRoom(nextRoom) { setServerRoom(nextRoom); onRoomUpdate?.(nextRoom); }
  async function runAction(action) { if (busy || !isMyTurn || game.gameOver) { soundManager.play("invalidAction", { cooldownMs: 160 }); return; } setBusy(true); setError(""); try { updateRoom(await action()); } catch (err) { soundManager.play("uiError"); setError(err.message || "Game action failed."); } finally { setBusy(false); } }
  function handleRoll() {
    if (game.dice.rolled) {
      if (!hasLegalMoveForRoll) {
        soundManager.play("turnChange", { cooldownMs: 260 });
        return runAction(() => endGameTurn({ roomCode: serverRoom.roomCode, profile }));
      }
      soundManager.play("invalidAction");
      setError("Dice already rolled. Move a piece or press End Turn.");
      return;
    }
    soundManager.play("diceRoll", { cooldownMs: 220 });
    runAction(() => rollGameDice({ roomCode: serverRoom.roomCode, profile }));
  }
  function handleCell(row, col) {
    const move = activeLegalSquares.get(`${row},${col}`);
    const clickedPiece = game.board?.[row]?.[col];
    const selectedPiece = game.selected ? game.board?.[game.selected.row]?.[game.selected.col] : null;

    if (move && selectedPiece) {
      soundManager.play(move.captured ? "capture" : soundManager.pieceMoveSound(selectedPiece.type), { cooldownMs: 120 });
    } else if (clickedPiece && clickedPiece.team === team) {
      soundManager.play("pieceSelect", { cooldownMs: 120 });
    } else {
      soundManager.play("invalidAction", { cooldownMs: 160 });
    }

    runAction(() => selectGameSquare({ roomCode: serverRoom.roomCode, profile, row, col }));
  }
  function handleEndTurn() { soundManager.play("turnChange", { cooldownMs: 260 }); runAction(() => endGameTurn({ roomCode: serverRoom.roomCode, profile })); }

  return (
    <section className="game-screen-page" aria-label="Game screen">
      <div className="game-stage" style={{ "--active-player-color": TEAM_COLOR[team] }}>
        <img
          className="game-stage-art"
          src="/assets/screens/arctic-dominion-game-base-desktop.png"
          alt=""
          aria-hidden="true"
          draggable="false"
          decoding="async"
          data-webp-preferred="true"
          onError={(event) => {
            if (!event.currentTarget.dataset.remoteFallbackApplied) {
              event.currentTarget.dataset.remoteFallbackApplied = "true";
              event.currentTarget.src = REMOTE_DESKTOP_GAME_ART;
            }
          }}
        />
        <div className="game-overlay">
          <div className="game-status-overlay" aria-live="polite">
            <div>
              <div className="game-status-turn">{game.gameOver ? winnerText(game) : `${TEAM_LABEL[team]} Turn`}</div>
              <div className="game-status-main">{serverRoom?.status === "finished" ? "Match complete. Loading results..." : statusText}</div>
              {eliminatedTeams.length > 0 && <div className="game-status-main">Eliminated: {eliminatedTeams.map((item) => TEAM_LABEL[item] || item).join(", ")}</div>}
            </div>
            <div className="game-status-badge">ROOM {serverRoom.roomCode}</div>
          </div>
          <div className="board-overlay"><div className="board-grid" aria-label="8 by 8 Arctic Dominion board">{renderBoardRows(game.board).map(({ piece, row, col }) => { const selected = game.selected?.row === row && game.selected?.col === col; const move = activeLegalSquares.get(`${row},${col}`); const classes = ["board-cell"]; if (selected) classes.push("selected"); if (move?.captured) classes.push("capture"); else if (move) classes.push("legal"); return <button key={`${row}-${col}`} className={classes.join(" ")} aria-label={piece ? `${piece.team} ${piece.type}` : `empty ${row + 1},${col + 1}`} onClick={() => handleCell(row, col)}>{piece && <PieceImage piece={piece} className="game-piece" />}</button>; })}</div></div>
          <div className="dice-overlay">{[0, 1].map((index) => <div className="dice-slot" key={index}><DiceFace game={game} index={index} team={team} /></div>)}</div>
          <div className="game-action-layer"><button className="game-action-hitbox roll-hitbox" aria-label="Roll dice" onClick={handleRoll} /><button className="game-action-hitbox end-turn-hitbox" aria-label="End turn" onClick={handleEndTurn} /><button className="game-action-hitbox new-game-hitbox" aria-label="Main Menu" onClick={onMainMenu || onBackToLobby || onFinishDemo} /><button className="game-back-button" onClick={onBackToLobby}>Lobby</button></div>
          {error && <div className="game-log" aria-live="polite"><span>{error}</span></div>}
        </div>
      </div>
    </section>
  );
}

function DiceFace({ game, index, team }) {
  const value = game.dice.values[index];
  const used = game.dice.used?.[index];
  if (!value) return <span className="die-piece dice-placeholder">{index === 0 ? "ROLL" : "DICE"}</span>;
  if (used) return <span className="die-piece dice-placeholder">USED</span>;
  const pieces = DICE_ROLLS[value] || [];
  return (
    <div className="die-piece die-piece-visual" aria-label={`${value}: ${pieces.join(" or ")}`} title={`${value}: ${pieces.join(" or ")}`}>
      <span className="die-piece-icons">
        {pieces.map((pieceType) => (
          <PieceImage key={pieceType} piece={{ team, type: pieceType }} className="dice-piece-icon" />
        ))}
      </span>
    </div>
  );
}
function PieceImage({ piece, className }) { const color = TEAM_ASSET_COLOR[piece.team]; const type = PIECE_ASSET_TYPE[piece.type]; if (!color || !type) return <span>{PIECE_LETTER[piece.type] || "?"}</span>; const filename = `${color}-${type}.png`; const remoteSrc = `${REMOTE_PIECE_ASSET_BASE}/${filename}`; const localSrc = `${LOCAL_PIECE_ASSET_BASE}/${filename}`; return <img src={remoteSrc} alt={`${TEAM_LABEL[piece.team]} ${piece.type}`} className={className} draggable="false" decoding="async" onError={(event) => { if (event.currentTarget.src !== localSrc) event.currentTarget.src = localSrc; }} />; }
function renderBoardRows(board) { const cells = []; board.forEach((rowItems, row) => { rowItems.forEach((piece, col) => cells.push({ piece, row, col })); }); return cells; }
function getStatusText({ game, team, isMyTurn, isBotTurn, busy, error, hasLegalMoveForRoll }) { if (error) return error; if (game.gameOver) return "Match complete."; if (isBotTurn) return "Bot is moving..."; if (!isMyTurn) return "Waiting for your turn."; if (busy) return "Submitting move..."; if (!game.dice.rolled) return "Roll dice."; if (!hasLegalMoveForRoll) return "No legal moves for this roll. Press End Turn, or tap Roll Dice to auto-skip."; return `${TEAM_LABEL[team]} rolled ${game.dice.values.join(" and ")}. Choose a legal move.`; }
function winnerText(game) { if (!game.winner) return "Draw"; return `${TEAM_LABEL[game.winner]} Wins`; }
