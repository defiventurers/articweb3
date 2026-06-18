import { useEffect, useState } from "react";

const STORAGE_KEY = "artic.closedBeta.rollbackDrill.v1";
const DEFAULT_STATE = {
  owner: "",
  disablePlan: "",
  restorePlan: "",
  dataCheck: "Not checked",
  commsCheck: "Not checked",
  drillResult: "Not run",
  note: ""
};
const CHECKS = ["Not checked", "Ready", "Issue", "N/A"];
const RESULTS = ["Not run", "Pass", "Issue", "Retest needed"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaRollbackDrillPanel() {
  const [state, setState] = useState(() => loadState());
  const [copyNote, setCopyNote] = useState("");
  const ready = state.dataCheck === "Ready" && state.commsCheck === "Ready" && state.drillResult === "Pass";

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  function update(key, value) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setState(DEFAULT_STATE);
    setCopyNote("");
  }

  async function copySummary() {
    const lines = [
      "Rollback Drill",
      `Status: ${ready ? "READY" : "HOLD"}`,
      `Owner: ${state.owner || "—"}`,
      `Disable plan: ${state.disablePlan || "—"}`,
      `Restore plan: ${state.restorePlan || "—"}`,
      `Data check: ${state.dataCheck}`,
      `Comms check: ${state.commsCheck}`,
      `Drill result: ${state.drillResult}`,
      `Note: ${state.note || "—"}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Rollback drill copied.");
    } catch {
      setCopyNote("Copy failed. Select the summary manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Rollback drill</strong>
      <p className="data-subtitle">Confirm the team can stop, communicate, and restore safely before widening access.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Status: {ready ? "READY" : "HOLD"}</span>
        <span className="stat-chip">Result: {state.drillResult}</span>
      </div>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Drill details</strong>
          <input style={inputStyle} value={state.owner} onChange={(event) => update("owner", event.target.value)} placeholder="Owner" />
          <input style={inputStyle} value={state.disablePlan} onChange={(event) => update("disablePlan", event.target.value)} placeholder="Disable plan" />
          <input style={inputStyle} value={state.restorePlan} onChange={(event) => update("restorePlan", event.target.value)} placeholder="Restore plan" />
          <select style={inputStyle} value={state.dataCheck} onChange={(event) => update("dataCheck", event.target.value)}>{CHECKS.map((item) => <option key={item} value={item}>Data {item}</option>)}</select>
          <select style={inputStyle} value={state.commsCheck} onChange={(event) => update("commsCheck", event.target.value)}>{CHECKS.map((item) => <option key={item} value={item}>Comms {item}</option>)}</select>
          <select style={inputStyle} value={state.drillResult} onChange={(event) => update("drillResult", event.target.value)}>{RESULTS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <input style={inputStyle} value={state.note} onChange={(event) => update("note", event.target.value)} placeholder="Note" />
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copySummary}>Copy Rollback Drill</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Rollback Drill</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? { ...DEFAULT_STATE, ...parsed } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}
