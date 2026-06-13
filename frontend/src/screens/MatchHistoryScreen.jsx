import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { getGameHistory } from "../network/socketClient.js";

const TEAM_LABELS = {
  green: "Abster",
  red: "Retsba",
  blue: "Pengu",
  yellow: "Polly"
};

export function MatchHistoryScreen({ profile, onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory() {
    if (!profile) return;
    setLoading(true);
    setError("");
    try {
      const rows = await getGameHistory({ profile });
      setHistory(rows);
    } catch (err) {
      setError(err.message || "Could not load match history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [profile?.wallet]);

  return (
    <section className="screen">
      <div className="card">
        <h1>Match History</h1>
        <p className="note">
          Finished games, entry locks, placements, payouts, points, and settlement transactions for {profile?.name}.
        </p>

        <button className="primary-btn" disabled={loading} onClick={loadHistory}>
          {loading ? "Loading..." : "Refresh History"}
        </button>

        {error && <p className="error-text">{error}</p>}

        {!loading && !history.length && (
          <p className="note">No finished games recorded yet. Complete a match first.</p>
        )}

        <div className="room-list">
          {history.map((item) => (
            <div className="room-row" key={item.id}>
              <div>
                <strong>Room {item.roomCode} · {item.roomMode === "high_stakes" ? "High Stakes" : "Open Ice"}</strong>
                <span>{formatDate(item.finishedAt)}</span>
              </div>
              <div>
                <span>Team: {TEAM_LABELS[item.team] || item.team || "—"}</span>
                <span>Result: {item.position ? `#${item.position}` : "—"}</span>
              </div>
              <div>
                <span>Locked: {formatEth(item.entryWei)} ETH</span>
                <span>Payout: {formatEth(item.payoutWei)} ETH</span>
                <span>Points: +{item.points || 0}</span>
              </div>
              <div>
                <span>Entry Tx: {compactHash(item.entryTxHash)}</span>
                <span>Settlement: {item.settlementStatus || "—"}</span>
                <span>Payout Tx: {compactHash(item.settlementTxHash)}</span>
              </div>
              {item.settlementError && <span>Settlement Error: {item.settlementError}</span>}
            </div>
          ))}
        </div>

        <button className="primary-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function formatEth(value) {
  try {
    return formatEther(BigInt(value || "0"));
  } catch {
    return "0";
  }
}

function compactHash(hash) {
  if (!hash) return "—";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
