import { useEffect, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.deviceMatrix.v1";
const DEFAULT_ROWS = [
  { target: "Desktop Chrome", status: "Untested", owner: "", note: "" },
  { target: "Desktop Safari", status: "Untested", owner: "", note: "" },
  { target: "Android Chrome", status: "Untested", owner: "", note: "" },
  { target: "iOS Safari", status: "Untested", owner: "", note: "" },
  { target: "Mobile wallet browser", status: "Untested", owner: "", note: "" }
];
const STATUSES = ["Untested", "Pass", "Issue", "Retest needed", "Skipped"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaDeviceMatrixPanel() {
  const [rows, setRows] = useState(() => loadRows());
  const [copyNote, setCopyNote] = useState("");
  const passCount = rows.filter((row) => row.status === "Pass").length;
  const issueCount = rows.filter((row) => row.status === "Issue" || row.status === "Retest needed").length;

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

  async function copyMatrix() {
    const lines = [
      "Closed Beta Device Matrix",
      `Passed: ${passCount}/${rows.length}`,
      `Issues: ${issueCount}`,
      "",
      ...rows.map((row) => `${row.target}: ${row.status} | owner=${row.owner || "—"} | note=${row.note || "—"}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Device matrix copied.");
    } catch {
      setCopyNote("Copy failed. Select the matrix manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Device matrix</strong>
      <p className="data-subtitle">Track browser and mobile coverage before inviting more testers.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Passed: {passCount}/{rows.length}</span>
        <span className="stat-chip">Issues: {issueCount}</span>
      </div>
      <div className="data-list compact-detail-list">
        {rows.map((row, index) => (
          <article className="mini-data-card" key={row.target}>
            <strong>{row.target}</strong>
            <select style={inputStyle} value={row.status} onChange={(event) => updateRow(index, "status", event.target.value)}>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <input style={inputStyle} value={row.owner} onChange={(event) => updateRow(index, "owner", event.target.value)} placeholder="Owner" />
            <input style={inputStyle} value={row.note} onChange={(event) => updateRow(index, "note", event.target.value)} placeholder="Short note" />
          </article>
        ))}
      </div>
      <button className="secondary-btn" type="button" onClick={copyMatrix}>Copy Device Matrix</button>
      <button className="secondary-btn" type="button" onClick={resetRows}>Reset Device Matrix</button>
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
