import { useEffect, useMemo, useState } from "react";
import { appConfig } from "../config/chain.js";

const STORAGE_KEY = "artic.closedBeta.kpi.v1";
const DEFAULT_KPI = {
  cyclesRun: "0",
  roomsCreated: "0",
  entriesLocked: "0",
  lockIssues: "0",
  matchesFinished: "0",
  settlementsVisible: "0",
  recoveryChecks: "0",
  notes: ""
};
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaKpiPanel() {
  const [kpi, setKpi] = useState(() => loadKpi());
  const [copyNote, setCopyNote] = useState("");
  const score = useMemo(() => getScore(kpi), [kpi]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kpi)); } catch {}
  }, [kpi]);

  function update(key, value) {
    setKpi((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setKpi(DEFAULT_KPI);
    setCopyNote("");
  }

  async function copyKpi() {
    const lines = [
      "Closed Beta KPI Summary",
      `Environment: ${appConfig.chainEnv} / ${appConfig.chainId}`,
      `Health score: ${score.label}`,
      `Cycles run: ${kpi.cyclesRun || "0"}`,
      `Rooms created: ${kpi.roomsCreated || "0"}`,
      `Entries locked: ${kpi.entriesLocked || "0"}`,
      `Lock issues: ${kpi.lockIssues || "0"}`,
      `Matches finished: ${kpi.matchesFinished || "0"}`,
      `Settlements visible: ${kpi.settlementsVisible || "0"}`,
      `Recovery checks: ${kpi.recoveryChecks || "0"}`,
      `Notes: ${kpi.notes || "—"}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("KPI summary copied.");
    } catch {
      setCopyNote("Copy failed. Select the KPI summary manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Beta KPIs</strong>
      <p className="data-subtitle">Track simple quality numbers for each closed-beta wave.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Health: {score.label}</span>
        <span className="stat-chip">Lock issue rate: {score.issueRate}</span>
      </div>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Cycle metrics</strong>
          <input style={inputStyle} inputMode="numeric" value={kpi.cyclesRun} onChange={(event) => update("cyclesRun", event.target.value)} placeholder="Cycles run" />
          <input style={inputStyle} inputMode="numeric" value={kpi.roomsCreated} onChange={(event) => update("roomsCreated", event.target.value)} placeholder="Rooms created" />
          <input style={inputStyle} inputMode="numeric" value={kpi.entriesLocked} onChange={(event) => update("entriesLocked", event.target.value)} placeholder="Entries locked" />
          <input style={inputStyle} inputMode="numeric" value={kpi.lockIssues} onChange={(event) => update("lockIssues", event.target.value)} placeholder="Lock issues" />
          <input style={inputStyle} inputMode="numeric" value={kpi.matchesFinished} onChange={(event) => update("matchesFinished", event.target.value)} placeholder="Matches finished" />
          <input style={inputStyle} inputMode="numeric" value={kpi.settlementsVisible} onChange={(event) => update("settlementsVisible", event.target.value)} placeholder="Settlements visible" />
          <input style={inputStyle} inputMode="numeric" value={kpi.recoveryChecks} onChange={(event) => update("recoveryChecks", event.target.value)} placeholder="Recovery checks passed" />
          <input style={inputStyle} value={kpi.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Short notes" />
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copyKpi}>Copy KPI Summary</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset KPIs</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function getScore(kpi) {
  const entries = Number(kpi.entriesLocked || 0);
  const issues = Number(kpi.lockIssues || 0);
  const finished = Number(kpi.matchesFinished || 0);
  const settlements = Number(kpi.settlementsVisible || 0);
  const issueRateNumber = entries > 0 ? issues / entries : 0;
  const issueRate = entries > 0 ? `${Math.round(issueRateNumber * 100)}%` : "—";
  if (entries === 0) return { label: "NO DATA", issueRate };
  if (issueRateNumber === 0 && finished > 0 && settlements >= finished) return { label: "STRONG", issueRate };
  if (issueRateNumber <= 0.1 && finished > 0) return { label: "WATCH", issueRate };
  return { label: "HOLD", issueRate };
}

function loadKpi() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? { ...DEFAULT_KPI, ...parsed } : DEFAULT_KPI;
  } catch {
    return DEFAULT_KPI;
  }
}
