import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { getVaultActivity } from "../network/socketClient.js";
import { txUrl, shortHash } from "../utils/explorerLinks.js";

const FILTERS = ["all", "locks", "settlements", "payouts"];

export function AccountActivityScreen({ profile, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    try { setItems(await getVaultActivity({ profile })); }
    catch (err) { setError(err.message || "Could not load account activity."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [profile?.wallet]);

  const sortedItems = useMemo(() => [...items].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)), [items]);
  const filteredItems = useMemo(() => sortedItems.filter((item) => filterMatches(item, filter)), [sortedItems, filter]);

  return (
    <section className="screen data-screen proof-screen">
      <div className="card data-card-shell proof-card activity-shell">
        <header className="data-header">
          <p className="data-kicker">Account Records</p>
          <h1>Account Activity</h1>
          <p className="data-subtitle">Room-linked records for this wallet. Newest records appear first.</p>
        </header>

        <button className="primary-btn data-main-action" disabled={loading} onClick={load}>{loading ? "Loading..." : "Refresh Activity"}</button>
        {error && <p className="error-text data-error">{error}</p>}

        <div className="data-filter-row" aria-label="Activity filters">
          {FILTERS.map((name) => (
            <button type="button" key={name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>
              {filterLabel(name)}
            </button>
          ))}
        </div>

        <div className="data-list activity-list">
          {filteredItems.map((item) => (
            <article className="data-item-card activity-card" key={item.id || `${item.type}-${item.createdAt}-${item.txHash}`}>
              <div className="data-card-topline">
                <div>
                  <strong>{labelFor(item.type)}</strong>
                  <span>{formatShortDate(item.createdAt)}</span>
                </div>
                <span className={`status-pill ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
              </div>

              <div className="stat-chip-row">
                <span className="stat-chip strong-chip">{formatEth(item.amountWei)} {item.currency || "ETH"}</span>
                <span className="stat-chip">Room {item.roomCode || "—"}</span>
                <span className="stat-chip">{activityTypeLabel(item.type)}</span>
              </div>

              <div className="data-card-meta">
                {item.matchId && <span>Match {shortHash(item.matchId)}</span>}
                {item.contractMatchId && <span>Contract {shortHash(item.contractMatchId)}</span>}
                {item.txHash && <span>Tx {shortHash(item.txHash)}</span>}
              </div>

              {item.note && <p className="data-card-note">{item.note}</p>}

              <div className="data-card-actions two-actions">
                {item.txHash ? <a className="primary-btn data-card-action" href={txUrl(item.txHash)} target="_blank" rel="noreferrer">View Tx {shortHash(item.txHash)}</a> : <span className="disabled-action">Tx: —</span>}
                {item.txHash && <button className="secondary-btn data-card-action" onClick={() => copyText(item.txHash)}>Copy Tx</button>}
              </div>
            </article>
          ))}
        </div>

        {!loading && !filteredItems.length && <p className="data-empty">No {filter === "all" ? "account activity" : filterLabel(filter).toLowerCase()} recorded yet.</p>}
        <button className="primary-btn data-back-btn" onClick={onBack}>Back To Hub</button>
      </div>
    </section>
  );
}

function labelFor(type) {
  const value = String(type || "activity").replace(/_/g, " ");
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function filterLabel(value) {
  return ({ all: "All", locks: "Locks", settlements: "Settlements", payouts: "Payouts" })[value] || value;
}

function filterMatches(item, filter) {
  if (filter === "all") return true;
  const type = String(item.type || "").toLowerCase();
  if (filter === "locks") return type.includes("lock") || type.includes("entry");
  if (filter === "settlements") return type.includes("settle") || type.includes("settlement");
  if (filter === "payouts") return type.includes("withdraw") || type.includes("payout");
  return true;
}

function activityTypeLabel(type) {
  const lower = String(type || "").toLowerCase();
  if (lower.includes("lock") || lower.includes("entry")) return "Entry Lock";
  if (lower.includes("settle")) return "Settlement";
  if (lower.includes("withdraw") || lower.includes("payout")) return "Payout";
  return "Activity";
}

function statusLabel(status) {
  return labelFor(status || "recorded");
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("confirm") || value.includes("complete") || value.includes("success") || value.includes("recorded")) return "success";
  if (value.includes("pending") || value.includes("waiting") || value.includes("submitted")) return "warning";
  if (value.includes("fail") || value.includes("error")) return "danger";
  return "neutral";
}

async function copyText(value) {
  try { await navigator.clipboard.writeText(value); } catch {}
}

function formatEth(value) {
  try { return trimEth(formatEther(BigInt(value || "0"))); } catch { return "0"; }
}

function trimEth(value) {
  const [whole, decimal = ""] = String(value || "0").split(".");
  const cleanDecimal = decimal.slice(0, 6).replace(/0+$/, "");
  return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
}

function formatShortDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
