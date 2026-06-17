import { useEffect, useMemo, useState } from "react";

const panelStyle = { display: "grid", gap: "0.65rem", width: "100%", margin: "1rem 0 1.25rem" };
const rowStyle = { display: "grid", gridTemplateColumns: "minmax(120px, 0.8fr) minmax(0, 1.4fr)", gap: "0.75rem", alignItems: "start", padding: "0.75rem 0.85rem", border: "1px solid rgba(148, 217, 255, 0.22)", borderRadius: "14px", background: "rgba(4, 28, 52, 0.38)" };
const labelStyle = { fontSize: "0.82rem", opacity: 0.78, textAlign: "left" };
const valueStyle = { minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word", textAlign: "left", fontFamily: "monospace", lineHeight: 1.35 };

export function SyncStatusPanel() {
  const statusUrl = useMemo(() => deriveStatusUrl(), []);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { refreshStatus(); }, [statusUrl]);

  async function refreshStatus() {
    if (!statusUrl) return;
    try {
      setBusy(true);
      setError("");
      const response = await fetch(statusUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Chain sync status returned " + response.status + ".");
      setStatus(await response.json());
    } catch (err) {
      setStatus(null);
      setError(err.message || "Could not read chain sync status.");
    } finally {
      setBusy(false);
    }
  }

  const lastRun = status?.lastRun || null;
  const rows = [
    ["Status endpoint", statusUrl || "Set VITE_WS_URL"],
    ["Sync state", status?.running ? "Running" : status ? "Idle" : "Not confirmed"],
    ["Total runs", status?.totalRuns ?? "—"],
    ["Total events", status?.totalIndexed ?? "—"],
    ["Last run", lastRun ? yesNo(lastRun.ok) : "—"],
    ["Last run events", lastRun?.indexed ?? "—"],
    ["Latest block", lastRun?.latest ?? "—"],
    ["Last error", status?.lastError || "—"],
    ["Sync DB", yesNo(status?.store?.databaseReady)]
  ];

  return (
    <section>
      <h3>Chain Sync Status</h3>
      <div style={panelStyle}>
        {rows.map(([label, value]) => (
          <div key={label} style={rowStyle}>
            <strong style={labelStyle}>{label}</strong>
            <span style={valueStyle}>{String(value)}</span>
          </div>
        ))}
      </div>
      {statusUrl && <a className="secondary-btn" href={statusUrl} target="_blank" rel="noreferrer">Open Sync Status</a>}
      <button className="secondary-btn" disabled={busy} onClick={refreshStatus}>{busy ? "Refreshing Sync..." : "Refresh Sync Status"}</button>
      {error && <p className="error">Chain sync note: {error}</p>}
    </section>
  );
}

function deriveStatusUrl() {
  const raw = import.meta.env.VITE_BACKEND_HTTP_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_WS_URL || "";
  if (!raw) return "";
  let base = String(raw).trim();
  if (base.startsWith("wss://")) base = "https://" + base.slice(6);
  if (base.startsWith("ws://")) base = "http://" + base.slice(5);
  if (base.endsWith("/")) base = base.slice(0, -1);
  return base + "/indexer/health";
}

function yesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}
