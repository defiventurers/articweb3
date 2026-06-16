import { useEffect, useMemo, useState } from "react";
import { devFillRoom } from "../network/socketClient.js";

const TEAM_LABELS = {
  green: "Abster",
  red: "Retsba",
  blue: "Pengu",
  yellow: "Polly"
};

const TEAM_EMOJIS = {
  red: "🔥",
  blue: "❄️",
  green: "🌌",
  yellow: "💎"
};

const TEAM_ORDER = ["red", "green", "blue", "yellow"];

export function WaitingRoomScreen({ room, profile, onRoomUpdate, onGameStart }) {
  const [currentRoom, setCurrentRoom] = useState(room);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const isEscrowTestRoom = currentRoom.roomMode === "high_stakes";
  const myPlayer = currentRoom.players.find((player) => player.wallet === profile.wallet);
  const hasPickedTeam = Boolean(myPlayer?.team);
  const realPlayers = useMemo(
    () => currentRoom.players.filter((player) => !String(player.wallet).startsWith("dev-")),
    [currentRoom.players]
  );
  const emptySeats = Math.max(0, 4 - currentRoom.playerCount);
  const readyTeams = currentRoom.players.filter((player) => player.team).length;
  const lockedPlayers = currentRoom.players.filter((player) => player.entryLocked).length;

  const teamSlots = useMemo(() => {
    return TEAM_ORDER.map((team) => {
      const player = currentRoom.players.find((entry) => entry.team === team);
      return { team, player };
    });
  }, [currentRoom.players]);

  const choosingPlayers = useMemo(() => currentRoom.players.filter((player) => !player.team), [currentRoom.players]);

  useEffect(() => {
    function handlePacket(event) {
      const packet = event.detail;
      if (packet.type !== "room_state") return;

      const updatedRoom = packet.payload.room;
      if (updatedRoom.roomCode !== currentRoom.roomCode) return;

      setCurrentRoom(updatedRoom);
      onRoomUpdate(updatedRoom);

      if (updatedRoom.status === "playing") {
        onGameStart(updatedRoom);
      }
    }

    window.addEventListener("server-packet", handlePacket);
    return () => window.removeEventListener("server-packet", handlePacket);
  }, [currentRoom.roomCode, onRoomUpdate, onGameStart]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!currentRoom.countdownStartTime) {
        setSecondsLeft(null);
        return;
      }

      const remaining =
        currentRoom.countdownDurationMs -
        (Date.now() - currentRoom.countdownStartTime);

      setSecondsLeft(Math.max(0, Math.ceil(remaining / 1000)));
    }, 250);

    return () => clearInterval(timer);
  }, [currentRoom]);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(currentRoom.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setError("Could not copy room code.");
    }
  }

  async function handleStartWithBots() {
    if (isEscrowTestRoom) {
      setError("Bots are disabled in this mode.");
      return;
    }

    if (!hasPickedTeam) {
      setError("Choose your team first.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const updatedRoom = await devFillRoom({
        roomCode: currentRoom.roomCode,
        profile
      });
      setCurrentRoom(updatedRoom);
      onRoomUpdate(updatedRoom);
    } catch (err) {
      setError(err.message || "Could not start with bots.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen data-screen waiting-screen">
      <div className="card data-card-shell waiting-card">
        <header className="data-header lobby-header">
          <p className="data-kicker">Battle Lobby</p>
          <h1>Room {currentRoom.roomCode}</h1>
          <p className="data-subtitle">
            {isEscrowTestRoom
              ? "Share this code with three real players. All four players must confirm before countdown."
              : "Share this code, choose different kingdoms, then start when ready."}
          </p>
        </header>

        <button className="secondary-btn data-main-action copy-code-btn" onClick={handleCopyCode}>
          {copied ? "Copied" : "Copy Room Code"}
        </button>

        <div className="lobby-score-grid">
          <div>
            <strong>{currentRoom.playerCount}/4</strong>
            <span>Seats Filled</span>
          </div>
          <div>
            <strong>{readyTeams}/4</strong>
            <span>Teams Ready</span>
          </div>
          {isEscrowTestRoom && (
            <div>
              <strong>{lockedPlayers}/4</strong>
              <span>Confirmed</span>
            </div>
          )}
        </div>

        {choosingPlayers.length > 0 && (
          <div className="lobby-choosing-list" aria-label="Players choosing teams">
            {choosingPlayers.map((player) => (
              <article className="lobby-team-card choosing-player-card" key={player.wallet}>
                <div className="lobby-team-topline">
                  <span>🧭</span>
                  <strong>{player.name || "Player"}</strong>
                  <em>Choosing</em>
                </div>
                <div className="lobby-player-name">Pick a kingdom to become ready.</div>
                {isEscrowTestRoom && <div className={`lobby-lock-pill ${player.entryLocked ? "success" : "warning"}`}>{player.entryLocked ? "Confirmed" : "Pending"}</div>}
              </article>
            ))}
          </div>
        )}

        <div className="lobby-team-grid" aria-label="Lobby team seats">
          {teamSlots.map(({ team, player }) => (
            <article className={`lobby-team-card team-${team} ${player ? "filled" : "empty"}`} key={team}>
              <div className="lobby-team-topline">
                <span>{TEAM_EMOJIS[team]}</span>
                <strong>{TEAM_LABELS[team]}</strong>
                <em>{player ? "Ready" : "Open"}</em>
              </div>
              <div className="lobby-player-name">{player?.name || "Waiting for player"}</div>
              {isEscrowTestRoom && player && <div className={`lobby-lock-pill ${player.entryLocked ? "success" : "warning"}`}>{player.entryLocked ? "Confirmed" : "Pending"}</div>}
            </article>
          ))}
        </div>

        <p className="data-subtitle lobby-note">
          {isEscrowTestRoom
            ? `${realPlayers.length}/4 real players · ${lockedPlayers}/4 confirmations · ${readyTeams}/4 teams ready`
            : realPlayers.length >= 2
              ? `${realPlayers.length} real players joined. Start with bots to fill ${emptySeats} empty seat${emptySeats === 1 ? "" : "s"}.`
              : "Waiting for another real player, or start with bots now."}
        </p>

        <div className={`countdown-card ${secondsLeft !== null ? "live" : ""}`}>
          <span>{secondsLeft !== null ? "Countdown" : "Readiness"}</span>
          <strong>{secondsLeft !== null ? `Starting in ${secondsLeft}` : `${readyTeams}/4 teams ready`}</strong>
        </div>

        {!isEscrowTestRoom && (
          <button className="primary-btn data-main-action" disabled={busy || !hasPickedTeam} onClick={handleStartWithBots}>
            {busy ? "Adding bots..." : "Start With Bots"}
          </button>
        )}

        {isEscrowTestRoom && <p className="data-empty">Bots are disabled here. Wait for four confirmed real players.</p>}
        {error && <p className="error data-error">{error}</p>}
      </div>
    </section>
  );
}
