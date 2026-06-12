import { useEffect, useMemo, useState } from "react";
import { devFillRoom } from "../network/socketClient.js";

const TEAM_LABELS = {
  green: "Abster",
  red: "Retsba",
  blue: "Pengu",
  yellow: "Polly"
};

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
    <section className="screen">
      <div className="card">
        <h1>Room {currentRoom.roomCode}</h1>

        <p className="note">
          {isEscrowTestRoom
            ? "Share this code with three real players. All four players must confirm before countdown."
            : "Share this code on the other device, then choose different teams."}
        </p>

        <button className="secondary-btn" onClick={handleCopyCode}>
          {copied ? "Copied" : "Copy Room Code"}
        </button>

        <div className="room-list">
          {currentRoom.players.map((player) => (
            <div className="room-row" key={player.wallet}>
              <strong>{player.name}</strong>
              <span>{player.team ? TEAM_LABELS[player.team] || player.team : "choosing"}</span>
              {isEscrowTestRoom && <span>{player.entryLocked ? "confirmed" : "pending"}</span>}
            </div>
          ))}
        </div>

        <h2>{currentRoom.playerCount}/4 seats filled</h2>

        <p className="note">
          {isEscrowTestRoom
            ? `${realPlayers.length}/4 real players · ${lockedPlayers}/4 confirmations · ${readyTeams}/4 teams ready`
            : realPlayers.length >= 2
              ? `${realPlayers.length} real players joined. Press Start With Bots to fill ${emptySeats} empty seat${emptySeats === 1 ? "" : "s"}.`
              : "Waiting for another real player, or start with bots now."}
        </p>

        <h2>
          {secondsLeft !== null
            ? `Starting in ${secondsLeft}`
            : `${readyTeams}/4 teams ready`}
        </h2>

        {!isEscrowTestRoom && (
          <button className="primary-btn" disabled={busy || !hasPickedTeam} onClick={handleStartWithBots}>
            {busy ? "Adding bots..." : "Start With Bots"}
          </button>
        )}

        {isEscrowTestRoom && <p className="note">Bots are disabled here. Wait for four confirmed real players.</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
