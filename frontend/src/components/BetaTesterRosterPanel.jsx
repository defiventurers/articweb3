import { useEffect, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.testerRoster.v1";
const DEFAULT_ROWS = [
  { role: "P1", address: "", team: "", lock: "Not started", note: "" },
  { role: "P2", address: "", team: "", lock: "Not started", note: "" },
  { role: "P3", address: "", team: "", lock: "Not started", note: "" },
  { role: "P4", address: "", team: "", lock: "Not started", note: "" }
];
const LOCK_STATES = ["Not started", "Funded", "Joined", "Locked", "Played", "Issue"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaTesterRosterPanel() {
  const [rows, setRows] = useState(() => loadRows());
  const [copyNote, setCopyNote] = useState("");

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch {}
  }, [rows]);

  function updateRow(index, key, value) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  function resetRows() {
    setRows(DEFAULT_ROWS);
    setCopyNote("");
  }

  async function copyRoster() {
    const lines = [
      "Closed Beta Tester Roster",
      "",
      ...rows.map((row) => `${row.role}: ${row.address || "—"} | team=${row.team || "—"} | status=${row.lock || "—"} | note=${row.note || "—"}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Tester roster copied.");
    } catch {
      setCopyNote("Copy failed. Select the roster manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Tester roster</strong>
      <p className="data-subtitle">Track the four-wallet closed-beta cycle without using a spreadsheet.</p>
      <div className="data-list compact-detail-list">
        {rows.map((row, index) => (
          <article className="mini-data-card" key={row.role}>
            <strong>{row.role}</strong>
            <input style={inputStyle} value={row.address} onChange={(event) => updateRow(index, "address", event.target.value)} placeholder="Public account address" />
            <input style={inputStyle} value={row.team} onChange={(event) => updateRow(index, "team", event.target.value)} placeholder="Team / tribe" />
            <select style={inputStyle} value={row.lock} onChange={(event) => updateRow(index, "lock", event.target.value)}>
              {LOCK_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <input style={inputStyle} value={row.note} onChange={(event) => updateRow(index, "note", event.target.value)} placeholder="Short note" />
          </article>
        ))}
      </div>
      <button className="secondary-btn" type="button" onClick={copyRoster}>Copy Tester Roster</button>
      <button className="secondary-btn" type="button" onClick={resetRows}>Reset Tester Roster</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadRows() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_ROWS;
  } catch {
    return DEFAULT_ROWS;
  }
}
