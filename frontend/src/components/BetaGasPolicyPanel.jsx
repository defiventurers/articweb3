import { useEffect, useState } from "react";
import { appConfig } from "../config/chain.js";

const STORAGE_KEY = "artic.closedBeta.gasPolicy.v1";
const DEFAULT_POLICY = {
  decision: "TESTER-PAID GAS",
  reviewer: "",
  budgetCap: "",
  nextAction: ""
};
const DECISIONS = ["TESTER-PAID GAS", "SPONSORSHIP RESEARCH", "TEST SPONSORSHIP ONLY", "NOT APPROVED"];
const inputStyle = { width: "100%", minWidth: 0, padding: "0.45rem 0.55rem", borderRadius: "10px", border: "1px solid rgba(148, 217, 255, 0.22)", background: "rgba(4, 28, 52, 0.4)", color: "inherit" };

export function BetaGasPolicyPanel() {
  const [policy, setPolicy] = useState(() => loadPolicy());
  const [copyNote, setCopyNote] = useState("");

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(policy)); } catch {}
  }, [policy]);

  function update(key, value) {
    setPolicy((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setPolicy(DEFAULT_POLICY);
    setCopyNote("");
  }

  async function copyPolicy() {
    const lines = [
      "Closed Beta Gas Policy",
      `Environment: ${appConfig.chainEnv} / ${appConfig.chainId}`,
      `Decision: ${policy.decision}`,
      `Reviewer: ${policy.reviewer || "—"}`,
      `Budget cap: ${policy.budgetCap || "—"}`,
      `Next action: ${policy.nextAction || "—"}`,
      "Default guardrail: tester-paid gas until sponsorship has explicit review and budget approval."
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyNote("Gas policy copied.");
    } catch {
      setCopyNote("Copy failed. Select the policy manually.");
    }
  }

  return (
    <section className="data-detail-panel">
      <strong>Gas policy</strong>
      <p className="data-subtitle">Default to tester-paid testnet gas. Do not enable sponsored gas until budget and operating rules are approved.</p>
      <div className="detail-chip-grid">
        <span className="stat-chip">Policy: {policy.decision}</span>
        <span className="stat-chip">Env: {appConfig.chainEnv}</span>
      </div>
      <div className="data-list compact-detail-list">
        <article className="mini-data-card">
          <strong>Decision</strong>
          <select style={inputStyle} value={policy.decision} onChange={(event) => update("decision", event.target.value)}>
            {DECISIONS.map((decision) => <option key={decision} value={decision}>{decision}</option>)}
          </select>
          <input style={inputStyle} value={policy.reviewer} onChange={(event) => update("reviewer", event.target.value)} placeholder="Reviewer / operator" />
          <input style={inputStyle} value={policy.budgetCap} onChange={(event) => update("budgetCap", event.target.value)} placeholder="Budget cap, if any" />
          <input style={inputStyle} value={policy.nextAction} onChange={(event) => update("nextAction", event.target.value)} placeholder="Next action" />
        </article>
      </div>
      <button className="secondary-btn" type="button" onClick={copyPolicy}>Copy Gas Policy</button>
      <button className="secondary-btn" type="button" onClick={reset}>Reset Gas Policy</button>
      {copyNote && <p className="data-subtitle">{copyNote}</p>}
    </section>
  );
}

function loadPolicy() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? { ...DEFAULT_POLICY, ...parsed } : DEFAULT_POLICY;
  } catch {
    return DEFAULT_POLICY;
  }
}
