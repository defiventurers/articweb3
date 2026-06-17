import { useEffect, useState } from "react";
import { appConfig } from "../config/chain.js";

const STORAGE_KEY = "artic.closedBeta.releaseDecision.v1";
const DEFAULT_DECISION = {
  decision: "HOLD",
  reviewer: "",
  nextAction: "",
  date: ""
};
const DECISIONS = ["HOLD", "READY FOR NEXT BETA WAVE", "RETEST REQUIRED"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaReleaseDecisionPanel() {
  const [state, setState] = useState(() => loadDecision());
  const [copyNote, setCopyNote] = useState("");

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  function update(key, value) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setState(DEFAULT_DECISION);
    setCopyNote("");
  }

  async function copyDecision() {
    const lines = [
      "Closed Beta Release Decision",
      `Environment: ${appConfig.chainEnv} / ${appConfig.chainId}`,
      `Decision: ${state.decision}`,
      `Reviewer: ${state.reviewer || "—"}`,
      `Date: ${state.date || "—"}`,
      `Next action: ${state.nextAction || "—"}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Release decision copied.");
    } catch {
      setCopyNote("Copy failed. Select the decision manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Release decision</strong>
      <p className="data-subtitle">Make a deliberate beta decision after reviewing gate, roster, cycle progress, and blocker triage.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Decision: {state.decision}</span>
        <span className="stat-chip">Env: {appConfig.chainEnv}</span>
      </div>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Decision</strong>
          <select style={inputStyle} value={state.decision} onChange={(event) => update("decision", event.target.value)}>
            {DECISIONS.map((decision) => <option key={decision} value={decision}>{decision}</option>)}
          </select>
          <input style={inputStyle} value={state.reviewer} onChange={(event) => update("reviewer", event.target.value)} placeholder="Reviewer / operator" />
          <input style={inputStyle} value={state.date} onChange={(event) => update("date", event.target.value)} placeholder="Date" />
          <input style={inputStyle} value={state.nextAction} onChange={(event) => update("nextAction", event.target.value)} placeholder="Next action" />
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copyDecision}>Copy Release Decision</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Decision</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadDecision() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? { ...DEFAULT_DECISION, ...parsed } : DEFAULT_DECISION;
  } catch {
    return DEFAULT_DECISION;
  }
}
