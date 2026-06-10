import { useEffect, useState } from "react";
import { devFillRoom } from "../network/socketClient.js";

export function WaitingRoomScreen({ room, profile, onRoomUpdate, onGameStart }) {
  const [currentRoom, setCurrentRoom] = useState(room);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  async function handleDevFillRoom() {
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
      setError(err.message || "Could not fill room.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen">
      <div className="card">
        <h1>Room {currentRoom.roomCode}</h1>

        <p className="note">Share this code with friends.</p>

        <div className="room-list">
          {currentRoom.players.map((player) => (
            <div className="room-row" key={player.wallet}>
              <strong>{player.name}</strong>
              <span>{player.team}</span>
            </div>
          ))}
        </div>

        <h2>{currentRoom.playerCount}/4 players</h2>

        <h2>
          {secondsLeft !== null
            ? `Starting in ${secondsLeft}`
            : "Waiting for 4 players"}
        </h2>

        <button className="secondary-btn" disabled={busy} onClick={handleDevFillRoom}>
          {busy ? "Adding test players..." : "Dev Fill Room"}
        </button>

        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
