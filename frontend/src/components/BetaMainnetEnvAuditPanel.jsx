import { useEffect, useState } from "react";
import { appConfig } from "../config/chain.js";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";

const STORAGE_KEY = "artic.closedBeta.mainnetEnvAudit.v1";
const DEFAULT_ROWS = [
  { item: "Frontend chain id", expected: "2741", actual: String(appConfig.chainId || ""), status: "Review" },
  { item: "Frontend chain env", expected: "mainnet", actual: appConfig.chainEnv || "", status: "Review" },
  { item: "Vault address", expected: "mainnet vault", actual: ETH_VAULT_ADDRESS || "", status: "Review" },
  { item: "Explorer base", expected: "mainnet explorer", actual: appConfig.explorerUrl || "", status: "Review" },
  { item: "Backend chain id", expected: "2741", actual: "", status: "Review" },
  { item: "Backend RPC", expected: "mainnet RPC", actual: "", status: "Review" },
  { item: "Settlement signer", expected: "approved signer", actual: "", status: "Review" },
  { item: "Indexer", expected: "mainnet events visible", actual: "", status: "Review" }
];
const STATUSES = ["Review", "Pass", "Issue", "Not used"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaMainnetEnvAuditPanel() {
  const [rows, setRows] = useState(() => loadRows());
  const [copyNote, setCopyNote] = useState("");
  const passCount = rows.filter((row) => row.status === "Pass").length;
  const issueCount = rows.filter((row) => row.status === "Issue").length;

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

  async function copyAudit() {
    const lines = [
      "Mainnet Environment Audit",
      `Pass: ${passCount}/${rows.length}`,
      `Issues: ${issueCount}`,
      "",
      ...rows.map((row) => `${row.item}: ${row.status} | expected=${row.expected || "—"} | actual=${row.actual || "—"}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Mainnet env audit copied.");
    } catch {
      setCopyNote("Copy failed. Select the audit manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Mainnet environment audit</strong>
      <p className="data-subtitle">Compare intended mainnet values before any capped rehearsal.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Pass: {passCount}/{rows.length}</span>
        <span className="stat-chip">Issues: {issueCount}</span>
      </div>
      <div className="data-list compact-detail-list">
        {rows.map((row, index) => (
          <article className="mini-data-card" key={row.item}>
            <strong>{row.item}</strong>
            <input style={inputStyle} value={row.expected} onChange={(event) => updateRow(index, "expected", event.target.value)} placeholder="Expected" />
            <input style={inputStyle} value={row.actual} onChange={(event) => updateRow(index, "actual", event.target.value)} placeholder="Actual" />
            <select style={inputStyle} value={row.status} onChange={(event) => updateRow(index, "status", event.target.value)}>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </article>
        ))}
      </div>
      <button className="secondary-btn" type="button" onClick={copyAudit}>Copy Env Audit</button>
      <button className="secondary-btn" type="button" onClick={resetRows}>Reset Env Audit</button>
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
