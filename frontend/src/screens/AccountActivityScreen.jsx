import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { getVaultActivity } from "../network/socketClient.js";
import { txUrl, shortHash } from "../utils/explorerLinks.js";

export function AccountActivityScreen({ profile, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setItems(await getVaultActivity({ profile })); }
    catch (err) { setError(err.message || "Could not load account activity."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [profile?.wallet]);

  return (
    <section className="screen proof-screen">
      <div className="card proof-card">
        <h1>Account Activity</h1>
        <p className="note">Wallet-linked game balance events for this player.</p>
        <button className="primary-btn" disabled={loading} onClick={load}>{loading ? "Loading..." : "Refresh Activity"}</button>
        {error && <p className="error-text">{error}</p>}
        <div className="room-list proof-list">
          {items.map((item) => (
            <div className="room-row proof-row" key={item.id}>
              <strong>{labelFor(item.type)}</strong>
              <span>{formatDate(item.createdAt)}</span>
              <span>{formatEth(item.amountWei)} {item.currency || "ETH"}</span>
              <span>Room: {item.roomCode || "—"}</span>
              <span>Status: {item.status || "—"}</span>
              {item.txHash ? <a href={txUrl(item.txHash)} target="_blank" rel="noreferrer">View {labelFor(item.type)} Tx: {shortHash(item.txHash)}</a> : <span>Tx: —</span>}
              {item.note && <span>{item.note}</span>}
            </div>
          ))}
        </div>
        {!loading && !items.length && <p className="note">No account activity recorded yet.</p>}
        <button className="primary-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function labelFor(type) {
  const value = String(type || "activity").replace(/_/g, " ");
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
function formatEth(value) { try { return formatEther(BigInt(value || "0")); } catch { return "0"; } }
function formatDate(value) { if (!value) return "—"; return new Date(value).toLocaleString(); }
