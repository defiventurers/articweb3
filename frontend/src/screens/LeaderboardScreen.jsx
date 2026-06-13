import { useEffect, useState } from "react";
import { getLeaderboard } from "../network/socketClient.js";

export function LeaderboardScreen({ onBack }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setLeaders(await getLeaderboard());
    } catch (err) {
      setError(err.message || "Could not load leaderboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="screen">
      <div className="card">
        <h1>Leaderboard</h1>
        <p className="note">Rankings by points, wins, and games played.</p>
        <button className="primary-btn" disabled={loading} onClick={load}>{loading ? "Loading..." : "Refresh"}</button>
        {error && <p className="error-text">{error}</p>}
        <div className="room-list">
          {leaders.map((player) => (
            <div className="room-row" key={player.wallet}>
              <div>
                <strong>#{player.rank} · {player.name}</strong>
                <span>{shortAddress(player.wallet)}</span>
              </div>
              <div>
                <span>Points: {player.points}</span>
                <span>Wins: {player.wins}</span>
                <span>Games: {player.gamesPlayed}</span>
                <span>Win Rate: {formatWinRate(player)}</span>
              </div>
            </div>
          ))}
        </div>
        {!loading && !leaders.length && <p className="note">No ranked players yet.</p>}
        <button className="primary-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function formatWinRate(player) {
  if (!player.gamesPlayed) return "0%";
  return `${Math.round((player.wins / player.gamesPlayed) * 100)}%`;
}

function shortAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
