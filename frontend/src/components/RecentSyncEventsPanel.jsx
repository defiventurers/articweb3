import { useEffect, useMemo, useState } from "react";

const panelStyle = { display: "grid", gap: "0.65rem", width: "100%", margin: "1rem 0 1.25rem" };
const rowStyle = { display: "grid", gridTemplateColumns: "minmax(120px, 0.8fr) minmax(0, 1.4fr)", gap: "0.75rem", alignItems: "start", padding: "0.75rem 0.85rem", border: "1px solid rgba(148, 217, 255, 0.22)", borderRadius: "14px", background: "rgba(4, 28, 52, 0.38)" };
const labelStyle = { fontSize: "0.82rem", opacity: 0.78, textAlign: "left" };
const valueStyle = { minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word", textAlign: "left", fontFamily: "monospace", lineHeight: 1.35 };

export function RecentSyncEventsPanel({ baseUrl }) {
  const eventsUrl = useMemo(() => baseUrl ? baseUrl + "/indexer/events?limit=10" : "", [baseUrl]);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { refreshEvents(); }, [eventsUrl]);

  async function refreshEvents() {
    if (!eventsUrl) return;
    try {
      setBusy(true);
      setError("");
      const response = await fetch(eventsUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Indexed events returned " + response.status + ".");
      const payload = await response.json();
      setEvents(Array.isArray(payload.events) ? payload.events : []);
    } catch (err) {
      setEvents([]);
      setError(err.message || "Could not load indexed events.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h4>Recent Indexed Events</h4>
      {eventsUrl && <a className="secondary-btn" href={eventsUrl} target="_blank" rel="noreferrer">Open Indexed Events</a>}
      <button className="secondary-btn" disabled={busy} onClick={refreshEvents}>{busy ? "Refreshing Events..." : "Refresh Indexed Events"}</button>
      {error && <p className="error">Indexed events note: {error}</p>}
      <div style={panelStyle}>
        {events.length ? events.map((event) => (
          <div key={event.id} style={rowStyle}>
            <strong style={labelStyle}>{event.eventName || "Event"}</strong>
            <span style={valueStyle}>block {event.blockNumber} / {event.player || event.matchId || "system"} / {shortHash(event.txHash)}</span>
          </div>
        )) : <p className="note">No indexed events found yet.</p>}
      </div>
    </section>
  );
}

function shortHash(value) {
  const text = String(value || "");
  return text.length > 14 ? text.slice(0, 8) + "..." + text.slice(-6) : text || "—";
}
