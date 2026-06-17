import { useEffect, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.blockerTriage.v1";
const DEFAULT_ROWS = [
  { id: "B1", severity: "Blocker", area: "", status: "Open", note: "" },
  { id: "B2", severity: "Major", area: "", status: "Open", note: "" },
  { id: "B3", severity: "Minor", area: "", status: "Open", note: "" },
  { id: "B4", severity: "Minor", area: "", status: "Open", note: "" }
];
const SEVERITIES = ["Blocker", "Major", "Minor", "Polish"];
const STATUSES = ["Open", "Investigating", "Fixed", "Retest passed", "Not reproducible"];
const AREAS = ["", "Wallet", "Network", "Funding", "Room", "Lock", "Gameplay", "Settlement", "Indexer", "UX", "Mobile"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaBlockerTriagePanel() {
  const [rows, setRows] = useState(() => loadRows());
  const [copyNote, setCopyNote] = useState("");
  const openBlockers = rows.filter((row) => row.severity === "Blocker" && !isResolved(row.status)).length;
  const openMajors = rows.filter((row) => row.severity === "Major" && !isResolved(row.status)).length;

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

  async function copyTriage() {
    const lines = [
      "Closed Beta Blocker Triage",
      `Open blockers: ${openBlockers}`,
      `Open majors: ${openMajors}`,
      "",
      ...rows.map((row) => `${row.id}: ${row.severity} | ${row.area || "Unassigned"} | ${row.status} | ${row.note || "—"}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Blocker triage copied.");
    } catch {
      setCopyNote("Copy failed. Select the triage manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Blocker triage</strong>
      <p className="data-subtitle">Track what prevents the next beta wave. Do not move forward with unresolved blocker issues.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Open blockers: {openBlockers}</span>
        <span className="stat-chip">Open majors: {openMajors}</span>
      </div>
      <div className="data-list compact-detail-list">
        {rows.map((row, index) => (
          <article className="mini-data-card" key={row.id}>
            <strong>{row.id}</strong>
            <select style={inputStyle} value={row.severity} onChange={(event) => updateRow(index, "severity", event.target.value)}>
              {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
            </select>
            <select style={inputStyle} value={row.area} onChange={(event) => updateRow(index, "area", event.target.value)}>
              {AREAS.map((area) => <option key={area || "blank"} value={area}>{area || "Area"}</option>)}
            </select>
            <select style={inputStyle} value={row.status} onChange={(event) => updateRow(index, "status", event.target.value)}>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <input style={inputStyle} value={row.note} onChange={(event) => updateRow(index, "note", event.target.value)} placeholder="Short public note" />
          </article>
        ))}
      </div>
      <button className="secondary-btn" type="button" onClick={copyTriage}>Copy Blocker Triage</button>
      <button className="secondary-btn" type="button" onClick={resetRows}>Reset Triage</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function isResolved(status) {
  return status === "Fixed" || status === "Retest passed" || status === "Not reproducible";
}

function loadRows() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_ROWS;
  } catch {
    return DEFAULT_ROWS;
  }
}
