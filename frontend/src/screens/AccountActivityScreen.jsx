import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { getVaultActivity } from "../network/socketClient.js";

export function AccountActivityScreen({ profile, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await getVaultActivity({ profile }));
    } catch (err) {
      setError(err.message || "Could not load account activity.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [profile?.wallet]);

  return (
    <section className="screen">
      <div className="card">
        <h1>Account Activity</h1>
        <p className="note">Wallet-linked game balance events for this player.</p>
        <button className="primary-btn" disabled={loading} onClick={load}>{loading ? "Loading..." : "Refresh Activity"}</button>
        {error && <p className="error-text">{error}</p>}
        <div className="room-list">
          {items.map((item) => (
            <div className="room-row" key={item.id}>
              <div><strong>{item.type}</strong><span>{formatDate(item.createdAt)}</span></div>
              <div><span>Amount: {formatEth(item.amountWei)} {item.currency || "ETH"}</span><span>Room: {item.roomCode || "—"}</span><span>Status: {item.status || "—"}</span></div>
              <div><span>Tx: {shortHash(item.txHash)}</span>{item.note && <span>{item.note}</span>}</div>
            </div>
          ))}
        </div>
        {!loading && !items.length && <p className="note">No account activity recorded yet.</p>}
        <button className="primary-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function formatEth(value) {
  try { return formatEther(BigInt(value || "0")); } catch { return "0"; }
}
function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
function shortHash(hash) {
  if (!hash) return "—";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}
