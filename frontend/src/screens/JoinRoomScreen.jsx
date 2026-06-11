import { useState } from "react";
import { joinRoom } from "../network/socketClient.js";

export function JoinRoomScreen({ profile, onRoomJoined, onBack }) {
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    const cleanCode = roomCode.trim().toUpperCase();

    if (!cleanCode) {
      setError("Enter a room code.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const room = await joinRoom({
        roomCode: cleanCode,
        profile
      });
      onRoomJoined(room);
    } catch (err) {
      setError(err.message || "Could not join room.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="open-ice-flow-page">
      <div className="open-ice-flow-card">
        <h1>Join Room</h1>

        <p className="open-ice-note">
          Enter the room code shared by the host.
        </p>

        <input
          className="open-ice-input"
          placeholder="Room code"
          maxLength={8}
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          disabled={busy}
        />

        <button className="open-ice-choice primary compact" disabled={busy} onClick={handleJoin}>
          <strong>{busy ? "Joining..." : "Join Room"}</strong>
        </button>

        <button className="open-ice-back" disabled={busy} onClick={onBack}>
          Back
        </button>

        {error && <p className="open-ice-error">{error}</p>}
      </div>
    </section>
  );
}
