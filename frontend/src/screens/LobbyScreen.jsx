import { useEffect, useState } from "react";
import { DepositPanel } from "../components/DepositPanel.jsx";
import { createRoom, joinRoom, listRooms } from "../network/socketClient.js";

const ROOM_MODES = {
  open_ice: {
    title: "Open Ice",
    description: "Play freely with no crypto required."
  },
  high_stakes: {
    title: "High Stakes",
    description: "Risk crypto and compete for the prize pool."
  }
};

export function LobbyScreen({ profile, onJoinRoom, onBack }) {
  const [rooms, setRooms] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [roomMode, setRoomMode] = useState("open_ice");
  const [error, setError] = useState("");

  const selectedMode = ROOM_MODES[roomMode];
  const highStakesLocked = roomMode === "high_stakes";

  async function refresh(nextMode = roomMode) {
    try {
      setError("");
      const nextRooms = await listRooms({ roomMode: nextMode });
      setRooms(nextRooms);
    } catch (err) {
      setError(err.message || "Could not load rooms.");
    }
  }

  function selectRoomMode(nextMode) {
    setRoomMode(nextMode);
    refresh(nextMode);
  }

  async function handleCreatePublic() {
    try {
      setError("");

      if (highStakesLocked) {
        setError("High Stakes is coming soon. Open Ice is live now.");
        return;
      }

      const room = await createRoom({ visibility: "public", roomMode, profile });
      onJoinRoom(room);
    } catch (err) {
      setError(err.message || "Could not create room.");
    }
  }

  async function handleCreatePrivate() {
    try {
      setError("");

      if (highStakesLocked) {
        setError("High Stakes is coming soon. Open Ice is live now.");
        return;
      }

      const room = await createRoom({ visibility: "private", roomMode, profile });
      onJoinRoom(room);
    } catch (err) {
      setError(err.message || "Could not create room.");
    }
  }

  async function handleJoin(code) {
    try {
      setError("");
      const cleanCode = String(code || "").trim().toUpperCase();

      if (!cleanCode) {
        setError("Enter a room code.");
        return;
      }

      const room = await joinRoom({ roomCode: cleanCode, profile });
      onJoinRoom(room);
    } catch (err) {
      setError(err.message || "Could not join room.");
    }
  }

  useEffect(() => {
    refresh("open_ice");
  }, []);

  return (
    <section className="screen">
      <div className="card">
        <h1>Lobby</h1>

        <p className="note">
          {profile.name} · {profile.points} points
        </p>

        <DepositPanel />

        <div className="mode-choice-grid">
          <button
            className={roomMode === "open_ice" ? "mode-choice active" : "mode-choice"}
            onClick={() => selectRoomMode("open_ice")}
          >
            <strong>Open Ice</strong>
            <span>Play freely with no crypto required.</span>
          </button>

          <button
            className={roomMode === "high_stakes" ? "mode-choice active" : "mode-choice"}
            onClick={() => selectRoomMode("high_stakes")}
          >
            <strong>High Stakes</strong>
            <span>Risk crypto and compete for the prize pool.</span>
          </button>
        </div>

        <p className="note">
          {selectedMode.title}: {selectedMode.description}
        </p>

        {roomMode === "high_stakes" && (
          <div className="rules-panel">
            <strong>Entry tiers</strong>
            <span>$1 · $4 · $16</span>
            <strong>Placement returns</strong>
            <span>1st: 3x entry + 100 points</span>
            <span>2nd: 1x entry + 100 points</span>
            <span>3rd: 0x entry + 100 points</span>
            <span>4th: 0x entry + 10 points</span>
          </div>
        )}

        {highStakesLocked && (
          <p className="error">
            High Stakes is locked until contracts, server-owned gameplay, and payout safety are ready.
          </p>
        )}

        <button className="secondary-btn" onClick={() => refresh()}>
          Refresh Rooms
        </button>

        <div className="room-list">
          {rooms.length === 0 && <p className="note">No {selectedMode.title} public rooms yet.</p>}

          {rooms.map((room) => (
            <button
              key={room.roomCode}
              className="room-row"
              onClick={() => handleJoin(room.roomCode)}
            >
              <strong>{room.roomCode}</strong>
              <span>{room.playerCount}/4 · {room.roomMode === "high_stakes" ? "High Stakes" : "Open Ice"}</span>
            </button>
          ))}
        </div>

        <button className="primary-btn" disabled={highStakesLocked} onClick={handleCreatePublic}>
          Create {selectedMode.title} Public Room
        </button>

        <button className="secondary-btn" disabled={highStakesLocked} onClick={handleCreatePrivate}>
          Create {selectedMode.title} Private Room
        </button>

        <div className="join-box">
          <input
            className="text-input"
            placeholder="Room code"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          />
          <button className="primary-btn" onClick={() => handleJoin(roomCode)}>
            Join
          </button>
        </div>

        <button className="secondary-btn" onClick={onBack}>
          Back
        </button>

        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
