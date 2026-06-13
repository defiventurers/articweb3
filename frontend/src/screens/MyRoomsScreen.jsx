import { useEffect, useState } from "react";
import { getMyRooms } from "../network/socketClient.js";

export function MyRoomsScreen({ profile, onResumeRoom, onBack }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRooms(await getMyRooms({ profile }));
    } catch (err) {
      setError(err.message || "Could not load rooms.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [profile?.wallet]);

  return (
    <section className="screen">
      <div className="card">
        <h1>My Rooms</h1>
        <p className="note">Reconnect to active rooms or view finished room results before the next backend restart.</p>
        <button className="primary-btn" disabled={loading} onClick={load}>{loading ? "Loading..." : "Refresh Rooms"}</button>
        {error && <p className="error-text">{error}</p>}
        <div className="room-list">
          {rooms.map((room) => (
            <div className="room-row" key={room.roomCode}>
              <div>
                <strong>{room.roomCode} · {room.roomMode === "high_stakes" ? "High Stakes" : "Open Ice"}</strong>
                <span>Status: {room.status}</span>
              </div>
              <div>
                <span>Players: {room.playerCount}/4</span>
                <span>Settlement: {room.settlementStatus || "—"}</span>
              </div>
              <button className="primary-btn" onClick={() => onResumeRoom(room)}>
                {room.status === "finished" ? "View Results" : "Resume"}
              </button>
            </div>
          ))}
        </div>
        {!loading && !rooms.length && <p className="note">No active rooms found.</p>}
        <button className="primary-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}
