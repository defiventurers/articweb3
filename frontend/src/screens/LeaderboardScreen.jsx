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
    <section className="screen data-screen">
      <div className="card data-card-shell leaderboard-shell">
        <header className="data-header">
          <p className="data-kicker">Frozen Rankings</p>
          <h1>Leaderboard</h1>
          <p className="data-subtitle">Rankings by points, wins, games played, and win rate.</p>
        </header>

        <button className="primary-btn data-main-action" disabled={loading} onClick={load}>{loading ? "Loading..." : "Refresh"}</button>
        {error && <p className="error-text data-error">{error}</p>}

        <div className="data-list leaderboard-list">
          {leaders.map((player) => (
            <article className={`data-item-card leaderboard-card rank-${player.rank}`} key={player.wallet}>
              <div className="leaderboard-rank-badge">{rankBadge(player.rank)}</div>
              <div className="leaderboard-main">
                <div className="data-card-topline">
                  <div>
                    <strong>{player.name || "Player"}</strong>
                    <span>{shortAddress(player.wallet)}</span>
                  </div>
                  <span className="status-pill neutral">#{player.rank}</span>
                </div>
                <div className="stat-chip-row">
                  <span className="stat-chip strong-chip">{player.points} pts</span>
                  <span className="stat-chip">{player.wins} win{player.wins === 1 ? "" : "s"}</span>
                  <span className="stat-chip">{player.gamesPlayed} game{player.gamesPlayed === 1 ? "" : "s"}</span>
                  <span className="stat-chip">{formatWinRate(player)} win rate</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!loading && !leaders.length && <p className="data-empty">No ranked players yet.</p>}
        <button className="primary-btn data-back-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function rankBadge(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function formatWinRate(player) {
  if (!player.gamesPlayed) return "0%";
  return `${Math.round((player.wins / player.gamesPlayed) * 100)}%`;
}

function shortAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
