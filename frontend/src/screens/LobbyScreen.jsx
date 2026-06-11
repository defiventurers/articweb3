import { useEffect, useState } from "react";
import { createRoom, joinRoom, listRooms } from "../network/socketClient.js";

export function LobbyScreen({ profile, onJoinRoom, onBack }) {
  const [rooms, setRooms] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setError("");
      const nextRooms = await listRooms({ roomMode: "open_ice" });
      setRooms(nextRooms);
    } catch (err) {
      setError(err.message || "Could not load rooms.");
    }
  }

  async function handleCreatePublic() {
    try {
      setError("");
      const room = await createRoom({ visibility: "public", roomMode: "open_ice", profile });
      onJoinRoom(room);
    } catch (err) {
      setError(err.message || "Could not create room.");
    }
  }

  async function handleCreatePrivate() {
    try {
      setError("");
      const room = await createRoom({ visibility: "private", roomMode: "open_ice", profile });
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
        <h1>Open Ice</h1>

        <p className="note">
          {profile.name} · {profile.points} points
        </p>

        <p className="note">
          Play freely with no crypto required.
        </p>

        <button className="secondary-btn" onClick={refresh}>
          Refresh Rooms
        </button>

        <div className="room-list">
          {rooms.length === 0 && <p className="note">No Open Ice public rooms yet.</p>}

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
          Create Open Ice Public Room
        </button>

        <button className="secondary-btn" onClick={handleCreatePrivate}>
          Create Open Ice Private Room
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
          Back To Hub
        </button>

        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
