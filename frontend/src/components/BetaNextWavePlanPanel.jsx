import { useEffect, useState } from "react";
import { appConfig } from "../config/chain.js";

const STORAGE_KEY = "artic.closedBeta.nextWavePlan.v1";
const DEFAULT_PLAN = {
  waveName: "Wave 2",
  targetDate: "",
  testerCount: "4",
  focus: "Locked Match reliability",
  owner: "",
  decision: "WAITING"
};
const DECISIONS = ["WAITING", "READY TO INVITE", "HOLD", "RETEST FIRST"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaNextWavePlanPanel() {
  const [plan, setPlan] = useState(() => loadPlan());
  const [copyNote, setCopyNote] = useState("");

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); } catch {}
  }, [plan]);

  function update(key, value) {
    setPlan((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setPlan(DEFAULT_PLAN);
    setCopyNote("");
  }

  async function copyPlan() {
    const lines = [
      "Closed Beta Next Wave Plan",
      `Environment: ${appConfig.chainEnv} / ${appConfig.chainId}`,
      `Wave: ${plan.waveName || "—"}`,
      `Target date: ${plan.targetDate || "—"}`,
      `Tester count: ${plan.testerCount || "—"}`,
      `Focus: ${plan.focus || "—"}`,
      `Owner: ${plan.owner || "—"}`,
      `Decision: ${plan.decision || "—"}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Next wave plan copied.");
    } catch {
      setCopyNote("Copy failed. Select the plan manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Next beta wave plan</strong>
      <p className="data-subtitle">Plan the next tester wave only after the current gate, blocker triage, and release decision are clean.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Wave: {plan.waveName || "—"}</span>
        <span className="stat-chip">Decision: {plan.decision}</span>
      </div>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Wave plan</strong>
          <input style={inputStyle} value={plan.waveName} onChange={(event) => update("waveName", event.target.value)} placeholder="Wave name" />
          <input style={inputStyle} value={plan.targetDate} onChange={(event) => update("targetDate", event.target.value)} placeholder="Target date" />
          <input style={inputStyle} value={plan.testerCount} onChange={(event) => update("testerCount", event.target.value)} placeholder="Tester count" />
          <input style={inputStyle} value={plan.focus} onChange={(event) => update("focus", event.target.value)} placeholder="Focus area" />
          <input style={inputStyle} value={plan.owner} onChange={(event) => update("owner", event.target.value)} placeholder="Owner" />
          <select style={inputStyle} value={plan.decision} onChange={(event) => update("decision", event.target.value)}>
            {DECISIONS.map((decision) => <option key={decision} value={decision}>{decision}</option>)}
          </select>
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copyPlan}>Copy Next Wave Plan</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Wave Plan</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadPlan() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? { ...DEFAULT_PLAN, ...parsed } : DEFAULT_PLAN;
  } catch {
    return DEFAULT_PLAN;
  }
}
