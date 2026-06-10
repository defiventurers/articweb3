import { useEffect, useState } from "react";
import { createRoom, joinRoom, listRooms } from "../network/socketClient.js";

export function LobbyScreen({ profile, onJoinRoom, onBack }) {
  const [rooms, setRooms] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setError("");
      const nextRooms = await listRooms();
      setRooms(nextRooms);
    } catch (err) {
      setError(err.message || "Could not load rooms.");
    }
  }

  async function handleCreatePublic() {
    try {
      setError("");
      const room = await createRoom({ visibility: "public", profile });
      onJoinRoom(room);
    } catch (err) {
      setError(err.message || "Could not create room.");
    }
  }

  async function handleCreatePrivate() {
    try {
      setError("");
      const room = await createRoom({ visibility: "private", profile });
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
    refresh();
  }, []);

  return (
    <section className="screen">
      <div className="card">
        <h1>Lobby</h1>

        <p className="note">
          {profile.name} · {profile.points} points
        </p>

        <button className="secondary-btn" onClick={refresh}>
          Refresh Rooms
        </button>

        <div className="room-list">
          {rooms.length === 0 && <p className="note">No public rooms yet.</p>}

          {rooms.map((room) => (
            <button
              key={room.roomCode}
              className="room-row"
              onClick={() => handleJoin(room.roomCode)}
            >
              <strong>{room.roomCode}</strong>
              <span>{room.playerCount}/4</span>
            </button>
          ))}
        </div>

        <button className="primary-btn" onClick={handleCreatePublic}>
          Create Public Room
        </button>

        <button className="secondary-btn" onClick={handleCreatePrivate}>
          Private Room
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
