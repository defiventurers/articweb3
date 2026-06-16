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
    <section className="screen data-screen">
      <div className="card data-card-shell myrooms-shell">
        <header className="data-header">
          <p className="data-kicker">Reconnect</p>
          <h1>My Rooms</h1>
          <p className="data-subtitle">Reconnect to active rooms or view finished results before the next backend restart.</p>
        </header>

        <button className="primary-btn data-main-action" disabled={loading} onClick={load}>{loading ? "Loading..." : "Refresh Rooms"}</button>
        {error && <p className="error-text data-error">{error}</p>}

        <div className="data-list room-card-list">
          {rooms.map((room) => (
            <article className="data-item-card my-room-card" key={room.roomCode}>
              <div className="data-card-topline">
                <div>
                  <strong>Room {room.roomCode}</strong>
                  <span>{room.roomMode === "high_stakes" ? "High Stakes" : "Open Ice"}</span>
                </div>
                <span className={`status-pill ${statusClass(room.status)}`}>{statusLabel(room.status)}</span>
              </div>

              <div className="stat-chip-row">
                <span className="stat-chip">Players {room.playerCount}/4</span>
                <span className="stat-chip">Settlement {room.settlementStatus || "—"}</span>
                <span className="stat-chip">{room.status === "finished" ? "Results Ready" : "Reconnectable"}</span>
              </div>

              <button className="primary-btn data-card-action" onClick={() => onResumeRoom(room)}>
                {room.status === "finished" ? "View Results" : "Resume"}
              </button>
            </article>
          ))}
        </div>

        {!loading && !rooms.length && <p className="data-empty">No active rooms found.</p>}
        <button className="primary-btn data-back-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function statusLabel(status) {
  const value = String(status || "unknown");
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("finished")) return "success";
  if (value.includes("playing")) return "info";
  if (value.includes("waiting")) return "warning";
  if (value.includes("fail") || value.includes("expired")) return "danger";
  return "neutral";
}
