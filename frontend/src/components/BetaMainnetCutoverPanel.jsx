import { useEffect, useState } from "react";
import { appConfig } from "../config/chain.js";
import { ETH_VAULT_ADDRESS } from "../config/chainTargets.js";

const STORAGE_KEY = "artic.closedBeta.mainnetCutover.v1";
const DEFAULT_PLAN = {
  targetDate: "",
  owner: "",
  frontendCommit: "",
  backendCommit: "",
  vaultAddress: ETH_VAULT_ADDRESS || "",
  rolloutScope: "Internal tiny-value rehearsal",
  rollbackPlan: "",
  decision: "HOLD"
};
const DECISIONS = ["HOLD", "READY FOR INTERNAL REHEARSAL", "READY FOR CAPPED MAINNET BETA", "RETEST FIRST"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaMainnetCutoverPanel() {
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
      "Mainnet Cutover Plan",
      `Current app env: ${appConfig.chainEnv} / ${appConfig.chainId}`,
      `Decision: ${plan.decision}`,
      `Target date: ${plan.targetDate || "—"}`,
      `Owner: ${plan.owner || "—"}`,
      `Frontend commit: ${plan.frontendCommit || "—"}`,
      `Backend commit: ${plan.backendCommit || "—"}`,
      `Vault address: ${plan.vaultAddress || "—"}`,
      `Rollout scope: ${plan.rolloutScope || "—"}`,
      `Rollback plan: ${plan.rollbackPlan || "—"}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Mainnet cutover plan copied.");
    } catch {
      setCopyNote("Copy failed. Select the cutover plan manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Mainnet cutover plan</strong>
      <p className="data-subtitle">Plan a capped rehearsal separately from public launch. Keep rollout scope narrow and reversible.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Decision: {plan.decision}</span>
        <span className="stat-chip">Scope: {plan.rolloutScope || "—"}</span>
      </div>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Cutover details</strong>
          <select style={inputStyle} value={plan.decision} onChange={(event) => update("decision", event.target.value)}>
            {DECISIONS.map((decision) => <option key={decision} value={decision}>{decision}</option>)}
          </select>
          <input style={inputStyle} value={plan.targetDate} onChange={(event) => update("targetDate", event.target.value)} placeholder="Target date" />
          <input style={inputStyle} value={plan.owner} onChange={(event) => update("owner", event.target.value)} placeholder="Owner" />
          <input style={inputStyle} value={plan.frontendCommit} onChange={(event) => update("frontendCommit", event.target.value)} placeholder="Frontend commit" />
          <input style={inputStyle} value={plan.backendCommit} onChange={(event) => update("backendCommit", event.target.value)} placeholder="Backend commit" />
          <input style={inputStyle} value={plan.vaultAddress} onChange={(event) => update("vaultAddress", event.target.value)} placeholder="Mainnet vault address" />
          <input style={inputStyle} value={plan.rolloutScope} onChange={(event) => update("rolloutScope", event.target.value)} placeholder="Rollout scope" />
          <input style={inputStyle} value={plan.rollbackPlan} onChange={(event) => update("rollbackPlan", event.target.value)} placeholder="Rollback plan" />
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copyPlan}>Copy Cutover Plan</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Cutover Plan</button>
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
